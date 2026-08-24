import { describe, expect, it } from "vitest";
import {
  featuredReposForImport,
  recordWithGithubImport,
  recordWithResumeImport,
} from "./onboarding.js";
import { emptyProfileRecord } from "./profile-identity.js";
import type { ResumeImport } from "./resume-import.js";
import type { GithubRepo } from "./github.js";

const account = { id: "user_1", name: "Jordan Reyes", handle: "@jordan" };

function emptyImport(): ResumeImport {
  return {
    name: "",
    role: "",
    location: "",
    summary: "",
    expertise: [],
    interests: [],
    experience: [],
    education: [],
    certifications: [],
    otherExperience: [],
  };
}

function repo(overrides: Partial<GithubRepo>): GithubRepo {
  return {
    owner: "jordanreyes",
    name: "repo",
    description: "",
    topics: [],
    stars: 0,
    forks: 0,
    isFork: false,
    isArchived: false,
    ...overrides,
  };
}

describe("recordWithResumeImport", () => {
  it("lays imported values over the record and restamps initials", () => {
    const imported = {
      ...emptyImport(),
      name: "Jordan A. Reyes",
      location: "Boston, MA",
      summary: "Engineer.",
      website: "https://jordanreyes.dev",
      expertise: ["Rust"],
      experience: [
        {
          id: "e1",
          title: "Firmware Engineer",
          organization: "Evergreen Robotics",
          start: "2023-01",
          end: undefined,
          highlights: [],
        },
      ],
    };
    const record = recordWithResumeImport(emptyProfileRecord(account), imported);
    expect(record.person).toMatchObject({
      name: "Jordan A. Reyes",
      initials: "JA",
      location: "Boston, MA",
      summary: "Engineer.",
      website: "https://jordanreyes.dev",
      expertise: ["Rust"],
    });
    expect(record.experience).toHaveLength(1);
  });

  it("derives the headline from the current position when the resume has none", () => {
    const imported = {
      ...emptyImport(),
      experience: [
        {
          id: "e1",
          title: "Past Analyst",
          organization: "Old Co",
          start: "2020-01",
          end: "2021-01",
          highlights: [],
        },
        {
          id: "e2",
          title: "Staff Engineer",
          organization: "Now Co",
          start: "2022-02",
          end: undefined,
          highlights: [],
        },
      ],
    };
    const record = recordWithResumeImport(emptyProfileRecord(account), imported);
    expect(record.person.role).toBe("Staff Engineer");
  });

  it("keeps existing sections when the import found nothing for them", () => {
    const base = emptyProfileRecord(account);
    base.person.summary = "Existing summary.";
    base.education = [
      { id: "ed1", school: "Falls City College", degree: "B.A.", start: "2018", end: "2022" },
    ];
    const record = recordWithResumeImport(base, {
      ...emptyImport(),
      expertise: ["Go"],
    });
    expect(record.person.summary).toBe("Existing summary.");
    expect(record.education).toHaveLength(1);
    expect(record.person.expertise).toEqual(["Go"]);
  });

  it("replaces a previous import instead of doubling it", () => {
    const imported = {
      ...emptyImport(),
      experience: [
        {
          id: "e1",
          title: "Engineer",
          organization: "Nimbus",
          start: "2024-01",
          end: undefined,
          highlights: [],
        },
      ],
    };
    const once = recordWithResumeImport(emptyProfileRecord(account), imported);
    const twice = recordWithResumeImport(once, imported);
    expect(twice.experience).toHaveLength(1);
  });

  it("never writes a github handle, which only a connection can prove", () => {
    const record = recordWithResumeImport(emptyProfileRecord(account), {
      ...emptyImport(),
      githubUsername: "jordanreyes",
    });
    expect(record.person.github).toBeUndefined();
  });
});

describe("featuredReposForImport", () => {
  it("features the most prominent original repositories", () => {
    const repos = [
      repo({ name: "small", stars: 1 }),
      repo({ name: "fork", stars: 900, isFork: true }),
      repo({ name: "archived", stars: 800, isArchived: true }),
      repo({ name: "big", stars: 500 }),
      ...Array.from({ length: 6 }, (_, index) =>
        repo({ name: `mid-${index}`, stars: 100 - index }),
      ),
    ];
    const featured = featuredReposForImport(repos);
    expect(featured).toHaveLength(6);
    expect(featured[0].name).toBe("big");
    expect(featured.map((item) => item.name)).not.toContain("fork");
    expect(featured.map((item) => item.name)).not.toContain("archived");
  });
});

describe("recordWithGithubImport", () => {
  it("writes the proven identity, projects, and repo languages", () => {
    const base = emptyProfileRecord(account);
    base.person.expertise = ["Rust", "python"];
    const record = recordWithGithubImport(
      base,
      "jordanreyes",
      [
        repo({ name: "alpha", stars: 5, language: "Python" }),
        repo({ name: "beta", stars: 3, language: "Rust" }),
        repo({ name: "gamma", stars: 1, language: "Swift" }),
      ],
      "2026-08-24T00:00:00.000Z",
    );
    expect(record.person.github).toBe("jordanreyes");
    expect(record.projects.map((project) => project.name)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
    expect(record.projects[0].syncedAt).toBe("2026-08-24T00:00:00.000Z");
    // Languages fold in without duplicating expertise the member already has.
    expect(record.person.expertise).toEqual(["Rust", "python", "Swift"]);
  });
});
