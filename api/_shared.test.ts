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
});
