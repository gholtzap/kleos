// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyProfileRecord } from "../profile-record";
import type { KleosRecord } from "../types";
import { SettingsPage } from "./SettingsPage";

interface MockExternalAccount {
  destroy: () => Promise<void>;
  provider: string;
  reauthorize: (params: { redirectUrl: string }) => Promise<object>;
  username?: string;
  verification?: { status: string };
}

const clerk = vi.hoisted(() => ({
  createExternalAccount: vi.fn(),
  destroyExternalAccount: vi.fn(),
  externalAccounts: [] as MockExternalAccount[],
  getToken: vi.fn(async () => "session-token"),
  passwordEnabled: false,
  reauthorizeExternalAccount: vi.fn(),
  signOut: vi.fn(),
  useReverification: vi.fn((operation: unknown) => operation),
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ getToken: clerk.getToken }),
  useClerk: () => ({ signOut: clerk.signOut }),
  useReverification: clerk.useReverification,
  useUser: () => ({
    user: {
      createExternalAccount: clerk.createExternalAccount,
      externalAccounts: clerk.externalAccounts,
      passwordEnabled: clerk.passwordEnabled,
      primaryEmailAddress: { emailAddress: "ada@example.com" },
    },
  }),
}));

const account = { id: "user-ada", name: "Ada Lovelace", handle: "@ada" };

let stored: KleosRecord | null = null;
let saved: KleosRecord[] = [];

function storedResponse(): Response {
  return stored
    ? new Response(JSON.stringify(stored), { status: 200 })
    : new Response("{}", { status: 404 });
}

function connection(
  provider: string,
  overrides: Partial<MockExternalAccount> = {},
): MockExternalAccount {
  return {
    destroy: clerk.destroyExternalAccount,
    provider,
    reauthorize: clerk.reauthorizeExternalAccount,
    verification: { status: "verified" },
    ...overrides,
  };
}

function rowFor(label: string): HTMLLIElement | undefined {
  return Array.from(document.querySelectorAll("li")).find((row) =>
    row.querySelector("strong")?.textContent?.startsWith(label),
  );
}

function buttonIn(row: HTMLLIElement | undefined, text: string) {
  return Array.from(row?.querySelectorAll("button") ?? []).find((button) =>
    button.textContent?.includes(text),
  );
}

async function renderSettings(): Promise<Root> {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<SettingsPage account={account} />));
  return root;
}

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  stored = emptyProfileRecord(account);
  saved = [];
  window.history.replaceState(null, "", "/settings");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: string, init?: RequestInit) => {
      if (init?.method !== "PUT") return storedResponse();
      const record = JSON.parse(String(init.body)) as KleosRecord;
      saved.push(record);
      stored = { ...record, revision: record.revision + 1 };
      return new Response(JSON.stringify(stored), { status: 200 });
    }),
  );
});

afterEach(() => {
  document.body.replaceChildren();
  clerk.externalAccounts = [];
  clerk.passwordEnabled = false;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SettingsPage", () => {
  it("lists every provider with its connection state", async () => {
    clerk.externalAccounts = [connection("github", { username: "ada" })];
    const root = await renderSettings();

    expect(rowFor("GitHub")?.textContent).toContain("Connected · @ada");
    expect(rowFor("Google")?.textContent).toContain("Not connected");
    expect(buttonIn(rowFor("Google"), "Connect")).toBeDefined();
    expect(document.body.textContent).toContain("ada@example.com");

    act(() => root.unmount());
  });

  it("starts an OAuth flow that returns to the settings page", async () => {
    clerk.createExternalAccount.mockResolvedValue({});
    const root = await renderSettings();

    await act(async () => buttonIn(rowFor("Google"), "Connect")?.click());

    expect(clerk.createExternalAccount).toHaveBeenCalledWith({
      strategy: "oauth_google",
      redirectUrl: `${window.location.origin}/settings?connected=google`,
    });

    act(() => root.unmount());
  });

  it("saves the proven handle when an X connection returns", async () => {
    clerk.externalAccounts = [connection("x", { username: "adalovelace" })];
    window.history.replaceState(null, "", "/settings?connected=x");
    const root = await renderSettings();

    expect(saved).toHaveLength(1);
    expect(saved[0]?.person.x).toBe("adalovelace");
    expect(window.location.search).toBe("");
    expect(document.body.textContent).toContain("X connected.");

    act(() => root.unmount());
  });

  it("writes nothing when the returning provider proves no handle", async () => {
    clerk.externalAccounts = [
      connection("google", { username: null as unknown as undefined }),
    ];
    window.history.replaceState(null, "", "/settings?connected=google");
    const root = await renderSettings();

    expect(saved).toEqual([]);
    expect(document.body.textContent).toContain("Google connected.");

    act(() => root.unmount());
  });

  it("clears the profile handle before it drops the connection", async () => {
    clerk.externalAccounts = [
      connection("x", { username: "adalovelace" }),
      connection("google"),
    ];
    if (stored) stored.person.x = "adalovelace";
    let savesBeforeDestroy = 0;
    clerk.destroyExternalAccount.mockImplementation(async () => {
      savesBeforeDestroy = saved.length;
    });
    const root = await renderSettings();

    await act(async () => buttonIn(rowFor("X"), "Disconnect")?.click());

    expect(saved[0]?.person.x).toBeUndefined();
    expect(clerk.destroyExternalAccount).toHaveBeenCalled();
    expect(savesBeforeDestroy).toBe(1);

    act(() => root.unmount());
  });

  it("holds the only sign-in method in place", async () => {
    clerk.externalAccounts = [connection("github", { username: "ada" })];
    const root = await renderSettings();

    expect(buttonIn(rowFor("GitHub"), "Disconnect")?.disabled).toBe(true);

    act(() => root.unmount());
  });

  it("releases the disconnect once a password can sign the member in", async () => {
    clerk.externalAccounts = [connection("github", { username: "ada" })];
    clerk.passwordEnabled = true;
    const root = await renderSettings();

    expect(buttonIn(rowFor("GitHub"), "Disconnect")?.disabled).toBe(false);

    act(() => root.unmount());
  });
});
