import { createHash, randomUUID } from "node:crypto";
import { includesValue, isRecord } from "../src/kleos.js";
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
  postImageMimeTypes,
  postMediaKindForMimeType,
} from "../src/posts.js";
import type { MediaUploadTicket, NewPostMedia, PostMedia } from "../src/types/index.js";

interface MediaConfiguration {
  apiKey: string;
  apiSecret: string;
  cloudName: string;
}

interface CloudinaryAsset {
  assetId: string;
  bytes: number;
  durationSeconds?: number;
  format: string;
  height: number;
  publicId: string;
  resourceType: "image" | "video";
  version: number;
  width: number;
}

function mediaConfiguration(): MediaConfiguration {
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!apiKey || !apiSecret || !cloudName) {
    throw new Error("Cloudinary media storage is not configured.");
  }
  return { apiKey, apiSecret, cloudName };
}

function signature(parameters: Record<string, string>, apiSecret: string): string {
  const payload = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
  return createHash("sha256").update(`${payload}${apiSecret}`).digest("hex");
}

function ownerMediaPrefix(ownerId: string): string {
  const ownerHash = createHash("sha256").update(ownerId).digest("hex").slice(0, 24);
  return `kleos/posts/${ownerHash}/`;
}

export function createMediaUploadTicket(
  ownerId: string,
  mimeType: string,
): MediaUploadTicket | null {
  const resourceType = postMediaKindForMimeType(mimeType);
  if (!resourceType) return null;
  const configuration = mediaConfiguration();
  const uploadPreset = process.env[
    resourceType === "image"
      ? "CLOUDINARY_IMAGE_UPLOAD_PRESET"
      : "CLOUDINARY_VIDEO_UPLOAD_PRESET"
  ]?.trim();
  if (!uploadPreset) {
    throw new Error(`Cloudinary ${resourceType} upload preset is not configured.`);
  }
  const publicId = `${ownerMediaPrefix(ownerId)}${randomUUID()}`;
  const allowedFormats =
    resourceType === "image"
      ? "jpg,jpeg,png,webp,gif"
      : "mp4,mov,webm,m4v";
  const signedParameters: Record<string, string> = {
    allowed_formats: allowedFormats,
    overwrite: "false",
    public_id: publicId,
    return_delete_token: "true",
    timestamp: String(Math.floor(Date.now() / 1_000)),
    unique_filename: "false",
    upload_preset: uploadPreset,
  };
  if (mimeType === "image/gif") {
    signedParameters.eager = "c_limit,f_webp,fl_awebp,q_auto:eco,w_1600";
  } else if (resourceType === "video") {
    signedParameters.eager = "c_limit,f_mp4,q_auto:good,vc_h264,w_1920";
  }
  return {
    apiKey: configuration.apiKey,
    cloudName: configuration.cloudName,
    publicId,
    resourceType,
    signature: signature(signedParameters, configuration.apiSecret),
    signedParameters,
  };
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function cloudinaryAsset(value: unknown): CloudinaryAsset | null {
  if (
    !isRecord(value) ||
    typeof value.asset_id !== "string" ||
    typeof value.public_id !== "string" ||
    (value.resource_type !== "image" && value.resource_type !== "video") ||
    typeof value.format !== "string"
  ) {
    return null;
  }
  const bytes = integer(value.bytes);
  const width = integer(value.width);
  const height = integer(value.height);
  const version = integer(value.version);
  const durationValue =
    value.duration === undefined ? undefined : finiteNumber(value.duration);
  if (
    bytes === null ||
    width === null ||
    width === 0 ||
    height === null ||
    height === 0 ||
    version === null ||
    (value.duration !== undefined && durationValue === null)
  ) {
    return null;
  }
  return {
    assetId: value.asset_id,
    bytes,
    durationSeconds: durationValue ?? undefined,
    format: value.format.toLowerCase(),
    height,
    publicId: value.public_id,
    resourceType: value.resource_type,
    version,
    width,
  };
}

async function loadCloudinaryAsset(
  publicId: string,
  resourceType: "image" | "video",
): Promise<CloudinaryAsset | null> {
  const configuration = mediaConfiguration();
  const url = new URL(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(configuration.cloudName)}/resources/${resourceType}/upload/${encodeURIComponent(publicId)}`,
  );
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${configuration.apiKey}:${configuration.apiSecret}`).toString("base64")}`,
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Cloudinary asset lookup failed with ${response.status}.`);
  return cloudinaryAsset(await response.json() as unknown);
}

function encodedPublicId(publicId: string): string {
  return publicId.split("/").map(encodeURIComponent).join("/");
}

function deliveryUrl(
  asset: CloudinaryAsset,
  transformation: string,
  extension: string,
): string {
  const { cloudName } = mediaConfiguration();
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/${asset.resourceType}/upload/${transformation}/v${asset.version}/${encodedPublicId(asset.publicId)}.${extension}`;
}

export async function verifiedPostMedia(
  ownerId: string,
  input: NewPostMedia,
): Promise<PostMedia | null> {
  if (!input.publicId.startsWith(ownerMediaPrefix(ownerId))) return null;
  const asset = await loadCloudinaryAsset(input.publicId, input.kind);
  if (!asset || asset.publicId !== input.publicId || asset.resourceType !== input.kind) {
    return null;
  }
  if (asset.resourceType === "image") {
    if (
      asset.bytes > MAX_IMAGE_BYTES ||
      !includesValue(["jpg", "jpeg", "png", "webp", "gif"] as const, asset.format)
    ) {
      return null;
    }
    const animated = asset.format === "gif";
    return {
      id: asset.assetId,
      kind: "image",
      url: deliveryUrl(
        asset,
        animated
          ? "c_limit,f_webp,fl_awebp,q_auto:eco,w_1600"
          : "c_limit,f_auto,q_auto:eco,w_1600",
        animated ? "webp" : asset.format,
      ),
      width: asset.width,
      height: asset.height,
      alt: input.alt,
      animated,
    };
  }
  if (
    asset.bytes > MAX_VIDEO_BYTES ||
    !includesValue(["mp4", "mov", "webm", "m4v"] as const, asset.format) ||
    asset.durationSeconds === undefined ||
    asset.durationSeconds > MAX_VIDEO_DURATION_SECONDS
  ) {
    return null;
  }
  return {
    id: asset.assetId,
    kind: "video",
    url: deliveryUrl(asset, "c_limit,f_mp4,q_auto:good,vc_h264,w_1920", "mp4"),
    posterUrl: deliveryUrl(asset, "c_limit,f_jpg,q_auto:eco,so_0,w_1200", "jpg"),
    width: asset.width,
    height: asset.height,
    durationSeconds: asset.durationSeconds,
  };
}

export function cloudinaryLinkPreviewImageUrl(sourceUrl: string): string {
  const { cloudName } = mediaConfiguration();
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/fetch/c_limit,f_auto,q_auto:eco,w_1200/${encodeURIComponent(sourceUrl)}`;
}
