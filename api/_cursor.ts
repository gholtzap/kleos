export interface DescendingCursor {
  at: string;
  id: string;
}

export function encodeDescendingCursor(cursor: DescendingCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeDescendingCursor(value: string): DescendingCursor | null {
  if (!value || value.length > 500) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("at" in decoded) ||
      typeof decoded.at !== "string" ||
      Number.isNaN(Date.parse(decoded.at)) ||
      !("id" in decoded) ||
      typeof decoded.id !== "string" ||
      decoded.id.length > 200
    ) {
      return null;
    }
    return { at: new Date(decoded.at).toISOString(), id: decoded.id };
  } catch {
    return null;
  }
}
