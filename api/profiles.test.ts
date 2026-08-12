import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyToken } from "@clerk/backend";
import { currentPerson, initialClaims } from "../src/data";
import { publicKleosRecord } from "../src/kleos";
import type { KleosRecord } from "../src/types";
import type { ApiRequest, ApiResponse } from "./_shared";
import { TestResponse } from "./test-response";

const database = vi.hoisted(() => ({
  record: null as KleosRecord | null,
  rateCount: 1,
  saveAllowed: true,
}));

const clerkDirectory = vi.hoisted(() => ({
  githubUsername: "gholtzap" as string | null,
  lookupCount: 0,
}));

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(async () => ({ sub: "owner-1" })),
  createClerkClient: () => ({
    users: {
      getUser: async () => {
        clerkDirectory.lookupCount += 1;
        return {
          externalAccounts: clerkDirectory.githubUsername
            ? [
                {
                  provider: "oauth_github",
                  username: clerkDirectory.githubUsername,
                  verification: { status: "verified" },
                },
              ]
            : [],
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
    if (text.includes("SELECT public_record")) {
      return database.record
        ? [{ public_record: publicKleosRecord(database.record) }]
        : [];
    }
    if (text.includes("SELECT revision, record")) {
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
    person: { ...currentPerson, id: "owner-1" },
    claims: initialClaims,
    projects: [],
  };
  database.rateCount = 1;
  database.saveAllowed = true;
  clerkDirectory.githubUsername = "gholtzap";
  clerkDirectory.lookupCount = 0;
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
        },
      },
      response,
    );
    expect(response.code).toBe(403);
    expect(response.body).toEqual({
      error: "Connect this GitHub account to Kleos before adding it.",
    });
  });

  it("skips verification when the stored github account is unchanged", async () => {
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
        },
      },
      response,
    );
    expect(response.code).toBe(200);
    expect(clerkDirectory.lookupCount).toBe(0);
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
