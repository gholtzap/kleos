import { isRecord, normalizeKleosRecord } from "./kleos";
import type { ReviewBundle } from "./types";

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
      headers: { "X-Kleos-Review-Token": token },
      signal,
    }),
  );
  if (!isRecord(value) || typeof value.expiresAt !== "string") {
    throw new Error("Invalid review bundle.");
  }
  const record = normalizeKleosRecord(value.record);
  if (!record) throw new Error("Invalid review bundle.");
  return { record, expiresAt: value.expiresAt };
}
