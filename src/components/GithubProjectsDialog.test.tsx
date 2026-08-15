// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeaturedProject } from "../types";
import { GithubProjectsDialog } from "./GithubProjectsDialog";

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
  reauthorizeExternalAccount: vi.fn(),
  useReverification: vi.fn(),
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ getToken: clerk.getToken }),
  useReverification: clerk.useReverification,
  useUser: () => ({
    user: {
      createExternalAccount: clerk.createExternalAccount,
      externalAccounts: clerk.externalAccounts,
    },
  }),
}));

function githubAccount(
  overrides: Partial<MockExternalAccount> = {},
): MockExternalAccount {
  return {
    destroy: clerk.destroyExternalAccount,
    provider: "github",
    reauthorize: clerk.reauthorizeExternalAccount,
    ...overrides,
  };
}

function connectedGithubAccount(username: string): MockExternalAccount {
  return githubAccount({ username, verification: { status: "verified" } });
}

function renderDialog(props: { projects?: readonly FeaturedProject[] } = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onSave = vi.fn(
    async (_github: string, _projects: FeaturedProject[]) => true,
  );
  const onCancel = vi.fn();
  return {
    onCancel,
    onSave,
    root,
    render: () =>
      act(async () =>
        root.render(
          <GithubProjectsDialog
            projects={props.projects ?? []}
            saveError=""
            saving={false}
            onCancel={onCancel}
            onSave={onSave}
          />,
        ),
      ),
  };
}

function buttonWithText(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text),
  );
}

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("GithubProjectsDialog", () => {
  afterEach(() => {
    document.body.replaceChildren();
    clerk.externalAccounts = [];
    vi.clearAllMocks();
  });

  it("uses Clerk reverification before it connects GitHub", async () => {
    clerk.useReverification.mockImplementation((operation) => operation);
    clerk.createExternalAccount.mockResolvedValue({});
    const dialog = renderDialog();

    await dialog.render();
    const connect = buttonWithText("Connect your GitHub account");
    expect(connect).toBeDefined();

    await act(async () => connect?.click());

    expect(clerk.useReverification).toHaveBeenCalled();
    expect(clerk.createExternalAccount).toHaveBeenCalledWith({
      strategy: "oauth_github",
      redirectUrl: window.location.href,
    });

    act(() => dialog.root.unmount());
  });

  it("reauthorizes an incomplete GitHub connection", async () => {
    clerk.useReverification.mockImplementation((operation) => operation);
    clerk.reauthorizeExternalAccount.mockResolvedValue({});
    clerk.externalAccounts = [githubAccount()];
    const dialog = renderDialog();

    await dialog.render();
    await act(async () => buttonWithText("Connect your GitHub account")?.click());

    expect(clerk.reauthorizeExternalAccount).toHaveBeenCalledWith({
      redirectUrl: window.location.href,
    });
    expect(clerk.createExternalAccount).not.toHaveBeenCalled();

    act(() => dialog.root.unmount());
  });

  it("clears profile data before it removes the Clerk connection", async () => {
    clerk.useReverification.mockImplementation((operation) => operation);
    clerk.destroyExternalAccount.mockResolvedValue(undefined);
    clerk.externalAccounts = [connectedGithubAccount("gholtzap")];
    const dialog = renderDialog();

    await dialog.render();
    await act(async () => buttonWithText("Disconnect GitHub")?.click());

    expect(dialog.onSave).toHaveBeenCalledWith("", []);
    expect(clerk.destroyExternalAccount).toHaveBeenCalled();
    expect(dialog.onSave.mock.invocationCallOrder[0]).toBeLessThan(
      clerk.destroyExternalAccount.mock.invocationCallOrder[0] ?? 0,
    );
    expect(dialog.onCancel).toHaveBeenCalled();

    act(() => dialog.root.unmount());
  });

  it("reads the verified account from the Clerk connection", async () => {
    clerk.useReverification.mockImplementation((operation) => operation);
    clerk.externalAccounts = [connectedGithubAccount("gholtzap")];
    const dialog = renderDialog();

    await dialog.render();

    expect(document.body.textContent).toContain("@gholtzap");
    expect(buttonWithText("Connect your GitHub account")).toBeUndefined();

    act(() => dialog.root.unmount());
  });
});
