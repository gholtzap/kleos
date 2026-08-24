/**
 * A text fragment as pdf.js reports it: the string plus the page-space
 * geometry of its box. `x`/`y` are the fragment's origin in PDF points.
 */
export interface ResumeTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One visual line of a resume page, in reading order. */
export interface ResumeLine {
  /** Line text. Gaps wider than a word space are encoded as a tab. */
  text: string;
  /** The tallest glyph box on the line, in PDF points — a font-size proxy. */
  height: number;
  page: number;
}

/** Fragments closer than this join without a space (kerning splits a word). */
const JOINED_GAP = 1;

/**
 * A horizontal gap at least this wide separates columns of one visual line —
 * a right-aligned date, a location, a skill list after its category label.
 * Word spaces and justified-text stretch stay well under it.
 */
const COLUMN_GAP = 12;

/**
 * Fragments within this vertical distance share a line. Half a typical line
 * pitch, so superscripts join their line without merging adjacent lines.
 */
const LINE_TOLERANCE = 5;

/**
 * Rebuilds the visual lines of one page from pdf.js text fragments. Fragments
 * are grouped by baseline, ordered left to right, and joined so that column
 * gaps survive as tabs — the layout signal the resume parser reads.
 */
export function linesFromTextItems(
  items: readonly ResumeTextItem[],
  page: number,
): ResumeLine[] {
  const fragments = items
    .filter((item) => item.str.trim().length > 0)
    .sort((left, right) => right.y - left.y || left.x - right.x);

  const groups: ResumeTextItem[][] = [];
  for (const fragment of fragments) {
    const group = groups.at(-1);
    const anchor = group?.[0];
    if (group && anchor && anchor.y - fragment.y <= LINE_TOLERANCE) {
      group.push(fragment);
    } else {
      groups.push([fragment]);
    }
  }

  const lines: ResumeLine[] = [];
  for (const group of groups) {
    group.sort((left, right) => left.x - right.x);
    let text = "";
    let end = Number.NEGATIVE_INFINITY;
    for (const fragment of group) {
      const gap = fragment.x - end;
      if (text.length > 0) {
        if (gap >= COLUMN_GAP) text += "\t";
        else if (gap >= JOINED_GAP) text += " ";
      }
      text += fragment.str;
      end = Math.max(end, fragment.x + fragment.width);
    }
    const cleaned = text
      .replace(/ {2,}/g, " ")
      .replace(/ ?\t ?/g, "\t")
      .replace(/[ \t]+$/g, "")
      .replace(/^[ \t]+/g, "");
    if (cleaned.length === 0) continue;
    lines.push({
      text: cleaned,
      height: Math.max(...group.map((fragment) => fragment.height)),
      page,
    });
  }
  return lines;
}
