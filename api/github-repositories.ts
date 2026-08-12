import {
  authenticatedUserId,
  clerkClient,
  enforceRateLimit,
  type ApiRequest,
  type ApiResponse,
  methodNotAllowed,
  observed,
  privateResponse,
  sendRateLimit,
  verifiedGithubAccount,
} from "./_shared.js";

const GITHUB_API_VERSION = "2022-11-28";

async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }

  const userId = await authenticatedUserId(request);
  if (!userId) {
    return response.status(401).json({ error: "Unauthorized." });
  }
  const limit = await enforceRateLimit(
    request,
    "github-repositories",
    60,
    60,
    userId,
  );
  if (!limit.allowed) return sendRateLimit(response, limit);

  const clerk = clerkClient();
  const [user, tokens] = await Promise.all([
    clerk.users.getUser(userId),
    clerk.users.getUserOauthAccessToken(userId, "github"),
  ]);
  const account = verifiedGithubAccount(user);
  const token = tokens.data.find(
    (candidate) => candidate.externalAccountId === account?.id,
  )?.token;
  if (!account?.username || !token) {
    return privateResponse(response).status(409).json({
      error: "Reconnect your GitHub account and try again.",
    });
  }

  const githubResponse = await fetch(
    `https://api.github.com/users/${encodeURIComponent(account.username)}/repos?per_page=100&sort=pushed`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "kleos.bio",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    },
  );
  if (githubResponse.status === 403 || githubResponse.status === 429) {
    return response
      .status(429)
      .json({ error: "GitHub rate limit reached. Try again later." });
  }
  if (!githubResponse.ok) {
    return response
      .status(502)
      .json({ error: "GitHub could not return repositories." });
  }
  const payload: unknown = await githubResponse.json();
  if (!Array.isArray(payload)) {
    return response.status(502).json({ error: "GitHub returned invalid data." });
  }
  return privateResponse(response).status(200).json(payload);
}

export default observed("github-repositories", handler);
