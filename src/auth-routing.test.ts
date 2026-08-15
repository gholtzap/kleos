import { describe, expect, it } from "vitest";
import {
  authPageFromPath,
  profileHandleFromPath,
  profilePath,
  profilePathMatchesAccount,
  signedInPageFromPath,
} from "./lib";

describe("Authentication routes", () => {
  it("recognizes the authentication flows", () => {
    expect(authPageFromPath("/sign-in")).toBe("sign-in");
    expect(authPageFromPath("/sign-up/")).toBe("sign-up");
    expect(authPageFromPath("/sign-in/factor-one")).toBe("sign-in");
    expect(authPageFromPath("/sign-up/verify-email-address")).toBe("sign-up");
    expect(authPageFromPath("/sign-updates")).toBeNull();
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
    expect(profileHandleFromPath("/p/Ada%20Lovelace")).toBe("Ada Lovelace");
    expect(profileHandleFromPath("/p/%")).toBeNull();
    expect(profilePathMatchesAccount("/p/ADA", "@ada")).toBe(true);
    expect(profilePathMatchesAccount("/p/grace", "@ada")).toBe(false);
  });
});
