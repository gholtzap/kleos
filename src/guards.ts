/**
 * Narrowing primitives shared by every boundary normalizer. They live apart from
 * any one domain so that modules which only need to check a shape do not have to
 * depend on the Kleos record to get one.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function includesValue<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return typeof value === "string" && values.some((item) => item === value);
}
