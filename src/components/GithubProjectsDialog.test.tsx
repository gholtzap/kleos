// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubProjectsDialog } from "./GithubProjectsDialog";

const clerk = vi.hoisted(() => ({
  createExternalAccount: vi.fn(),
  createExternalAccountWithReverification: vi.fn(),
  useReverification: vi.fn(),
}));

vi.mock("@clerk/react", () => ({
  useReverification: clerk.useReverification,
  useUser: () => ({ user: { createExternalAccount: clerk.createExternalAccount } }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("GithubProjectsDialog", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("uses Clerk reverification before it connects GitHub", async () => {
    clerk.useReverification.mockReturnValue(
      clerk.createExternalAccountWithReverification,
    );
    clerk.createExternalAccountWithReverification.mockResolvedValue({});
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(
      <GithubProjectsDialog
        github=""
        projects={[]}
        saveError=""
        saving={false}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    ));
    const connect = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Connect your GitHub account"),
    );
    expect(connect).toBeDefined();

    await act(async () => connect?.click());

    expect(clerk.useReverification).toHaveBeenCalled();
    expect(clerk.createExternalAccountWithReverification).toHaveBeenCalledWith({
      strategy: "oauth_github",
      redirectUrl: window.location.href,
    });
    expect(clerk.createExternalAccount).not.toHaveBeenCalled();

    act(() => root.unmount());
  });
});
