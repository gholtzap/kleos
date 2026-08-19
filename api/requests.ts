import { randomUUID } from "node:crypto";
import { includesValue, normalizePerson } from "../src/kleos.js";
import {
  normalizeNewProfessionalRequest,
  requestKinds,
} from "../src/requests.js";
import type {
  ProfessionalRequest,
  RequestKind,
  ResultPage,
} from "../src/types/index.js";
import {
  authenticatedUserId,
  enforceRateLimit,
  first,
  isoDate,
  methodNotAllowed,
  observed,
  parseBody,
  privateResponse,
  sendRateLimit,
  sql,
  stringArray,
  type ApiRequest,
  type ApiResponse,
} from "./_shared.js";
import {
  decodeDescendingCursor,
  encodeDescendingCursor,
} from "./_cursor.js";

const PAGE_SIZE = 20;
const MAX_ACTIVE_REQUESTS = 100;

interface RequestCursor {
  postedAt: string;
  id: string;
}

export function decodeRequestCursor(value: string): RequestCursor | null {
  const cursor = decodeDescendingCursor(value);
  return cursor ? { postedAt: cursor.at, id: cursor.id } : null;
}

function requestKind(value: string | undefined): RequestKind | null {
  return includesValue(requestKinds, value) ? value : null;
}

function requestFromRow(
  row: Record<string, unknown>,
): ProfessionalRequest | null {
  const author = normalizePerson(row.author);
  const experience = stringArray(row.experience);
  const postedAt = isoDate(row.created_at);
  if (
    !author ||
    !experience ||
    !postedAt ||
    typeof row.id !== "string" ||
    !includesValue(requestKinds, row.kind) ||
    typeof row.title !== "string" ||
    typeof row.need !== "string" ||
    typeof row.commitment !== "string" ||
    typeof row.compensation !== "string" ||
    typeof row.constraints !== "string" ||
    typeof row.preferred_evidence !== "string"
  ) {
    return null;
  }
  return {
    id: row.id,
    author,
    kind: row.kind,
    title: row.title,
    need: row.need,
    experience,
    commitment: row.commitment,
    compensation: row.compensation,
    constraints: row.constraints,
    preferredEvidence: row.preferred_evidence,
    postedAt,
  };
}

async function handler(request: ApiRequest, response: ApiResponse) {
  const userId = await authenticatedUserId(request);
  if (!userId) {
    return response.status(401).json({ error: "Unauthorized." });
  }

  if (request.method === "GET") {
    const kindValue = first(request.query.kind);
    const kind = requestKind(kindValue);
    if (kindValue && !kind) {
      return response.status(400).json({ error: "Invalid request type." });
    }
    const cursorValue = first(request.query.cursor);
    const cursor = cursorValue ? decodeRequestCursor(cursorValue) : null;
    if (cursorValue && !cursor) {
      return response.status(400).json({ error: "Invalid cursor." });
    }
    const limit = await enforceRateLimit(
      request,
      "request-feed",
      120,
      60,
      userId,
    );
    if (!limit.allowed) return sendRateLimit(response, limit);

    const rows = cursor
      ? await sql`
          SELECT
            request.id,
            request.kind,
            request.title,
            request.need,
            request.experience,
            request.commitment,
            request.compensation,
            request.constraints,
            request.preferred_evidence,
            request.created_at,
            record.public_record->'person' AS author
          FROM folio_requests AS request
          JOIN folio_records AS record ON record.owner_id = request.owner_id
          WHERE request.status = 'Active'
            AND (${kind}::TEXT IS NULL OR request.kind = ${kind})
            AND (request.created_at, request.id) <
              (${cursor.postedAt}::TIMESTAMPTZ, ${cursor.id})
          ORDER BY request.created_at DESC, request.id DESC
          LIMIT ${PAGE_SIZE + 1}
        `
      : await sql`
          SELECT
            request.id,
            request.kind,
            request.title,
            request.need,
            request.experience,
            request.commitment,
            request.compensation,
            request.constraints,
            request.preferred_evidence,
            request.created_at,
            record.public_record->'person' AS author
          FROM folio_requests AS request
          JOIN folio_records AS record ON record.owner_id = request.owner_id
          WHERE request.status = 'Active'
            AND (${kind}::TEXT IS NULL OR request.kind = ${kind})
          ORDER BY request.created_at DESC, request.id DESC
          LIMIT ${PAGE_SIZE + 1}
        `;
    const items = rows
      .slice(0, PAGE_SIZE)
      .map(requestFromRow)
      .filter((item): item is ProfessionalRequest => item !== null);
    const extra = rows.at(PAGE_SIZE);
    const lastRow = rows.at(PAGE_SIZE - 1);
    const lastPostedAt = isoDate(lastRow?.created_at);
    const lastId =
      typeof lastRow?.id === "string" ? lastRow.id : null;
    if (extra && (!lastPostedAt || !lastId)) {
      throw new Error("Stored professional request cursor is invalid.");
    }
    const page: ResultPage<ProfessionalRequest> = {
      items,
      nextCursor:
        extra && lastPostedAt && lastId
          ? encodeDescendingCursor({ at: lastPostedAt, id: lastId })
          : undefined,
    };
    return privateResponse(response).status(200).json(page);
  }

  if (request.method === "POST") {
    const limit = await enforceRateLimit(
      request,
      "request-write",
      20,
      60,
      userId,
    );
    if (!limit.allowed) return sendRateLimit(response, limit);
    const input = normalizeNewProfessionalRequest(parseBody(request.body));
    if (!input) {
      return response
        .status(400)
        .json({ error: "Invalid professional request." });
    }
    const [row] = await sql`
      WITH owner_lock AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))
      ),
      active_count AS MATERIALIZED (
        SELECT COUNT(*) AS value
        FROM folio_requests
        CROSS JOIN owner_lock
        WHERE owner_id = ${userId}
          AND status = 'Active'
      )
      INSERT INTO folio_requests (
          id,
          owner_id,
          kind,
          title,
          need,
          experience,
          commitment,
          compensation,
          constraints,
          preferred_evidence
        )
        SELECT
          ${randomUUID()},
          record.owner_id,
          ${input.kind},
          ${input.title},
          ${input.need},
          ${input.experience},
          ${input.commitment},
          ${input.compensation},
          ${input.constraints},
          ${input.preferredEvidence}
        FROM folio_records AS record
        CROSS JOIN active_count
        WHERE record.owner_id = ${userId}
          AND active_count.value < ${MAX_ACTIVE_REQUESTS}
      RETURNING
        id,
        kind,
        title,
        need,
        experience,
        commitment,
        compensation,
        constraints,
        preferred_evidence,
        created_at,
        (
          SELECT public_record->'person'
          FROM folio_records
          WHERE owner_id = ${userId}
        ) AS author
    `;
    if (!row) {
      return response
        .status(409)
        .json({
          error:
            "Save your Kleos profile or close an active request before you publish another.",
        });
    }
    const created = requestFromRow(row);
    if (!created) {
      throw new Error("Stored professional request is invalid.");
    }
    return privateResponse(response).status(201).json(created);
  }

  if (request.method === "DELETE") {
    const id = first(request.query.id);
    if (!id || id.length > 200) {
      return response.status(400).json({ error: "Request ID is required." });
    }
    const rows = await sql`
      UPDATE folio_requests
      SET status = 'Closed', closed_at = NOW()
      WHERE id = ${id}
        AND owner_id = ${userId}
        AND status = 'Active'
      RETURNING id
    `;
    if (!rows.length) {
      return response
        .status(404)
        .json({ error: "Professional request not found." });
    }
    return privateResponse(response).status(204).end();
  }

  return methodNotAllowed(response, ["GET", "POST", "DELETE"]);
}

export default observed("requests", handler);
