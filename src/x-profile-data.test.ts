// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  dummyProfileDetails,
  loadEditableProfile,
  saveEditableProfile,
} from "./x-profile-data";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

vi.stubGlobal("localStorage", new MemoryStorage());

describe("Editable profile storage", () => {
  beforeEach(() => localStorage.clear());

  it("stores profile edits by account handle and rejects invalid data", () => {
    expect(loadEditableProfile("@ada")).toEqual({
      bio: dummyProfileDetails.bio,
      website: dummyProfileDetails.website,
    });

    saveEditableProfile("@ada", {
      bio: "A saved biography.",
      website: "ada.example",
    });
    expect(loadEditableProfile("@ada")).toEqual({
      bio: "A saved biography.",
      website: "ada.example",
    });
    expect(loadEditableProfile("@grace")).toEqual({
      bio: dummyProfileDetails.bio,
      website: dummyProfileDetails.website,
    });

    localStorage.setItem("kleos:x-profile:@ada", "{} ");
    expect(loadEditableProfile("@ada")).toEqual({
      bio: dummyProfileDetails.bio,
      website: dummyProfileDetails.website,
    });
  });

  it("reads profiles saved under the previous brand key", () => {
    localStorage.setItem(
      "folio:x-profile:@ada",
      JSON.stringify({ bio: "Existing biography.", website: "ada.example" }),
    );

    expect(loadEditableProfile("@ada")).toEqual({
      bio: "Existing biography.",
      website: "ada.example",
    });
  });
});
