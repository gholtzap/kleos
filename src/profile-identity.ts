import { defaultInboundPolicy } from "./inbound-policy.js";
import type { KleosRecord } from "./types.js";
import type { AccountIdentity } from "./types/profile.js";

const MAX_PROFILE_HANDLE_LENGTH = 200;

export function normalizeProfileHandle(value: string): string | null {
  const handle = value.trim().replace(/^@+/, "").toLowerCase();
  return handle.length > 0 &&
    handle.length <= MAX_PROFILE_HANDLE_LENGTH &&
    !/[/?#]/u.test(handle)
    ? handle
    : null;
}

export function profileHandle(
  username: string | null | undefined,
  userId: string,
): string {
  return normalizeProfileHandle(username ?? "") ?? userId.toLowerCase();
}

export function accountHandle(
  username: string | null | undefined,
  userId: string,
): string {
  return `@${profileHandle(username, userId)}`;
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
      id: account.id,
      handle: normalizeProfileHandle(account.handle) ?? account.id.toLowerCase(),
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
    inbound: defaultInboundPolicy(),
  };
}
