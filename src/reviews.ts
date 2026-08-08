import { isRecord, normalizeEvidence } from "./folio";
import type { EvidenceReviewItem } from "./types";

function reviewItem(value: unknown): EvidenceReviewItem | null {
  if (
    !isRecord(value) ||
    typeof value.ownerId !== "string" ||
    typeof value.ownerName !== "string" ||
    typeof value.claimId !== "string" ||
    typeof value.claimTitle !== "string" ||
    typeof value.contribution !== "string" ||
    typeof value.outcome !== "string" ||
    typeof value.outcomeContext !== "string"
  ) {
    return null;
  }
  const evidence = normalizeEvidence(value.evidence);
  return evidence
    ? {
        ownerId: value.ownerId,
        ownerName: value.ownerName,
        claimId: value.claimId,
        claimTitle: value.claimTitle,
        contribution: value.contribution,
        outcome: value.outcome,
        outcomeContext: value.outcomeContext,
        evidence,
      }
    : null;
}

export async function getEvidenceReviews(
  token: string,
): Promise<EvidenceReviewItem[] | null> {
  const response = await fetch("/api/reviews", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 403) return null;
  if (!response.ok) throw new Error("Could not load evidence reviews.");
  const value = (await response.json()) as unknown;
  if (!Array.isArray(value)) throw new Error("Invalid evidence review queue.");
  const items = value.map(reviewItem);
  if (items.some((item) => item === null)) {
    throw new Error("Invalid evidence review queue.");
  }
  return items.filter((item): item is EvidenceReviewItem => item !== null);
}

export async function decideEvidenceReview(
  token: string,
  input: {
    ownerId: string;
    claimId: string;
    evidenceId: string;
    decision: "Confirmed" | "Rejected";
    note: string;
  },
): Promise<void> {
  const response = await fetch("/api/reviews", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Could not save the review decision.");
}
