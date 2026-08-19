import { beforeAll, describe, expect, it, vi } from "vitest";
import { currentPerson, initialClaims } from "../src/fixtures/data";
import type { ApiRequest, ApiResponse } from "./_shared";
import { TestResponse } from "./test-response";

vi.mock("@neondatabase/serverless", () => {
  const query = async (
    strings: TemplateStringsArray,
    ..._values: unknown[]
  ): Promise<Record<string, unknown>[]> => {
    const text = strings.join("?");
    if (text.includes("INSERT INTO folio_rate_limits")) {
      return [{ request_count: 1 }];
    }
    if (text.includes("SELECT owner_id, public_record")) {
      return [
        {
          owner_id: "owner-1",
          public_record: {
            version: 1,
            revision: 2,
            person: { ...currentPerson, id: "owner-1" },
            claims: [initialClaims[0]],
          },
        },
      ];
    }
    return [];
  };
  return { neon: () => query };
});

let discoverHandler: (
  request: ApiRequest,
  response: ApiResponse,
) => Promise<ApiResponse | void>;

beforeAll(async () => {
  process.env.DATABASE_URL = "postgresql://test.invalid/folio";
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  discoverHandler = (await import("./discover")).default;
});

describe("discovery API", () => {
  it("returns a bounded public result page with CDN caching", async () => {
    const response = new TestResponse();
    await discoverHandler(
      {
        method: "GET",
        query: { q: "migration", ownership: "Accountable owner" },
        headers: { "x-forwarded-for": "127.0.0.1" },
        body: undefined,
      },
      response,
    );
    expect(response.code).toBe(200);
    expect(response.body).toMatchObject({
      items: [
        {
          person: { id: "owner-1" },
          claim: { id: "claims-platform" },
        },
      ],
    });
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=120",
    );
  });

  it("rejects an unbounded query before it reaches storage", async () => {
    const response = new TestResponse();
    await discoverHandler(
      {
        method: "GET",
        query: { q: "x".repeat(201) },
        headers: {},
        body: undefined,
      },
      response,
    );
    expect(response.code).toBe(400);
  });

  it("rejects an unknown ownership level", async () => {
    const response = new TestResponse();
    await discoverHandler(
      {
        method: "GET",
        query: { ownership: "Unknown" },
        headers: {},
        body: undefined,
      },
      response,
    );
    expect(response.code).toBe(400);
  });
});
