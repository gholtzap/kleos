export type XProfileTab = "Posts" | "Replies" | "Highlights" | "Media" | "Likes";

export interface XAccountIdentity {
  name: string;
  handle: string;
}

export interface XProfileRecord extends XAccountIdentity {
  postCount: string;
  mediaCount: string;
  likeCount: string;
  bio: string;
  website: string;
  joined: string;
  following: number;
  followers: number;
}

export type XEditableProfile = Pick<XProfileRecord, "bio" | "website">;
