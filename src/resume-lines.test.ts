import { describe, expect, it } from "vitest";
import {
  columnGutter,
  linesFromTextItems,
  type ResumeTextItem,
} from "./resume-lines.js";

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
    expect(lines[0]?.text).toBe("Software Engineer\tMay 2024 – Present");
  });

  it("joins kerning-split fragments without a space", () => {
    const lines = linesFromTextItems(
      [item("1 km", 28, 700, 40), item("2", 68.2, 703.6, 4, 7)],
      1,
    );
    expect(lines[0]?.text).toBe("1 km2");
    expect(lines[0]?.height).toBe(10);
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
    expect(lines[0]?.text).toBe("Languages\tPython, Rust");
  });

  it("reports the tallest fragment as the line height", () => {
    const lines = linesFromTextItems(
      [item("Zidan", 200, 758, 50, 17.2), item("Kazi", 255, 758, 40, 17.2)],
      2,
    );
    expect(lines[0]).toMatchObject({ height: 17.2, page: 2 });
  });
});

/** A sidebar-and-main page: sidebar ends by x=170, the main column starts at 220. */
function twoColumnItems(): ResumeTextItem[] {
  const sidebar = [
    "CONTACT",
    "jordan@example.com",
    "Portland, OR",
    "SKILLS",
    "Python",
    "Rust",
    "Go",
    "SQL",
    "Docker",
    "Figma",
  ].map((text, index) => item(text, 30, 700 - index * 20, 120));
  const main = [
    item("EXPERIENCE", 220, 700, 90),
    item("Firmware Engineer", 220, 680, 120),
    item("Jan 2023 – Mar 2024", 470, 680, 110),
    item("Evergreen Robotics, Inc.", 220, 660, 160),
    ...Array.from({ length: 6 }, (_, index) =>
      item(`• Did the thing number ${index}`, 220, 640 - index * 20, 300),
    ),
  ];
  return [item("Jordan Reyes", 200, 760, 180, 16), ...sidebar, ...main];
}

describe("columnGutter", () => {
  it("finds the gutter of a genuine two-column page", () => {
    expect(columnGutter(twoColumnItems())).toBe(220);
  });

  it("sees no columns when body lines run through the middle", () => {
    const items = [
      ...Array.from({ length: 12 }, (_, index) =>
        item(`• A bullet that runs across the whole page ${index}`, 28, 700 - index * 30, 550),
      ),
      ...Array.from({ length: 12 }, (_, index) =>
        item("Jun 2024", 480, 690 - index * 30, 60),
      ),
    ];
    expect(columnGutter(items)).toBeNull();
  });
});

describe("two-column pages", () => {
  it("reads the page column by column, not row by row", () => {
    const texts = linesFromTextItems(twoColumnItems(), 1).map(
      (line) => line.text,
    );
    expect(texts).toEqual([
      "Jordan Reyes",
      "CONTACT",
      "jordan@example.com",
      "Portland, OR",
      "SKILLS",
      "Python",
      "Rust",
      "Go",
      "SQL",
      "Docker",
      "Figma",
      "EXPERIENCE",
      "Firmware Engineer\tJan 2023 – Mar 2024",
      "Evergreen Robotics, Inc.",
      "• Did the thing number 0",
      "• Did the thing number 1",
      "• Did the thing number 2",
      "• Did the thing number 3",
      "• Did the thing number 4",
      "• Did the thing number 5",
    ]);
  });
});
