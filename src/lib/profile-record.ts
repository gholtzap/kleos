import { normalizeKleosRecord } from "./kleos";
import {
  sessionAuthorizationHeader,
  type SessionTokenGetter,
} from "./api-client";
import type { KleosRecord } from "../types";
export { emptyProfileRecord, initialsFromName } from "./profile-identity";

export class ProfileConflictError extends Error {
  constructor() {
    super("Your profile changed elsewhere. It was reloaded — try again.");
    this.name = "ProfileConflictError";
  }
}

async function recordFromResponse(response: Response): Promise<KleosRecord> {
  const record = normalizeKleosRecord(await response.json());
  if (!record) throw new Error("Kleos returned an invalid record.");
  return record;
}

export async function getOwnProfileRecord(
  getToken: SessionTokenGetter,
  signal?: AbortSignal,
): Promise<KleosRecord | null> {
  const response = await fetch("/api/profiles", {
    headers: await sessionAuthorizationHeader(getToken),
    signal,
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not load your profile.");
  return recordFromResponse(response);
}

export async function saveOwnProfileRecord(
  record: KleosRecord,
  getToken: SessionTokenGetter,
): Promise<KleosRecord> {
  const response = await fetch("/api/profiles", {
    method: "PUT",
    headers: {
      ...(await sessionAuthorizationHeader(getToken)),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(record),
  });
  if (response.status === 409) throw new ProfileConflictError();
  if (!response.ok) throw new Error("Could not save your profile.");
  return recordFromResponse(response);
}
