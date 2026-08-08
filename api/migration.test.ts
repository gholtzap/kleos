import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Folio storage migration", () => {
  it("defines the durable tables and query indexes outside request handlers", async () => {
    const [migration, sharedApi] = await Promise.all([
      readFile("migrations/0001_folio_storage.sql", "utf8"),
      readFile("api/_shared.ts", "utf8"),
    ]);
    for (const contract of [
      "CREATE TABLE IF NOT EXISTS folio_records",
      "CREATE TABLE IF NOT EXISTS folio_requests",
      "CREATE TABLE IF NOT EXISTS folio_rate_limits",
      "folio_records_search_vector_idx",
      "folio_records_ownership_levels_idx",
      "folio_records_expertise_idx",
      "folio_requests_active_feed_idx",
      "folio_requests_active_kind_idx",
    ]) {
      expect(migration).toContain(contract);
    }
    expect(sharedApi).not.toContain("CREATE TABLE");
    expect(sharedApi).not.toContain("CREATE INDEX");
  });
});
