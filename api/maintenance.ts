import {
  cronAuthorized,
  methodNotAllowed,
  observed,
  privateResponse,
  sql,
  type ApiRequest,
  type ApiResponse,
} from "./_shared.js";

async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }
  if (!cronAuthorized(request)) {
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
  return privateResponse(response).status(200).json({
    removedRateLimits: rateLimits.length,
    removedReviewLinks: reviewLinks.length,
  });
}

export default observed("maintenance", handler);
