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

/** Play at a gutter's edges, so near-touching fragments classify stably. */
const GUTTER_TOLERANCE = 2;

/** The fewest fragments a side must hold for a gutter to be a real column. */
const MIN_COLUMN_FRAGMENTS = 10;

/** The narrowest whitespace band that reads as a gutter between columns. */
const MIN_GUTTER_GAP = 18;

/** Rows of fragments sharing a baseline, top of the page first. */
function rowsFromFragments(
  fragments: readonly ResumeTextItem[],
): ResumeTextItem[][] {
  const rows: ResumeTextItem[][] = [];
  for (const fragment of fragments) {
    const row = rows.at(-1);
    const anchor = row?.[0];
    if (row && anchor && anchor.y - fragment.y <= LINE_TOLERANCE) {
      row.push(fragment);
    } else {
      rows.push([fragment]);
    }
  }
  return rows;
}

function lineFromRow(row: ResumeTextItem[], page: number): ResumeLine | null {
  const ordered = [...row].sort((left, right) => left.x - right.x);
  let text = "";
  let end = Number.NEGATIVE_INFINITY;
  for (const fragment of ordered) {
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
  if (cleaned.length === 0) return null;
  return {
    text: cleaned,
    height: Math.max(...ordered.map((fragment) => fragment.height)),
    page,
  };
}

/**
 * The x position of a vertical gutter splitting the page into two genuine
 * columns, or null for a single-column page. A real gutter has substantial
 * text on both sides and almost nothing crossing it — a single-column resume
 * with right-aligned dates fails that test, because its body lines run
 * through the middle of the page.
 */
export function columnGutter(
  fragments: readonly ResumeTextItem[],
): number | null {
  if (fragments.length < MIN_COLUMN_FRAGMENTS * 2) return null;
  const pageLeft = Math.min(...fragments.map((fragment) => fragment.x));
  const pageRight = Math.max(
    ...fragments.map((fragment) => fragment.x + fragment.width),
  );
  const width = pageRight - pageLeft;
  const candidates = [
    ...new Set(
      fragments
        .filter(
          (fragment) =>
            fragment.x > pageLeft + width * 0.2 &&
            fragment.x < pageLeft + width * 0.75,
        )
        .map((fragment) => Math.round(fragment.x)),
    ),
  ];

  let best: { gutter: number; gap: number } | null = null;
  for (const gutter of candidates) {
    let left = 0;
    let right = 0;
    let crossing = 0;
    let leftEdge = Number.NEGATIVE_INFINITY;
    for (const fragment of fragments) {
      if (fragment.x >= gutter - GUTTER_TOLERANCE) right += 1;
      else if (fragment.x + fragment.width <= gutter + GUTTER_TOLERANCE) {
        left += 1;
        leftEdge = Math.max(leftEdge, fragment.x + fragment.width);
      } else crossing += 1;
    }
    // A page-wide title may cross; body text crossing means no column here.
    if (crossing > 2) continue;
    if (left < MIN_COLUMN_FRAGMENTS || right < MIN_COLUMN_FRAGMENTS) continue;
    // The widest whitespace band wins: a candidate inside a page-wide line's
    // span would leave a narrower gap than the true gutter does.
    const gap = gutter - leftEdge;
    if (gap < MIN_GUTTER_GAP) continue;
    if (best === null || gap > best.gap) best = { gutter, gap };
  }
  return best?.gutter ?? null;
}

/**
 * Rebuilds the visual lines of one page from pdf.js text fragments, in the
 * order a reader takes them. Fragments group by baseline and join left to
 * right, with column gaps kept as tabs — the layout signal the parser reads.
 *
 * A two-column page reads column by column: page-wide lines split it into
 * bands, and each band yields its left column and then its right, so every
 * sidebar section stays contiguous instead of interleaving with the other
 * column line by line.
 */
export function linesFromTextItems(
  items: readonly ResumeTextItem[],
  page: number,
): ResumeLine[] {
  const fragments = items
    .filter((item) => item.str.trim().length > 0)
    .sort((left, right) => right.y - left.y || left.x - right.x);
  const rows = rowsFromFragments(fragments);
  const gutter = columnGutter(fragments);

  if (gutter === null) {
    return rows.flatMap((row) => lineFromRow(row, page) ?? []);
  }

  const lines: ResumeLine[] = [];
  let leftBand: ResumeTextItem[][] = [];
  let rightBand: ResumeTextItem[][] = [];
  const flushBand = () => {
    lines.push(
      ...leftBand.flatMap((row) => lineFromRow(row, page) ?? []),
      ...rightBand.flatMap((row) => lineFromRow(row, page) ?? []),
    );
    leftBand = [];
    rightBand = [];
  };
  for (const row of rows) {
    const left: ResumeTextItem[] = [];
    const right: ResumeTextItem[] = [];
    let crossing = false;
    for (const fragment of row) {
      if (fragment.x >= gutter - GUTTER_TOLERANCE) right.push(fragment);
      else if (fragment.x + fragment.width <= gutter + GUTTER_TOLERANCE) {
        left.push(fragment);
      } else crossing = true;
    }
    if (crossing) {
      // A page-wide line: everything above it belongs together, so read that
      // band out before it.
      flushBand();
      const spanning = lineFromRow(row, page);
      if (spanning) lines.push(spanning);
    } else {
      if (left.length > 0) leftBand.push(left);
      if (right.length > 0) rightBand.push(right);
    }
  }
  flushBand();
  return lines;
}
