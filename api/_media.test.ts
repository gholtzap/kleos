import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  process.env.CLOUDINARY_API_KEY = "key";
  process.env.CLOUDINARY_API_SECRET = "secret";
  process.env.CLOUDINARY_CLOUD_NAME = "kleos-test";
  process.env.CLOUDINARY_IMAGE_UPLOAD_PRESET = "kleos-post-images";
  process.env.CLOUDINARY_VIDEO_UPLOAD_PRESET = "kleos-post-videos";
  vi.unstubAllGlobals();
});

describe("post media storage", () => {
  it("signs a private upload path and verifies a GIF before WebP delivery", async () => {
    const { createMediaUploadTicket, verifiedPostMedia } = await import("./_media");
    const ticket = createMediaUploadTicket("user_private", "image/gif");
    expect(ticket).not.toBeNull();
    if (!ticket) return;
    expect(ticket.publicId).not.toContain("user_private");
    expect(ticket.publicId).toMatch(/^kleos\/posts\/[a-f0-9]{24}\//);
    expect(ticket.signedParameters.eager).toContain("f_webp");
    const serialized = Object.entries(ticket.signedParameters)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => `${name}=${value}`)
      .join("&");
    expect(ticket.signature).toBe(
      createHash("sha256").update(`${serialized}secret`).digest("hex"),
    );

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      asset_id: "asset-1",
      bytes: 1_000,
      format: "gif",
      height: 600,
      public_id: ticket.publicId,
      resource_type: "image",
      version: 10,
      width: 800,
    }), { status: 200 })));
    const media = await verifiedPostMedia("user_private", {
      publicId: ticket.publicId,
      kind: "image",
      alt: "Animated chart",
    });
    expect(media).toMatchObject({
      animated: true,
      alt: "Animated chart",
      kind: "image",
    });
    expect(media?.url).toContain("f_webp,fl_awebp");
    expect(media?.url).toContain(".webp");
  });

  it("rejects an asset outside the authenticated account path", async () => {
    const { verifiedPostMedia } = await import("./_media");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await verifiedPostMedia("owner-1", {
      publicId: "kleos/posts/someone-else/file",
      kind: "image",
      alt: "",
    })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
