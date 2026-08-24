import { describe, expect, it } from "vitest";
import { linesFromTextItems, type ResumeTextItem } from "./resume-lines.js";

function item(
  str: string,
  x: number,
  y: number,
  width: number,
  height = 10,
): ResumeTextItem {
  return { str, x, y, width, height };
}

describe("linesFromTextItems", () => {
  it("groups fragments by baseline and orders them for reading", () => {
    const lines = linesFromTextItems(
      [
        item("world", 60, 700, 30),
        item("Second line", 28, 688, 60),
        item("Hello", 28, 700, 28),
      ],
      1,
    );
    expect(lines.map((line) => line.text)).toEqual([
      "Hello world",
      "Second line",
    ]);
  });

  it("keeps a column gap as a tab and a word gap as a space", () => {
    const lines = linesFromTextItems(
      [
        item("Software Engineer", 28, 700, 120),
        item("May 2024 – Present", 480, 700, 90),
      ],
      1,
    );
    expect(lines[0].text).toBe("Software Engineer\tMay 2024 – Present");
  });

  it("joins kerning-split fragments without a space", () => {
    const lines = linesFromTextItems(
      [item("1 km", 28, 700, 40), item("2", 68.2, 703.6, 4, 7)],
      1,
    );
    expect(lines[0].text).toBe("1 km2");
    expect(lines[0].height).toBe(10);
  });

  it("keeps a superscript on its line without merging neighbors", () => {
    const lines = linesFromTextItems(
      [
        item("processing a 1 km", 28, 700, 100),
        item("2", 128.2, 703.6, 4, 7),
        item("benchmark", 136, 700, 50),
        item("next line", 28, 688, 40),
      ],
      1,
    );
    expect(lines.map((line) => line.text)).toEqual([
      "processing a 1 km2 benchmark",
      "next line",
    ]);
  });

  it("drops whitespace-only fragments, including wide column spacers", () => {
    const lines = linesFromTextItems(
      [
        item("Languages", 28, 700, 52),
        item(" ", 80, 700, 60, 0),
        item("Python, Rust", 140, 700, 80),
      ],
      1,
    );
    expect(lines[0].text).toBe("Languages\tPython, Rust");
  });

  it("reports the tallest fragment as the line height", () => {
    const lines = linesFromTextItems(
      [item("Zidan", 200, 758, 50, 17.2), item("Kazi", 255, 758, 40, 17.2)],
      2,
    );
    expect(lines[0]).toMatchObject({ height: 17.2, page: 2 });
  });
});
