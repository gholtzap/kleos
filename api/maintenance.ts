import { timingSafeEqual } from "node:crypto";
import {
  first,
  observed,
  sql,
  type ApiRequest,
  type ApiResponse,
} from "./_shared";

function authorized(request: ApiRequest): boolean {
  const configured = process.env.CRON_SECRET;
  const supplied = first(request.headers.authorization)?.replace(
    /^Bearer\s+/i,
    "",
  );
  if (!configured || !supplied) return false;
  const configuredBytes = Buffer.from(configured);
  const suppliedBytes = Buffer.from(supplied);
  return (
    configuredBytes.length === suppliedBytes.length &&
    timingSafeEqual(configuredBytes, suppliedBytes)
  );
}

async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }
  if (!authorized(request)) {
    return response.status(401).json({ error: "Unauthorized." });
  }
  const [rateLimits, reviewLinks] = await sql.transaction((transaction) => [
    transaction`
      DELETE FROM folio_rate_limits
      WHERE updated_at < NOW() - INTERVAL '2 days'
      RETURNING scope
    `,
    transaction`
      DELETE FROM folio_review_links
      WHERE (
        expires_at < NOW() - INTERVAL '90 days'
        OR revoked_at < NOW() - INTERVAL '90 days'
      )
      RETURNING id
    `,
  ]);
  response.setHeader("Cache-Control", "private, no-store");
  return response.status(200).json({
    removedRateLimits: rateLimits.length,
    removedReviewLinks: reviewLinks.length,
  });
}

export default observed("maintenance", handler);
