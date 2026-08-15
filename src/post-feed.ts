import { sessionAuthorizationHeader, type SessionTokenGetter } from "./api-client.js";
import { isRecord } from "./kleos.js";
import {
  normalizeFeedPage,
  normalizeFeedPost,
  normalizeMediaUploadTicket,
} from "./posts.js";
import type {
  FeedPost,
  MediaUploadTicket,
  NewPost,
  ResultPage,
} from "./types.js";

export interface UploadedPostFile {
  cloudName: string;
  deleteToken?: string;
  kind: "image" | "video";
  publicId: string;
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const value = await response.json() as unknown;
    if (!isRecord(value)) return fallback;
    if (typeof value.error === "string") return value.error;
    return isRecord(value.error) && typeof value.error.message === "string"
      ? value.error.message
      : fallback;
  } catch {
    return fallback;
  }
}

export async function getPostFeed(
  getToken: SessionTokenGetter,
  cursor?: string,
  signal?: AbortSignal,
): Promise<ResultPage<FeedPost>> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const response = await fetch(`/api/posts${query}`, {
    headers: await sessionAuthorizationHeader(getToken),
    signal,
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Could not load posts."));
  const page = normalizeFeedPage(await response.json() as unknown);
  if (!page) throw new Error("The post feed response is invalid.");
  return page;
}

async function uploadTicket(
  mimeType: string,
  getToken: SessionTokenGetter,
): Promise<MediaUploadTicket> {
  const response = await fetch("/api/media-upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...await sessionAuthorizationHeader(getToken),
    },
    body: JSON.stringify({ mimeType }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Could not prepare the upload."));
  const ticket = normalizeMediaUploadTicket(await response.json() as unknown);
  if (!ticket) throw new Error("The media upload response is invalid.");
  return ticket;
}

export async function uploadPostFile(
  file: File,
  getToken: SessionTokenGetter,
): Promise<UploadedPostFile> {
  const ticket = await uploadTicket(file.type, getToken);
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", ticket.apiKey);
  body.append("signature", ticket.signature);
  for (const [name, value] of Object.entries(ticket.signedParameters)) body.append(name, value);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(ticket.cloudName)}/${ticket.resourceType}/upload`,
    { method: "POST", body },
  );
  if (!response.ok) throw new Error(await errorMessage(response, "Could not upload the media."));
  const uploaded = await response.json() as unknown;
  if (
    !isRecord(uploaded) ||
    uploaded.public_id !== ticket.publicId ||
    (uploaded.delete_token !== undefined && typeof uploaded.delete_token !== "string")
  ) {
    throw new Error("The media provider response is invalid.");
  }
  return {
    cloudName: ticket.cloudName,
    publicId: ticket.publicId,
    kind: ticket.resourceType,
    deleteToken: uploaded.delete_token,
  };
}

export async function deleteUnattachedUpload(upload: UploadedPostFile): Promise<void> {
  if (!upload.deleteToken) return;
  await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(upload.cloudName)}/delete_by_token`, {
    method: "POST",
    body: new URLSearchParams({ token: upload.deleteToken }),
  });
}

export async function createPost(
  input: NewPost,
  getToken: SessionTokenGetter,
): Promise<FeedPost> {
  const response = await fetch("/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...await sessionAuthorizationHeader(getToken),
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Could not publish the post."));
  const post = normalizeFeedPost(await response.json() as unknown);
  if (!post) throw new Error("The created post response is invalid.");
  return post;
}
