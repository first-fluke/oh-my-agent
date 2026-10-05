// Text helpers shared by the diagram components. Diagrams are laid out in Node
// without font metrics, so widths are estimated by character class. Estimates
// lean wide: spare room inside a node beats text crossing its border.

const WIDE_RE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/;
const NARROW = new Set([..."iljtfrI.,:;|!'`()[]{} "]);
const BROAD = new Set([..."mwMWOQGD@%&"]);

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** CJK and fullwidth glyphs, which render about one em wide. */
export function isWide(char: string): boolean {
  return WIDE_RE.test(char);
}

function charUnits(char: string, mono: boolean): number {
  if (isWide(char)) return 1;
  if (mono) return 0.62;
  if (NARROW.has(char)) return 0.34;
  if (BROAD.has(char)) return 0.88;
  if (char >= "A" && char <= "Z") return 0.7;
  return 0.58;
}

/** Estimated rendered width of `text` in px at `size` px font size. */
export function measure(text: string, size = 13, mono = false): number {
  let units = 0;
  for (const char of text) units += charUnits(char, mono);
  return units * size;
}

/**
 * Break text into lines no wider than `maxWidth`. Breaks fall on spaces first,
 * between CJK glyphs second, and inside an over-long token (a path, a URL)
 * after a separator or, failing that, anywhere — so no line overflows.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  size = 13,
  mono = false,
): string[] {
  const lines: string[] = [];
  let line = "";
  const fits = (candidate: string) =>
    measure(candidate, size, mono) <= maxWidth;
  const flush = () => {
    if (line.trim()) lines.push(line.trim());
    line = "";
  };

  // Tokens: a run of non-space, non-wide characters, a single wide glyph, or
  // a run of spaces.
  const tokens = text.match(/\s+|[^\sᄀ-￦]+|[ᄀ-￦]/g) ?? [];
  for (const token of tokens) {
    if (fits(line + token)) {
      line += token;
      continue;
    }
    if (/^\s+$/.test(token)) {
      flush();
      continue;
    }
    flush();
    if (fits(token)) {
      line = token;
      continue;
    }
    // One token wider than the line: cut it, preferring to end on a separator.
    let rest = token;
    while (rest && !fits(rest)) {
      let cut = 1;
      for (let end = 1; end <= rest.length; end++) {
        if (!fits(rest.slice(0, end))) break;
        cut = end;
      }
      const head = rest.slice(0, cut);
      const separator = Math.max(
        head.lastIndexOf("/"),
        head.lastIndexOf("-"),
        head.lastIndexOf("_"),
        head.lastIndexOf("."),
      );
      if (separator > 0 && separator < cut - 1) cut = separator + 1;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    line = rest;
  }
  flush();
  return lines.length > 0 ? lines : [""];
}

export type DraftLanguage = "en" | "ko" | "ja" | "zh";

/**
 * Language a draft is written in, by script. Hangul marks Korean and hiragana
 * marks Japanese; Han characters without either are Chinese.
 */
export function detectLanguage(text: string): DraftLanguage {
  let hangul = 0;
  let hiragana = 0;
  let han = 0;
  let latin = 0;
  for (const char of text) {
    if (/[가-힣]/.test(char)) hangul++;
    else if (/[぀-ゟ]/.test(char)) hiragana++;
    else if (/[一-鿿]/.test(char)) han++;
    else if (/[a-z]/i.test(char)) latin++;
  }
  const cjk = hangul + hiragana + han;
  if (cjk * 3 < latin) return "en";
  if (hangul >= hiragana + han) return "ko";
  return hiragana > 0 && hiragana / cjk >= 0.05 ? "ja" : "zh";
}

/** Stable, HTML-id-safe slug of a label; non-ASCII labels hash to an id. */
export function slugId(label: string, prefix = "n"): string {
  const ascii = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (ascii && ascii.length >= label.trim().length / 2)
    return `${prefix}-${ascii}`;
  let hash = 5381;
  for (const char of label)
    hash = ((hash * 33) ^ (char.codePointAt(0) ?? 0)) >>> 0;
  return `${prefix}-${hash.toString(36)}`;
}
