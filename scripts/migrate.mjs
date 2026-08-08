import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import {
  discoveryProjection,
  normalizeFolioRecord,
} from "../src/folio.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const sql = neon(databaseUrl);
const migrationsDirectory = resolve("migrations");

await sql`
  CREATE TABLE IF NOT EXISTS folio_schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const appliedRows = await sql`SELECT name FROM folio_schema_migrations`;
const applied = new Set(
  appliedRows.flatMap((row) =>
    typeof row.name === "string" ? [row.name] : [],
  ),
);
const files = (await readdir(migrationsDirectory))
  .filter((name) => name.endsWith(".sql"))
  .sort();

for (const name of files) {
  if (applied.has(name)) continue;
  const source = await readFile(resolve(migrationsDirectory, name), "utf8");
  const statements = source
    .split("-- migrate:split")
    .map((statement) => statement.trim())
    .filter(Boolean);
  await sql.transaction((transaction) => [
    ...statements.map((statement) => transaction.query(statement)),
    transaction`
      INSERT INTO folio_schema_migrations (name)
      VALUES (${name})
    `,
  ]);
  console.log(`Applied ${name}.`);
}

try {
  let legacyCursor = "";
  for (;;) {
    const rows = await sql`
      SELECT user_id::TEXT AS owner_id, profile
      FROM public_profiles
      WHERE user_id::TEXT > ${legacyCursor}
        AND NOT EXISTS (
          SELECT 1
          FROM folio_records
          WHERE owner_id = user_id::TEXT
        )
      ORDER BY user_id::TEXT
      LIMIT 500
    `;
    if (!rows.length) break;
    const inserts = rows.flatMap((row) => {
      if (typeof row.owner_id !== "string") return [];
      const record = normalizeFolioRecord(row.profile);
      if (!record) return [];
      record.person.id = row.owner_id;
      const projection = discoveryProjection(record);
      return [
        sql`
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
            ${row.owner_id},
            ${record.revision},
            ${JSON.stringify(record)},
            ${JSON.stringify(projection.publicRecord)},
            ${projection.searchText},
            ${projection.ownershipLevels},
            ${projection.expertise}
          )
          ON CONFLICT (owner_id) DO NOTHING
        `,
      ];
    });
    if (inserts.length) await sql.transaction(inserts);
    const last = rows.at(-1);
    if (!last || typeof last.owner_id !== "string") break;
    legacyCursor = last.owner_id;
  }
} catch (error) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== "42P01"
  ) {
    throw error;
  }
}

let projectionCursor = "";
for (;;) {
  const rows = await sql`
    SELECT owner_id, revision, record
    FROM folio_records
    WHERE owner_id > ${projectionCursor}
      AND (
        public_record = '{}'::JSONB
        OR search_text = ''
      )
    ORDER BY owner_id
    LIMIT 500
  `;
  if (!rows.length) break;
  const updates = rows.flatMap((row) => {
    if (
      typeof row.owner_id !== "string" ||
      (typeof row.revision !== "number" &&
        typeof row.revision !== "string")
    ) {
      return [];
    }
    const record = normalizeFolioRecord(row.record);
    if (!record) {
      throw new Error(`Stored Folio record ${row.owner_id} is invalid.`);
    }
    record.revision = Number(row.revision);
    const projection = discoveryProjection(record);
    return [
      sql`
        UPDATE folio_records
        SET
          record = ${JSON.stringify(record)},
          public_record = ${JSON.stringify(projection.publicRecord)},
          search_text = ${projection.searchText},
          ownership_levels = ${projection.ownershipLevels},
          expertise = ${projection.expertise}
        WHERE owner_id = ${row.owner_id}
          AND revision = ${record.revision}
      `,
    ];
  });
  if (updates.length) await sql.transaction(updates);
  const last = rows.at(-1);
  if (!last || typeof last.owner_id !== "string") break;
  projectionCursor = last.owner_id;
}

console.log("Folio storage is current.");
