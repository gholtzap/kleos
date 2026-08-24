// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyProfileRecord } from "../profile-identity";
import type { KleosRecord } from "../types";
import {
  OnboardingView,
  type OnboardingViewProps,
} from "./OnboardingView";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const account = { id: "user_1", name: "Jordan Reyes", handle: "@jordan" };

function reviewDraft(): KleosRecord {
  const record = emptyProfileRecord(account);
  record.person.expertise = ["Rust", "TypeScript"];
  record.experience = [
    {
      id: "exp-1",
      title: "Firmware Engineer",
      organization: "Evergreen Robotics",
      start: "2023-01",
      highlights: ["Shipped the motor control loop"],
    },
  ];
  record.education = [
    {
      id: "edu-1",
      school: "Falls City College",
      degree: "B.A. History",
      start: "",
      end: undefined,
    },
  ];
  return record;
}

function viewProps(
  overrides: Partial<OnboardingViewProps>,
): OnboardingViewProps {
  return {
    firstName: "Jordan",
    draft: null,
    resumeFileName: "",
    resumeGithub: "",
    ready: true,
    parsingResume: false,
    importingGithub: false,
    connectingGithub: false,
    saving: false,
    error: "",
    onImportResume: () => {},
    onImportGithub: () => {},
    onPatchPerson: () => {},
    onPatchEducation: () => {},
    onRemoveEntry: () => {},
    onRemoveSkill: () => {},
    onAddSkill: () => {},
    onRemoveProject: () => {},
    onSave: () => {},
    ...overrides,
  };
}

describe("OnboardingView", () => {
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    document.body.replaceChildren();
  });

  function render(props: OnboardingViewProps): HTMLElement {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(<OnboardingView {...props} />));
    return container;
  }

  function buttonByText(
    container: HTMLElement,
    text: string,
  ): HTMLButtonElement {
    const button = [...container.querySelectorAll("button")].find((candidate) =>
      candidate.textContent?.includes(text),
    );
    if (!button) throw new Error(`Missing button: ${text}`);
    return button;
  }

  it("leads with both imports and starts them on click", () => {
    const onImportResume = vi.fn();
    const onImportGithub = vi.fn();
    const container = render(
      viewProps({ onImportResume, onImportGithub }),
    );

    expect(container.textContent).toContain("Welcome to Kleos, Jordan.");
    act(() => buttonByText(container, "Import from resume").click());
    act(() => buttonByText(container, "Import from GitHub").click());
    expect(onImportResume).toHaveBeenCalledOnce();
    expect(onImportGithub).toHaveBeenCalledOnce();
  });

  it("holds the imports until the stored record has loaded", () => {
    const container = render(viewProps({ ready: false }));
    expect(
      buttonByText(container, "Import from resume").disabled,
    ).toBe(true);
    expect(
      buttonByText(container, "Import from GitHub").disabled,
    ).toBe(true);
  });

  it("shows what an import found and edits reach the draft", () => {
    const onRemoveSkill = vi.fn();
    const onPatchEducation = vi.fn();
    const onSave = vi.fn();
    const container = render(
      viewProps({
        draft: reviewDraft(),
        resumeFileName: "resume.pdf",
        onRemoveSkill,
        onPatchEducation,
        onSave,
      }),
    );

    expect(container.textContent).toContain("Resume · resume.pdf");
    expect(container.textContent).toContain("Firmware Engineer");

    act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Remove Rust"]')
        ?.click(),
    );
    expect(onRemoveSkill).toHaveBeenCalledWith("Rust");

    const startYear = [
      ...container.querySelectorAll<HTMLInputElement>("input"),
    ].find((input) => input.closest("label")?.textContent?.includes("Start year"));
    if (!startYear) throw new Error("Missing start year input.");
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(startYear, "2019x");
      startYear.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onPatchEducation).toHaveBeenCalledWith("edu-1", { start: "2019" });

    act(() => buttonByText(container, "Save your profile").click());
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("prompts to verify a GitHub handle the resume mentioned", () => {
    const container = render(
      viewProps({ draft: reviewDraft(), resumeGithub: "jordanreyes" }),
    );
    expect(container.textContent).toContain(
      "Your resume lists github.com/jordanreyes",
    );
    expect(buttonByText(container, "Connect GitHub")).toBeDefined();
  });

  it("shows the verified handle and featured projects after a GitHub import", () => {
    const draft = reviewDraft();
    draft.person.github = "jordanreyes";
    draft.projects = [
      {
        id: "github:jordanreyes/pgqueue",
        owner: "jordanreyes",
        name: "pgqueue",
        description: "",
        topics: [],
        stars: 3,
        forks: 0,
        syncedAt: "2026-08-24T00:00:00.000Z",
      },
    ];
    const onRemoveProject = vi.fn();
    const container = render(viewProps({ draft, onRemoveProject }));

    expect(container.textContent).toContain("GitHub · @jordanreyes");
    act(() =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Remove jordanreyes/pgqueue"]',
        )
        ?.click(),
    );
    expect(onRemoveProject).toHaveBeenCalledWith("github:jordanreyes/pgqueue");
  });
});
