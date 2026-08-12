import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiRequest, ApiResponse } from "./_shared";
import { TestResponse } from "./test-response";

const clerk = vi.hoisted(() => ({
  externalAccountId: "external-1" as string | null,
  tokenExternalAccountId: "external-1" as string | null,
}));

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(async () => ({ sub: "owner-1" })),
  createClerkClient: () => ({
    users: {
      getUser: async () => ({
        externalAccounts: clerk.externalAccountId
          ? [
              {
                id: clerk.externalAccountId,
                provider: "oauth_github",
                username: "gholtzap",
                verification: { status: "verified" },
              },
            ]
          : [],
      }),
      getUserOauthAccessToken: async () => ({
        data: clerk.tokenExternalAccountId
          ? [
              {
                externalAccountId: clerk.tokenExternalAccountId,
                token: "github-user-token",
              },
            ]
          : [],
      }),
    },
  }),
}));

vi.mock("@neondatabase/serverless", () => ({
  neon: () => async (strings: TemplateStringsArray) =>
    strings.join("?").includes("INSERT INTO folio_rate_limits")
      ? [{ request_count: 1 }]
      : [],
}));

let githubRepositoriesHandler: (
  request: ApiRequest,
  response: ApiResponse,
) => Promise<ApiResponse | void>;

beforeAll(async () => {
  process.env.DATABASE_URL = "postgresql://test.invalid/folio";
  process.env.CLERK_JWT_KEY = "test-key";
  process.env.CLERK_SECRET_KEY = "sk-test";
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  githubRepositoriesHandler = (await import("./github-repositories")).default;
});

beforeEach(() => {
  clerk.externalAccountId = "external-1";
  clerk.tokenExternalAccountId = "external-1";
  vi.unstubAllGlobals();
});

describe("GitHub repositories API", () => {
  it("uses the signed-in user's matching Clerk token", async () => {
    const githubFetch = vi.fn(async () =>
      new Response(JSON.stringify([{ name: "kleos" }]), { status: 200 }),
    );
    vi.stubGlobal("fetch", githubFetch);
    const response = new TestResponse();

    await githubRepositoriesHandler(
      {
        method: "GET",
        query: {},
        headers: { authorization: "Bearer session-token" },
        body: undefined,
      },
      response,
    );

    expect(response.code).toBe(200);
    expect(response.body).toEqual([{ name: "kleos" }]);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(githubFetch).toHaveBeenCalledWith(
      "https://api.github.com/users/gholtzap/repos?per_page=100&sort=pushed",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer github-user-token",
        }),
      }),
    );
  });

  it("does not use a token from a different external account", async () => {
    clerk.tokenExternalAccountId = "external-other";
    const githubFetch = vi.fn();
    vi.stubGlobal("fetch", githubFetch);
    const response = new TestResponse();

    await githubRepositoriesHandler(
      {
        method: "GET",
        query: {},
        headers: { authorization: "Bearer session-token" },
        body: undefined,
      },
      response,
    );

    expect(response.code).toBe(409);
    expect(githubFetch).not.toHaveBeenCalled();
  });
});
