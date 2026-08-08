import { isRecord, normalizeFolioRecord } from "./folio";
import type {
  CreatedReviewLink,
  ReviewBundle,
  ReviewLinkSummary,
} from "./types";

export function reviewLinkHash(token: string) {
  return `#/r/${encodeURIComponent(token)}`;
}

export function reviewTokenFromHash(hash: string) {
  const match = hash.match(/^#\/r\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function reviewLinkSummary(value: unknown): ReviewLinkSummary | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isStringArray(value.claimIds) ||
    !isStringArray(value.evidenceIds) ||
    typeof value.createdAt !== "string" ||
    typeof value.expiresAt !== "string" ||
    (value.revokedAt !== undefined && typeof value.revokedAt !== "string")
  ) {
    return null;
  }
  return {
    id: value.id,
    claimIds: value.claimIds,
    evidenceIds: value.evidenceIds,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
    revokedAt: value.revokedAt,
  };
}

async function responseJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error("Review link request failed.");
  return response.json() as Promise<unknown>;
}

export async function listReviewLinks(
  token: string,
): Promise<ReviewLinkSummary[]> {
  const value = await responseJson(
    await fetch("/api/review-links", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
  if (!Array.isArray(value)) throw new Error("Invalid review link list.");
  const links = value.map(reviewLinkSummary);
  if (links.some((link) => link === null)) {
    throw new Error("Invalid review link list.");
  }
  return links.filter((link): link is ReviewLinkSummary => link !== null);
}

export async function createReviewLink(
  token: string,
  input: {
    claimIds: string[];
    evidenceIds: string[];
    expiresInDays: number;
  },
): Promise<CreatedReviewLink> {
  const value = await responseJson(
    await fetch("/api/review-links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }),
  );
  const summary = reviewLinkSummary(value);
  if (!summary || !isRecord(value) || typeof value.token !== "string") {
    throw new Error("Invalid review link.");
  }
  return { ...summary, token: value.token };
}

export async function revokeReviewLink(
  token: string,
  id: string,
): Promise<void> {
  const response = await fetch(`/api/review-links?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Could not revoke review link.");
}

export async function getReviewBundle(
  token: string,
  signal?: AbortSignal,
): Promise<ReviewBundle> {
  const value = await responseJson(
    await fetch("/api/review-links", {
      headers: { "X-Folio-Review-Token": token },
      signal,
    }),
  );
  if (!isRecord(value) || typeof value.expiresAt !== "string") {
    throw new Error("Invalid review bundle.");
  }
  const record = normalizeFolioRecord(value.record);
  if (!record) throw new Error("Invalid review bundle.");
  return { record, expiresAt: value.expiresAt };
}
