import { describe, expect, it } from "vitest";
import { authPageFromPath, profilePath, signedInPageFromPath } from "./lib";

describe("Authentication routes", () => {
  it("recognizes only the dedicated authentication pages", () => {
    expect(authPageFromPath("/sign-in")).toBe("sign-in");
    expect(authPageFromPath("/sign-up/")).toBe("sign-up");
    expect(authPageFromPath("/sign-in/help")).toBeNull();
    expect(authPageFromPath("/")).toBeNull();
  });
});

describe("Signed-in routes", () => {
  it("maps profile URLs to the profile screen", () => {
    expect(signedInPageFromPath("/p/ada")).toBe("profile");
    expect(signedInPageFromPath("/p/ada/")).toBe("profile");
    expect(signedInPageFromPath("/p/ada/notes")).toBe("home");
    expect(signedInPageFromPath("/home")).toBe("home");
    expect(signedInPageFromPath("/")).toBe("home");
    expect(profilePath("@ada")).toBe("/p/ada");
    expect(profilePath("Ada Lovelace")).toBe("/p/Ada%20Lovelace");
  });
});
