import { refreshedProjects } from "../src/github.js";
import {
  cronAuthorized,
  githubReposForUser,
  methodNotAllowed,
  observed,
  privateResponse,
  saveRefreshedRecord,
  staleProjectRecords,
  type ApiRequest,
  type ApiResponse,
} from "./_shared.js";

const BATCH_SIZE = 50;
const STALE_AFTER_MINUTES = 45;

async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }
  if (!cronAuthorized(request)) {
    return response.status(401).json({ error: "Unauthorized." });
  }

  const now = new Date();
  const cutoff = new Date(
    now.getTime() - STALE_AFTER_MINUTES * 60_000,
  ).toISOString();
  const syncedAt = now.toISOString();
  const stale = await staleProjectRecords(cutoff, BATCH_SIZE);

  let refreshed = 0;
  let skipped = 0;
  for (const { ownerId, record } of stale) {
    const repos = await githubReposForUser(ownerId);
    if (!repos) {
      skipped += 1;
      continue;
    }
    record.projects = refreshedProjects(record.projects, repos, syncedAt);
    if (await saveRefreshedRecord(ownerId, record)) {
      refreshed += 1;
    } else {
      skipped += 1;
    }
  }

  return privateResponse(response).status(200).json({
    considered: stale.length,
    refreshed,
    skipped,
  });
}

export default observed("refresh-projects", handler);
