import { describe, expect, it } from "vitest";
import { currentPerson, initialClaims } from "./data";
import {
  discoveryProjection,
  kleosRecordContentIsValid,
  mergeOwnerKleosRecord,
  normalizeKleosRecord,
  reviewKleosRecord,
} from "./kleos";
import {
  compareExperience,
  currentExperience,
  experiencePeriod,
  formatMonth,
  yearRange,
} from "./profile-sections";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  KleosRecord,
  OtherExperienceEntry,
} from "./types";

const experienceEntry: ExperienceEntry = {
  id: "exp-1",
  title: "Senior infrastructure engineer",
  organization: "Meridian",
  employmentType: "Full-time",
  location: "New York",
  start: "2023-03",
  highlights: ["Rewrote the settlement queue; checkout p99 fell 62%."],
};

const educationEntry: EducationEntry = {
  id: "edu-1",
  school: "Cornell University",
  degree: "BS, Computer Science",
  start: "2017",
  end: "2021",
};

const certificationEntry: CertificationEntry = {
  id: "cert-1",
  name: "CKA: Certified Kubernetes Administrator",
  issuer: "Cloud Native Computing Foundation",
  issued: "2023",
  expires: "2026",
};

const otherEntry: OtherExperienceEntry = {
  id: "other-1",
  title: "Speaker — PGConf NYC",
  detail: '"Queues on plain Postgres"',
  period: "2025",
};

function sampleRecord(overrides: Partial<KleosRecord> = {}): KleosRecord {
  return {
    version: 1,
    revision: 0,
    person: currentPerson,
    claims: initialClaims,
    projects: [],
    experience: [experienceEntry],
    education: [educationEntry],
    certifications: [certificationEntry],
    otherExperience: [otherEntry],
    ...overrides,
  };
}

describe("profile section normalization", () => {
  it("tolerates legacy records without the section arrays", () => {
    const legacy = normalizeKleosRecord({
      version: 1,
      revision: 3,
      person: currentPerson,
      claims: initialClaims,
    });
    expect(legacy?.experience).toEqual([]);
    expect(legacy?.education).toEqual([]);
    expect(legacy?.certifications).toEqual([]);
    expect(legacy?.otherExperience).toEqual([]);
  });

  it("rejects malformed section entries and shapes", () => {
    const record = sampleRecord();
    expect(normalizeKleosRecord(record)).toEqual(record);
    expect(
      normalizeKleosRecord({ ...record, experience: [{ id: 1 }] }),
    ).toBeNull();
    expect(normalizeKleosRecord({ ...record, education: "nope" })).toBeNull();
    expect(
      normalizeKleosRecord({
        ...record,
        certifications: [{ ...certificationEntry, issued: 2023 }],
      }),
    ).toBeNull();
  });
});

describe("profile section validation", () => {
  it("accepts a full record and enforces dates, ids, and caps", () => {
    expect(kleosRecordContentIsValid(sampleRecord())).toBe(true);
    expect(
      kleosRecordContentIsValid(
        sampleRecord({
          experience: [{ ...experienceEntry, start: "2023-13" }],
        }),
      ),
    ).toBe(false);
    expect(
      kleosRecordContentIsValid(
        sampleRecord({
          experience: [{ ...experienceEntry, end: "2022-01" }],
        }),
      ),
    ).toBe(false);
    expect(
      kleosRecordContentIsValid(
        sampleRecord({ experience: [experienceEntry, experienceEntry] }),
      ),
    ).toBe(false);
    expect(
      kleosRecordContentIsValid(
        sampleRecord({ education: [{ ...educationEntry, start: "17" }] }),
      ),
    ).toBe(false);
    expect(
      kleosRecordContentIsValid(
        sampleRecord({ otherExperience: [{ ...otherEntry, title: "  " }] }),
      ),
    ).toBe(false);
    const tooMany = Array.from({ length: 31 }, (_, index) => ({
      ...experienceEntry,
      id: `exp-${index}`,
    }));
    expect(kleosRecordContentIsValid(sampleRecord({ experience: tooMany }))).toBe(
      false,
    );
  });

  it("validates the person website and x handle", () => {
    expect(
      kleosRecordContentIsValid(
        sampleRecord({
          person: { ...currentPerson, website: "https://example.com" },
        }),
      ),
    ).toBe(true);
    expect(
      kleosRecordContentIsValid(
        sampleRecord({
          person: { ...currentPerson, website: "javascript:alert(1)" },
        }),
      ),
    ).toBe(false);
    expect(
      kleosRecordContentIsValid(
        sampleRecord({ person: { ...currentPerson, x: "fake_person" } }),
      ),
    ).toBe(true);
    expect(
      kleosRecordContentIsValid(
        sampleRecord({ person: { ...currentPerson, x: "not a handle" } }),
      ),
    ).toBe(false);
  });
});

describe("profile sections through record flows", () => {
  it("keeps sections through merge and public projection, strips for review", () => {
    const submitted = sampleRecord();
    const merged = mergeOwnerKleosRecord(null, submitted, "owner-1");
    expect(merged.experience).toEqual(submitted.experience);
    expect(merged.education).toEqual(submitted.education);
    expect(merged.certifications).toEqual(submitted.certifications);
    expect(merged.otherExperience).toEqual(submitted.otherExperience);

    const review = reviewKleosRecord(submitted, [], []);
    expect(review.experience).toEqual([]);
    expect(review.education).toEqual([]);
    expect(review.certifications).toEqual([]);
    expect(review.otherExperience).toEqual([]);

    const projection = discoveryProjection(submitted);
    expect(projection.searchText).toContain("Meridian");
    expect(projection.searchText).toContain("Cornell University");
    expect(projection.searchText).toContain("Kubernetes Administrator");
    expect(projection.searchText).toContain("PGConf NYC");
  });
});

describe("profile section formatting", () => {
  it("formats months, ranges, and durations", () => {
    expect(formatMonth("2023-03")).toBe("Mar 2023");
    expect(yearRange("2017", "2021")).toBe("2017 – 2021");
    expect(yearRange("2024", undefined)).toBe("2024 – Present");
    expect(
      experiencePeriod(
        { ...experienceEntry, end: "2024-02" },
        new Date(2026, 7, 14),
      ),
    ).toBe("Mar 2023 – Feb 2024 · 1 yr");
    expect(experiencePeriod(experienceEntry, new Date(2026, 7, 14))).toBe(
      "Mar 2023 – Present · 3 yrs 6 mos",
    );
  });

  it("orders experience with current roles first, then most recent", () => {
    const past: ExperienceEntry = {
      ...experienceEntry,
      id: "exp-2",
      start: "2021-07",
      end: "2023-02",
    };
    const older: ExperienceEntry = {
      ...experienceEntry,
      id: "exp-3",
      start: "2020-06",
      end: "2020-09",
    };
    const sorted = [older, experienceEntry, past].sort(compareExperience);
    expect(sorted.map((entry) => entry.id)).toEqual([
      "exp-1",
      "exp-2",
      "exp-3",
    ]);
    expect(currentExperience([older, past, experienceEntry])?.id).toBe("exp-1");
  });
});
