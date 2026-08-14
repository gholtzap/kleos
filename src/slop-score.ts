export interface SlopScoreBreakdown {
  score: number;
  reasons: string[];
}

const BUZZWORDS = [
  "thrilled to announce",
  "excited to announce",
  "game-changer",
  "game changer",
  "grateful",
  "humbled",
  "humbling",
  "synergy",
  "leverage",
  "circle back",
  "deep dive",
  "let that sink in",
  "unlock",
  "move the needle",
  "low-hanging fruit",
  "double-click on",
  "at the end of the day",
  "here's the thing",
  "plot twist",
  "the game has changed",
  "level up",
  "value add",
  "growth mindset",
  "hustle",
];

const HYPE_WORDS = [
  "incredible",
  "amazing",
  "insane",
  "game-changing",
  "revolutionary",
  "literally",
  "unbelievable",
  "mind-blowing",
];

const LISTICLE_PATTERN = /\d+\s+(lessons|things|tips|takeaways|reasons)/i;
const HERES_WHAT_PATTERN = /here'?s (what|why|how)/i;
const RHETORICAL_HOOK_PATTERN = /want to know|ever wonder|what if i told you/i;
// Short acronyms (API, CEO, CI) read as normal professional writing, not shouting,
// so only words of 4+ letters count toward the ALL-CAPS signal.
const ALL_CAPS_WORD_PATTERN = /^[A-Z]{4,}[.!?,]?$/;

// Trailing inflections count ("leveraged", "unlocking"), but a prefix must not:
// "ungrateful" is not "grateful", and "hustlers" is not another "hustle".
function phrasePattern(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}(?:s|es|d|ed|ing)?\\b`, "g");
}

// Word-anchored so "grateful" does not fire inside "ungrateful" and one root word
// ("hustle" in "hustlers who hustle") is not counted several times over.
function countMatches(text: string, phrase: string): number {
  return (text.match(phrasePattern(phrase)) ?? []).length;
}

function phraseListPenalty(
  text: string,
  phrases: readonly string[],
  weight: number,
  cap: number,
  describe: (phrase: string) => string,
  reasons: string[],
): number {
  let total = 0;
  for (const phrase of phrases) {
    const matches = countMatches(text, phrase);
    if (matches > 0) {
      total += matches * weight;
      reasons.push(describe(phrase));
    }
  }
  return Math.min(cap, total);
}

function buzzwordPenalty(lowerText: string, reasons: string[]): number {
  return phraseListPenalty(
    lowerText,
    BUZZWORDS,
    6,
    40,
    (phrase) => `Uses cliché phrase "${phrase}"`,
    reasons,
  );
}

function structurePenalty(text: string, reasons: string[]): number {
  let total = 0;

  if (LISTICLE_PATTERN.test(text)) {
    total += 10;
    reasons.push("Reads like a numbered listicle");
  }
  if (HERES_WHAT_PATTERN.test(text)) {
    total += 10;
    reasons.push('Opens with a "here\'s what/why/how" hook');
  }
  if (RHETORICAL_HOOK_PATTERN.test(text)) {
    total += 8;
    reasons.push("Opens with a rhetorical-question hook");
  }

  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 4) {
    const shortLines = lines.filter((line) => line.length < 60);
    if (shortLines.length / lines.length > 0.5) {
      total += 15;
      reasons.push("Overuses one-sentence-per-line formatting");
    }
  }

  return Math.min(30, total);
}

// Counts what a reader sees as one emoji: a ZWJ family sequence or a flag is a single
// grapheme cluster, not the two-to-three codepoints a naive per-codepoint regex counts.
function countEmoji(text: string): number {
  const isEmojiCluster = (cluster: string) =>
    /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(cluster);

  if (typeof Intl.Segmenter !== "function") {
    return (text.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  }

  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  let count = 0;
  for (const { segment } of segmenter.segment(text)) {
    if (isEmojiCluster(segment)) count += 1;
  }
  return count;
}

const EMOJI_RATIO_FLOOR = 0.15;

function emojiPenalty(text: string, reasons: string[]): number {
  const wordCount = Math.max(1, text.split(/\s+/).filter(Boolean).length);
  const ratio = countEmoji(text) / wordCount;
  if (ratio <= EMOJI_RATIO_FLOOR) return 0;
  reasons.push("Heavy emoji use");
  // Ramp up from the floor so one stray emoji in a short post is a nudge, not a cliff.
  return Math.min(20, (ratio - EMOJI_RATIO_FLOOR) * 130);
}

function hashtagPenalty(text: string, reasons: string[]): number {
  const hashtags = text.match(/#\w+/g) ?? [];
  if (hashtags.length <= 2) return 0;
  reasons.push("Hashtag spam");
  return Math.min(15, (hashtags.length - 2) * 4);
}

function allCapsPenalty(text: string, reasons: string[]): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const shoutingWords = words.filter((word) => ALL_CAPS_WORD_PATTERN.test(word));
  const ratio = shoutingWords.length / words.length;
  if (ratio <= 0.2) return 0;
  reasons.push("ALL-CAPS shouting");
  return Math.min(15, ratio * 100);
}

function exclamationPenalty(text: string, reasons: string[]): number {
  const count = (text.match(/!/g) ?? []).length;
  if (count <= 2) return 0;
  reasons.push("Excessive exclamation points");
  return Math.min(12, (count - 2) * 3);
}

function hypeWordPenalty(lowerText: string, reasons: string[]): number {
  return phraseListPenalty(
    lowerText,
    HYPE_WORDS,
    3,
    15,
    (word) => `Overuses hype word "${word}"`,
    reasons,
  );
}

export function scoreSlopDetailed(text: string): SlopScoreBreakdown {
  const trimmed = text.trim();
  if (!trimmed) return { score: 0, reasons: [] };

  // Hashtags are scored on their own below; blanking them here keeps "#grateful"
  // from paying both the cliché-phrase and the hashtag-spam penalty.
  const lowerText = trimmed.toLowerCase().replace(/#\w+/g, " ");
  const reasons: string[] = [];

  const total =
    buzzwordPenalty(lowerText, reasons) +
    structurePenalty(trimmed, reasons) +
    emojiPenalty(trimmed, reasons) +
    hashtagPenalty(trimmed, reasons) +
    allCapsPenalty(trimmed, reasons) +
    exclamationPenalty(trimmed, reasons) +
    hypeWordPenalty(lowerText, reasons);

  return { score: Math.min(100, Math.max(0, Math.round(total))), reasons };
}

export function scoreSlop(text: string): number {
  return scoreSlopDetailed(text).score;
}

export type SlopTier = "low" | "some" | "high" | "peak";

const TIER_LABELS: Record<SlopTier, string> = {
  low: "Low slop",
  some: "Some slop",
  high: "High slop",
  peak: "Peak slop",
};

export function slopTier(score: number): SlopTier {
  if (score < 25) return "low";
  if (score < 50) return "some";
  if (score < 75) return "high";
  return "peak";
}

export function slopLabel(score: number): string {
  return TIER_LABELS[slopTier(score)];
}
