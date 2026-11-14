/**
 * i18n style linter for translated docs.
 *
 * Detects content-level anti-patterns (not structural drift — see i18n-drift.ts
 * for that) that violate the oma-translation skill's mechanical-checks rules.
 *
 * Currently checks:
 * - cjk-em-dash: em-dash (—) usage in CJK targets (ko/ja/zh) outside code
 *   blocks, outside closed `<!-- oma:generated <name>:start/end -->` regions,
 *   and outside placeholder-only Markdown table cells (`| — |`). Per the
 *   oma-translation language profiles, em-dashes in CJK should be structurally
 *   restructured into separate clauses, parentheses, or coordinated noun
 *   phrases — never used as direct substitution from English.
 * - wrong-language: file lives under web/i18n/<lang>/... but the detected
 *   language of its prose body doesn't match <lang>. Catches untranslated
 *   placeholder copies (most common: EN copied as bootstrap for every locale
 *   and the translator never came back to fill it in).
 *
 * The CLI never auto-fixes; it only reports. The host LLM (oma-translation
 * runtime) consumes the issue list and applies restructuring or translation.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { eld } from "eld/medium";

export type I18nStyleRule = "cjk-em-dash" | "wrong-language";

export interface I18nStyleIssue {
  file: string;
  lang: string;
  line: number;
  rule: I18nStyleRule;
  match: string;
}

export interface LintI18nOptions {
  repoRoot: string;
  i18nDir?: string;
  i18nDocsSubpath?: string;
  cjkLocales?: string[];
  /**
   * Locales to check for wrong-language. Defaults to ALL locales found under
   * the i18n dir (not just CJK), since untranslated EN-as-placeholder is
   * common across both CJK and Latin-script targets.
   */
  allLocales?: string[];
  rules?: I18nStyleRule[];
  /**
   * Minimum body characters required before running language detection.
   * Files shorter than this are skipped (detection is unreliable on tiny
   * samples). Default: 200.
   */
  minDetectionChars?: number;
}

const DEFAULT_CJK_LOCALES = ["ko", "ja", "zh"];
const DEFAULT_RULES: I18nStyleRule[] = ["cjk-em-dash", "wrong-language"];
const DEFAULT_MIN_DETECTION_CHARS = 200;
const EM_DASH = "—";

function findMarkdownFiles(
  root: string,
  results: string[] = [],
  base = root,
): string[] {
  if (!existsSync(root)) return results;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      findMarkdownFiles(full, results, base);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(relative(base, full));
    }
  }
  return results;
}

/**
 * Strip fenced code blocks from text so em-dash inside code (e.g., flag
 * descriptions, regex examples) doesn't trigger the rule.
 *
 * Returns the stripped text with the same line count (code-block lines
 * become empty), so reported line numbers remain accurate.
 */
function stripCodeBlocks(text: string): string {
  const lines = text.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      lines[i] = "";
      continue;
    }
    if (inFence) {
      lines[i] = "";
      continue;
    }
    // Strip inline code spans (`...`) on the line
    lines[i] = line.replace(/`[^`\n]+`/g, "");
  }
  return lines.join("\n");
}

// A generator region is one whole line: `<!-- oma:generated <name>:start -->`
// through the matching `<!-- oma:generated <name>:end -->`. `<name>` is any
// single token (cli-registry, skill-catalog, …).
const GENERATED_REGION_MARKER =
  /^[ \t]*<!--\s*oma:generated\s+([^\s:]+):(start|end)\s*-->[ \t]*$/;

/**
 * Indexes of lines inside a closed generator region. The end marker closes the
 * nearest unmatched start with the same `<name>`.
 *
 * A start marker with no matching end does not open a region. Those lines stay
 * visible, so a missing end cannot hide the rest of the file.
 */
function generatedRegionLines(lines: readonly string[]): Set<number> {
  const open: { name: string; line: number }[] = [];
  const hidden = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    const match = GENERATED_REGION_MARKER.exec(lines[i] ?? "");
    if (!match) continue;
    const name = match[1] ?? "";
    if (match[2] === "start") {
      open.push({ name, line: i });
      continue;
    }
    for (let j = open.length - 1; j >= 0; j--) {
      const start = open[j];
      if (!start || start.name !== name) continue;
      open.splice(j, 1);
      for (let k = start.line; k <= i; k++) hidden.add(k);
      break;
    }
  }
  return hidden;
}

function splitTableCells(line: string): string[] {
  const cells: string[] = [];
  let start = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "\\") {
      i++;
      continue;
    }
    if (line[i] === "|") {
      cells.push(line.slice(start, i));
      start = i + 1;
    }
  }
  cells.push(line.slice(start));
  return cells;
}

/**
 * Return true when `strippedLine` contains an em-dash that is not a lone
 * no-value placeholder (`—`) occupying an entire Markdown table cell.
 */
function hasProseEmDash(rawLine: string, strippedLine: string): boolean {
  if (!strippedLine.includes(EM_DASH)) return false;
  // Mask inline code with a non-whitespace token so a cell like `` `x` — ``
  // does not collapse to a bare `—` while pipes inside code stay ignored.
  const codeMasked = rawLine.replace(/`[^`\n]+`/g, "_");
  if (!codeMasked.includes("|")) return true;
  return splitTableCells(codeMasked).some((cell) => {
    const trimmed = cell.trim();
    return trimmed.includes(EM_DASH) && trimmed !== EM_DASH;
  });
}

function checkCjkEmDash(
  fileRel: string,
  lang: string,
  text: string,
): I18nStyleIssue[] {
  const issues: I18nStyleIssue[] = [];
  // Code stripping keeps one line per source line. Region detection runs on
  // that text so a marker inside a fence cannot suppress later prose, and
  // finding line numbers stay the file's line numbers.
  const rawLines = text.split("\n");
  const stripped = stripCodeBlocks(text);
  const lines = stripped.split("\n");
  const generated = generatedRegionLines(lines);
  for (let i = 0; i < lines.length; i++) {
    if (generated.has(i)) continue;
    const line = lines[i] ?? "";
    if (!hasProseEmDash(rawLines[i] ?? "", line)) continue;
    issues.push({
      file: fileRel,
      lang,
      line: i + 1,
      rule: "cjk-em-dash",
      match: line.trim().slice(0, 120),
    });
  }
  return issues;
}

/**
 * Strip frontmatter, headings (which often contain English proper nouns/code),
 * and markdown link/image syntax. Leaves prose body for language detection.
 */
function extractProseBody(text: string): string {
  let stripped = stripCodeBlocks(text);
  // Strip frontmatter (--- ... ---)
  stripped = stripped.replace(/^---\n[\s\S]*?\n---\n/, "");
  // Strip markdown link syntax — keep link text only
  stripped = stripped.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Strip image syntax
  stripped = stripped.replace(/!\[[^\]]*\]\([^)]+\)/g, "");
  // Strip URLs
  stripped = stripped.replace(/https?:\/\/\S+/g, "");
  // Strip HTML tags
  stripped = stripped.replace(/<[^>]+>/g, "");
  return stripped;
}

function isExpectedLangMatch(detected: string, expected: string): boolean {
  if (detected === expected) return true;
  // zh-cn / zh-tw / zh-hans / zh-hant — accept any zh-* as zh
  if (expected === "zh" && detected.startsWith("zh")) return true;
  return false;
}

/**
 * Flag a file when language detection identifies the dominant language as
 * English (or another non-expected language) for an i18n file that should
 * be in `expectedLang`. Uses `eld` (Efficient Language Detector) which is
 * more accurate than tinyld for technical mixed-content docs.
 *
 * Only flags when:
 * - eld considers detection reliable (isReliable === true), AND
 * - detected language differs from expected, AND
 * - detected language is "en" (the most common untranslated-placeholder case)
 *
 * We deliberately do NOT flag on other mismatches (e.g., detected="pt" for
 * an es file) because Romance/Germanic-language confusion is common in eld
 * for short or code-heavy bodies and would produce too many false positives.
 * The "en placeholder" pattern is the high-signal case worth catching.
 */
function checkWrongLanguage(
  fileRel: string,
  expectedLang: string,
  text: string,
  minChars: number,
): I18nStyleIssue[] {
  const body = extractProseBody(text).replace(/\s+/g, " ").trim();
  if (body.length < minChars) return [];
  const r = eld.detect(body);
  if (!r.isReliable()) return [];
  if (isExpectedLangMatch(r.language, expectedLang)) return [];
  // Only flag the en-placeholder case
  if (r.language !== "en") return [];
  return [
    {
      file: fileRel,
      lang: expectedLang,
      line: 1,
      rule: "wrong-language",
      match: `expected=${expectedLang} detected=en (likely untranslated EN placeholder)`,
    },
  ];
}

function findLocales(i18nRoot: string): string[] {
  if (!existsSync(i18nRoot)) return [];
  return readdirSync(i18nRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export function lintI18nStyle(opts: LintI18nOptions): I18nStyleIssue[] {
  const i18nDir = opts.i18nDir ?? "web/i18n";
  const subpath =
    opts.i18nDocsSubpath ?? "docusaurus-plugin-content-docs/current";
  const cjk = opts.cjkLocales ?? DEFAULT_CJK_LOCALES;
  const rules = opts.rules ?? DEFAULT_RULES;
  const minChars = opts.minDetectionChars ?? DEFAULT_MIN_DETECTION_CHARS;
  const allLocales =
    opts.allLocales ?? findLocales(join(opts.repoRoot, i18nDir));

  const issues: I18nStyleIssue[] = [];
  // CJK em-dash check (CJK locales only)
  if (rules.includes("cjk-em-dash")) {
    for (const lang of cjk) {
      const langRoot = join(opts.repoRoot, i18nDir, lang, subpath);
      if (!existsSync(langRoot)) continue;
      const files = findMarkdownFiles(langRoot);
      for (const rel of files) {
        const abs = join(langRoot, rel);
        const text = readFileSync(abs, "utf-8");
        const fileRel = join(i18nDir, lang, subpath, rel);
        issues.push(...checkCjkEmDash(fileRel, lang, text));
      }
    }
  }
  // Wrong-language check (all locales)
  if (rules.includes("wrong-language")) {
    for (const lang of allLocales) {
      const langRoot = join(opts.repoRoot, i18nDir, lang, subpath);
      if (!existsSync(langRoot)) continue;
      const files = findMarkdownFiles(langRoot);
      for (const rel of files) {
        const abs = join(langRoot, rel);
        const text = readFileSync(abs, "utf-8");
        const fileRel = join(i18nDir, lang, subpath, rel);
        issues.push(...checkWrongLanguage(fileRel, lang, text, minChars));
      }
    }
  }
  return issues;
}

export function summarizeStyleIssues(issues: I18nStyleIssue[]): {
  total: number;
  byRule: Record<I18nStyleRule, number>;
  byLang: Record<string, number>;
  byFile: Array<{ file: string; lang: string; count: number }>;
} {
  const byRule: Record<I18nStyleRule, number> = {
    "cjk-em-dash": 0,
    "wrong-language": 0,
  };
  const byLang: Record<string, number> = {};
  const fileCounts = new Map<string, { lang: string; count: number }>();
  for (const i of issues) {
    byRule[i.rule]++;
    byLang[i.lang] = (byLang[i.lang] ?? 0) + 1;
    const cur = fileCounts.get(i.file);
    if (cur) {
      cur.count++;
    } else {
      fileCounts.set(i.file, { lang: i.lang, count: 1 });
    }
  }
  const byFile = Array.from(fileCounts.entries())
    .map(([file, { lang, count }]) => ({ file, lang, count }))
    .sort((a, b) => b.count - a.count);
  return { total: issues.length, byRule, byLang, byFile };
}
