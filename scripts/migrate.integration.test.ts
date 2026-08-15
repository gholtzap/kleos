import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { migrateDatabase } from "./migrate";

const runDatabaseTests = process.env.RUN_KLEOS_DB_TESTS === "1";

describe.runIf(runDatabaseTests)("migration runner PostgreSQL integration", () => {
  it("serializes concurrent migration runners", async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required.");
    const schema = `migration_test_${randomUUID().replaceAll("-", "")}`;
    const directory = await mkdtemp(join(tmpdir(), "kleos-migrations-"));
    const admin = postgres(databaseUrl, {
      max: 1,
      onnotice: () => undefined,
    });
    const scoped = postgres(databaseUrl, { max: 1 });
    try {
      await admin`CREATE SCHEMA ${admin(schema)}`;
      const names = (await readdir(resolve("migrations")))
        .filter((name) => name.endsWith(".sql"))
        .sort();
      await Promise.all(names.map(async (name) => {
        const source = await readFile(resolve("migrations", name), "utf8");
        await writeFile(resolve(directory, name), source);
      }));
      const probeName = "9999_concurrent_runner_probe.sql";
      await writeFile(resolve(directory, probeName), `
        CREATE TABLE migration_lock_probe (id INTEGER PRIMARY KEY);
        -- migrate:split
        SELECT pg_sleep(0.1);
        -- migrate:split
        INSERT INTO migration_lock_probe (id) VALUES (1);
      `);
      names.push(probeName);
      const logs: string[][] = [[], []];

      const results = await Promise.allSettled(logs.map((messages) => migrateDatabase({
        databaseUrl,
        log: (message) => messages.push(message),
        migrationsDirectory: directory,
        schema,
      })));
      expect(results.map((result) => result.status)).toEqual([
        "fulfilled",
        "fulfilled",
      ]);

      const rows = await scoped<{ name: string }[]>`
        SELECT name
        FROM ${scoped(schema)}.folio_schema_migrations
        ORDER BY name
      `;
      expect(rows.map((row) => row.name)).toEqual(names);
      expect(logs.map((messages) => messages.filter(
        (message) => message.startsWith("Applied "),
      ).length).sort((left, right) => left - right)).toEqual([0, names.length]);
    } finally {
      await scoped.end({ timeout: 5 });
      await admin`DROP SCHEMA IF EXISTS ${admin(schema)} CASCADE`;
      await admin.end({ timeout: 5 });
      await rm(directory, { force: true, recursive: true });
    }
  });
});
