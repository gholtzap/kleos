import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyToken } from "@clerk/backend";
import { currentPerson, initialClaims } from "../src/data";
import { publicKleosRecord } from "../src/kleos";
import type { KleosRecord } from "../src/types";
import type { ApiRequest, ApiResponse } from "./_shared";
import { TestResponse } from "./test-response";
import { defaultInboundPolicy } from "../src/inbound-policy";

const database = vi.hoisted(() => ({
  record: null as KleosRecord | null,
  handleBindCount: 0,
  loadedOwnerIds: [] as string[],
  rateCount: 1,
  saveAllowed: true,
  savedOwnerIds: [] as string[],
}));

const clerkDirectory = vi.hoisted(() => ({
  githubUsername: "gholtzap" as string | null,
  xUsername: null as string | null,
  lookupCount: 0,
  listCount: 0,
  listFails: false,
  profileExists: true,
  profileUsername: "kabirdhillon" as string | null,
}));

function clerkUser() {
  return {
    id: "owner-1",
    firstName: "Kabir",
    lastName: "Dhillon",
    username: clerkDirectory.profileUsername,
    externalAccounts: (
      [
        ["oauth_github", clerkDirectory.githubUsername],
        ["oauth_x", clerkDirectory.xUsername],
      ] as const
    )
      .filter(([, username]) => username !== null)
      .map(([provider, username]) => ({
        provider,
        username,
        verification: { status: "verified" },
      })),
  };
}

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(async () => ({ sub: "owner-1" })),
  createClerkClient: () => ({
    users: {
      getUser: async () => {
        clerkDirectory.lookupCount += 1;
        if (!clerkDirectory.profileExists) throw new Error("Not found");
        return clerkUser();
      },
      getUserList: async () => {
        clerkDirectory.listCount += 1;
        if (clerkDirectory.listFails) throw new Error("Directory unavailable");
        return {
          data: clerkDirectory.profileExists ? [clerkUser()] : [],
          totalCount: clerkDirectory.profileExists ? 1 : 0,
        };
      },
    },
  }),
}));

vi.mock("@neondatabase/serverless", () => {
  const query = async (
    strings: TemplateStringsArray,
    ..._values: unknown[]
  ): Promise<Record<string, unknown>[]> => {
    const text = strings.join("?");
    if (text.includes("INSERT INTO folio_rate_limits")) {
      return [{ request_count: database.rateCount }];
    }
    if (text.includes("WHERE lower(public_record")) {
      const requestedHandle = _values[0];
      const record = database.record;
      if (!record || record.person.handle !== requestedHandle) return [];
      return [{ public_record: publicKleosRecord(record) }];
    }
    if (text.includes("UPDATE folio_records") && text.includes("jsonb_set")) {
      database.handleBindCount += 1;
      if (database.record && typeof _values[0] === "string") {
        database.record.person.handle = _values[0];
      }
      return [];
    }
    if (text.includes("SELECT public_record")) {
      return database.record
        ? [{ public_record: publicKleosRecord(database.record) }]
        : [];
    }
    if (text.includes("SELECT revision, record")) {
      if (typeof _values[0] === "string") {
        database.loadedOwnerIds.push(_values[0]);
      }
      return database.record
        ? [
            {
              revision: database.record.revision,
              record: database.record,
            },
          ]
        : [];
    }
    if (text.includes("INSERT INTO folio_records")) {
      if (typeof _values[0] === "string") {
        database.savedOwnerIds.push(_values[0]);
      }
      return database.saveAllowed ? [{ owner_id: "owner-1" }] : [];
    }
    return [];
  };
  return { neon: () => query };
});

let profilesHandler: (
  request: ApiRequest,
  response: ApiResponse,
) => Promise<ApiResponse | void>;

beforeAll(async () => {
  process.env.DATABASE_URL = "postgresql://test.invalid/folio";
  process.env.CLERK_JWT_KEY = "test-key";
  process.env.CLERK_SECRET_KEY = "sk-test";
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  profilesHandler = (await import("./profiles")).default;
});

beforeEach(() => {
  database.record = {
    version: 1,
    revision: 5,
    person: {
      ...currentPerson,
      id: "owner-1",
      handle: "kabirdhillon",
    },
    claims: initialClaims,
    projects: [],
    experience: [],
    education: [],
    certifications: [],
    otherExperience: [],
    inbound: defaultInboundPolicy(),
  };
  database.rateCount = 1;
  database.saveAllowed = true;
  database.handleBindCount = 0;
  database.loadedOwnerIds = [];
  database.savedOwnerIds = [];
  clerkDirectory.githubUsername = "gholtzap";
  clerkDirectory.xUsername = null;
  clerkDirectory.lookupCount = 0;
  clerkDirectory.listCount = 0;
  clerkDirectory.listFails = false;
  clerkDirectory.profileExists = true;
  clerkDirectory.profileUsername = "kabirdhillon";
});

describe("profiles API", () => {
  it("serves only the public projection with browser and CDN cache contracts", async () => {
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "GET",
        query: { id: "owner-1" },
        headers: { "x-forwarded-for": "127.0.0.1" },
        body: undefined,
      },
      response,
    );
    expect(response.code).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=300",
    );
    expect(response.headers.get("ETag")).toBe('W/"kleos-5"');
    expect(response.body).toMatchObject({
      revision: 5,
      claims: [
        { id: "claims-platform" },
        { id: "incident-console" },
      ],
    });
  });

  it("loads an indexed public profile by canonical handle", async () => {
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "GET",
        query: { handle: "KabirDhillon" },
        headers: { "x-forwarded-for": "127.0.0.1" },
        body: undefined,
      },
      response,
    );
    expect(response.code).toBe(200);
    expect(response.body).toMatchObject({
      person: { id: "owner-1", handle: "kabirdhillon" },
    });
    expect(clerkDirectory.listCount).toBe(0);
  });

  it("binds an existing legacy record after its first exact Clerk lookup", async () => {
    if (database.record) database.record.person.handle = undefined;
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "GET",
        query: { handle: "kabirdhillon" },
        headers: { "x-forwarded-for": "127.0.0.1" },
        body: undefined,
      },
      response,
    );
    expect(response.code).toBe(200);
    expect(response.body).toMatchObject({
      person: { id: "owner-1", handle: "kabirdhillon" },
    });
    expect(clerkDirectory.listCount).toBe(1);
    expect(database.handleBindCount).toBe(1);
  });

  it("serves a public blank profile for an account without a saved record", async () => {
    database.record = null;
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "GET",
        query: { handle: "kabirdhillon" },
        headers: { "x-forwarded-for": "127.0.0.1" },
        body: undefined,
      },
      response,
    );
    expect(response.code).toBe(200);
    expect(response.body).toMatchObject({
      revision: 0,
      person: {
        id: "owner-1",
        handle: "kabirdhillon",
        name: "Kabir Dhillon",
      },
      claims: [],
    });
  });

  it("returns not found only when the profile directory has no exact account", async () => {
    database.record = null;
    clerkDirectory.profileExists = false;
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "GET",
        query: { handle: "kabirdhillon" },
        headers: { "x-forwarded-for": "127.0.0.1" },
        body: undefined,
      },
      response,
    );
    expect(response.code).toBe(404);
    expect(response.body).toEqual({ error: "Profile not found." });
  });

  it("does not cache a directory outage as a missing profile", async () => {
    database.record = null;
    clerkDirectory.listFails = true;
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "GET",
        query: { handle: "kabirdhillon" },
        headers: { "x-forwarded-for": "127.0.0.1" },
        body: undefined,
      },
      response,
    );
    expect(response.code).toBe(500);
    expect(response.body).toEqual({
      error: "The server could not complete this request.",
    });
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBeUndefined();
  });

  it("rejects an invalid public handle before a directory lookup", async () => {
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "GET",
        query: { handle: "bad/handle" },
        headers: { "x-forwarded-for": "127.0.0.1" },
        body: undefined,
      },
      response,
    );
    expect(response.code).toBe(404);
    expect(clerkDirectory.listCount).toBe(0);
  });

  it("stops an over-limit public caller before the profile read", async () => {
    database.rateCount = 301;
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "GET",
        query: { id: "owner-1" },
        headers: { "x-forwarded-for": "127.0.0.1" },
        body: undefined,
      },
      response,
    );
    expect(response.code).toBe(429);
    expect(response.headers.get("Retry-After")).toBeDefined();
  });

  it("rejects a malformed nested claim before storage", async () => {
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "PUT",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          version: 1,
          revision: 5,
          person: currentPerson,
          claims: [null],
        },
      },
      response,
    );
    expect(response.code).toBe(400);
    expect(response.body).toEqual({ error: "Invalid Kleos record." });
  });

  it("writes only the authenticated profile when the client forges a target", async () => {
    database.record = null;
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "PUT",
        query: { id: "other-owner", handle: "someone-else" },
        headers: { authorization: "Bearer token" },
        body: {
          version: 1,
          revision: 0,
          person: {
            ...currentPerson,
            id: "other-owner",
            handle: "someone-else",
          },
          claims: [],
          projects: [],
          experience: [],
          education: [],
          certifications: [],
          otherExperience: [],
        },
      },
      response,
    );
    expect(response.code).toBe(200);
    expect(response.body).toMatchObject({
      person: { id: "owner-1", handle: "kabirdhillon" },
    });
    expect(database.loadedOwnerIds).toEqual(["owner-1"]);
    expect(database.savedOwnerIds).toEqual(["owner-1"]);
  });

  it("persists a connected github account and featured projects", async () => {
    const project = {
      id: "github:gholtzap/kleos",
      owner: "gholtzap",
      name: "kleos",
      description: "Professional profiles built on evidence.",
      homepage: "https://kleos.bio",
      language: "TypeScript",
      topics: ["react"],
      stars: 42,
      forks: 3,
      syncedAt: "2026-08-12T00:00:00.000Z",
    };
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "PUT",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          version: 1,
          revision: 5,
          person: { ...currentPerson, github: "GHoltzap" },
          claims: initialClaims,
          projects: [project],
        },
      },
      response,
    );
    expect(response.code).toBe(200);
    expect(response.body).toMatchObject({
      revision: 6,
      person: { github: "gholtzap" },
      projects: [project],
    });
    expect(clerkDirectory.lookupCount).toBe(1);
  });

  it("refuses a github account the user has not linked and verified", async () => {
    clerkDirectory.githubUsername = null;
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "PUT",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          version: 1,
          revision: 5,
          person: { ...currentPerson, github: "someone-else" },
          claims: initialClaims,
          projects: [],
          experience: [],
          education: [],
          certifications: [],
          otherExperience: [],
        },
      },
      response,
    );
    expect(response.code).toBe(403);
    expect(response.body).toEqual({
      error: "Connect this GitHub account to Kleos before adding it.",
    });
  });

  it("persists an x account the member has connected", async () => {
    clerkDirectory.xUsername = "gholtzap";
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "PUT",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          version: 1,
          revision: 5,
          person: { ...currentPerson, x: "GHoltzap" },
          claims: initialClaims,
          projects: [],
          experience: [],
          education: [],
          certifications: [],
          otherExperience: [],
        },
      },
      response,
    );
    expect(response.code).toBe(200);
    expect(response.body).toMatchObject({ person: { x: "gholtzap" } });
  });

  it("refuses an x account the user has not linked and verified", async () => {
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "PUT",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          version: 1,
          revision: 5,
          person: { ...currentPerson, x: "someoneelse" },
          claims: initialClaims,
          projects: [],
          experience: [],
          education: [],
          certifications: [],
          otherExperience: [],
        },
      },
      response,
    );
    expect(response.code).toBe(403);
    expect(response.body).toEqual({
      error: "Connect this X account to Kleos before adding it.",
    });
  });

  it("keeps a stored x handle that no connection proves", async () => {
    if (database.record) database.record.person.x = "typedbyhand";
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "PUT",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          version: 1,
          revision: 5,
          person: { ...currentPerson, x: "typedbyhand" },
          claims: initialClaims,
          projects: [],
          experience: [],
          education: [],
          certifications: [],
          otherExperience: [],
        },
      },
      response,
    );
    expect(response.code).toBe(200);
    expect(response.body).toMatchObject({ person: { x: "typedbyhand" } });
    expect(clerkDirectory.lookupCount).toBe(1);
  });

  it("does not make a second Clerk read when the github account is unchanged", async () => {
    if (database.record) database.record.person.github = "gholtzap";
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "PUT",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          version: 1,
          revision: 5,
          person: { ...currentPerson, github: "gholtzap" },
          claims: initialClaims,
          projects: [],
          experience: [],
          education: [],
          certifications: [],
          otherExperience: [],
        },
      },
      response,
    );
    expect(response.code).toBe(200);
    expect(clerkDirectory.lookupCount).toBe(1);
  });

  it("rejects featured projects that are not owned by the connected account", async () => {
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "PUT",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          version: 1,
          revision: 5,
          person: { ...currentPerson, github: "gholtzap" },
          claims: initialClaims,
          projects: [
            {
              id: "github:someone-else/repo",
              owner: "someone-else",
              name: "repo",
              description: "Not theirs.",
              topics: [],
              stars: 1,
              forks: 0,
              syncedAt: "2026-08-12T00:00:00.000Z",
            },
          ],
        },
      },
      response,
    );
    expect(response.code).toBe(400);
    expect(response.body).toEqual({ error: "Invalid Kleos content." });
  });

  it("rejects a featured project that fails validation", async () => {
    const response = new TestResponse();
    await profilesHandler(
      {
        method: "PUT",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          version: 1,
          revision: 5,
          person: currentPerson,
          claims: initialClaims,
          projects: [
            {
              id: "github:someone-else/repo",
              owner: "gholtzap",
              name: "repo",
              description: "Mismatched id.",
              topics: [],
              stars: 1,
              forks: 0,
              syncedAt: "2026-08-12T00:00:00.000Z",
            },
          ],
        },
      },
      response,
    );
    expect(response.code).toBe(400);
    expect(response.body).toEqual({ error: "Invalid Kleos content." });
  });

  it("rejects a stale write and returns the saved revision after a valid write", async () => {
    const staleResponse = new TestResponse();
    await profilesHandler(
      {
        method: "PUT",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          version: 1,
          revision: 4,
          person: currentPerson,
          claims: initialClaims,
          projects: [],
          experience: [],
          education: [],
          certifications: [],
          otherExperience: [],
        },
      },
      staleResponse,
    );
    expect(staleResponse.code).toBe(409);

    const savedResponse = new TestResponse();
    await profilesHandler(
      {
        method: "PUT",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          version: 1,
          revision: 5,
          person: currentPerson,
          claims: initialClaims,
          projects: [],
          experience: [],
          education: [],
          certifications: [],
          otherExperience: [],
        },
      },
      savedResponse,
    );
    expect(savedResponse.code).toBe(200);
    expect(savedResponse.body).toMatchObject({
      revision: 6,
      person: { id: "owner-1" },
    });
    expect(vi.mocked(verifyToken)).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({
        jwtKey: "test-key",
      }),
    );
  });
});
