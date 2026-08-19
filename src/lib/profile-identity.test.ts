import { describe, expect, it } from "vitest";
import {
  accountHandle,
  emptyProfileRecord,
  normalizeProfileHandle,
} from "./profile-identity";

describe("profile identity", () => {
  it("uses one canonical, globally unique handle contract", () => {
    expect(normalizeProfileHandle("@@KabirDhillon")).toBe("kabirdhillon");
    expect(normalizeProfileHandle("name/child")).toBeNull();
    expect(normalizeProfileHandle(" ")).toBeNull();
    expect(accountHandle("KabirDhillon", "user-1")).toBe("@kabirdhillon");
    expect(accountHandle(null, "user-1")).toBe("@user-1");
  });

  it("builds a public-safe blank profile for an account without a saved record", () => {
    const record = emptyProfileRecord({
      id: "user-1",
      name: "Kabir Dhillon",
      handle: "@kabirdhillon",
    });
    expect(record).toMatchObject({
      revision: 0,
      person: {
        id: "user-1",
        handle: "kabirdhillon",
        name: "Kabir Dhillon",
      },
      claims: [],
    });
  });
});
