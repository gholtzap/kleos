import type { XEditableProfile, XProfileRecord } from "./types/x-profile";

export const dummyProfileDetails: Omit<XProfileRecord, "name" | "handle"> = {
  postCount: "12 posts",
  mediaCount: "4 photos & videos",
  likeCount: "8 Likes",
  bio: "Sample profile biography.\nAdd more details about this user here.",
  website: "example.com",
  joined: "Joined January 2024",
  following: 12,
  followers: 34,
};

function profileStorageKey(handle: string): string {
  return `folio:x-profile:${handle}`;
}

function editableProfileFromValue(value: unknown): XEditableProfile | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("bio" in value) ||
    !("website" in value) ||
    typeof value.bio !== "string" ||
    typeof value.website !== "string"
  ) {
    return null;
  }

  return { bio: value.bio, website: value.website };
}

export function loadEditableProfile(handle: string): XEditableProfile {
  const fallback = {
    bio: dummyProfileDetails.bio,
    website: dummyProfileDetails.website,
  };

  try {
    const stored = localStorage.getItem(profileStorageKey(handle));
    if (!stored) return fallback;
    return editableProfileFromValue(JSON.parse(stored)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveEditableProfile(
  handle: string,
  profile: XEditableProfile,
): void {
  try {
    localStorage.setItem(profileStorageKey(handle), JSON.stringify(profile));
  } catch {
    // The in-memory profile remains editable when browser storage is unavailable.
  }
}
