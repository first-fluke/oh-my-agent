/**
 * i18n drift detection for docs.
 *
 * Compares each English source doc against its translations under
 * web/i18n/{lang}/docusaurus-plugin-content-docs/current/{rel-path}.
 *
 * Emits structural drift signals (line count, heading count, last-modified
 * timestamp) so the host LLM (oma-translator runtime) can decide which
 * translations need a diff-sync patch.
 *
 * The CLI never edits translations itself — it only reports candidate pairs.
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const toPosix = (p: string): string => (sep === "/" ? p : p.split(sep).join("/"));

export interface I18nDriftPair {
  source: string;
  target: string;
  lang: string;
  enLines: number;
  tgtLines: number;
  linesDiff: number;
  linesDiffPct: number;
  enHeadings: number;
  tgtHeadings: number;
  headingCountDiff: number;
  enMtimeUnix: number | null;
  tgtMtimeUnix: number | null;
  enNewerThanTgt: boolean;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

const HEADING_RE = /^#{1,6}\s/;

function countLines(text: string): number {
  if (text === "") return 0;
  return text.split("\n").length;
}

function countHeadings(text: string): number {
  let n = 0;
  for (const line of text.split("\n")) {
    if (HEADING_RE.test(line)) n++;
  }
  return n;
}

function gitLastCommitUnix(repoRoot: string, file: string): number | null {
  try {
    const out = execSync(`git log -1 --format=%ct -- "${file}"`, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out ? Number.parseInt(out, 10) : null;
  } catch {
    return null;
  }
}

function classifySeverity(
  pair: Omit<I18nDriftPair, "severity">,
): I18nDriftPair["severity"] {
  // CRITICAL: target file missing entirely (caller signals via tgtLines === -1)
  if (pair.tgtLines === -1) return "CRITICAL";
  // HIGH: large line drift OR EN newer with structural drift
  if (pair.linesDiffPct >= 15) return "HIGH";
  if (pair.enNewerThanTgt && pair.headingCountDiff > 0) return "HIGH";
  // MEDIUM: moderate line drift OR EN newer
  if (pair.linesDiffPct >= 5) return "MEDIUM";
  if (pair.enNewerThanTgt) return "MEDIUM";
  // LOW: minor drift, target up to date
  return "LOW";
}

function findEnDocs(
  docsRoot: string,
  results: string[] = [],
  base = docsRoot,
): string[] {
  if (!existsSync(docsRoot)) return results;
  for (const entry of readdirSync(docsRoot, { withFileTypes: true })) {
    const full = join(docsRoot, entry.name);
    if (entry.isDirectory()) {
      findEnDocs(full, results, base);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(toPosix(relative(base, full)));
    }
  }
  return results;
}

function findLocales(i18nRoot: string): string[] {
  if (!existsSync(i18nRoot)) return [];
  return readdirSync(i18nRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export interface DetectI18nDriftOptions {
  repoRoot: string;
  docsDir?: string; // default: web/docs
  i18nDir?: string; // default: web/i18n
  i18nDocsSubpath?: string; // default: docusaurus-plugin-content-docs/current
  minSeverity?: I18nDriftPair["severity"]; // filter: only emit at-or-above this severity
}

const SEVERITY_RANK: Record<I18nDriftPair["severity"], number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/**
 * Scan all (en-doc, translation) pairs and return drift signals.
 * Ordered by severity (CRITICAL → LOW), then by linesDiffPct descending.
 */
export function detectI18nDrift(opts: DetectI18nDriftOptions): I18nDriftPair[] {
  const docsDir = opts.docsDir ?? "web/docs";
  const i18nDir = opts.i18nDir ?? "web/i18n";
  const subpath =
    opts.i18nDocsSubpath ?? "docusaurus-plugin-content-docs/current";
  const minRank = SEVERITY_RANK[opts.minSeverity ?? "LOW"];

  const docsAbs = join(opts.repoRoot, docsDir);
  const i18nAbs = join(opts.repoRoot, i18nDir);
  const enDocs = findEnDocs(docsAbs);
  const locales = findLocales(i18nAbs);

  const pairs: I18nDriftPair[] = [];
  for (const rel of enDocs) {
    const enAbs = join(docsAbs, rel);
    if (!existsSync(enAbs)) continue;
    const enText = readFileSync(enAbs, "utf-8");
    const enLines = countLines(enText);
    const enHeadings = countHeadings(enText);
    const sourceRel = `${docsDir}/${rel}`;
    const enMtime = gitLastCommitUnix(opts.repoRoot, sourceRel);

    for (const lang of locales) {
      const tgtRel = `${i18nDir}/${lang}/${subpath}/${rel}`;
      const tgtAbs = join(opts.repoRoot, tgtRel);
      if (!existsSync(tgtAbs)) {
        const missing: I18nDriftPair = {
          source: sourceRel,
          target: tgtRel,
          lang,
          enLines,
          tgtLines: -1,
          linesDiff: enLines,
          linesDiffPct: 100,
          enHeadings,
          tgtHeadings: 0,
          headingCountDiff: enHeadings,
          enMtimeUnix: enMtime,
          tgtMtimeUnix: null,
          enNewerThanTgt: enMtime !== null,
          severity: "CRITICAL",
        };
        pairs.push(missing);
        continue;
      }
      const tgtText = readFileSync(tgtAbs, "utf-8");
      const tgtLines = countLines(tgtText);
      const tgtHeadings = countHeadings(tgtText);
      const tgtMtime = gitLastCommitUnix(opts.repoRoot, tgtRel);
      const linesDiff = Math.abs(enLines - tgtLines);
      const linesDiffPct =
        enLines > 0 ? Math.round((linesDiff * 100) / enLines) : 0;
      const headingCountDiff = Math.abs(enHeadings - tgtHeadings);
      const enNewerThanTgt =
        enMtime !== null && tgtMtime !== null && enMtime > tgtMtime;

      const partial: Omit<I18nDriftPair, "severity"> = {
        source: sourceRel,
        target: tgtRel,
        lang,
        enLines,
        tgtLines,
        linesDiff,
        linesDiffPct,
        enHeadings,
        tgtHeadings,
        headingCountDiff,
        enMtimeUnix: enMtime,
        tgtMtimeUnix: tgtMtime,
        enNewerThanTgt,
      };
      pairs.push({
        ...partial,
        severity: classifySeverity(partial),
      });
    }
  }

  return pairs
    .filter((p) => SEVERITY_RANK[p.severity] >= minRank)
    .sort((a, b) => {
      const rd = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (rd !== 0) return rd;
      return b.linesDiffPct - a.linesDiffPct;
    });
}

export function summarizeDrift(pairs: I18nDriftPair[]): {
  total: number;
  bySeverity: Record<I18nDriftPair["severity"], number>;
  topPairs: I18nDriftPair[];
} {
  const bySeverity: Record<I18nDriftPair["severity"], number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  for (const p of pairs) bySeverity[p.severity]++;
  return {
    total: pairs.length,
    bySeverity,
    topPairs: pairs.slice(0, 10),
  };
}
