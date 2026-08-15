import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  normalizeFeedPage,
  normalizeNewPost,
  postContentIsValid,
  postMediaKindForMimeType,
} from "./posts";

describe("post contracts", () => {
  it("accepts the supported first-release media combinations and rejects mixed media", () => {
    const images = Array.from({ length: 4 }, (_, index) => ({
      publicId: `image-${index}`,
      kind: "image" as const,
      alt: "",
    }));
    expect(postContentIsValid({ body: "", media: images })).toBe(true);
    expect(postContentIsValid({
      body: "Mixed",
      media: [images[0]!, { publicId: "video", kind: "video", alt: "" }],
    })).toBe(false);
    expect(normalizeNewPost({ body: "  Hello  ", media: [] })).toEqual({
      body: "Hello",
      media: [],
    });
    expect(postMediaKindForMimeType("image/gif")).toBe("image");
    expect(postMediaKindForMimeType("video/quicktime")).toBe("video");
    expect(postMediaKindForMimeType("application/pdf")).toBeNull();
    expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
  });

  it("normalizes a typed feed page without accepting partial records", () => {
    const post = {
      id: "post-1",
      author: { id: "user-1", name: "Gavin", handle: "@gavin" },
      body: "A real post",
      media: [],
      postedAt: "2026-08-15T12:00:00.000Z",
      replyCount: 0,
      repostCount: 0,
      likeCount: 0,
    };
    expect(normalizeFeedPage({ items: [post], nextCursor: "next" }))
      .toEqual({ items: [post], nextCursor: "next" });
    expect(normalizeFeedPage({ items: [{ ...post, author: null }] })).toBeNull();
  });
});
