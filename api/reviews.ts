import {
  applyEvidenceReviewDecision,
  normalizeEvidence,
} from "../src/folio";
import type { EvidenceReviewItem } from "../src/types";
import {
  authenticatedUserId,
  enforceRateLimit,
  isRecord,
  loadFolioRecord,
  observed,
  parseBody,
  reviewerIsAllowed,
  saveFolioRecord,
  sendRateLimit,
  sql,
  type ApiRequest,
  type ApiResponse,
} from "./_shared";

interface ReviewDecision {
  ownerId: string;
  claimId: string;
  evidenceId: string;
  decision: "Confirmed" | "Rejected";
  note: string;
}

function reviewDecision(value: unknown): ReviewDecision | null {
  if (
    !isRecord(value) ||
    typeof value.ownerId !== "string" ||
    value.ownerId.length > 200 ||
    typeof value.claimId !== "string" ||
    value.claimId.length > 200 ||
    typeof value.evidenceId !== "string" ||
    value.evidenceId.length > 200 ||
    (value.decision !== "Confirmed" && value.decision !== "Rejected") ||
    typeof value.note !== "string" ||
    value.note.length > 5_000 ||
    (value.decision === "Rejected" && value.note.trim().length < 10)
  ) {
    return null;
  }
  return {
    ownerId: value.ownerId,
    claimId: value.claimId,
    evidenceId: value.evidenceId,
    decision: value.decision,
    note: value.note.trim(),
  };
}

async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  const reviewerId = await authenticatedUserId(request);
  if (!reviewerId) {
    return response.status(401).json({ error: "Unauthorized." });
  }
  if (!reviewerIsAllowed(reviewerId)) {
    return response.status(403).json({ error: "Reviewer access is required." });
  }
  const limit = await enforceRateLimit(
    request,
    "evidence-review",
    120,
    60,
    reviewerId,
  );
  if (!limit.allowed) return sendRateLimit(response, limit);

  if (request.method === "GET") {
    // ponytail: Indexed JSONB fits bounded Folio records. Normalize the queue if measured latency grows.
    const rows = await sql`
      SELECT
        owner_id,
        record->'person'->>'name' AS owner_name,
        claim->>'id' AS claim_id,
        claim->>'title' AS claim_title,
        claim->>'contribution' AS contribution,
        claim->>'outcome' AS outcome,
        claim->>'outcomeContext' AS outcome_context,
        evidence
      FROM folio_records
      CROSS JOIN LATERAL jsonb_array_elements(record->'claims') AS claim
      CROSS JOIN LATERAL jsonb_array_elements(
        COALESCE(claim->'evidence', '[]'::jsonb)
      ) AS evidence
      WHERE evidence->>'reviewStatus' = 'Pending'
        AND record @? '$.claims[*].evidence[*] ? (@.reviewStatus == "Pending")'
        AND owner_id <> ${reviewerId}
      ORDER BY evidence->>'updatedAt' ASC
      LIMIT 200
    `;
    const items = rows.flatMap((row): EvidenceReviewItem[] => {
      const evidence = normalizeEvidence(row.evidence);
      return evidence &&
        typeof row.owner_id === "string" &&
        typeof row.owner_name === "string" &&
        typeof row.claim_id === "string" &&
        typeof row.claim_title === "string" &&
        typeof row.contribution === "string" &&
        typeof row.outcome === "string" &&
        typeof row.outcome_context === "string"
        ? [
            {
              ownerId: row.owner_id,
              ownerName: row.owner_name,
              claimId: row.claim_id,
              claimTitle: row.claim_title,
              contribution: row.contribution,
              outcome: row.outcome,
              outcomeContext: row.outcome_context,
              evidence,
            },
          ]
        : [];
    });
    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).json(items);
  }

  if (request.method === "PATCH") {
    const input = reviewDecision(parseBody(request.body));
    if (!input) {
      return response.status(400).json({ error: "Invalid review decision." });
    }
    if (input.ownerId === reviewerId) {
      return response
        .status(403)
        .json({ error: "Reviewers cannot confirm their own evidence." });
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const record = await loadFolioRecord(input.ownerId);
      if (!record) {
        return response
          .status(404)
          .json({ error: "Pending evidence not found." });
      }
      const now = new Date().toISOString();
      const updatedRecord = applyEvidenceReviewDecision(
        record,
        input.claimId,
        input.evidenceId,
        input.decision,
        input.note,
        reviewerId,
        now,
      );
      if (!updatedRecord) {
        return response
          .status(404)
          .json({ error: "Pending evidence not found." });
      }
      updatedRecord.revision = record.revision + 1;
      if (
        await saveFolioRecord(input.ownerId, updatedRecord, record.revision)
      ) {
        response.setHeader("Cache-Control", "private, no-store");
        return response.status(204).end();
      }
    }
    return response
      .status(409)
      .json({ error: "Folio changed. Review it again." });
  }

  response.setHeader("Allow", "GET, PATCH");
  return response.status(405).json({ error: "Method not allowed." });
}

export default observed("reviews", handler);
