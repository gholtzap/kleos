import { describe, expect, it } from "vitest";
import { authPageFromPath } from "./lib";

describe("Authentication routes", () => {
  it("recognizes only the dedicated authentication pages", () => {
    expect(authPageFromPath("/sign-in")).toBe("sign-in");
    expect(authPageFromPath("/sign-up/")).toBe("sign-up");
    expect(authPageFromPath("/sign-in/help")).toBeNull();
    expect(authPageFromPath("/")).toBeNull();
  });
});
