// ── Visual-width helpers (ANSI + emoji aware) ────────────────────────

/** Strip ANSI escape sequences so we measure only visible characters. */
function stripAnsi(s: string): string {
  // biome-ignore lint: the regex is intentionally broad to cover all ANSI sequences
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Approximate the visual (terminal column) width of a string.
 * - strips ANSI first
 * - treats common wide emoji / symbols as width 2
 * - everything else as width 1
 */
function visualWidth(s: string): number {
  const plain = stripAnsi(s);
  let w = 0;
  for (const ch of plain) {
    const cp = ch.codePointAt(0) ?? 0;
    // Variation Selector-16 (U+FE0F) adds no extra column
    if (cp === 0xfe0f) continue;
    // Common wide emoji ranges (Miscellaneous Symbols, Dingbats, Emoticons,
    // Supplemental Symbols, etc.)  — conservatively flag anything above
    // U+2600 that's likely rendered full-width in most terminals.
    if (cp >= 0x2600) {
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
}

/** Right-pad a (possibly ANSI-colored) string to `targetWidth` visual columns. */
export function visualPadEnd(s: string, targetWidth: number): string {
  const diff = targetWidth - visualWidth(s);
  return diff > 0 ? s + " ".repeat(diff) : s;
}
