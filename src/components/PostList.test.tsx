// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { testAccounts, testPosts } from "../post-data";
import { PostList } from "./PostList";

describe("PostList", () => {
  it("renders every post with its account profile link", () => {
    document.body.innerHTML = renderToStaticMarkup(<PostList posts={testPosts} />);

    expect(document.querySelectorAll("article")).toHaveLength(testPosts.length);
    expect(document.querySelector('a[href="/p/gavinholtzapple"]')?.textContent).toBe("G");
    expect(document.body.textContent).toContain("The best reliability work often looks quiet");
  });

  it("keeps fixture identities and posts valid", () => {
    expect(new Set(testAccounts.map((account) => account.handle.toLowerCase())).size).toBe(
      testAccounts.length,
    );
    expect(new Set(testPosts.map((post) => post.id)).size).toBe(testPosts.length);

    for (const account of testAccounts) {
      expect(testPosts.filter((post) => post.author === account).length).toBeGreaterThanOrEqual(2);
    }
  });
});
