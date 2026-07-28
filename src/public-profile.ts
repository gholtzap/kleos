import type { Claim, Person } from "./types";

export interface PublicProfile {
  person: Person;
  claims: Claim[];
}

export function publicProfileHash(id: string) {
  return `#/p/${encodeURIComponent(id)}`;
}

export function publicProfileIdFromHash(hash: string) {
  const match = hash.match(/^#\/p\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function getPublicProfile(id: string, signal?: AbortSignal) {
  const response = await fetch(`/api/profiles?id=${encodeURIComponent(id)}`, { signal });
  if (!response.ok) throw new Error("Profile not found.");
  return response.json() as Promise<PublicProfile>;
}

export async function savePublicProfile(token: string, profile: PublicProfile) {
  const response = await fetch("/api/profiles", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw new Error("Could not publish profile.");
}
