import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SkillsSection } from "./SkillsSection";

describe("SkillsSection", () => {
  it("renders the grouped skills in an expanded native disclosure", () => {
    const markup = renderToStaticMarkup(<SkillsSection />);

    expect(markup).toContain("<details open=\"\">");
    expect(markup).toContain("TypeScript");
    expect(markup).toContain("Photoshop");
  });
});
