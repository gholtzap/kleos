import { verifyToken } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";
import type { PublicProfile } from "../src/public-profile";

type RequestValue = string | string[] | undefined;

interface ApiRequest {
  method?: string;
  query: Record<string, RequestValue>;
  headers: Record<string, RequestValue>;
  body: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): ApiResponse;
  setHeader(name: string, value: string): void;
  end(): ApiResponse;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const sql = neon(databaseUrl);

function first(value: RequestValue) {
  return Array.isArray(value) ? value[0] : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPublicProfile(value: unknown): value is PublicProfile {
  return (
    isRecord(value) &&
    isRecord(value.person) &&
    typeof value.person.id === "string" &&
    Array.isArray(value.claims)
  );
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method === "GET") {
    const id = first(request.query.id) ?? "";
    const [row] = await sql`
      SELECT profile
      FROM public_profiles
      WHERE user_id = ${id}
      LIMIT 1
    `;

    if (!row || !isPublicProfile(row.profile)) {
      return response.status(404).json({ error: "Profile not found." });
    }

    response.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return response.status(200).json(row.profile);
  }

  if (request.method === "PUT") {
    const authorization = first(request.headers.authorization);
    const token = authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return response.status(401).json({ error: "Unauthorized." });

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return response.status(500).json({ error: "Authentication is not configured." });
    }

    let userId: string;
    try {
      userId = (await verifyToken(token, { secretKey })).sub;
    } catch {
      return response.status(401).json({ error: "Unauthorized." });
    }

    let profile: unknown = request.body;
    if (typeof profile === "string") {
      try {
        profile = JSON.parse(profile) as unknown;
      } catch {
        return response.status(400).json({ error: "Invalid profile." });
      }
    }
    if (!isPublicProfile(profile)) {
      return response.status(400).json({ error: "Invalid profile." });
    }

    profile.person.id = userId;
    profile.claims = profile.claims.filter((claim) => claim.privacy === "Public");
    const serializedProfile = JSON.stringify(profile);
    if (serializedProfile.length > 100_000) {
      return response.status(413).json({ error: "Profile is too large." });
    }

    await sql`
      INSERT INTO public_profiles (user_id, profile)
      VALUES (${userId}, ${serializedProfile})
      ON CONFLICT (user_id)
      DO UPDATE SET profile = EXCLUDED.profile, updated_at = NOW()
    `;
    return response.status(204).end();
  }

  response.setHeader("Allow", "GET, PUT");
  return response.status(405).json({ error: "Method not allowed." });
}
