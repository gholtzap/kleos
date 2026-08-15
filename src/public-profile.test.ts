import { afterEach, describe, expect, it, vi } from "vitest";
import { currentPerson } from "./data";
import { getPublicProfileByHandle } from "./public-profile";

describe("public profile client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads a public record by canonical handle", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          version: 1,
          revision: 0,
          person: { ...currentPerson, handle: "kabirdhillon" },
          claims: [],
          projects: [],
          experience: [],
          education: [],
          certifications: [],
          otherExperience: [],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPublicProfileByHandle("kabirdhillon")).resolves.toMatchObject({
      person: { handle: "kabirdhillon" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/profiles?handle=kabirdhillon",
      { signal: undefined },
    );
  });
});
