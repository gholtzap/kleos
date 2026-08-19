import type { User } from "@clerk/backend";
import {
  identityFieldDefinition,
  identityFields,
} from "../src/lib/connections.js";
import {
  kleosRecordContentIsValid,
  mergeOwnerKleosRecord,
  normalizeSubmittedKleosRecord,
} from "../src/lib/kleos.js";
import {
  accountIdentityForUser,
  authenticatedUserId,
  clerkClient,
  enforceRateLimit,
  type ApiRequest,
  type ApiResponse,
  first,
  loadKleosRecord,
  loadPublicKleosRecord,
  loadPublicKleosRecordByHandle,
  methodNotAllowed,
  observed,
  parseBody,
  privateResponse,
  saveKleosRecord,
  sendRateLimit,
  verifiedExternalAccount,
} from "./_shared.js";

const MAX_RECORD_BYTES = 100_000;

async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method === "GET") {
    const publicId = first(request.query.id);
    const publicHandle = first(request.query.handle);
    const publicRead =
      request.query.id !== undefined || request.query.handle !== undefined;
    if (publicRead) {
      if (
        Boolean(publicId) === Boolean(publicHandle) ||
        (publicId?.length ?? 0) > 200 ||
        (publicHandle?.length ?? 0) > 200
      ) {
        return response.status(404).json({ error: "Profile not found." });
      }
      const limit = await enforceRateLimit(
        request,
        "public-profile",
        300,
        60,
      );
      if (!limit.allowed) return sendRateLimit(response, limit);
      const record = publicHandle
        ? await loadPublicKleosRecordByHandle(publicHandle)
        : await loadPublicKleosRecord(publicId ?? "");
      if (!record) {
        return response.status(404).json({ error: "Profile not found." });
      }
      response.setHeader("Cache-Control", "public, max-age=60");
      response.setHeader(
        "Vercel-CDN-Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=300",
      );
      response.setHeader("ETag", `W/"kleos-${record.revision}"`);
      return response.status(200).json(record);
    }

    const userId = await authenticatedUserId(request);
    if (!userId) {
      return response.status(401).json({ error: "Unauthorized." });
    }
    const record = await loadKleosRecord(userId);
    if (!record) {
      return response.status(404).json({ error: "Profile not found." });
    }
    return privateResponse(response).status(200).json(record);
  }

  if (request.method === "PUT") {
    const userId = await authenticatedUserId(request);
    if (!userId) {
      return response.status(401).json({ error: "Unauthorized." });
    }
    const limit = await enforceRateLimit(
      request,
      "profile-write",
      60,
      60,
      userId,
    );
    if (!limit.allowed) return sendRateLimit(response, limit);
    const record = normalizeSubmittedKleosRecord(parseBody(request.body));
    if (!record) {
      return response.status(400).json({ error: "Invalid Kleos record." });
    }

    if (!kleosRecordContentIsValid(record)) {
      return response.status(400).json({ error: "Invalid Kleos content." });
    }
    const existing = await loadKleosRecord(userId);
    const currentRevision = existing?.revision ?? 0;
    if (record.revision !== currentRevision) {
      return response
        .status(409)
        .json({ error: "Kleos changed. Reload and try again." });
    }

    let ownerUser: User;
    try {
      ownerUser = await clerkClient().users.getUser(userId);
    } catch {
      return response
        .status(503)
        .json({ error: "Profile identity is unavailable. Try again." });
    }

    // A handle only reaches the profile when a live connection proves it. An
    // unchanged handle is left alone, so an earlier value survives and a
    // disconnect can always clear it.
    for (const field of identityFields) {
      const submitted = record.person[field];
      if (submitted === undefined || submitted === existing?.person[field]) {
        continue;
      }
      const { provider, label } = identityFieldDefinition(field);
      const verified =
        verifiedExternalAccount(ownerUser, provider)?.username ?? null;
      if (!verified || verified.toLowerCase() !== submitted.toLowerCase()) {
        return response.status(403).json({
          error: `Connect this ${label} account to Kleos before adding it.`,
        });
      }
      record.person[field] = verified;
    }

    const owner = accountIdentityForUser(ownerUser);
    const safeRecord = mergeOwnerKleosRecord(
      existing,
      record,
      userId,
      owner.handle,
    );
    safeRecord.revision = currentRevision + 1;
    const serialized = JSON.stringify(safeRecord);
    if (Buffer.byteLength(serialized, "utf8") > MAX_RECORD_BYTES) {
      return response.status(413).json({ error: "Kleos record is too large." });
    }

    if (!(await saveKleosRecord(userId, safeRecord, currentRevision))) {
      return response
        .status(409)
        .json({ error: "Kleos changed. Reload and try again." });
    }
    return privateResponse(response).status(200).json(safeRecord);
  }

  return methodNotAllowed(response, ["GET", "PUT"]);
}

export default observed("profiles", handler);
