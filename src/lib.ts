import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Person } from "./types";

const DEFAULT_HEAP_CEILING_BYTES = 512 * 1024 * 1024;
const HEAP_LIMIT_RATIO = 0.85;

export interface HeapSnapshot {
  usedJSHeapSize: number;
  jsHeapSizeLimit?: number;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function heapUsageIsUnsafe(
  snapshot: HeapSnapshot,
  ceilingBytes = DEFAULT_HEAP_CEILING_BYTES,
) {
  const browserLimit = snapshot.jsHeapSizeLimit
    ? snapshot.jsHeapSizeLimit * HEAP_LIMIT_RATIO
    : Number.POSITIVE_INFINITY;
  return snapshot.usedJSHeapSize >= Math.min(ceilingBytes, browserLimit);
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function parseCommaSeparatedList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function emptyProfile(id: string, name: string): Person {
  return {
    id,
    name,
    initials: initials(name),
    role: "Folio member",
    location: "",
    summary: "",
    expertise: [],
    interests: [],
    availability: [],
    notOpenTo: [],
    preferredLocations: [],
    compensationPreference: "",
    identityVerified: false,
    employmentVerified: false,
    relationship: "You",
    accent: "sage",
  };
}
