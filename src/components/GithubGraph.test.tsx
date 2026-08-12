import { describe, expect, it } from "vitest";
import { buildContributionWeeks, normalizeGithubAccount } from "./GithubGraph";

describe("GithubGraph", () => {
  it("normalizes accounts and builds complete calendar weeks", () => {
    expect(normalizeGithubAccount(" @gholtzap ")).toBe("gholtzap");
    expect(normalizeGithubAccount("not/a/handle")).toBeNull();

    const weeks = buildContributionWeeks([
      { date: "2026-08-10", count: 2, level: 2 },
      { date: "2026-08-11", count: 4, level: 4 },
    ]);

    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toHaveLength(7);
    expect(weeks[0]?.[1]).toMatchObject({ date: "2026-08-10", count: 2, level: 2 });
  });
});
