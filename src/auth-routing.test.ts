import { describe, expect, it } from "vitest";
import {
  authPageFromPath,
  clearedConnectedSearch,
  connectedProviderFromSearch,
  isSettingsPath,
  profileHandleFromPath,
  profilePath,
  profilePathMatchesAccount,
  sharedRouteFromPath,
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
    expect(profilePath("Ada Lovelace")).toBe("/p/ada%20lovelace");
    expect(profileHandleFromPath("/p/Ada%20Lovelace")).toBe("ada lovelace");
    expect(profileHandleFromPath("/p/%")).toBeNull();
    expect(profilePathMatchesAccount("/p/ADA", "@ada")).toBe(true);
    expect(profilePathMatchesAccount("/p/grace", "@ada")).toBe(false);
    expect(sharedRouteFromPath("/p/KabirDhillon")).toEqual({
      kind: "profile-handle",
      profileHandle: "kabirdhillon",
    });
    expect(sharedRouteFromPath("/home")).toBeNull();
  });

  it("recognizes the settings URL and nothing near it", () => {
    expect(isSettingsPath("/settings")).toBe(true);
    expect(isSettingsPath("/settings/")).toBe(true);
    expect(isSettingsPath("/settings/connections")).toBe(false);
    expect(isSettingsPath("/p/ada")).toBe(false);
    expect(sharedRouteFromPath("/settings")).toBeNull();
  });
});

describe("Connection redirects", () => {
  it("only accepts a provider Kleos offers", () => {
    expect(connectedProviderFromSearch("?connected=google")).toBe("google");
    expect(connectedProviderFromSearch("?connected=x&from=profile")).toBe("x");
    expect(connectedProviderFromSearch("?connected=myspace")).toBeNull();
    expect(connectedProviderFromSearch("")).toBeNull();
  });

  it("takes the return marker back out of the URL", () => {
    expect(clearedConnectedSearch("?connected=google")).toBe("");
    expect(clearedConnectedSearch("?connected=google&tab=account")).toBe(
      "?tab=account",
    );
    expect(clearedConnectedSearch("")).toBe("");
  });
});
