import { normalizeFolioRecord } from "./folio";
import type { FolioRecord } from "./types";

const publicProfilePattern = /^#\/p\/([^/?]+)(?:\?v=([0-9]+))?$/;

export function publicProfileIdFromHash(hash: string) {
  const match = hash.match(publicProfilePattern);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function publicProfileRevisionFromHash(hash: string) {
  const value = hash.match(publicProfilePattern)?.[2];
  if (!value) return undefined;
  const revision = Number(value);
  return Number.isSafeInteger(revision) ? revision : undefined;
}

async function recordFromResponse(response: Response): Promise<FolioRecord> {
  if (!response.ok) throw new Error("Folio record not found.");
  const record = normalizeFolioRecord(await response.json());
  if (!record) throw new Error("Folio returned an invalid record.");
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
