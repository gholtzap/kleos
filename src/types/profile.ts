export type ProfileTab = "Posts" | "Replies" | "Highlights" | "Media" | "Likes";

export interface AccountIdentity {
  name: string;
  handle: string;
}

export interface ProfileRecord extends AccountIdentity {
  postCount: string;
  mediaCount: string;
  likeCount: string;
  bio: string;
  website: string;
  joined: string;
  following: number;
  followers: number;
}

export type EditableProfile = Pick<ProfileRecord, "bio" | "website">;
