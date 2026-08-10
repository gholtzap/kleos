import { includesValue, normalizeKleosRecord } from "../src/kleos";
import type {
  Claim,
  DiscoveryResult,
  KleosRecord,
  Ownership,
  ResultPage,
} from "../src/types";
import {
  enforceRateLimit,
  first,
  observed,
  sendRateLimit,
  sql,
  type ApiRequest,
  type ApiResponse,
} from "./_shared";

const PAGE_SIZE = 20;
const ownershipLevels: readonly Ownership[] = [
  "Contributor",
  "Major contributor",
  "Lead",
  "Accountable owner",
];

function normalizedParameter(
  value: string | undefined,
  maximumLength: number,
): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length <= maximumLength ? normalized : null;
}

function ownershipParameter(value: string): Ownership | null {
  return includesValue(ownershipLevels, value) ? value : null;
}

function claimText(claim: Claim): string {
  return [
    claim.title,
    claim.project,
    claim.organization,
    claim.profession,
    claim.ownership,
    claim.contribution,
    claim.outcome,
    claim.outcomeContext,
    claim.period,
  ]
    .join(" ")
    .toLowerCase();
}

function matchingClaim(
  record: KleosRecord,
  query: string,
  ownership: Ownership | null,
): Claim | null {
  const candidates = record.claims.filter(
    (claim) => !ownership || claim.ownership === ownership,
  );
  if (!candidates.length) return null;
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (!terms.length) {
    return candidates.find((claim) => claim.featured) ?? candidates[0] ?? null;
  }
  let selected = candidates[0] ?? null;
  let selectedScore = -1;
  for (const claim of candidates) {
    const text = claimText(claim);
    const score = terms.reduce(
      (total, term) => total + (text.includes(term) ? 1 : 0),
      claim.featured ? 0.25 : 0,
    );
    if (score > selectedScore) {
      selected = claim;
      selectedScore = score;
    }
  }
  return selected;
}

async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }
  const query = normalizedParameter(first(request.query.q), 200);
  const expertise = normalizedParameter(
    first(request.query.expertise),
    200,
  );
  const ownershipValue = normalizedParameter(
    first(request.query.ownership),
    100,
  );
  const cursor = normalizedParameter(first(request.query.cursor), 200);
  if (
    query === null ||
    expertise === null ||
    ownershipValue === null ||
    cursor === null
  ) {
    return response.status(400).json({ error: "Invalid discovery query." });
  }
  const ownership = ownershipParameter(ownershipValue);
  if (ownershipValue && !ownership) {
    return response.status(400).json({ error: "Invalid ownership level." });
  }
  const limit = await enforceRateLimit(request, "discovery", 120, 60);
  if (!limit.allowed) return sendRateLimit(response, limit);
  const expertiseSearch = expertise.toLowerCase();

  const rows = await sql`
    SELECT owner_id, public_record
    FROM folio_records
    WHERE owner_id > ${cursor}
      AND JSONB_TYPEOF(public_record->'person') = 'object'
      AND JSONB_ARRAY_LENGTH(
        COALESCE(public_record->'claims', '[]'::JSONB)
      ) > 0
      AND (
        ${query} = ''
        OR search_vector @@ websearch_to_tsquery('english', ${query})
      )
      AND (
        ${expertiseSearch} = ''
        OR expertise @> ARRAY[${expertiseSearch}]::TEXT[]
      )
      AND (
        ${ownershipValue} = ''
        OR ownership_levels @> ARRAY[${ownershipValue}]::TEXT[]
      )
    ORDER BY owner_id
    LIMIT ${PAGE_SIZE + 1}
  `;
  const items = rows
    .slice(0, PAGE_SIZE)
    .flatMap((row): DiscoveryResult[] => {
      const record = normalizeKleosRecord(row.public_record);
      const claim = record
        ? matchingClaim(record, query, ownership)
        : null;
      return record && claim ? [{ person: record.person, claim }] : [];
    });
  const extra = rows.at(PAGE_SIZE);
  const lastOwnerId = rows.at(PAGE_SIZE - 1)?.owner_id;
  const page: ResultPage<DiscoveryResult> = {
    items,
    nextCursor:
      extra && typeof lastOwnerId === "string" ? lastOwnerId : undefined,
  };
  response.setHeader("Cache-Control", "public, max-age=30");
  response.setHeader(
    "Vercel-CDN-Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=120",
  );
  return response.status(200).json(page);
}

export default observed("discover", handler);
