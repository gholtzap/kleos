import type { EditableProfile, ProfileRecord } from "./types/profile";

export const defaultProfileDetails: Omit<ProfileRecord, "name" | "handle"> = {
  postCount: "0 posts",
  mediaCount: "0 photos & videos",
  likeCount: "0 Likes",
  bio: "",
  website: "",
  joined: "",
  following: 0,
  followers: 0,
};

function profileStorageKey(handle: string): string {
  return `kleos:profile:${handle}`;
}

function previousKleosProfileStorageKey(handle: string): string {
  return `kleos:x-profile:${handle}`;
}

function previousFolioProfileStorageKey(handle: string): string {
  return `folio:x-profile:${handle}`;
}

function editableProfileFromValue(value: unknown): EditableProfile | null {
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

export function loadEditableProfile(handle: string): EditableProfile {
  const fallback = {
    bio: defaultProfileDetails.bio,
    website: defaultProfileDetails.website,
  };

  try {
    const stored =
      localStorage.getItem(profileStorageKey(handle)) ??
      localStorage.getItem(previousKleosProfileStorageKey(handle)) ??
      localStorage.getItem(previousFolioProfileStorageKey(handle));
    if (!stored) return fallback;
    return editableProfileFromValue(JSON.parse(stored)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveEditableProfile(
  handle: string,
  profile: EditableProfile,
): void {
  try {
    localStorage.setItem(profileStorageKey(handle), JSON.stringify(profile));
  } catch {
    // The in-memory profile remains editable when browser storage is unavailable.
  }
}
