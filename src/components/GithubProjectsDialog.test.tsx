// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubProjectsDialog } from "./GithubProjectsDialog";

const clerk = vi.hoisted(() => ({
  createExternalAccount: vi.fn(),
  destroyExternalAccount: vi.fn(),
  externalAccounts: [] as Array<{
    destroy: () => Promise<void>;
    provider: "github";
    reauthorize: (params: { redirectUrl: string }) => Promise<object>;
  }>,
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
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(
      <GithubProjectsDialog
        projects={[]}
        saveError=""
        saving={false}
        onCancel={vi.fn()}
        onSave={vi.fn(async () => true)}
      />,
    ));
    const connect = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Connect your GitHub account"),
    );
    expect(connect).toBeDefined();

    await act(async () => connect?.click());

    expect(clerk.useReverification).toHaveBeenCalled();
    expect(clerk.createExternalAccount).toHaveBeenCalledWith({
      strategy: "oauth_github",
      redirectUrl: window.location.href,
    });

    act(() => root.unmount());
  });

  it("reauthorizes an incomplete GitHub connection", async () => {
    clerk.useReverification.mockImplementation((operation) => operation);
    clerk.reauthorizeExternalAccount.mockResolvedValue({});
    const githubAccount = {
      destroy: clerk.destroyExternalAccount,
      provider: "github" as const,
      reauthorize: clerk.reauthorizeExternalAccount,
    };
    clerk.externalAccounts = [githubAccount];
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(
      <GithubProjectsDialog
        githubAccount={githubAccount}
        projects={[]}
        saveError=""
        saving={false}
        onCancel={vi.fn()}
        onSave={vi.fn(async () => true)}
      />,
    ));
    const connect = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Connect your GitHub account"),
    );
    await act(async () => connect?.click());

    expect(clerk.reauthorizeExternalAccount).toHaveBeenCalledWith({
      redirectUrl: window.location.href,
    });
    expect(clerk.createExternalAccount).not.toHaveBeenCalled();

    act(() => root.unmount());
  });

  it("clears profile data before it removes the Clerk connection", async () => {
    clerk.useReverification.mockImplementation((operation) => operation);
    clerk.destroyExternalAccount.mockResolvedValue(undefined);
    const githubAccount = {
      destroy: clerk.destroyExternalAccount,
      provider: "github" as const,
      reauthorize: clerk.reauthorizeExternalAccount,
    };
    clerk.externalAccounts = [githubAccount];
    const onSave = vi.fn(async () => true);
    const onCancel = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(
      <GithubProjectsDialog
        githubAccount={githubAccount}
        verifiedGithub="gholtzap"
        projects={[]}
        saveError=""
        saving={false}
        onCancel={onCancel}
        onSave={onSave}
      />,
    ));
    const disconnect = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Disconnect GitHub"),
    );
    await act(async () => disconnect?.click());

    expect(onSave).toHaveBeenCalledWith("", []);
    expect(clerk.destroyExternalAccount).toHaveBeenCalled();
    expect(onSave.mock.invocationCallOrder[0]).toBeLessThan(
      clerk.destroyExternalAccount.mock.invocationCallOrder[0] ?? 0,
    );
    expect(onCancel).toHaveBeenCalled();

    act(() => root.unmount());
  });
});
