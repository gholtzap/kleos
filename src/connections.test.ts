import { describe, expect, it } from "vitest";
import {
  accountConnections,
  connectionDefinition,
  connectionDefinitions,
  identityChanges,
  isConnectionProvider,
  matchesConnectionProvider,
  recordWithoutIdentity,
  recordWithVerifiedIdentities,
  verifiedIdentityUsername,
  type ExternalAccountLike,
} from "./connections";
import { emptyProfileRecord } from "./profile-record";
import type { FeaturedProject, KleosRecord } from "./types";

function verifiedAccount(
  provider: string,
  username: string,
): ExternalAccountLike {
  return { provider, username, verification: { status: "verified" } };
}

function baseRecord(): KleosRecord {
  return emptyProfileRecord({
    id: "user-ada",
    name: "Ada Lovelace",
    handle: "@ada",
  });
}

function project(owner: string): FeaturedProject {
  return {
    id: `github:${owner}/engine`,
    owner,
    name: "engine",
    description: "",
    topics: [],
    stars: 3,
    forks: 0,
    syncedAt: "2026-08-15T00:00:00.000Z",
  };
}

describe("Connection providers", () => {
  it("describes every provider it offers", () => {
    expect(connectionDefinitions().map((entry) => entry.provider)).toEqual([
      "github",
      "google",
      "x",
      "apple",
    ]);
    expect(connectionDefinition("google").strategy).toBe("oauth_google");
    expect(connectionDefinition("google").identityField).toBeUndefined();
    expect(connectionDefinition("apple").identityField).toBeUndefined();
    expect(connectionDefinition("apple").strategy).toBe("oauth_apple");
    expect(connectionDefinition("x").identityField).toBe("x");
    expect(isConnectionProvider("github")).toBe(true);
    expect(isConnectionProvider("linkedin")).toBe(false);
  });

  it("resolves the browser and server spellings of a Clerk provider", () => {
    expect(matchesConnectionProvider("github", "github")).toBe(true);
    expect(matchesConnectionProvider("oauth_github", "github")).toBe(true);
    expect(matchesConnectionProvider("OAuth_GitHub", "github")).toBe(true);
    expect(matchesConnectionProvider("oauth_twitter", "x")).toBe(true);
    expect(matchesConnectionProvider("oauth_google", "x")).toBe(false);
    expect(matchesConnectionProvider("oauth_gitlab", "github")).toBe(false);
  });
});

describe("Account connections", () => {
  it("reports the state of each provider", () => {
    const connections = accountConnections([
      verifiedAccount("oauth_github", "ada"),
      { provider: "google", emailAddress: "ada@example.com", verification: { status: "verified" } },
      { provider: "x", username: "adalovelace", verification: { status: "unverified" } },
    ]);

    expect(connections.map((connection) => connection.connected)).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(connections[0]?.username).toBe("ada");
    expect(connections[1]?.emailAddress).toBe("ada@example.com");
    expect(connections[2]?.verified).toBe(false);
  });

  it("treats a missing provider as disconnected", () => {
    const [github] = accountConnections([]);

    expect(github?.connected).toBe(false);
    expect(github?.verified).toBe(false);
    expect(github?.username).toBeUndefined();
  });

  it("only trusts a handle from a verified connection", () => {
    const accounts = [
      verifiedAccount("x", "adalovelace"),
      { provider: "github", username: "ada", verification: { status: "unverified" } },
    ];

    expect(verifiedIdentityUsername(accounts, "x")).toBe("adalovelace");
    expect(verifiedIdentityUsername(accounts, "github")).toBeUndefined();
  });
});

describe("Identity synchronization", () => {
  it("adopts handles that verified connections prove", () => {
    const record = baseRecord();
    const accounts = [
      verifiedAccount("oauth_github", "ada"),
      verifiedAccount("oauth_x", "adalovelace"),
    ];

    expect(identityChanges(record.person, accounts)).toEqual([
      { field: "github", username: "ada" },
      { field: "x", username: "adalovelace" },
    ]);
    const synchronized = recordWithVerifiedIdentities(record, accounts);
    expect(synchronized.person.github).toBe("ada");
    expect(synchronized.person.x).toBe("adalovelace");
  });

  it("keeps a stored handle when no connection proves it", () => {
    const record = baseRecord();
    record.person.x = "typed-by-hand";

    expect(identityChanges(record.person, [])).toEqual([]);
    expect(recordWithVerifiedIdentities(record, [])).toBe(record);
  });

  it("makes no change once the stored handle already matches", () => {
    const record = baseRecord();
    record.person.github = "ada";
    const accounts = [verifiedAccount("github", "ada")];

    expect(identityChanges(record.person, accounts)).toEqual([]);
    expect(recordWithVerifiedIdentities(record, accounts)).toBe(record);
  });

  it("drops featured projects with the GitHub handle they belong to", () => {
    const record = baseRecord();
    record.person.github = "ada";
    record.person.x = "adalovelace";
    record.projects = [project("ada")];

    const withoutGithub = recordWithoutIdentity(record, "github");
    expect(withoutGithub.person.github).toBeUndefined();
    expect(withoutGithub.projects).toEqual([]);
    expect(withoutGithub.person.x).toBe("adalovelace");

    const withoutX = recordWithoutIdentity(record, "x");
    expect(withoutX.person.x).toBeUndefined();
    expect(withoutX.projects).toHaveLength(1);
  });
});
