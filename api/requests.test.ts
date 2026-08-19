import { beforeAll, describe, expect, it, vi } from "vitest";
import { currentPerson } from "../src/fixtures/data";
import type { ApiRequest, ApiResponse } from "./_shared";
import { TestResponse } from "./test-response";

const database = vi.hoisted(() => ({
  requestRow: null as Record<string, unknown> | null,
}));

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(async () => ({ sub: "owner-1" })),
}));

vi.mock("@neondatabase/serverless", () => {
  const query = async (
    strings: TemplateStringsArray,
    ..._values: unknown[]
  ): Promise<Record<string, unknown>[]> => {
    const text = strings.join("?");
    if (text.includes("INSERT INTO folio_rate_limits")) {
      return [{ request_count: 1 }];
    }
    if (text.includes("UPDATE folio_requests")) {
      return [{ id: "request-1" }];
    }
    if (
      text.includes("FROM folio_requests AS request") ||
      text.includes("INSERT INTO folio_requests")
    ) {
      return database.requestRow ? [database.requestRow] : [];
    }
    return [];
  };
  return { neon: () => query };
});

let requestsHandler: (
  request: ApiRequest,
  response: ApiResponse,
) => Promise<ApiResponse | void>;

beforeAll(async () => {
  process.env.DATABASE_URL = "postgresql://test.invalid/folio";
  process.env.CLERK_JWT_KEY = "test-key";
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  database.requestRow = {
    id: "request-1",
    kind: "Advice",
    title: "Review a migration plan",
    need: "I need an experienced operator to review this migration plan.",
    experience: ["Platform migration"],
    commitment: "One hour",
    compensation: "$300",
    constraints: "Remote",
    preferred_evidence: "A confirmed migration claim",
    created_at: "2026-07-28T12:00:00.000Z",
    author: { ...currentPerson, id: "owner-1" },
  };
  requestsHandler = (await import("./requests")).default;
});

const input = {
  kind: "Advice",
  title: "Review a migration plan",
  need: "I need an experienced operator to review this migration plan.",
  experience: ["Platform migration"],
  commitment: "One hour",
  compensation: "$300",
  constraints: "Remote",
  preferredEvidence: "A confirmed migration claim",
};

describe("professional requests API", () => {
  it("returns a cursor-ready page and creates a request for the signed-in owner", async () => {
    const listResponse = new TestResponse();
    await requestsHandler(
      {
        method: "GET",
        query: {},
        headers: { authorization: "Bearer token" },
        body: undefined,
      },
      listResponse,
    );
    expect(listResponse.code).toBe(200);
    expect(listResponse.body).toMatchObject({
      items: [{ id: "request-1", author: { id: "owner-1" } }],
    });
    expect(listResponse.headers.get("Cache-Control")).toBe("private, no-store");

    const createResponse = new TestResponse();
    await requestsHandler(
      {
        method: "POST",
        query: {},
        headers: { authorization: "Bearer token" },
        body: { ...input, author: { id: "forged" } },
      },
      createResponse,
    );
    expect(createResponse.code).toBe(201);
    expect(createResponse.body).toMatchObject({
      id: "request-1",
      author: { id: "owner-1" },
    });

    const deleteResponse = new TestResponse();
    await requestsHandler(
      {
        method: "DELETE",
        query: { id: "request-1" },
        headers: { authorization: "Bearer token" },
        body: undefined,
      },
      deleteResponse,
    );
    expect(deleteResponse.code).toBe(204);
    expect(deleteResponse.headers.get("Cache-Control")).toBe(
      "private, no-store",
    );
  });

  it("rejects invalid request content", async () => {
    const response = new TestResponse();
    await requestsHandler(
      {
        method: "POST",
        query: {},
        headers: { authorization: "Bearer token" },
        body: { ...input, need: "Too short" },
      },
      response,
    );
    expect(response.code).toBe(400);
  });
});
