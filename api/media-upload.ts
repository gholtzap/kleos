import { createMediaUploadTicket } from "./_media.js";
import {
  authenticatedUserId,
  enforceRateLimit,
  isRecord,
  methodNotAllowed,
  observed,
  parseBody,
  privateResponse,
  sendRateLimit,
  type ApiRequest,
  type ApiResponse,
} from "./_shared.js";

async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  const userId = await authenticatedUserId(request);
  if (!userId) return response.status(401).json({ error: "Unauthorized." });
  const limit = await enforceRateLimit(request, "post-media-upload", 20, 60, userId);
  if (!limit.allowed) return sendRateLimit(response, limit);

  const body = parseBody(request.body);
  if (!isRecord(body) || typeof body.mimeType !== "string") {
    return response.status(400).json({ error: "Invalid media type." });
  }
  const ticket = createMediaUploadTicket(userId, body.mimeType);
  if (!ticket) return response.status(400).json({ error: "Unsupported media type." });
  return privateResponse(response).status(201).json(ticket);
}

export default observed("media-upload", handler);
