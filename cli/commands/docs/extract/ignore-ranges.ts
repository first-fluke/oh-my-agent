/**
 * Escape-hatch handling for oma-docs extract: file-level frontmatter skip
 * and block-level <!-- oma-docs:ignore-start/end --> ranges.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Extractor
 */

// ---------------------------------------------------------------------------
// Frontmatter extraction
// ---------------------------------------------------------------------------

export function extractFrontmatterSkip(content: string): boolean {
  // Check for YAML frontmatter with oma-docs: skip
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch || fmMatch[1] === undefined) return false;
  return /^oma-docs\s*:\s*skip\s*$/m.test(fmMatch[1]);
}

// ---------------------------------------------------------------------------
// Ignore block tracking
// ---------------------------------------------------------------------------

export interface IgnoreRange {
  startLine: number;
  endLine: number | null; // null = EOF
}

// Markers must appear as standalone HTML comment lines, not inside backticks
// or fenced code blocks. This prevents false positives when oma-docs's own
// docs (SKILL.md, design doc) describe the marker syntax in prose.
const IGNORE_START_RE = /^<!--\s*oma-docs:ignore-start\s*-->$/;
const IGNORE_END_RE = /^<!--\s*oma-docs:ignore-end\s*-->$/;
const FENCE_RE = /^(```|~~~)/;

export function parseIgnoreRanges(content: string): {
  ranges: IgnoreRange[];
  unmatched: boolean;
} {
  const lines = content.split("\n");
  const ranges: IgnoreRange[] = [];
  let unmatched = false;
  let currentStart: number | null = null;
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine === undefined) continue;
    const line = rawLine.trim();
    // Toggle fenced-code-block state — markers inside fences are ignored.
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    // 1-based line number = i + 1
    if (IGNORE_START_RE.test(line) && currentStart === null) {
      currentStart = i + 1;
    } else if (IGNORE_END_RE.test(line) && currentStart !== null) {
      ranges.push({ startLine: currentStart, endLine: i + 1 });
      currentStart = null;
    }
  }

  if (currentStart !== null) {
    // Unmatched start — ignore until EOF
    ranges.push({ startLine: currentStart, endLine: null });
    unmatched = true;
  }

  return { ranges, unmatched };
}

export function isLineIgnored(line: number, ranges: IgnoreRange[]): boolean {
  for (const range of ranges) {
    const end = range.endLine ?? Number.POSITIVE_INFINITY;
    if (line >= range.startLine && line <= end) return true;
  }
  return false;
}
