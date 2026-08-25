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
    onPatchExperience: () => {},
    onPatchEducation: () => {},
    onPatchCertification: () => {},
    onPatchOther: () => {},
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

  function fieldByLabel(
    container: HTMLElement,
    label: string,
  ): HTMLInputElement | HTMLTextAreaElement {
    const field = [
      ...container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input, textarea",
      ),
    ].find((candidate) =>
      candidate.closest("label")?.textContent?.includes(label),
    );
    if (!field) throw new Error(`Missing field: ${label}`);
    return field;
  }

  /** Types into a controlled field the way React sees real input. */
  function typeInto(
    field: HTMLInputElement | HTMLTextAreaElement,
    value: string,
  ) {
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        field instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(field, value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
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

    typeInto(fieldByLabel(container, "Start year"), "2019x");
    expect(onPatchEducation).toHaveBeenCalledWith("edu-1", { start: "2019" });

    act(() => buttonByText(container, "Save your profile").click());
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("opens every field of an experience entry for editing", () => {
    const onPatchExperience = vi.fn();
    const container = render(
      viewProps({ draft: reviewDraft(), onPatchExperience }),
    );

    // Collapsed rows summarize; the fields appear once the entry is opened.
    expect(container.querySelector('[aria-label="Edit Firmware Engineer"]'))
      .toBeDefined();
    act(() =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Edit Firmware Engineer"]',
        )
        ?.click(),
    );

    typeInto(fieldByLabel(container, "Organization"), "Evergreen Labs");
    expect(onPatchExperience).toHaveBeenCalledWith("exp-1", {
      organization: "Evergreen Labs",
    });

    typeInto(
      fieldByLabel(container, "Highlights"),
      "Shipped the motor control loop\nCut boot time in half",
    );
    expect(onPatchExperience).toHaveBeenCalledWith("exp-1", {
      highlights: ["Shipped the motor control loop", "Cut boot time in half"],
    });

    typeInto(fieldByLabel(container, "End"), "2024-03");
    expect(onPatchExperience).toHaveBeenCalledWith("exp-1", {
      end: "2024-03",
    });
  });

  it("keeps an education entry without years open until they are added", () => {
    const container = render(viewProps({ draft: reviewDraft() }));
    // No click needed: the dateless entry's editor is already showing.
    expect(fieldByLabel(container, "School").value).toBe("Falls City College");
    expect(container.textContent).toContain(
      "Your resume did not state the years",
    );
    const pencil = container.querySelector<HTMLButtonElement>(
      '[aria-label="Edit Falls City College"]',
    );
    expect(pencil?.disabled).toBe(true);
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
