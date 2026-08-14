import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiRequest } from "./_shared";
import { TestResponse } from "./test-response";

const state = vi.hoisted(() => ({
  githubStatus: 200,
  githubRepos: [] as unknown[],
  hasToken: true,
  rows: [] as Record<string, unknown>[],
  updates: [] as string[],
}));

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(),
  createClerkClient: () => ({
    users: {
      getUser: async () => ({
        externalAccounts: [
          {
            id: "external-1",
            provider: "oauth_github",
            username: "gholtzap",
            verification: { status: "verified" },
          },
        ],
      }),
      getUserOauthAccessToken: async () => ({
        data: state.hasToken
          ? [{ externalAccountId: "external-1", token: "github-user-token" }]
          : [],
      }),
    },
  }),
}));

vi.mock("@neondatabase/serverless", () => ({
  neon: () => async (strings: TemplateStringsArray) => {
    const query = strings.join("?");
    if (query.includes("UPDATE folio_records")) {
      state.updates.push(query);
      return [{ owner_id: "owner-1" }];
    }
    if (query.includes("FROM folio_records")) return state.rows;
    return [];
  },
}));

function pinnedRecord(syncedAt: string) {
  return {
    version: 1,
    revision: 4,
    person: {
      id: "owner-1",
      name: "Fake Person",
      initials: "FP",
      role: "",
      location: "",
      summary: "",
      expertise: [],
      interests: [],
      availability: [],
      notOpenTo: [],
      identityVerified: false,
      employmentVerified: false,
      relationship: "You",
      accent: "graphite",
    },
    claims: [],
    projects: [
      {
        id: "github:gholtzap/kleos",
        owner: "gholtzap",
        name: "kleos",
        description: "Old description.",
        language: "TypeScript",
        topics: [],
        stars: 1,
        forks: 0,
        syncedAt,
      },
    ],
    experience: [],
    education: [],
    certifications: [],
    otherExperience: [],
  };
}

const cronRequest: ApiRequest = {
  method: "GET",
  query: {},
  headers: { authorization: "Bearer cron-secret" },
  body: undefined,
};

async function runHandler(request: ApiRequest = cronRequest) {
  const module = await import("./refresh-projects");
  const response = new TestResponse();
  await module.default(request, response);
  return response;
}

describe("refresh-projects cron", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CRON_SECRET = "cron-secret";
    process.env.DATABASE_URL = "postgresql://test.invalid/folio";
    process.env.CLERK_JWT_KEY = "test-key";
    process.env.CLERK_SECRET_KEY = "sk-test";
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    state.githubStatus = 200;
    state.hasToken = true;
    state.updates = [];
    state.rows = [
      { owner_id: "owner-1", revision: 4, record: pinnedRecord("2026-01-01T00:00:00.000Z") },
    ];
    state.githubRepos = [
      {
        name: "kleos",
        owner: { login: "gholtzap" },
        description: "Fresh description.",
        language: "TypeScript",
        topics: [],
        stargazers_count: 412,
        forks_count: 37,
        fork: false,
        archived: false,
        pushed_at: "2026-08-14T00:00:00Z",
      },
    ];
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(JSON.stringify(state.githubRepos), {
          status: state.githubStatus,
        }),
    );
  });

  it("rejects callers without the cron secret", async () => {
    const response = await runHandler({
      ...cronRequest,
      headers: { authorization: "Bearer wrong" },
    });
    expect(response.code).toBe(401);
    expect(state.updates).toHaveLength(0);
  });

  it("rejects non-GET requests", async () => {
    const response = await runHandler({ ...cronRequest, method: "POST" });
    expect(response.code).toBe(405);
  });

  it("refreshes stale pinned projects", async () => {
    const response = await runHandler();
    expect(response.code).toBe(200);
    expect(response.body).toEqual({
      considered: 1,
      refreshed: 1,
      skipped: 0,
    });
    expect(state.updates).toHaveLength(1);
  });

  it("guards on the revision without advancing it", async () => {
    await runHandler();
    const query = state.updates[0];
    const assignments = query.slice(query.indexOf("SET"), query.indexOf("WHERE"));
    expect(assignments).not.toContain("revision");
    expect(query).toContain("AND revision = ?");
  });

  it("skips owners whose GitHub token is gone", async () => {
    state.hasToken = false;
    const response = await runHandler();
    expect(response.body).toEqual({
      considered: 1,
      refreshed: 0,
      skipped: 1,
    });
    expect(state.updates).toHaveLength(0);
  });

  it("skips owners when GitHub declines the request", async () => {
    state.githubStatus = 403;
    const response = await runHandler();
    expect(response.body).toEqual({
      considered: 1,
      refreshed: 0,
      skipped: 1,
    });
    expect(state.updates).toHaveLength(0);
  });
});
