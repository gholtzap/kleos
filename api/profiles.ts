import {
  folioRecordContentIsValid,
  mergeOwnerFolioRecord,
  normalizeSubmittedFolioRecord,
} from "../src/folio";
import {
  authenticatedUserId,
  enforceRateLimit,
  type ApiRequest,
  type ApiResponse,
  first,
  loadFolioRecord,
  loadPublicFolioRecord,
  observed,
  parseBody,
  privateResponse,
  saveFolioRecord,
  sendRateLimit,
} from "./_shared";

const MAX_RECORD_BYTES = 100_000;

async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method === "GET") {
    const publicId = first(request.query.id);
    if (publicId) {
      if (publicId.length > 200) {
        return response.status(404).json({ error: "Profile not found." });
      }
      const limit = await enforceRateLimit(
        request,
        "public-profile",
        300,
        60,
      );
      if (!limit.allowed) return sendRateLimit(response, limit);
      response.setHeader("Cache-Control", "public, max-age=60");
      response.setHeader(
        "Vercel-CDN-Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=300",
      );
      const record = await loadPublicFolioRecord(publicId);
      if (!record) {
        return response.status(404).json({ error: "Profile not found." });
      }
      response.setHeader("ETag", `W/"folio-${record.revision}"`);
      return response.status(200).json(record);
    }

    const userId = await authenticatedUserId(request);
    if (!userId) {
      return response.status(401).json({ error: "Unauthorized." });
    }
    const record = await loadFolioRecord(userId);
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
    const record = normalizeSubmittedFolioRecord(parseBody(request.body));
    if (!record) {
      return response.status(400).json({ error: "Invalid Folio record." });
    }

    if (!folioRecordContentIsValid(record)) {
      return response.status(400).json({ error: "Invalid Folio content." });
    }
    const existing = await loadFolioRecord(userId);
    const currentRevision = existing?.revision ?? 0;
    if (record.revision !== currentRevision) {
      return response
        .status(409)
        .json({ error: "Folio changed. Reload and try again." });
    }
    const safeRecord = mergeOwnerFolioRecord(existing, record, userId);
    safeRecord.revision = currentRevision + 1;
    const serialized = JSON.stringify(safeRecord);
    if (Buffer.byteLength(serialized, "utf8") > MAX_RECORD_BYTES) {
      return response.status(413).json({ error: "Folio record is too large." });
    }

    if (!(await saveFolioRecord(userId, safeRecord, currentRevision))) {
      return response
        .status(409)
        .json({ error: "Folio changed. Reload and try again." });
    }
    return privateResponse(response).status(200).json(safeRecord);
  }

  response.setHeader("Allow", "GET, PUT");
  return response.status(405).json({ error: "Method not allowed." });
}

export default observed("profiles", handler);
