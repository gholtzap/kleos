import { isRecord, normalizeFolioRecord } from "./folio";
import type { DiscoveryResult, ResultPage } from "./types";

export function normalizeDiscoveryResult(
  value: unknown,
): DiscoveryResult | null {
  if (!isRecord(value)) return null;
  const record = normalizeFolioRecord({
    version: 1,
    revision: 0,
    person: value.person,
    claims: [value.claim],
  });
  const claim = record?.claims[0];
  return record && claim ? { person: record.person, claim } : null;
}

function normalizeDiscoveryPage(
  value: unknown,
): ResultPage<DiscoveryResult> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    (value.nextCursor !== undefined &&
      typeof value.nextCursor !== "string")
  ) {
    throw new Error("Invalid discovery page.");
  }
  const items = value.items.map(normalizeDiscoveryResult);
  if (items.some((item) => item === null)) {
    throw new Error("Invalid discovery page.");
  }
  return {
    items: items.filter((item): item is DiscoveryResult => item !== null),
    nextCursor: value.nextCursor,
  };
}

export async function discoverProfessionals(
  input: {
    query: string;
    expertise: string;
    ownership: string;
    cursor?: string;
  },
  signal?: AbortSignal,
): Promise<ResultPage<DiscoveryResult>> {
  const parameters = new URLSearchParams();
  if (input.query) parameters.set("q", input.query);
  if (input.expertise) parameters.set("expertise", input.expertise);
  if (input.ownership) parameters.set("ownership", input.ownership);
  if (input.cursor) parameters.set("cursor", input.cursor);
  const response = await fetch(`/api/discover?${parameters}`, { signal });
  if (!response.ok) throw new Error("Discovery request failed.");
  return normalizeDiscoveryPage(await response.json());
}
