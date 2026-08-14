import { normalizeKleosRecord } from "./kleos";
import {
  sessionAuthorizationHeader,
  type SessionTokenGetter,
} from "./api-client";
import type { KleosRecord } from "./types";
import type { AccountIdentity } from "./types/profile";

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

export function initialsFromName(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "K";
}

export function emptyProfileRecord(account: AccountIdentity): KleosRecord {
  const name = account.name.trim().slice(0, 200) || "Kleos member";
  return {
    version: 1,
    revision: 0,
    person: {
      id: account.handle.replace(/^@+/, "").slice(0, 200),
      name,
      initials: initialsFromName(name),
      role: "",
      location: "",
      summary: "",
      expertise: [],
      interests: [],
      availability: [],
      notOpenTo: [],
      identityVerified: false,
      employmentVerified: false,
      relationship: "You",
      accent: "graphite",
    },
    claims: [],
    projects: [],
    experience: [],
    education: [],
    certifications: [],
    otherExperience: [],
  };
}
