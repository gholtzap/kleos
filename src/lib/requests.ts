import {
  includesValue,
  isRecord,
  isStringArray,
} from "./kleos.js";
import type {
  NewProfessionalRequest,
  RequestKind,
} from "../types/index.js";

export const requestKinds: readonly RequestKind[] = [
  "Hiring",
  "Advice",
  "Contract",
  "Collaboration",
  "Research",
];

export function normalizeNewProfessionalRequest(
  value: unknown,
): NewProfessionalRequest | null {
  if (
    !isRecord(value) ||
    !includesValue(requestKinds, value.kind) ||
    !isStringArray(value.experience) ||
    typeof value.title !== "string" ||
    typeof value.need !== "string" ||
    typeof value.commitment !== "string" ||
    typeof value.compensation !== "string" ||
    typeof value.constraints !== "string" ||
    typeof value.preferredEvidence !== "string"
  ) {
    return null;
  }
  const request: NewProfessionalRequest = {
    kind: value.kind,
    title: value.title.trim(),
    need: value.need.trim(),
    experience: value.experience.map((item) => item.trim()),
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
