import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

function fallbackProfile(user) {
  const name = user.name || "Folio member";
  return {
    person: {
      id: user.id,
      name,
      initials: name
        .split(" ")
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      role: "Folio member",
      location: "",
      summary: "",
      expertise: [],
      interests: [],
      availability: [],
      notOpenTo: [],
      preferredLocations: [],
      compensationPreference: "",
      identityVerified: Boolean(user.email_verified),
      employmentVerified: false,
      relationship: "",
      accent: "sage",
    },
    claims: [],
  };
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    const id = String(request.query.id || "");
    const [row] = await sql`
      SELECT u.id, u.name, u."emailVerified" AS email_verified, p.profile
      FROM neon_auth.user u
      LEFT JOIN public_profiles p ON p.user_id = u.id
      WHERE u.id = ${id}
      LIMIT 1
    `;

    if (!row) return response.status(404).json({ error: "Profile not found." });

    response.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return response.status(200).json(row.profile || fallbackProfile(row));
  }

  if (request.method === "PUT") {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return response.status(401).json({ error: "Unauthorized." });

    const [session] = await sql`
      SELECT "userId" AS user_id
      FROM neon_auth.session
      WHERE token = ${token} AND "expiresAt" > NOW()
      LIMIT 1
    `;
    if (!session) return response.status(401).json({ error: "Unauthorized." });

    let profile;
    try {
      profile = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    } catch {
      return response.status(400).json({ error: "Invalid profile." });
    }
    if (!profile?.person || !Array.isArray(profile.claims)) {
      return response.status(400).json({ error: "Invalid profile." });
    }

    profile.person.id = session.user_id;
    profile.claims = profile.claims.filter((claim) => claim.privacy === "Public");
    if (JSON.stringify(profile).length > 100_000) {
      return response.status(413).json({ error: "Profile is too large." });
    }

    await sql`
      INSERT INTO public_profiles (user_id, profile)
      VALUES (${session.user_id}, ${JSON.stringify(profile)})
      ON CONFLICT (user_id)
      DO UPDATE SET profile = EXCLUDED.profile, updated_at = NOW()
    `;
    return response.status(204).end();
  }

  response.setHeader("Allow", "GET, PUT");
  return response.status(405).json({ error: "Method not allowed." });
}
