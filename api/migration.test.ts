import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Kleos storage migration", () => {
  it("defines the durable tables and query indexes outside request handlers", async () => {
    const [migration, postMigration, sharedApi] = await Promise.all([
      readFile("migrations/0001_folio_storage.sql", "utf8"),
      readFile("migrations/0003_post_feed.sql", "utf8"),
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
    for (const contract of [
      "CREATE TABLE IF NOT EXISTS folio_accounts",
      "CREATE TABLE IF NOT EXISTS folio_posts",
      "CREATE TABLE IF NOT EXISTS folio_post_media",
      "folio_posts_feed_idx",
      "folio_post_media_post_idx",
      "REFERENCES folio_accounts(id)",
    ]) {
      expect(postMigration).toContain(contract);
    }
    expect(sharedApi).not.toContain("CREATE TABLE");
    expect(sharedApi).not.toContain("CREATE INDEX");
  });

  it("defines the messaging tables, their ordering, and their guarantees", async () => {
    const migration = await readFile("migrations/0004_messaging.sql", "utf8");
    for (const contract of [
      "CREATE TABLE IF NOT EXISTS folio_conversations",
      "CREATE TABLE IF NOT EXISTS folio_direct_pairs",
      "CREATE TABLE IF NOT EXISTS folio_conversation_members",
      "CREATE TABLE IF NOT EXISTS folio_messages",
      "CREATE TABLE IF NOT EXISTS folio_message_blocks",
      "REFERENCES folio_accounts(id)",
      "folio_conversation_members_inbox_idx",
      "folio_conversation_members_unread_idx",
      "folio_messages_history_idx",
      "folio_messages_search_idx",
      "folio_messages_outreach_author_idx",
    ]) {
      expect(migration).toContain(contract);
    }
    // One thread per pair, enforced by the database rather than by every caller.
    expect(migration).toContain("CHECK (low_account_id < high_account_id)");
    // Sequences are what unread, read receipts, and the poll delta are built on,
    // so a conversation must never hand the same one out twice.
    expect(migration).toContain("UNIQUE (conversation_id, sequence)");
    // Search ships with the table while it is empty; bolting a stored generated
    // column onto a large folio_messages later rewrites it.
    expect(migration).toContain("GENERATED ALWAYS AS (to_tsvector(");
  });

  it("keeps every messaging statement separately applicable", async () => {
    const migration = await readFile("migrations/0004_messaging.sql", "utf8");
    const statements = migration
      .split("-- migrate:split")
      .map((statement) => statement.trim())
      .filter(Boolean);
    expect(statements).toHaveLength(11);
    for (const statement of statements) {
      const withoutLeadingComments = statement
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("--"))
        .join("\n")
        .trim();
      expect(withoutLeadingComments).toMatch(/^(CREATE|ALTER)\b/);
    }
  });

  it("indexes canonical public profile handles", async () => {
    const migration = await readFile(
      "migrations/0002_public_profile_handles.sql",
      "utf8",
    );
    expect(migration).toContain("folio_records_public_handle_idx");
    expect(migration).toContain("lower(public_record #>> '{person,handle}')");
  });
});
