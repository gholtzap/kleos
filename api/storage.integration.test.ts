import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialClaims, currentPerson } from "../src/data";
import type { ApiRequest } from "./_shared";
import { TestResponse } from "./test-response";

const runDatabaseTests = process.env.RUN_KLEOS_DB_TESTS === "1";
const ownerId = `folio-test-${randomUUID()}`;

vi.mock("@neondatabase/serverless", async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const { postgresTestAdapter } = await import("./_postgres-test-adapter");
  return { neon: () => postgresTestAdapter(databaseUrl) };
});

describe.runIf(runDatabaseTests)("Kleos database integration", () => {
  afterEach(async () => {
    const { sql } = await import("./_shared");
    await sql`DELETE FROM folio_posts WHERE owner_id = ${ownerId}`;
    await sql`DELETE FROM folio_accounts WHERE id = ${ownerId}`;
    await sql`DELETE FROM folio_review_links WHERE owner_id = ${ownerId}`;
    await sql`DELETE FROM folio_records WHERE owner_id = ${ownerId}`;
    await sql`
      DELETE FROM folio_rate_limits
      WHERE scope IN ('public-profile', 'discovery', 'review-link')
    `;
  });

  it("keeps feed posts attached to durable account rows", async () => {
    const { sql } = await import("./_shared");
    await sql`
      INSERT INTO folio_accounts (id, name, handle)
      VALUES (${ownerId}, 'Database User', '@database-user')
    `;
    const [post] = await sql`
      INSERT INTO folio_posts (id, owner_id, body)
      VALUES (${randomUUID()}::UUID, ${ownerId}, 'Persistent post')
      RETURNING id::TEXT
    `;
    expect(typeof post?.id).toBe("string");
    await sql`
      INSERT INTO folio_post_media (
        id, post_id, position, kind, public_id, url, width, height, alt
      ) VALUES (
        'asset-test', ${post?.id}::UUID, 0, 'image',
        ${`kleos/posts/${ownerId}/asset-test`}, 'https://example.com/image.webp',
        1200, 800, 'Database image'
      )
    `;
    const [stored] = await sql`
      SELECT post.body, account.id AS owner_id, COUNT(media.id)::INTEGER AS media_count
      FROM folio_posts AS post
      JOIN folio_accounts AS account ON account.id = post.owner_id
      LEFT JOIN folio_post_media AS media ON media.post_id = post.id
      WHERE post.id = ${post?.id}::UUID
      GROUP BY post.id, account.id
    `;
    expect(stored).toMatchObject({
      body: "Persistent post",
      media_count: 1,
      owner_id: ownerId,
    });
  });

  it("persists private evidence and enforces selected, expiring review access", async () => {
    const { loadKleosRecord, saveKleosRecord, sql } = await import(
      "./_shared"
    );
    const {
      createReviewLinkForOwner,
      default: reviewLinksHandler,
      listReviewLinksForOwner,
      revokeReviewLinkForOwner,
    } = await import("./review-links");
    const { default: profilesHandler } = await import("./profiles");
    const claim = initialClaims[0];
    expect(claim).toBeDefined();
    if (!claim) return;
    const record = {
      version: 1 as const,
      revision: 0,
      person: {
        ...currentPerson,
        id: ownerId,
        handle: `db-${ownerId.toLowerCase()}`,
      },
      claims: [claim],
      projects: [],
      experience: [],
      education: [],
      certifications: [],
      otherExperience: [],
    };
    expect(await saveKleosRecord(ownerId, record)).toBe(true);
    expect(await loadKleosRecord(ownerId)).toEqual(record);
    const publicResponse = new TestResponse();
    await profilesHandler(
      {
        method: "GET",
        query: { id: ownerId },
        headers: {},
        body: undefined,
      },
      publicResponse,
    );
    expect(publicResponse.code).toBe(200);
    expect(publicResponse.headers.get("Cache-Control")).toBe(
      "public, max-age=60",
    );
    expect(publicResponse.headers.get("Vercel-CDN-Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=300",
    );
    const handleResponse = new TestResponse();
    await profilesHandler(
      {
        method: "GET",
        query: { handle: record.person.handle },
        headers: { "x-forwarded-for": "127.0.0.2" },
        body: undefined,
      },
      handleResponse,
    );
    expect(handleResponse.code).toBe(200);
    expect(handleResponse.body).toMatchObject({
      person: { id: ownerId, handle: record.person.handle },
    });
    const revisedRecord = { ...record, revision: 1 };
    expect(await saveKleosRecord(ownerId, revisedRecord, 0)).toBe(true);
    expect(
      await saveKleosRecord(ownerId, { ...record, revision: 2 }, 0),
    ).toBe(false);
    expect((await loadKleosRecord(ownerId))?.revision).toBe(1);

    const { default: discoverHandler } = await import("./discover");
    const discoverResponse = new TestResponse();
    await discoverHandler(
      {
        method: "GET",
        query: { q: "migration" },
        headers: { "x-forwarded-for": "127.0.0.1" },
        body: undefined,
      },
      discoverResponse,
    );
    expect(discoverResponse.code).toBe(200);
    expect(discoverResponse.body).toMatchObject({
      items: [
        {
          person: { id: ownerId },
          claim: { id: claim.id },
        },
      ],
    });

    const selectedEvidence = claim.evidence[0];
    expect(selectedEvidence).toBeDefined();
    if (!selectedEvidence) return;
    const created = await createReviewLinkForOwner(ownerId, {
      claimIds: [claim.id],
      evidenceIds: [selectedEvidence.id],
      expiresInDays: 7,
    });
    expect(created).not.toBeNull();
    if (!created) return;
    expect(
      await createReviewLinkForOwner(ownerId, {
        claimIds: [claim.id],
        evidenceIds: ["not-owned"],
        expiresInDays: 7,
      }),
    ).toBeNull();

    const request: ApiRequest = {
      method: "GET",
      query: {},
      headers: { "x-kleos-review-token": created.token },
      body: undefined,
    };
    const activeResponse = new TestResponse();
    await reviewLinksHandler(request, activeResponse);
    expect(activeResponse.code).toBe(200);
    expect(activeResponse.headers.get("Cache-Control")).toBe(
      "private, no-store",
    );
    expect(activeResponse.body).toMatchObject({
      record: {
        claims: [
          {
            id: claim.id,
            evidence: [{ id: selectedEvidence.id }],
          },
        ],
      },
    });

    const claimIds = JSON.stringify([claim.id]);
    const evidenceIds = JSON.stringify([selectedEvidence.id]);
    await sql`
      INSERT INTO folio_review_links (
        id,
        owner_id,
        token_hash,
        claim_ids,
        evidence_ids,
        expires_at,
        created_at
      )
      SELECT
        ${ownerId} || '-active-' || value,
        ${ownerId},
        ${ownerId} || '-active-hash-' || value,
        ${claimIds}::jsonb,
        ${evidenceIds}::jsonb,
        NOW() + INTERVAL '1 day',
        NOW() - value * INTERVAL '1 second'
      FROM generate_series(1, 99) AS series(value)
    `;
    await sql`
      INSERT INTO folio_review_links (
        id,
        owner_id,
        token_hash,
        claim_ids,
        evidence_ids,
        expires_at,
        revoked_at,
        created_at
      )
      SELECT
        ${ownerId} || '-closed-' || value,
        ${ownerId},
        ${ownerId} || '-closed-hash-' || value,
        ${claimIds}::jsonb,
        ${evidenceIds}::jsonb,
        NOW() + INTERVAL '1 day',
        NOW(),
        NOW() - value * INTERVAL '1 second'
      FROM generate_series(1, 101) AS series(value)
    `;
    const listedLinks = await listReviewLinksForOwner(ownerId);
    expect(listedLinks).toHaveLength(200);
    expect(listedLinks.slice(0, 100).every((link) => !link.revokedAt)).toBe(
      true,
    );
    expect(listedLinks.some((link) => link.id === created.id)).toBe(true);
    expect(
      await createReviewLinkForOwner(ownerId, {
        claimIds: [claim.id],
        evidenceIds: [],
        expiresInDays: 7,
      }),
    ).toBeNull();

    await sql`
      UPDATE folio_review_links
      SET expires_at = NOW() - INTERVAL '1 minute'
      WHERE id = ${created.id}
    `;
    const expiredResponse = new TestResponse();
    await reviewLinksHandler(request, expiredResponse);
    expect(expiredResponse.code).toBe(404);

    await sql`
      UPDATE folio_review_links
      SET expires_at = NOW() + INTERVAL '1 minute'
      WHERE id = ${created.id}
    `;
    expect(await revokeReviewLinkForOwner(ownerId, created.id)).toBe(true);
    const revokedResponse = new TestResponse();
    await reviewLinksHandler(request, revokedResponse);
    expect(revokedResponse.code).toBe(404);

    const indexRows = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('folio_records', 'folio_requests')
    `;
    const indexes = new Set(
      indexRows.flatMap((row) =>
        typeof row.indexname === "string" ? [row.indexname] : [],
      ),
    );
    for (const index of [
      "folio_records_search_vector_idx",
      "folio_records_ownership_levels_idx",
      "folio_records_expertise_idx",
      "folio_requests_active_feed_idx",
      "folio_requests_active_kind_idx",
    ]) {
      expect(indexes.has(index)).toBe(true);
    }
  });
});
