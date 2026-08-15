import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel routes", () => {
  it("serves every client-side route through the app", () => {
    const config = JSON.parse(
      readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
    ) as unknown;

    expect(config).toMatchObject({
      rewrites: [
        { source: "/sign-in/:path*", destination: "/index.html" },
        { source: "/sign-up/:path*", destination: "/index.html" },
        { source: "/home", destination: "/index.html" },
        { source: "/p/:handle", destination: "/index.html" },
        { source: "/settings", destination: "/index.html" },
      ],
    });
  });
});
