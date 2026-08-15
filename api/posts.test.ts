import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiRequest, ApiResponse } from "./_shared";
import { TestResponse } from "./test-response";

const database = vi.hoisted(() => ({
  statements: [] as string[],
}));
const clerkUser = vi.hoisted(() => ({
  emailAddresses: [{ id: "email-1", emailAddress: "owner@example.com" }],
  firstName: "Real" as string | null,
  id: "owner-1",
  imageUrl: "https://img.example.com/owner.jpg",
  lastName: "Owner" as string | null,
  primaryEmailAddressId: "email-1",
  username: "realowner" as string | null,
}));

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(async () => ({ sub: "owner-1" })),
  createClerkClient: () => ({
    users: {
      getUser: async () => clerkUser,
    },
  }),
}));

vi.mock("./_media", () => ({
  verifiedPostMedia: vi.fn(async (_ownerId: string, media: { publicId: string; kind: string; alt: string }) =>
    media.kind === "image"
      ? {
          id: `asset:${media.publicId}`,
          kind: "image",
          url: "https://cdn.example.com/image.webp",
          width: 1200,
          height: 800,
          alt: media.alt,
          animated: false,
        }
      : null),
}));

vi.mock("./_link-preview", () => ({
  linkPreviewForText: vi.fn(async () => null),
}));

vi.mock("@neondatabase/serverless", () => {
  const query = async (
    strings: TemplateStringsArray,
    ..._values: unknown[]
  ): Promise<Record<string, unknown>[]> => {
    const text = strings.join("?");
    database.statements.push(text);
    if (text.includes("INSERT INTO folio_rate_limits")) return [{ request_count: 1 }];
    if (text.includes("FROM selected_posts AS post")) {
      return [{
        id: "post-from-owner-2",
        author: { id: "owner-2", name: "Other Account", handle: "@other" },
        body: "Visible to another signed-in account",
        media: [],
        link_preview: null,
        created_at: "2026-08-15T12:00:00.000Z",
        reply_count: "0",
        repost_count: "0",
        like_count: "0",
      }];
    }
    if (text.includes("INSERT INTO folio_posts")) {
      return [{ created_at: "2026-08-15T13:00:00.000Z" }];
    }
    return [];
  };
  query.transaction = async (queries: Promise<Record<string, unknown>[]>[]) =>
    Promise.all(queries);
  return { neon: () => query };
});

let postsHandler: (request: ApiRequest, response: ApiResponse) => Promise<ApiResponse | void>;

beforeAll(async () => {
  process.env.DATABASE_URL = "postgresql://test.invalid/kleos";
  process.env.CLERK_JWT_KEY = "test-key";
  process.env.CLERK_SECRET_KEY = "secret-key";
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  postsHandler = (await import("./posts")).default;
});

beforeEach(() => {
  database.statements = [];
  clerkUser.firstName = "Real";
  clerkUser.lastName = "Owner";
  clerkUser.username = "realowner";
});

describe("posts API", () => {
  it("returns posts from other real accounts to a signed-in account", async () => {
    const response = new TestResponse();
    await postsHandler({
      method: "GET",
      query: {},
      headers: { authorization: "Bearer token" },
      body: undefined,
    }, response);
    expect(response.code).toBe(200);
    expect(response.body).toMatchObject({
      items: [{
        id: "post-from-owner-2",
        author: { id: "owner-2", handle: "@other" },
      }],
    });
  });

  it("derives the post author from Clerk and stores account ownership", async () => {
    const response = new TestResponse();
    await postsHandler({
      method: "POST",
      query: {},
      headers: { authorization: "Bearer token" },
      body: {
        body: "Post with an image",
        media: [{ publicId: "owned-upload", kind: "image", alt: "A chart" }],
        author: { id: "attacker", name: "Spoofed" },
      },
    }, response);
    expect(response.code).toBe(201);
    expect(response.body).toMatchObject({
      author: { id: "owner-1", name: "Real Owner", handle: "@realowner" },
      body: "Post with an image",
      media: [{ alt: "A chart", kind: "image" }],
    });
    expect(database.statements.some((text) => text.includes("INSERT INTO folio_accounts")))
      .toBe(true);
    expect(database.statements.some((text) => text.includes("INSERT INTO folio_post_media")))
      .toBe(true);
  });

  it("does not publish a private email address as the account name", async () => {
    clerkUser.firstName = null;
    clerkUser.lastName = null;
    clerkUser.username = null;
    const response = new TestResponse();
    await postsHandler({
      method: "POST",
      query: {},
      headers: { authorization: "Bearer token" },
      body: { body: "Account-safe post", media: [] },
    }, response);
    expect(response.code).toBe(201);
    expect(response.body).toMatchObject({
      author: { id: "owner-1", name: "owner-1", handle: "@owner-1" },
    });
  });
});
