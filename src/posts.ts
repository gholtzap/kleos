import { includesValue, isRecord } from "./kleos.js";
import type {
  FeedPost,
  LinkPreview,
  MediaUploadTicket,
  NewPost,
  NewPostMedia,
  PostAuthor,
  PostMedia,
  ResultPage,
} from "./types.js";
import type { AccountIdentity } from "./types/profile.js";

export const postMediaKinds = ["image", "video"] as const;
export const postImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export const postVideoMimeTypes = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
] as const;

export const MAX_POST_BODY_LENGTH = 5_000;
export const MAX_POST_IMAGES = 4;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_VIDEO_DURATION_SECONDS = 5 * 60;

export function normalizeNewPost(value: unknown): NewPost | null {
  if (!isRecord(value) || typeof value.body !== "string" || !Array.isArray(value.media)) {
    return null;
  }
  const media = value.media
    .map(normalizeNewPostMedia)
    .filter((item): item is NewPostMedia => item !== null);
  if (media.length !== value.media.length) return null;

  const post = { body: value.body.trim(), media };
  return postContentIsValid(post) ? post : null;
}

export function postContentIsValid(post: NewPost): boolean {
  if (post.body.length > MAX_POST_BODY_LENGTH || (!post.body && !post.media.length)) {
    return false;
  }
  const images = post.media.filter((item) => item.kind === "image").length;
  const videos = post.media.filter((item) => item.kind === "video").length;
  return (
    (videos === 0 && images <= MAX_POST_IMAGES) ||
    (videos === 1 && images === 0 && post.media.length === 1)
  );
}

export function acceptedPostFile(file: Pick<File, "size" | "type">): boolean {
  if (includesValue(postImageMimeTypes, file.type)) return file.size <= MAX_IMAGE_BYTES;
  if (includesValue(postVideoMimeTypes, file.type)) return file.size <= MAX_VIDEO_BYTES;
  return false;
}

export function postMediaKindForMimeType(
  mimeType: string,
): "image" | "video" | null {
  if (includesValue(postImageMimeTypes, mimeType)) return "image";
  if (includesValue(postVideoMimeTypes, mimeType)) return "video";
  return null;
}

function normalizeNewPostMedia(value: unknown): NewPostMedia | null {
  if (
    !isRecord(value) ||
    typeof value.publicId !== "string" ||
    !includesValue(postMediaKinds, value.kind) ||
    typeof value.alt !== "string"
  ) {
    return null;
  }
  const publicId = value.publicId.trim();
  const alt = value.alt.trim();
  if (!publicId || publicId.length > 500 || alt.length > 1_000) return null;
  return { publicId, kind: value.kind, alt };
}

export function normalizeFeedPage(value: unknown): ResultPage<FeedPost> | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const items = value.items
    .map(normalizeFeedPost)
    .filter((item): item is FeedPost => item !== null);
  if (
    items.length !== value.items.length ||
    (value.nextCursor !== undefined && typeof value.nextCursor !== "string")
  ) {
    return null;
  }
  return { items, nextCursor: value.nextCursor };
}

export function normalizeFeedPost(value: unknown): FeedPost | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.body !== "string" ||
    typeof value.postedAt !== "string" ||
    Number.isNaN(Date.parse(value.postedAt)) ||
    !Array.isArray(value.media)
  ) {
    return null;
  }
  const author = normalizeAccountIdentity(value.author);
  const replyCount = normalizedCount(value.replyCount);
  const repostCount = normalizedCount(value.repostCount);
  const likeCount = normalizedCount(value.likeCount);
  const media = value.media
    .map(normalizePostMedia)
    .filter((item): item is PostMedia => item !== null);
  const linkPreview =
    value.linkPreview === undefined
      ? undefined
      : normalizeLinkPreview(value.linkPreview);
  if (
    !author ||
    replyCount === null ||
    repostCount === null ||
    likeCount === null ||
    media.length !== value.media.length ||
    linkPreview === null
  ) return null;
  return {
    id: value.id,
    author,
    body: value.body,
    media,
    linkPreview,
    postedAt: new Date(value.postedAt).toISOString(),
    replyCount,
    repostCount,
    likeCount,
  };
}

function normalizedCount(value: unknown): number | null {
  const count = typeof value === "string" && /^\d+$/.test(value)
    ? Number(value)
    : value;
  return typeof count === "number" && Number.isSafeInteger(count) && count >= 0
    ? count
    : null;
}

export function normalizeAccountIdentity(value: unknown): AccountIdentity | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.handle !== "string" ||
    (value.avatarUrl !== undefined && typeof value.avatarUrl !== "string")
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    handle: value.handle,
    avatarUrl: value.avatarUrl,
  };
}

function normalizePostMedia(value: unknown): PostMedia | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !includesValue(postMediaKinds, value.kind) ||
    typeof value.url !== "string" ||
    typeof value.width !== "number" ||
    typeof value.height !== "number" ||
    value.width <= 0 ||
    value.height <= 0
  ) {
    return null;
  }
  if (value.kind === "image") {
    return typeof value.alt === "string" && typeof value.animated === "boolean"
      ? {
          id: value.id,
          kind: "image",
          url: value.url,
          width: value.width,
          height: value.height,
          alt: value.alt,
          animated: value.animated,
        }
      : null;
  }
  return typeof value.posterUrl === "string" &&
    typeof value.durationSeconds === "number" &&
    value.durationSeconds >= 0
    ? {
        id: value.id,
        kind: "video",
        url: value.url,
        posterUrl: value.posterUrl,
        width: value.width,
        height: value.height,
        durationSeconds: value.durationSeconds,
      }
    : null;
}

export function normalizeLinkPreview(value: unknown): LinkPreview | null {
  if (
    !isRecord(value) ||
    typeof value.url !== "string" ||
    typeof value.title !== "string" ||
    typeof value.description !== "string" ||
    (value.imageUrl !== undefined && typeof value.imageUrl !== "string") ||
    (value.siteName !== undefined && typeof value.siteName !== "string")
  ) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value.url);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return {
    url: url.toString(),
    title: value.title,
    description: value.description,
    imageUrl: value.imageUrl,
    siteName: value.siteName,
  };
}

export function normalizeMediaUploadTicket(value: unknown): MediaUploadTicket | null {
  if (
    !isRecord(value) ||
    typeof value.apiKey !== "string" ||
    typeof value.cloudName !== "string" ||
    typeof value.publicId !== "string" ||
    (value.resourceType !== "image" && value.resourceType !== "video") ||
    typeof value.signature !== "string" ||
    !isRecord(value.signedParameters) ||
    !Object.values(value.signedParameters).every((item) => typeof item === "string")
  ) {
    return null;
  }
  return {
    apiKey: value.apiKey,
    cloudName: value.cloudName,
    publicId: value.publicId,
    resourceType: value.resourceType,
    signature: value.signature,
    signedParameters: value.signedParameters as Record<string, string>,
  };
}
