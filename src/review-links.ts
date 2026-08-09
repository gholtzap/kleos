import { isRecord, normalizeFolioRecord } from "./folio";
import type { ReviewBundle } from "./types";

export function reviewTokenFromHash(hash: string) {
  const match = hash.match(/^#\/r\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function responseJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error("Review link request failed.");
  return response.json() as Promise<unknown>;
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
