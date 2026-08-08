import { beforeAll, describe, expect, it, vi } from "vitest";
import { currentPerson } from "../src/data";
import type { ApiRequest, ApiResponse } from "./_shared";

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

class TestResponse implements ApiResponse {
  code = 200;
  body: unknown;
  headers = new Map<string, string>();

  status(code: number) {
    this.code = code;
    return this;
  }

  json(body: unknown) {
    this.body = body;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
  }

  end() {
    return this;
  }
}

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
