import { normalizeKleosRecord } from "./kleos";
import type { KleosRecord } from "../types";

async function recordFromResponse(response: Response): Promise<KleosRecord> {
  if (!response.ok) throw new Error("Kleos record not found.");
  const record = normalizeKleosRecord(await response.json());
  if (!record) throw new Error("Kleos returned an invalid record.");
  return record;
}

export async function getPublicProfile(
  id: string,
  revision?: number,
  signal?: AbortSignal,
) {
  const parameters = new URLSearchParams({ id });
  if (revision !== undefined) parameters.set("v", String(revision));
  return recordFromResponse(
    await fetch(`/api/profiles?${parameters}`, { signal }),
  );
}

export async function getPublicProfileByHandle(
  handle: string,
  signal?: AbortSignal,
) {
  const parameters = new URLSearchParams({ handle });
  return recordFromResponse(
    await fetch(`/api/profiles?${parameters}`, { signal }),
  );
}
