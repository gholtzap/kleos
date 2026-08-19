// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { previewPosts, testAccounts, testPosts } from "../fixtures/post-data";
import { PostList } from "./PostList";

describe("PostList", () => {
  it("renders every realistic fixture with its account identity", () => {
    document.body.innerHTML = renderToStaticMarkup(
      <PostList posts={previewPosts} />,
    );
    expect(document.querySelectorAll("article")).toHaveLength(testPosts.length);
    expect(document.querySelector('a[href="/p/gavinholtzapple"]')?.textContent).toBe("G");
    expect(document.body.textContent).toContain("The best reliability work often looks quiet");
    expect(new Set(testAccounts.map((account) => account.handle.toLowerCase())).size)
      .toBe(testAccounts.length);
  });

  it("renders images, normalized video, and structured link previews", () => {
    const base = {
      author: { id: "author", name: "Real Author", handle: "@author" },
      body: "Media post",
      replyCount: 0,
      repostCount: 0,
      likeCount: 0,
      postedAt: "2026-08-15T12:00:00.000Z",
    };
    const html = renderToStaticMarkup(
      <PostList
        posts={[
          {
            ...base,
            id: "post-image",
            media: [{
              id: "image-1",
              kind: "image",
              url: "https://cdn.example.com/image.webp",
              width: 1200,
              height: 800,
              alt: "A launch photo",
              animated: false,
            }],
            linkPreview: {
              url: "https://example.com/story",
              title: "Example story",
              description: "A structured preview.",
            },
          },
          {
            ...base,
            id: "post-video",
            media: [{
              id: "video-1",
              kind: "video",
              url: "https://cdn.example.com/video.mp4",
              posterUrl: "https://cdn.example.com/poster.jpg",
              width: 1920,
              height: 1080,
              durationSeconds: 12,
            }],
          },
        ]}
      />,
    );
    expect(html).toContain('href="/p/author"');
    expect(html).toContain('alt="A launch photo"');
    expect(html).toContain('src="https://cdn.example.com/video.mp4"');
    expect(html).toContain("Example story");
  });
});
