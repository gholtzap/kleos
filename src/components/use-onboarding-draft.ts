import { useState } from "react";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  KleosRecord,
  OtherExperienceEntry,
  Person,
} from "../types";
import type { OnboardingEntrySection } from "./OnboardingView";

export interface OnboardingDraftStore {
  /** Null until an import seeds it; the review step exists only after that. */
  draft: KleosRecord | null;
  /** Replaces the draft wholesale — how imports land. */
  applyImport: (next: (current: KleosRecord | null) => KleosRecord) => void;
  patchPerson: (updates: Partial<Person>) => void;
  patchExperience: (id: string, updates: Partial<ExperienceEntry>) => void;
  patchEducation: (id: string, updates: Partial<EducationEntry>) => void;
  patchCertification: (id: string, updates: Partial<CertificationEntry>) => void;
  patchOther: (id: string, updates: Partial<OtherExperienceEntry>) => void;
  removeEntry: (section: OnboardingEntrySection, id: string) => void;
  removeSkill: (value: string) => void;
  addSkill: (value: string) => void;
  removeProject: (id: string) => void;
}

/**
 * The review draft an onboarding screen edits: every field patch, removal,
 * and skill change, over a record that only exists once an import seeds it.
 * `onEdit` fires before each change — the screen uses it to clear whatever
 * message the previous save attempt left.
 */
export function useOnboardingDraft(onEdit: () => void): OnboardingDraftStore {
  const [draft, setDraft] = useState<KleosRecord | null>(null);

  function patchDraft(patch: (current: KleosRecord) => KleosRecord) {
    onEdit();
    setDraft((current) => (current === null ? current : patch(current)));
  }

  return {
    draft,

    applyImport(next) {
      onEdit();
      setDraft(next);
    },

    patchPerson(updates) {
      patchDraft((current) => ({
        ...current,
        person: { ...current.person, ...updates },
      }));
    },

    patchExperience(id, updates) {
      patchDraft((current) => ({
        ...current,
        experience: current.experience.map((entry) =>
          entry.id === id ? { ...entry, ...updates } : entry,
        ),
      }));
    },

    patchEducation(id, updates) {
      patchDraft((current) => ({
        ...current,
        education: current.education.map((entry) =>
          entry.id === id ? { ...entry, ...updates } : entry,
        ),
      }));
    },

    patchCertification(id, updates) {
      patchDraft((current) => ({
        ...current,
        certifications: current.certifications.map((entry) =>
          entry.id === id ? { ...entry, ...updates } : entry,
        ),
      }));
    },

    patchOther(id, updates) {
      patchDraft((current) => ({
        ...current,
        otherExperience: current.otherExperience.map((entry) =>
          entry.id === id ? { ...entry, ...updates } : entry,
        ),
      }));
    },

    removeEntry(section, id) {
      patchDraft((current) => ({
        ...current,
        [section]: current[section].filter((entry) => entry.id !== id),
      }));
    },

    removeSkill(value) {
      patchDraft((current) => ({
        ...current,
        person: {
          ...current.person,
          expertise: current.person.expertise.filter(
            (skill) => skill !== value,
          ),
        },
      }));
    },

    addSkill(value) {
      patchDraft((current) => ({
        ...current,
        person: {
          ...current.person,
          expertise: current.person.expertise.some(
            (skill) => skill.toLowerCase() === value.toLowerCase(),
          )
            ? current.person.expertise
            : [...current.person.expertise, value],
        },
      }));
    },

    removeProject(id) {
      patchDraft((current) => ({
        ...current,
        projects: current.projects.filter((project) => project.id !== id),
      }));
    },
  };
}
