import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import {
  discoveryProjection,
  normalizeKleosRecord,
} from "../src/kleos.ts";

const MIGRATION_LOCK_NAME = "kleos-schema-migrations";
const PAGE_SIZE = 500;
const SCHEMA_PATTERN = /^[a-z_][a-z0-9_]*$/;

type Database = ReturnType<typeof postgres>;

interface MigrationFile {
  name: string;
  statements: readonly string[];
}

interface MigrationOptions {
  databaseUrl: string;
  log?: (message: string) => void;
  migrationsDirectory?: string;
  schema?: string;
}

interface LegacyRow {
  owner_id: string;
  profile: unknown;
}

interface ProjectionRow {
  owner_id: string;
  record: unknown;
  revision: number | string;
}

function migrationSchema(value: string | undefined): string {
  const schema = value?.trim() || "public";
  if (!SCHEMA_PATTERN.test(schema)) {
    throw new Error("MIGRATION_SCHEMA must be a PostgreSQL identifier.");
  }
  return schema;
}

async function migrationFiles(directory: string): Promise<readonly MigrationFile[]> {
  const names = (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  return Promise.all(names.map(async (name) => {
    const source = await readFile(resolve(directory, name), "utf8");
    return {
      name,
      statements: source
        .split("-- migrate:split")
        .map((statement) => statement.trim())
        .filter(Boolean),
    };
  }));
}

async function applySchemaMigrations(
  sql: Database,
  files: readonly MigrationFile[],
  schema: string,
): Promise<readonly string[]> {
  return sql.begin(async (transaction) => {
    await transaction`
      SELECT pg_advisory_xact_lock(hashtextextended(${MIGRATION_LOCK_NAME}, 0))
    `;
    await transaction.unsafe(`SET LOCAL search_path TO "${schema}"`);
    await transaction`
      CREATE TABLE IF NOT EXISTS folio_schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    const appliedRows = await transaction<{ name: string }[]>`
      SELECT name FROM folio_schema_migrations
    `;
    const applied = new Set(appliedRows.map((row) => row.name));
    const added: string[] = [];

    for (const file of files) {
      if (applied.has(file.name)) continue;
      for (const statement of file.statements) {
        await transaction.unsafe(statement);
      }
      await transaction`
        INSERT INTO folio_schema_migrations (name)
        VALUES (${file.name})
      `;
      added.push(file.name);
    }
    return added;
  });
}

function isUndefinedTable(error: unknown): boolean {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42P01";
}

async function backfillLegacyRecords(sql: Database, schema: string): Promise<void> {
  try {
    let legacyCursor = "";
    for (;;) {
      const rows = await sql.begin(async (transaction) => {
        await transaction.unsafe(`SET LOCAL search_path TO "${schema}"`);
        const page = await transaction<LegacyRow[]>`
          SELECT user_id::TEXT AS owner_id, profile
          FROM public_profiles
          WHERE user_id::TEXT > ${legacyCursor}
            AND NOT EXISTS (
              SELECT 1
              FROM folio_records
              WHERE owner_id = user_id::TEXT
            )
          ORDER BY user_id::TEXT
          LIMIT ${PAGE_SIZE}
        `;
        const inserts = page.flatMap((row) => {
          const record = normalizeKleosRecord(row.profile);
          if (!record) return [];
          record.person.id = row.owner_id;
          const projection = discoveryProjection(record);
          return [{
            ownerId: row.owner_id,
            ownershipLevels: projection.ownershipLevels,
            expertise: projection.expertise,
            publicRecord: JSON.stringify(projection.publicRecord),
            record: JSON.stringify(record),
            revision: record.revision,
            searchText: projection.searchText,
          }];
        });
        await Promise.all(inserts.map((insert) => transaction`
            INSERT INTO folio_records (
              owner_id,
              revision,
              record,
              public_record,
              search_text,
              ownership_levels,
              expertise
            )
            VALUES (
              ${insert.ownerId},
              ${insert.revision},
              ${insert.record}::JSONB,
              ${insert.publicRecord}::JSONB,
              ${insert.searchText},
              ${insert.ownershipLevels},
              ${insert.expertise}
            )
            ON CONFLICT (owner_id) DO NOTHING
          `));
        return page;
      });
      if (!rows.length) break;
      const last = rows.at(-1);
      if (!last) break;
      legacyCursor = last.owner_id;
    }
  } catch (error) {
    if (!isUndefinedTable(error)) throw error;
  }
}

async function backfillProjections(sql: Database, schema: string): Promise<void> {
  let projectionCursor = "";
  for (;;) {
    const rows = await sql.begin(async (transaction) => {
      await transaction.unsafe(`SET LOCAL search_path TO "${schema}"`);
      const page = await transaction<ProjectionRow[]>`
        SELECT owner_id, revision, record
        FROM folio_records
        WHERE owner_id > ${projectionCursor}
          AND (
            public_record = '{}'::JSONB
            OR search_text = ''
          )
        ORDER BY owner_id
        LIMIT ${PAGE_SIZE}
      `;
      const updates = page.map((row) => {
        const record = normalizeKleosRecord(row.record);
        if (!record) {
          throw new Error(`Stored Kleos record ${row.owner_id} is invalid.`);
        }
        record.revision = Number(row.revision);
        const projection = discoveryProjection(record);
        return {
          expertise: projection.expertise,
          ownerId: row.owner_id,
          ownershipLevels: projection.ownershipLevels,
          publicRecord: JSON.stringify(projection.publicRecord),
          record: JSON.stringify(record),
          revision: record.revision,
          searchText: projection.searchText,
        };
      });
      await Promise.all(updates.map((update) => transaction`
        UPDATE folio_records
        SET
          record = ${update.record}::JSONB,
          public_record = ${update.publicRecord}::JSONB,
          search_text = ${update.searchText},
          ownership_levels = ${update.ownershipLevels},
          expertise = ${update.expertise}
        WHERE owner_id = ${update.ownerId}
          AND revision = ${update.revision}
      `));
      return page;
    });
    if (!rows.length) break;
    const last = rows.at(-1);
    if (!last) break;
    projectionCursor = last.owner_id;
  }
}

export async function migrateDatabase({
  databaseUrl,
  log = console.log,
  migrationsDirectory = resolve("migrations"),
  schema: schemaValue,
}: MigrationOptions): Promise<void> {
  const schema = migrationSchema(schemaValue);
  const files = await migrationFiles(migrationsDirectory);
  const sql = postgres(databaseUrl, {
    max: 1,
    onnotice: () => undefined,
  });
  try {
    const applied = await applySchemaMigrations(sql, files, schema);
    for (const name of applied) log(`Applied ${name}.`);
    await backfillLegacyRecords(sql, schema);
    await backfillProjections(sql, schema);
    log("Kleos storage is current.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  await migrateDatabase({
    databaseUrl,
    schema: process.env.MIGRATION_SCHEMA,
  });
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(resolve(entryPoint)).href) {
  await main();
}
