import { isRecord, normalizePerson } from "./folio";
import type {
  NewProfessionalRequest,
  ProfessionalRequest,
  RequestKind,
  ResultPage,
} from "./types";

export const requestKinds: readonly RequestKind[] = [
  "Hiring",
  "Advice",
  "Contract",
  "Collaboration",
  "Research",
];

function isRequestKind(value: unknown): value is RequestKind {
  return (
    typeof value === "string" &&
    requestKinds.some((requestKind) => requestKind === value)
  );
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string")
    ? value
    : null;
}

export function normalizeNewProfessionalRequest(
  value: unknown,
): NewProfessionalRequest | null {
  if (
    !isRecord(value) ||
    !isRequestKind(value.kind) ||
    typeof value.title !== "string" ||
    typeof value.need !== "string" ||
    typeof value.commitment !== "string" ||
    typeof value.compensation !== "string" ||
    typeof value.constraints !== "string" ||
    typeof value.preferredEvidence !== "string"
  ) {
    return null;
  }
  const experience = stringArray(value.experience);
  if (!experience) return null;
  const request: NewProfessionalRequest = {
    kind: value.kind,
    title: value.title.trim(),
    need: value.need.trim(),
    experience: experience.map((item) => item.trim()),
    commitment: value.commitment.trim(),
    compensation: value.compensation.trim(),
    constraints: value.constraints.trim(),
    preferredEvidence: value.preferredEvidence.trim(),
  };
  return professionalRequestContentIsValid(request) ? request : null;
}

export function professionalRequestContentIsValid(
  request: NewProfessionalRequest,
): boolean {
  return (
    request.title.length > 0 &&
    request.title.length <= 300 &&
    request.need.length >= 25 &&
    request.need.length <= 5_000 &&
    request.experience.length <= 30 &&
    request.experience.every(
      (item) => item.length > 0 && item.length <= 200,
    ) &&
    request.commitment.length > 0 &&
    request.commitment.length <= 500 &&
    request.compensation.length > 0 &&
    request.compensation.length <= 500 &&
    request.constraints.length > 0 &&
    request.constraints.length <= 1_000 &&
    request.preferredEvidence.length > 0 &&
    request.preferredEvidence.length <= 1_000
  );
}

export function normalizeProfessionalRequest(
  value: unknown,
): ProfessionalRequest | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id.length > 200 ||
    typeof value.postedAt !== "string" ||
    Number.isNaN(Date.parse(value.postedAt))
  ) {
    return null;
  }
  const author = normalizePerson(value.author);
  const request = normalizeNewProfessionalRequest(value);
  if (!author || !request) return null;
  return {
    id: value.id,
    author,
    ...request,
    postedAt: new Date(value.postedAt).toISOString(),
  };
}

function normalizeRequestPage(value: unknown): ResultPage<ProfessionalRequest> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    (value.nextCursor !== undefined &&
      typeof value.nextCursor !== "string")
  ) {
    throw new Error("Invalid professional request page.");
  }
  const items = value.items.map(normalizeProfessionalRequest);
  if (items.some((item) => item === null)) {
    throw new Error("Invalid professional request page.");
  }
  return {
    items: items.filter(
      (item): item is ProfessionalRequest => item !== null,
    ),
    nextCursor: value.nextCursor,
  };
}

async function responseValue(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error("Professional request failed.");
  return response.json() as Promise<unknown>;
}

export async function getProfessionalRequests(
  token: string,
  kind: RequestKind | null,
  cursor?: string,
  signal?: AbortSignal,
): Promise<ResultPage<ProfessionalRequest>> {
  const parameters = new URLSearchParams();
  if (kind) parameters.set("kind", kind);
  if (cursor) parameters.set("cursor", cursor);
  const value = await responseValue(
    await fetch(`/api/requests?${parameters}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    }),
  );
  return normalizeRequestPage(value);
}

export async function createProfessionalRequest(
  token: string,
  input: NewProfessionalRequest,
): Promise<ProfessionalRequest> {
  const value = await responseValue(
    await fetch("/api/requests", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }),
  );
  const request = normalizeProfessionalRequest(value);
  if (!request) throw new Error("Invalid professional request.");
  return request;
}

export async function closeProfessionalRequest(
  token: string,
  id: string,
): Promise<void> {
  const response = await fetch(
    `/api/requests?id=${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) throw new Error("Could not close professional request.");
}

export function formatRequestDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}
