import { createHash } from "node:crypto";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";
import {
  discoveryProjection,
  isRecord,
  normalizeKleosRecord,
  publicKleosRecord,
} from "../src/kleos";
import type { KleosRecord } from "../src/types";

export { isRecord };

export type RequestValue = string | string[] | undefined;

export interface ApiRequest {
  method?: string;
  query: Record<string, RequestValue>;
  headers: Record<string, RequestValue>;
  body: unknown;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): ApiResponse;
  setHeader(name: string, value: string): void;
  end(): ApiResponse;
}

export type HttpMethod =
  | "CONNECT"
  | "DELETE"
  | "GET"
  | "HEAD"
  | "OPTIONS"
  | "PATCH"
  | "POST"
  | "PUT"
  | "TRACE";

export type AllowedMethods = readonly [HttpMethod, ...HttpMethod[]];

export type ApiHandler = (
  request: ApiRequest,
  response: ApiResponse,
) => Promise<ApiResponse | void>;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

export const sql = neon(databaseUrl);

export function first(value: RequestValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseBody(body: unknown): unknown {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

export function stringArray(value: unknown): string[] | null {
  if (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string")
  ) {
    return value;
  }
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function isoDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function configuredJwtKey(): string | null {
  const value = process.env.CLERK_JWT_KEY?.replace(/\\n/g, "\n").trim();
  return value || null;
}

export async function authenticatedUserId(
  request: ApiRequest,
): Promise<string | null> {
  const authorization = first(request.headers.authorization);
  const token = authorization?.replace(/^Bearer\s+/i, "");
  const jwtKey = configuredJwtKey();
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!token || (!jwtKey && !secretKey)) return null;
  if (process.env.VERCEL_ENV === "production" && !jwtKey) {
    throw new Error("CLERK_JWT_KEY is required in production.");
  }
  const authorizedParties = (process.env.CLERK_AUTHORIZED_PARTIES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (process.env.VERCEL_ENV === "production" && !authorizedParties.length) {
    throw new Error("CLERK_AUTHORIZED_PARTIES is required in production.");
  }
  try {
    return (
      await verifyToken(token, {
        jwtKey: jwtKey ?? undefined,
        secretKey: jwtKey ? undefined : secretKey,
        authorizedParties: authorizedParties.length
          ? authorizedParties
          : undefined,
      })
    ).sub;
  } catch {
    return null;
  }
}

export async function verifiedGithubUsername(
  userId: string,
): Promise<string | null> {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required for GitHub verification.");
  }
  const clerk = createClerkClient({ secretKey });
  const user = await clerk.users.getUser(userId);
  const account = user.externalAccounts.find(
    (external) =>
      external.provider.endsWith("github") &&
      external.verification?.status === "verified" &&
      external.username,
  );
  return account?.username ?? null;
}

export async function loadKleosRecord(
  ownerId: string,
): Promise<KleosRecord | null> {
  const [row] = await sql`
    SELECT revision, record
    FROM folio_records
    WHERE owner_id = ${ownerId}
    LIMIT 1
  `;
  if (row) {
    const record = normalizeKleosRecord(row.record);
    const revision =
      typeof row.revision === "number" || typeof row.revision === "string"
        ? Number(row.revision)
        : Number.NaN;
    if (!record || !Number.isSafeInteger(revision) || revision < 0) {
      throw new Error("Stored Kleos record is invalid.");
    }
    record.revision = revision;
    return record;
  }

  try {
    const [legacyRow] = await sql`
      SELECT profile
      FROM public_profiles
      WHERE user_id::TEXT = ${ownerId}
      LIMIT 1
    `;
    return normalizeKleosRecord(legacyRow?.profile);
  } catch {
    return null;
  }
}

export async function loadPublicKleosRecord(
  ownerId: string,
): Promise<KleosRecord | null> {
  const [row] = await sql`
    SELECT public_record
    FROM folio_records
    WHERE owner_id = ${ownerId}
    LIMIT 1
  `;
  const projected = normalizeKleosRecord(row?.public_record);
  if (projected) return projected;
  const record = await loadKleosRecord(ownerId);
  return record ? publicKleosRecord(record) : null;
}

export async function saveKleosRecord(
  ownerId: string,
  record: KleosRecord,
  expectedRevision = 0,
): Promise<boolean> {
  const serialized = JSON.stringify(record);
  const projection = discoveryProjection(record);
  const rows = await sql`
    INSERT INTO folio_records (
      owner_id,
      revision,
      record,
      public_record,
      search_text,
      ownership_levels,
      expertise
    )
    VALUES (
      ${ownerId},
      ${record.revision},
      ${serialized},
      ${JSON.stringify(projection.publicRecord)},
      ${projection.searchText},
      ${projection.ownershipLevels},
      ${projection.expertise}
    )
    ON CONFLICT (owner_id)
    DO UPDATE SET
      revision = EXCLUDED.revision,
      record = EXCLUDED.record,
      public_record = EXCLUDED.public_record,
      search_text = EXCLUDED.search_text,
      ownership_levels = EXCLUDED.ownership_levels,
      expertise = EXCLUDED.expertise,
      updated_at = NOW()
    WHERE folio_records.revision = ${expectedRevision}
    RETURNING owner_id
  `;
  return rows.length > 0;
}

function rateLimitKey(request: ApiRequest, explicitKey?: string): string {
  const address =
    explicitKey ??
    first(request.headers["x-vercel-forwarded-for"]) ??
    first(request.headers["x-forwarded-for"])?.split(",")[0]?.trim() ??
    first(request.headers["x-real-ip"]) ??
    "unknown";
  const secret = process.env.RATE_LIMIT_SECRET?.trim();
  if (process.env.VERCEL_ENV === "production" && !secret) {
    throw new Error("RATE_LIMIT_SECRET is required in production.");
  }
  return createHash("sha256")
    .update(`${secret || "local"}:${address}`)
    .digest("hex");
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function enforceRateLimit(
  request: ApiRequest,
  scope: string,
  maximum: number,
  windowSeconds: number,
  explicitKey?: string,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStartedAt = new Date(
    Math.floor(now / (windowSeconds * 1_000)) * windowSeconds * 1_000,
  ).toISOString();
  const [row] = await sql`
    INSERT INTO folio_rate_limits (
      scope,
      key_hash,
      window_started_at,
      request_count
    )
    VALUES (
      ${scope},
      ${rateLimitKey(request, explicitKey)},
      ${windowStartedAt},
      1
    )
    ON CONFLICT (scope, key_hash)
    DO UPDATE SET
      window_started_at = GREATEST(
        folio_rate_limits.window_started_at,
        EXCLUDED.window_started_at
      ),
      request_count = CASE
        WHEN folio_rate_limits.window_started_at = EXCLUDED.window_started_at
          THEN folio_rate_limits.request_count + 1
        WHEN folio_rate_limits.window_started_at < EXCLUDED.window_started_at
          THEN 1
        ELSE folio_rate_limits.request_count
      END,
      updated_at = NOW()
    RETURNING request_count
  `;
  const count =
    typeof row?.request_count === "number" ||
    typeof row?.request_count === "string"
      ? Number(row.request_count)
      : maximum + 1;
  const elapsedSeconds = Math.floor((now - Date.parse(windowStartedAt)) / 1_000);
  return {
    allowed: count <= maximum,
    retryAfterSeconds: Math.max(1, windowSeconds - elapsedSeconds),
  };
}

export function privateResponse(response: ApiResponse): ApiResponse {
  response.setHeader("Cache-Control", "private, no-store");
  return response;
}

export function methodNotAllowed(
  response: ApiResponse,
  allowedMethods: AllowedMethods,
): ApiResponse {
  response.setHeader("Allow", allowedMethods.join(", "));
  return response.status(405).json({ error: "Method not allowed." });
}

export function sendRateLimit(
  response: ApiResponse,
  result: RateLimitResult,
): ApiResponse {
  response.setHeader("Retry-After", String(result.retryAfterSeconds));
  return privateResponse(response)
    .status(429)
    .json({ error: "Too many requests." });
}

export function reviewerIsAllowed(userId: string): boolean {
  const reviewerIds = (
    process.env.KLEOS_REVIEWER_USER_IDS ??
    process.env.FOLIO_REVIEWER_USER_IDS ??
    ""
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return reviewerIds.includes(userId);
}

export function observed(name: string, handler: ApiHandler): ApiHandler {
  return async (request, response) => {
    const startedAt = performance.now();
    let status = 200;
    let sent = false;
    const setTiming = () => {
      const durationMs =
        Math.round((performance.now() - startedAt) * 10) / 10;
      response.setHeader(
        "Server-Timing",
        `app;dur=${Math.max(0, durationMs)}`,
      );
      return durationMs;
    };
    const measured: ApiResponse = {
      status(code) {
        status = code;
        response.status(code);
        return measured;
      },
      json(body) {
        setTiming();
        sent = true;
        response.json(body);
        return measured;
      },
      setHeader(headerName, value) {
        response.setHeader(headerName, value);
      },
      end() {
        setTiming();
        sent = true;
        response.end();
        return measured;
      },
    };
    try {
      return await handler(request, measured);
    } catch (error) {
      status = 500;
      console.error(
        JSON.stringify({
          event: "api.error",
          route: name,
          method: request.method ?? "UNKNOWN",
          error: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      if (!sent) {
        measured
          .status(500)
          .json({ error: "The server could not complete this request." });
      }
      return measured;
    } finally {
      const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
      console.log(
        JSON.stringify({
          event: "api.request",
          route: name,
          method: request.method ?? "UNKNOWN",
          status,
          durationMs,
        }),
      );
    }
  };
}
