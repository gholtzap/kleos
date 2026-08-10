import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.DATABASE_URL = "postgresql://user:password@test.invalid/folio";
});

describe("shared database value parsers", () => {
  it("normalizes supported values and rejects invalid values", async () => {
    const { isoDate, stringArray } = await import("./_shared");
    const date = "2026-08-09T12:00:00.000Z";

    expect(stringArray(["one", "two"])).toEqual(["one", "two"]);
    expect(stringArray('["one","two"]')).toEqual(["one", "two"]);
    expect(stringArray('["one",2]')).toBeNull();
    expect(stringArray({})).toBeNull();
    expect(isoDate(new Date(date))).toBe(date);
    expect(isoDate(date)).toBe(date);
    expect(isoDate("invalid")).toBeNull();
    expect(isoDate(1)).toBeNull();
  });

  it("uses Kleos reviewer configuration with previous-name fallback", async () => {
    const { reviewerIsAllowed } = await import("./_shared");
    const currentKleosIds = process.env.KLEOS_REVIEWER_USER_IDS;
    const currentLegacyIds = process.env.FOLIO_REVIEWER_USER_IDS;

    try {
      process.env.KLEOS_REVIEWER_USER_IDS = "kleos-reviewer";
      process.env.FOLIO_REVIEWER_USER_IDS = "previous-reviewer";
      expect(reviewerIsAllowed("kleos-reviewer")).toBe(true);
      expect(reviewerIsAllowed("previous-reviewer")).toBe(false);

      delete process.env.KLEOS_REVIEWER_USER_IDS;
      expect(reviewerIsAllowed("previous-reviewer")).toBe(true);
    } finally {
      if (currentKleosIds === undefined) {
        delete process.env.KLEOS_REVIEWER_USER_IDS;
      } else {
        process.env.KLEOS_REVIEWER_USER_IDS = currentKleosIds;
      }
      if (currentLegacyIds === undefined) {
        delete process.env.FOLIO_REVIEWER_USER_IDS;
      } else {
        process.env.FOLIO_REVIEWER_USER_IDS = currentLegacyIds;
      }
    }
  });
});
