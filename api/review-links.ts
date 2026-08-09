import { createHash, randomBytes, randomUUID } from "node:crypto";
import { reviewFolioRecord } from "../src/folio";
import type {
  CreatedReviewLink,
  ReviewBundle,
  ReviewLinkSummary,
} from "../src/types";
import {
  authenticatedUserId,
  enforceRateLimit,
  first,
  isoDate,
  isRecord,
  loadFolioRecord,
  observed,
  parseBody,
  privateResponse,
  sendRateLimit,
  sql,
  stringArray,
  type ApiRequest,
  type ApiResponse,
} from "./_shared";

const MAX_EXPIRY_DAYS = 90;
const MAX_ACTIVE_LINKS = 100;

export interface ReviewLinkInput {
  claimIds: string[];
  evidenceIds: string[];
  expiresInDays: number;
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 100 &&
    value.every(
      (item) =>
        typeof item === "string" && item.length > 0 && item.length <= 200,
    ) &&
    new Set(value).size === value.length
  );
}

function reviewLinkInput(value: unknown): ReviewLinkInput | null {
  if (
    !isRecord(value) ||
    !isStringArray(value.claimIds) ||
    !Array.isArray(value.evidenceIds) ||
    value.evidenceIds.length > 5_000 ||
    !value.evidenceIds.every(
      (item) =>
        typeof item === "string" && item.length > 0 && item.length <= 200,
    ) ||
    new Set(value.evidenceIds).size !== value.evidenceIds.length ||
    !Number.isInteger(value.expiresInDays) ||
    typeof value.expiresInDays !== "number" ||
    value.expiresInDays < 1 ||
    value.expiresInDays > MAX_EXPIRY_DAYS
  ) {
    return null;
  }
  return {
    claimIds: value.claimIds,
    evidenceIds: value.evidenceIds,
    expiresInDays: value.expiresInDays,
  };
}

function summaryFromRow(row: Record<string, unknown>): ReviewLinkSummary | null {
  const claimIds = stringArray(row.claim_ids);
  const evidenceIds = stringArray(row.evidence_ids);
  const createdAt = isoDate(row.created_at);
  const expiresAt = isoDate(row.expires_at);
  const revokedAt = row.revoked_at ? isoDate(row.revoked_at) : undefined;
  if (
    typeof row.id !== "string" ||
    !claimIds ||
    !evidenceIds ||
    !createdAt ||
    !expiresAt ||
    (row.revoked_at && !revokedAt)
  ) {
    return null;
  }
  return {
    id: row.id,
    claimIds,
    evidenceIds,
    createdAt,
    expiresAt,
    revokedAt: revokedAt ?? undefined,
  };
}

export async function createReviewLinkForOwner(
  userId: string,
  input: ReviewLinkInput,
): Promise<CreatedReviewLink | null> {
  const record = await loadFolioRecord(userId);
  if (!record) return null;
  const claims = record.claims.filter((claim) =>
    input.claimIds.includes(claim.id),
  );
  const selectableEvidence = new Set(
    claims.flatMap((claim) => claim.evidence.map((item) => item.id)),
  );
  if (
    claims.length !== input.claimIds.length ||
    input.evidenceIds.some((id) => !selectableEvidence.has(id))
  ) {
    return null;
  }

  const id = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const claimIds = JSON.stringify(input.claimIds);
  const evidenceIds = JSON.stringify(input.evidenceIds);
  const [row] = await sql`
    WITH owner_lock AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))
    ),
    active_count AS MATERIALIZED (
      SELECT COUNT(*) AS value
      FROM folio_review_links
      CROSS JOIN owner_lock
      WHERE owner_id = ${userId}
        AND revoked_at IS NULL
        AND expires_at > NOW()
    )
    INSERT INTO folio_review_links (
      id,
      owner_id,
      token_hash,
      claim_ids,
      evidence_ids,
      expires_at
    )
    SELECT
      ${id},
      ${userId},
      ${tokenHash(token)},
      ${claimIds},
      ${evidenceIds},
      ${expiresAt}
    FROM active_count
    WHERE value < ${MAX_ACTIVE_LINKS}
    RETURNING id, claim_ids, evidence_ids, created_at, expires_at, revoked_at
  `;
  const summary = row ? summaryFromRow(row) : null;
  return summary ? { ...summary, token } : null;
}

export async function revokeReviewLinkForOwner(
  userId: string,
  id: string,
): Promise<boolean> {
  const rows = await sql`
    UPDATE folio_review_links
    SET revoked_at = COALESCE(revoked_at, NOW())
    WHERE id = ${id} AND owner_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function listReviewLinksForOwner(
  userId: string,
): Promise<ReviewLinkSummary[]> {
  const rows = await sql`
    SELECT id, claim_ids, evidence_ids, created_at, expires_at, revoked_at
    FROM folio_review_links
    WHERE owner_id = ${userId}
      AND (
        (revoked_at IS NULL AND expires_at > NOW())
        OR id IN (
          SELECT id
          FROM folio_review_links
          WHERE owner_id = ${userId}
            AND (revoked_at IS NOT NULL OR expires_at <= NOW())
          ORDER BY created_at DESC
          LIMIT 100
        )
      )
    ORDER BY
      (revoked_at IS NULL AND expires_at > NOW()) DESC,
      created_at DESC
  `;
  return rows
    .map(summaryFromRow)
    .filter((link): link is ReviewLinkSummary => link !== null);
}

async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  const reviewToken = first(request.headers["x-folio-review-token"]);
  if (request.method === "GET" && reviewToken) {
    const token = reviewToken;
    if (token.length < 32 || token.length > 200) {
      return response.status(404).json({ error: "Review link not found." });
    }
    const limit = await enforceRateLimit(request, "review-link", 60, 60);
    if (!limit.allowed) return sendRateLimit(response, limit);
    const [row] = await sql`
      SELECT owner_id, claim_ids, evidence_ids, expires_at
      FROM folio_review_links
      WHERE token_hash = ${tokenHash(token)}
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `;
    const claimIds = stringArray(row?.claim_ids);
    const evidenceIds = stringArray(row?.evidence_ids);
    const expiresAt = isoDate(row?.expires_at);
    if (
      typeof row?.owner_id !== "string" ||
      !claimIds ||
      !evidenceIds ||
      !expiresAt
    ) {
      return response.status(404).json({ error: "Review link not found." });
    }
    const record = await loadFolioRecord(row.owner_id);
    if (!record) {
      return response.status(404).json({ error: "Review link not found." });
    }
    const bundle: ReviewBundle = {
      record: reviewFolioRecord(record, claimIds, evidenceIds),
      expiresAt,
    };
    return privateResponse(response).status(200).json(bundle);
  }

  const userId = await authenticatedUserId(request);
  if (!userId) {
    return response.status(401).json({ error: "Unauthorized." });
  }
  const limit = await enforceRateLimit(
    request,
    "review-link-owner",
    120,
    60,
    userId,
  );
  if (!limit.allowed) return sendRateLimit(response, limit);

  if (request.method === "GET") {
    const links = await listReviewLinksForOwner(userId);
    return privateResponse(response).status(200).json(links);
  }

  if (request.method === "POST") {
    const input = reviewLinkInput(parseBody(request.body));
    if (!input) {
      return response.status(400).json({ error: "Invalid review link." });
    }
    const created = await createReviewLinkForOwner(userId, input);
    if (!created) {
      return response.status(400).json({ error: "Invalid review selection." });
    }
    return privateResponse(response).status(201).json(created);
  }

  if (request.method === "DELETE") {
    const body = parseBody(request.body);
    const id =
      first(request.query.id) ??
      (isRecord(body) && typeof body.id === "string" ? body.id : "");
    if (!id) {
      return response.status(400).json({ error: "Review link ID is required." });
    }
    if (!(await revokeReviewLinkForOwner(userId, id))) {
      return response.status(404).json({ error: "Review link not found." });
    }
    return privateResponse(response).status(204).end();
  }

  response.setHeader("Allow", "GET, POST, DELETE");
  return response.status(405).json({ error: "Method not allowed." });
}

export default observed("review-links", handler);
