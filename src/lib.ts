import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Person } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
