import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { ApiRequest, ApiResponse } from "./_shared";
import { TestResponse } from "./test-response";

const runDatabaseTests = process.env.RUN_KLEOS_DB_TESTS === "1";
const identity = vi.hoisted(() => ({ ownerId: "post-owner-integration" }));

vi.mock("@neondatabase/serverless", async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const { postgresTestAdapter } = await import("./_postgres-test-adapter");
  return { neon: () => postgresTestAdapter(databaseUrl) };
});

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(async () => ({ sub: identity.ownerId })),
  createClerkClient: () => ({
    users: {
      getUser: async () => ({
        emailAddresses: [],
        firstName: "Database",
        id: identity.ownerId,
        imageUrl: "",
        lastName: "Author",
        primaryEmailAddressId: null,
        username: "database-author",
      }),
    },
  }),
}));

vi.mock("./_media", () => ({
  verifiedPostMedia: vi.fn(async (_userId: string, input: { publicId: string; alt: string }) => ({
    id: `asset-${identity.ownerId}`,
    kind: "image",
    url: "https://cdn.example.com/post.webp",
    width: 1200,
    height: 800,
    alt: input.alt,
    animated: false,
  })),
}));

vi.mock("./_link-preview", () => ({
  linkPreviewForText: vi.fn(async () => null),
}));

let postsHandler: (request: ApiRequest, response: ApiResponse) => Promise<ApiResponse | void>;

beforeAll(async () => {
  process.env.CLERK_JWT_KEY = "test-key";
  process.env.CLERK_SECRET_KEY = "test-secret";
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  postsHandler = (await import("./posts")).default;
});

describe.runIf(runDatabaseTests)("posts PostgreSQL integration", () => {
  afterEach(async () => {
    const { sql } = await import("./_shared");
    await sql`DELETE FROM folio_posts WHERE owner_id = ${identity.ownerId}`;
    await sql`DELETE FROM folio_accounts WHERE id = ${identity.ownerId}`;
    await sql`DELETE FROM folio_rate_limits WHERE key_hash IS NOT NULL`;
  });

  it("publishes media under the authenticated account and reads it from the shared feed", async () => {
    const created = new TestResponse();
    await postsHandler({
      method: "POST",
      query: {},
      headers: { authorization: "Bearer token" },
      body: {
        body: "PostgreSQL post",
        media: [{ publicId: "owned-upload", kind: "image", alt: "A database chart" }],
      },
    }, created);
    expect(created.code).toBe(201);
    expect(created.body).toMatchObject({
      author: { id: identity.ownerId, handle: "@database-author" },
      media: [{ alt: "A database chart", kind: "image" }],
    });

    const feed = new TestResponse();
    await postsHandler({
      method: "GET",
      query: {},
      headers: { authorization: "Bearer token" },
      body: undefined,
    }, feed);
    expect(feed.code).toBe(200);
    expect(feed.body).toMatchObject({
      items: [{
        author: { id: identity.ownerId },
        body: "PostgreSQL post",
        media: [{ alt: "A database chart" }],
      }],
    });
  });

  it("rolls back the account and post when a media insert fails", async () => {
    const response = new TestResponse();
    await postsHandler({
      method: "POST",
      query: {},
      headers: { authorization: "Bearer token" },
      body: {
        body: "This transaction must fail",
        media: [
          { publicId: "first-upload", kind: "image", alt: "First chart" },
          { publicId: "second-upload", kind: "image", alt: "Second chart" },
        ],
      },
    }, response);
    expect(response.code).toBe(409);

    const { sql } = await import("./_shared");
    const [stored] = await sql`
      SELECT
        EXISTS(SELECT 1 FROM folio_accounts WHERE id = ${identity.ownerId}) AS account_exists,
        EXISTS(SELECT 1 FROM folio_posts WHERE owner_id = ${identity.ownerId}) AS post_exists
    `;
    expect(stored).toEqual({ account_exists: false, post_exists: false });
  });
});
