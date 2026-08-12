import { afterEach, describe, expect, it, vi } from "vitest";
import { currentPerson, initialClaims } from "./data";
import {
  compareReposByProminence,
  featuredProjectFromRepo,
  featuredProjectId,
  fetchGithubRepos,
  githubRepoFromValue,
  githubRepoUrl,
  normalizeGithubAccount,
  validGithubRepoName,
} from "./github";
import {
  discoveryProjection,
  kleosRecordContentIsValid,
  mergeOwnerKleosRecord,
  normalizeKleosRecord,
  publicKleosRecord,
  reviewKleosRecord,
} from "./kleos";
import type { FeaturedProject, KleosRecord } from "./types";

const apiRepo = {
  name: "kleos",
  owner: { login: "gholtzap" },
  description: "Professional profiles built on evidence.",
  homepage: "https://kleos.bio",
  language: "TypeScript",
  topics: ["react", "vite"],
  stargazers_count: 42,
  forks_count: 3,
  fork: false,
  archived: false,
  pushed_at: "2026-08-01T12:00:00Z",
};

function sampleProject(): FeaturedProject {
  return {
    id: featuredProjectId("gholtzap", "kleos"),
    owner: "gholtzap",
    name: "kleos",
    description: "Professional profiles built on evidence.",
    homepage: "https://kleos.bio",
    language: "TypeScript",
    topics: ["react", "vite"],
    stars: 42,
    forks: 3,
    syncedAt: "2026-08-12T00:00:00.000Z",
  };
}

function sampleRecord(projects: FeaturedProject[]): KleosRecord {
  return {
    version: 1,
    revision: 0,
    person: { ...currentPerson, github: "gholtzap" },
    claims: initialClaims,
    projects,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("github module", () => {
  it("validates accounts, repo names, and derives ids and urls", () => {
    expect(normalizeGithubAccount(" @Octocat ")).toBe("Octocat");
    expect(normalizeGithubAccount("not/a/handle")).toBeNull();
    expect(validGithubRepoName("my-repo.v2_final")).toBe(true);
    expect(validGithubRepoName("bad name")).toBe(false);
    expect(validGithubRepoName("..")).toBe(false);
    expect(featuredProjectId("Octocat", "Hello-World")).toBe(
      "github:octocat/hello-world",
    );
    expect(githubRepoUrl({ owner: "octocat", name: "hello" })).toBe(
      "https://github.com/octocat/hello",
    );
  });

  it("parses repository payloads defensively", () => {
    const repo = githubRepoFromValue(apiRepo);
    expect(repo).toMatchObject({
      owner: "gholtzap",
      name: "kleos",
      stars: 42,
      forks: 3,
      language: "TypeScript",
      topics: ["react", "vite"],
    });
    expect(githubRepoFromValue({ ...apiRepo, name: "bad name" })).toBeNull();
    expect(githubRepoFromValue({ ...apiRepo, owner: {} })).toBeNull();
    expect(
      githubRepoFromValue({
        ...apiRepo,
        homepage: "javascript:alert(1)",
        stargazers_count: -5,
        topics: ["ok", 7],
      }),
    ).toMatchObject({ homepage: undefined, stars: 0, topics: ["ok"] });
  });

  it("fetches and filters repositories for a valid account", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([apiRepo, { junk: true }]), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const repos = await fetchGithubRepos("@gholtzap");
    expect(repos).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/users/gholtzap/repos?per_page=100&sort=pushed",
      expect.objectContaining({
        headers: { Accept: "application/vnd.github+json" },
      }),
    );
    await expect(fetchGithubRepos("in valid")).rejects.toThrow(
      "Enter a valid GitHub username.",
    );

    vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 }));
    await expect(fetchGithubRepos("gholtzap")).rejects.toThrow(
      "GitHub account not found.",
    );

    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));
    await expect(fetchGithubRepos("gholtzap")).rejects.toThrow(
      "GitHub returned an unexpected response.",
    );
  });

  it("orders repositories by stars and recency", () => {
    const base = githubRepoFromValue(apiRepo);
    expect(base).not.toBeNull();
    if (!base) return;
    const popular = { ...base, name: "popular", stars: 100 };
    const fresh = { ...base, name: "fresh", pushedAt: "2026-08-11T00:00:00Z" };
    expect(
      [base, fresh, popular].sort(compareReposByProminence).map((r) => r.name),
    ).toEqual(["popular", "fresh", "kleos"]);
  });

  it("converts repositories into featured projects", () => {
    const repo = githubRepoFromValue(apiRepo);
    expect(repo).not.toBeNull();
    if (!repo) return;
    const project = featuredProjectFromRepo(repo, "2026-08-12T00:00:00.000Z");
    expect(project).toEqual(sampleProject());
  });
});

describe("featured projects on the Kleos record", () => {
  it("normalizes records with and without projects", () => {
    const record = sampleRecord([sampleProject()]);
    expect(normalizeKleosRecord(record)).toEqual(record);

    const legacy = normalizeKleosRecord({
      version: 1,
      revision: 0,
      person: currentPerson,
      claims: initialClaims,
    });
    expect(legacy?.projects).toEqual([]);

    expect(
      normalizeKleosRecord({ ...record, projects: [{ id: 1 }] }),
    ).toBeNull();
    expect(normalizeKleosRecord({ ...record, projects: "nope" })).toBeNull();
  });

  it("validates project content and the github account", () => {
    expect(kleosRecordContentIsValid(sampleRecord([sampleProject()]))).toBe(
      true,
    );
    expect(
      kleosRecordContentIsValid({
        ...sampleRecord([]),
        person: { ...currentPerson, github: "not/valid" },
      }),
    ).toBe(false);
    expect(
      kleosRecordContentIsValid(
        sampleRecord([{ ...sampleProject(), id: "github:wrong/id" }]),
      ),
    ).toBe(false);
    expect(
      kleosRecordContentIsValid(
        sampleRecord([{ ...sampleProject(), stars: -1 }]),
      ),
    ).toBe(false);
    expect(
      kleosRecordContentIsValid(
        sampleRecord([{ ...sampleProject(), homepage: "javascript:x" }]),
      ),
    ).toBe(false);
    expect(
      kleosRecordContentIsValid(
        sampleRecord([sampleProject(), sampleProject()]),
      ),
    ).toBe(false);
    const many = Array.from({ length: 13 }, (_, index) => ({
      ...sampleProject(),
      id: featuredProjectId("gholtzap", `repo-${index}`),
      name: `repo-${index}`,
    }));
    expect(kleosRecordContentIsValid(sampleRecord(many))).toBe(false);
  });

  it("keeps projects through merge and public projection, strips them for review", () => {
    const submitted = sampleRecord([sampleProject()]);
    const merged = mergeOwnerKleosRecord(null, submitted, "owner-1");
    expect(merged.projects).toEqual(submitted.projects);
    expect(merged.person.github).toBe("gholtzap");

    expect(publicKleosRecord(submitted).projects).toEqual(submitted.projects);
    expect(
      reviewKleosRecord(submitted, [], []).projects,
    ).toEqual([]);

    const projection = discoveryProjection(submitted);
    expect(projection.searchText).toContain("gholtzap/kleos");
    expect(projection.searchText).toContain("TypeScript");
    expect(projection.publicRecord.projects).toEqual(submitted.projects);
  });
});
