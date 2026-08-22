import { randomUUID } from "node:crypto";
import { normalizeFeedPost, normalizeLinkPreview, normalizeNewPost } from "../src/posts.js";
import type { FeedPost, LinkPreview, PostAuthor, PostMedia, ResultPage } from "../src/types.js";
import { decodeDescendingCursor, encodeDescendingCursor } from "./_cursor.js";
import { linkPreviewForText } from "./_link-preview.js";
import { verifiedPostMedia } from "./_media.js";
import {
  accountIdentityForUser,
  authenticatedUserId,
  clerkClient,
  enforceRateLimit,
  first,
  isoDate,
  methodNotAllowed,
  observed,
  parseBody,
  privateResponse,
  rememberAccount,
  sendRateLimit,
  sql,
  type ApiRequest,
  type ApiResponse,
} from "./_shared.js";

const PAGE_SIZE = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function postFromRow(row: Record<string, unknown>): FeedPost | null {
  const postedAt = isoDate(row.created_at);
  if (!postedAt || typeof row.id !== "string" || typeof row.body !== "string") return null;
  return normalizeFeedPost({
    id: row.id,
    author: row.author,
    body: row.body,
    media: row.media,
    linkPreview: row.link_preview === null ? undefined : row.link_preview,
    postedAt,
    replyCount: row.reply_count,
    repostCount: row.repost_count,
    likeCount: row.like_count,
  });
}

async function listPosts(
  cursor: ReturnType<typeof decodeDescendingCursor>,
): Promise<ResultPage<FeedPost>> {
  const rows = cursor
    ? await sql`
        WITH selected_posts AS MATERIALIZED (
          SELECT id, owner_id, body, link_preview, created_at,
            reply_count, repost_count, like_count
          FROM folio_posts
          WHERE (created_at, id) < (${cursor.at}::TIMESTAMPTZ, ${cursor.id}::UUID)
          ORDER BY created_at DESC, id DESC
          LIMIT ${PAGE_SIZE + 1}
        )
        SELECT
          post.id::TEXT,
          post.body,
          post.link_preview,
          post.created_at,
          post.reply_count,
          post.repost_count,
          post.like_count,
          JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
            'id', account.id,
            'name', account.name,
            'handle', account.handle,
            'avatarUrl', account.avatar_url
          )) AS author,
          COALESCE(
            JSONB_AGG(
              JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
                'id', media.id,
                'kind', media.kind,
                'url', media.url,
                'posterUrl', media.poster_url,
                'width', media.width,
                'height', media.height,
                'durationSeconds', media.duration_seconds,
                'alt', media.alt,
                'animated', media.animated
              )) ORDER BY media.position
            ) FILTER (WHERE media.id IS NOT NULL),
            '[]'::JSONB
          ) AS media
        FROM selected_posts AS post
        JOIN folio_accounts AS account ON account.id = post.owner_id
        LEFT JOIN folio_post_media AS media ON media.post_id = post.id
        GROUP BY post.id, post.body, post.link_preview, post.created_at,
          post.reply_count, post.repost_count, post.like_count, account.id
        ORDER BY post.created_at DESC, post.id DESC
        LIMIT ${PAGE_SIZE + 1}
      `
    : await sql`
        WITH selected_posts AS MATERIALIZED (
          SELECT id, owner_id, body, link_preview, created_at,
            reply_count, repost_count, like_count
          FROM folio_posts
          ORDER BY created_at DESC, id DESC
          LIMIT ${PAGE_SIZE + 1}
        )
        SELECT
          post.id::TEXT,
          post.body,
          post.link_preview,
          post.created_at,
          post.reply_count,
          post.repost_count,
          post.like_count,
          JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
            'id', account.id,
            'name', account.name,
            'handle', account.handle,
            'avatarUrl', account.avatar_url
          )) AS author,
          COALESCE(
            JSONB_AGG(
              JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
                'id', media.id,
                'kind', media.kind,
                'url', media.url,
                'posterUrl', media.poster_url,
                'width', media.width,
                'height', media.height,
                'durationSeconds', media.duration_seconds,
                'alt', media.alt,
                'animated', media.animated
              )) ORDER BY media.position
            ) FILTER (WHERE media.id IS NOT NULL),
            '[]'::JSONB
          ) AS media
        FROM selected_posts AS post
        JOIN folio_accounts AS account ON account.id = post.owner_id
        LEFT JOIN folio_post_media AS media ON media.post_id = post.id
        GROUP BY post.id, post.body, post.link_preview, post.created_at,
          post.reply_count, post.repost_count, post.like_count, account.id
        ORDER BY post.created_at DESC, post.id DESC
        LIMIT ${PAGE_SIZE + 1}
      `;
  const items = rows.slice(0, PAGE_SIZE).map(postFromRow);
  if (items.some((item) => item === null)) throw new Error("Stored post is invalid.");
  const validItems = items.filter((item): item is FeedPost => item !== null);
  const last = rows.at(PAGE_SIZE - 1);
  const lastAt = isoDate(last?.created_at);
  const lastId = typeof last?.id === "string" ? last.id : null;
  return {
    items: validItems,
    nextCursor:
      rows.length > PAGE_SIZE && lastAt && lastId
        ? encodeDescendingCursor({ at: lastAt, id: lastId })
        : undefined,
  };
}

async function handler(request: ApiRequest, response: ApiResponse) {
  const userId = await authenticatedUserId(request);
  if (!userId) return response.status(401).json({ error: "Unauthorized." });

  if (request.method === "GET") {
    const cursorValue = first(request.query.cursor);
    const cursor = cursorValue ? decodeDescendingCursor(cursorValue) : null;
    if (cursorValue && (!cursor || !UUID_PATTERN.test(cursor.id))) {
      return response.status(400).json({ error: "Invalid cursor." });
    }
    const limit = await enforceRateLimit(request, "post-feed", 120, 60, userId);
    if (!limit.allowed) return sendRateLimit(response, limit);
    return privateResponse(response).status(200).json(await listPosts(cursor));
  }

  if (request.method === "POST") {
    const limit = await enforceRateLimit(request, "post-write", 20, 60, userId);
    if (!limit.allowed) return sendRateLimit(response, limit);
    const input = normalizeNewPost(parseBody(request.body));
    if (!input) return response.status(400).json({ error: "Invalid post." });

    const media = await Promise.all(
      input.media.map((item) => verifiedPostMedia(userId, item)),
    );
    if (media.some((item) => item === null)) {
      return response.status(400).json({ error: "Uploaded media is invalid or unavailable." });
    }
    const verifiedMedia = media.filter((item): item is PostMedia => item !== null);
    let linkPreview: LinkPreview | null = null;
    if (!verifiedMedia.length && input.body) linkPreview = await linkPreviewForText(input.body);
    const account: PostAuthor = accountIdentityForUser(
      await clerkClient().users.getUser(userId),
    );
    const postId = randomUUID();
    const linkPreviewJson = linkPreview ? JSON.stringify(linkPreview) : null;
    const queries = [
      rememberAccount(account),
      sql`
        INSERT INTO folio_posts (id, owner_id, body, link_preview)
        VALUES (${postId}::UUID, ${userId}, ${input.body}, ${linkPreviewJson}::JSONB)
        RETURNING created_at
      `,
      ...verifiedMedia.map((item, position) => sql`
        INSERT INTO folio_post_media (
          id,
          post_id,
          position,
          kind,
          public_id,
          url,
          poster_url,
          width,
          height,
          duration_seconds,
          alt,
          animated
        ) VALUES (
          ${item.id},
          ${postId}::UUID,
          ${position},
          ${item.kind},
          ${input.media[position]?.publicId ?? ""},
          ${item.url},
          ${item.kind === "video" ? item.posterUrl : null},
          ${item.width},
          ${item.height},
          ${item.kind === "video" ? item.durationSeconds : null},
          ${item.kind === "image" ? item.alt : ""},
          ${item.kind === "image" && item.animated}
        )
      `),
    ];
    let results: Record<string, unknown>[][];
    try {
      results = await sql.transaction(queries);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return response.status(409).json({ error: "This upload is already attached to a post." });
      }
      throw error;
    }
    const postedAt = isoDate(results[1]?.[0]?.created_at);
    if (!postedAt) throw new Error("Created post timestamp is invalid.");
    const created: FeedPost = {
      id: postId,
      author: account,
      body: input.body,
      media: verifiedMedia,
      linkPreview: linkPreview ?? undefined,
      postedAt,
      replyCount: 0,
      repostCount: 0,
      likeCount: 0,
    };
    return privateResponse(response).status(201).json(created);
  }

  return methodNotAllowed(response, ["GET", "POST"]);
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export default observed("posts", handler);
