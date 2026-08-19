import { describe, expect, it } from "vitest";
import { scoreSlop, scoreSlopDetailed, slopLabel } from "./slop-score";

describe("scoreSlop", () => {
  it("scores empty or whitespace-only text as 0", () => {
    expect(scoreSlop("")).toBe(0);
    expect(scoreSlop("   \n  ")).toBe(0);
  });

  it("scores buzzword-laden text highly", () => {
    const text =
      "Thrilled to announce this incredible game-changer! 🚀🚀🚀🚀🚀 Grateful and humbled to unlock this next level. Here's what 10 lessons taught me. Let that sink in. #hustle #grind #blessed";
    expect(scoreSlop(text)).toBeGreaterThan(50);
  });

  it("does not match a cliché phrase buried inside a longer word", () => {
    expect(scoreSlop("He was ungrateful and rather disingenuous")).toBe(0);
    expect(scoreSlopDetailed("hustlers gonna hustle").reasons).toEqual([
      'Uses cliché phrase "hustle"',
    ]);
  });

  it("matches trailing inflections of a cliché phrase", () => {
    expect(scoreSlop("We leveraged our synergies")).toBeGreaterThan(0);
  });

  it("does not charge a hashtag both cliché and hashtag-spam penalties", () => {
    const { reasons } = scoreSlopDetailed("#grateful #humbled #hustle");
    expect(reasons).toEqual(["Hashtag spam"]);
  });

  it("treats short acronyms as normal writing, not shouting", () => {
    const { reasons } = scoreSlopDetailed("I shipped the API. The CEO and the CTO agreed. TDD FTW");
    expect(reasons).not.toContain("ALL-CAPS shouting");
  });

  it("still flags genuine all-caps shouting", () => {
    const { reasons } = scoreSlopDetailed("THIS IS THE BIGGEST ANNOUNCEMENT OF MY CAREER");
    expect(reasons).toContain("ALL-CAPS shouting");
  });

  it("counts a multi-codepoint emoji as one, the same as a single-codepoint one", () => {
    const zwjSequence = "Our family 👨‍👩‍👧 celebrated together with the whole team today";
    const singleEmoji = "Our family 🙂 celebrated together with the whole team today";
    expect(scoreSlop(zwjSequence)).toBe(scoreSlop(singleEmoji));
    expect(scoreSlop(zwjSequence)).toBe(0);
  });

  it("counts flag emoji, which are not Extended_Pictographic", () => {
    const { reasons } = scoreSlopDetailed("shipping 🇺🇸 🇬🇧 🇯🇵 🇩🇪 worldwide");
    expect(reasons).toContain("Heavy emoji use");
  });

  it("scores plain neutral text low", () => {
    const text = "The meeting moved to 3pm. Please bring the updated budget spreadsheet.";
    expect(scoreSlop(text)).toBeLessThan(20);
  });

  it("never exceeds 100 regardless of input length", () => {
    const text = Array(50).fill("Thrilled to announce this incredible game-changer!").join(" ");
    expect(scoreSlop(text)).toBeLessThanOrEqual(100);
  });

  it("labels each severity tier", () => {
    expect(slopLabel(0)).toBe("Low slop");
    expect(slopLabel(24)).toBe("Low slop");
    expect(slopLabel(25)).toBe("Some slop");
    expect(slopLabel(49)).toBe("Some slop");
    expect(slopLabel(50)).toBe("High slop");
    expect(slopLabel(74)).toBe("High slop");
    expect(slopLabel(75)).toBe("Peak slop");
    expect(slopLabel(100)).toBe("Peak slop");
  });

  it("caps individual categories so no single signal dominates", () => {
    const text = Array(30).fill("synergy").join(" ");
    const { score, reasons } = scoreSlopDetailed(text);
    expect(score).toBeLessThanOrEqual(40);
    expect(reasons.length).toBeGreaterThan(0);
  });
});
