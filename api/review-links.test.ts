import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.DATABASE_URL = "postgresql://user:password@test.invalid/kleos";
});

describe("review link token headers", () => {
  it("uses the Kleos header with previous-name fallback", async () => {
    const { reviewTokenFromHeaders } = await import("./review-links");

    expect(
      reviewTokenFromHeaders({
        "x-kleos-review-token": "kleos-token",
        "x-folio-review-token": "previous-token",
      }),
    ).toBe("kleos-token");
    expect(
      reviewTokenFromHeaders({
        "x-folio-review-token": "previous-token",
      }),
    ).toBe("previous-token");
  });
});
