import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { INSTALLED_SKILLS_DIR } from "../../constants/vendors.js";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import {
  pairwiseSimilarity,
  type SimilarityPair,
} from "../../utils/text-similarity.js";

export const SKILLS_AUDIT_WARN_THRESHOLD = 0.6;
export const SKILLS_AUDIT_FAIL_THRESHOLD = 0.75;

// Library-size routing-decay heuristic (Routing Law — Chen et al. 2026,
// arXiv:2605.16508). Routing/selection accuracy decays logarithmically as the
// skill library grows. There is no "safe" count, but we warn once the installed
// set grows well past the curated baseline (~48 shipped skills) so users who
// pile on custom skills get a signal to consolidate or sharpen boundaries.
export const SKILLS_COUNT_WARN_THRESHOLD = 60;

// Black-hole detection (Routing Law, ibid.): an overly-generic skill whose
// description overlaps *many* neighbors and inappropriately captures requests
// ("skill hijacking"). Pairwise similarity misses this — a black-hole need not
// be a near-duplicate of any single skill. We flag a skill whose mean similarity
// to all others is a positive outlier in the library's breadth distribution.
export const BLACKHOLE_MIN_SKILLS = 5;
export const BLACKHOLE_Z = 1.5;
export const BLACKHOLE_BREADTH_FLOOR = 0.15;

// Focus check (SkillsBench — Li et al. 2026, arXiv:2602.12670). Focused skills
// with few instruction modules outperform larger bundles, and gains shrink as
// a skill sprawls. OMA's progressive disclosure (resources load on demand)
// softens the penalty, so we only flag extremes: a skill whose reference-doc
// count or SKILL.md body is far past the curated library's norm.
export const FOCUS_DOC_WARN_THRESHOLD = 20;
export const FOCUS_BODY_WARN_THRESHOLD = 25_000;
const FOCUS_EXCLUDED_DIRS = new Set(["node_modules", "vendor", "vendored"]);

export interface SkillAuditFinding {
  pair: SimilarityPair;
  severity: "warn" | "fail";
}

/** Per-skill mean cosine similarity to every other skill ("breadth"). */
export interface SkillBreadth {
  id: string;
  breadth: number;
}

/** A skill flagged as an overly-generic "black-hole" by outlier breadth. */
export interface BlackHoleFinding {
  id: string;
  breadth: number;
  cutoff: number;
  severity: "warn";
}

/** Library-size routing-decay warning. */
export interface SkillCountFinding {
  skillCount: number;
  threshold: number;
  severity: "warn";
}

/** A skill flagged as an oversized bundle by the focus check. */
export interface FocusFinding {
  id: string;
  docCount: number;
  bodyChars: number;
  reasons: Array<"docs" | "body">;
  severity: "warn";
}

export interface SkillAuditReport {
  skillsDir: string;
  skillCount: number;
  pairs: SimilarityPair[];
  findings: SkillAuditFinding[];
  worstPair?: SimilarityPair;
  breadths: SkillBreadth[];
  blackHoles: BlackHoleFinding[];
  sizeFinding?: SkillCountFinding;
  focusFindings: FocusFinding[];
}

function readSkillDescriptions(
  skillsDir: string,
): Array<{ id: string; text: string }> {
  if (!existsSync(skillsDir)) return [];
  const entries = readdirSync(skillsDir).filter((name) => {
    if (name.startsWith("_")) return false;
    const skillPath = join(skillsDir, name);
    try {
      return statSync(skillPath).isDirectory();
    } catch {
      return false;
    }
  });

  const docs: Array<{ id: string; text: string }> = [];
  for (const name of entries) {
    const skillMdPath = join(skillsDir, name, "SKILL.md");
    if (!existsSync(skillMdPath)) continue;
    try {
      const raw = readFileSync(skillMdPath, "utf-8");
      // Skip oma-generated wrappers (e.g. workflow routers). They are command
      // adapters, not domain skills, and their descriptions are copied from the
      // workflow — auditing them produces false-positive collisions.
      if (raw.includes("<!-- oma:generated -->")) continue;
      const { frontmatter } = parseFrontmatter(raw);
      const description =
        typeof frontmatter.description === "string"
          ? frontmatter.description
          : "";
      if (description.trim().length === 0) continue;
      docs.push({ id: name, text: description });
    } catch {}
  }
  return docs;
}

/**
 * Mean cosine similarity of each skill to every other skill. A skill with a
 * high breadth overlaps the whole library — the black-hole signature that
 * pairwise similarity (which only compares two skills at a time) cannot see.
 */
export function computeBreadths(
  ids: string[],
  pairs: SimilarityPair[],
): SkillBreadth[] {
  if (ids.length < 2) return [];
  const sums = new Map<string, number>(ids.map((id) => [id, 0]));
  for (const pair of pairs) {
    sums.set(pair.a, (sums.get(pair.a) ?? 0) + pair.similarity);
    sums.set(pair.b, (sums.get(pair.b) ?? 0) + pair.similarity);
  }
  const denom = ids.length - 1;
  return ids
    .map((id) => ({ id, breadth: (sums.get(id) ?? 0) / denom }))
    .sort((x, y) => y.breadth - x.breadth);
}

/**
 * Flag skills whose breadth is a positive outlier in the library distribution
 * (>= mean + BLACKHOLE_Z * stddev) and clears an absolute floor. Self-calibrating
 * so it stays quiet on a library of well-separated skills and only fires on a
 * genuinely over-generic description.
 */
export function detectBlackHoles(breadths: SkillBreadth[]): BlackHoleFinding[] {
  if (breadths.length < BLACKHOLE_MIN_SKILLS) return [];
  const values = breadths.map((b) => b.breadth);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  if (stddev < 1e-9) return []; // uniform breadth → no outlier
  const cutoff = mean + BLACKHOLE_Z * stddev;
  const findings: BlackHoleFinding[] = [];
  for (const b of breadths) {
    if (b.breadth >= cutoff && b.breadth >= BLACKHOLE_BREADTH_FLOOR) {
      findings.push({
        id: b.id,
        breadth: b.breadth,
        cutoff,
        severity: "warn",
      });
    }
  }
  return findings;
}

/** Count non-SKILL.md markdown docs under a skill dir, skipping vendored trees. */
function countReferenceDocs(dir: string): number {
  let count = 0;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return 0;
  }
  for (const name of entries) {
    if (FOCUS_EXCLUDED_DIRS.has(name)) continue;
    const full = join(dir, name);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) {
        count += countReferenceDocs(full);
      } else if (name.endsWith(".md") && name !== "SKILL.md") {
        count += 1;
      }
    } catch {}
  }
  return count;
}

/**
 * Flag skills that have sprawled into bundles: too many reference docs or an
 * oversized SKILL.md body. Focused skills outperform bundles (SkillsBench);
 * the fix is splitting into narrower skills, not deleting content.
 */
export function computeFocusFindings(
  skillsDir: string,
  ids: string[],
): FocusFinding[] {
  const findings: FocusFinding[] = [];
  for (const id of ids) {
    const skillDir = join(skillsDir, id);
    const docCount = countReferenceDocs(skillDir);
    let bodyChars = 0;
    try {
      bodyChars = readFileSync(join(skillDir, "SKILL.md"), "utf-8").length;
    } catch {}
    const reasons: Array<"docs" | "body"> = [];
    if (docCount > FOCUS_DOC_WARN_THRESHOLD) reasons.push("docs");
    if (bodyChars > FOCUS_BODY_WARN_THRESHOLD) reasons.push("body");
    if (reasons.length > 0) {
      findings.push({ id, docCount, bodyChars, reasons, severity: "warn" });
    }
  }
  return findings.sort((a, b) => b.docCount - a.docCount);
}

export function auditSkills(workspace: string): SkillAuditReport {
  const skillsDir = join(workspace, INSTALLED_SKILLS_DIR);
  const docs = readSkillDescriptions(skillsDir);
  const pairs = pairwiseSimilarity(docs);
  const findings: SkillAuditFinding[] = [];
  for (const pair of pairs) {
    if (pair.similarity >= SKILLS_AUDIT_FAIL_THRESHOLD) {
      findings.push({ pair, severity: "fail" });
    } else if (pair.similarity >= SKILLS_AUDIT_WARN_THRESHOLD) {
      findings.push({ pair, severity: "warn" });
    }
  }
  const breadths = computeBreadths(
    docs.map((d) => d.id),
    pairs,
  );
  const blackHoles = detectBlackHoles(breadths);
  const sizeFinding: SkillCountFinding | undefined =
    docs.length > SKILLS_COUNT_WARN_THRESHOLD
      ? {
          skillCount: docs.length,
          threshold: SKILLS_COUNT_WARN_THRESHOLD,
          severity: "warn",
        }
      : undefined;
  const focusFindings = computeFocusFindings(
    skillsDir,
    docs.map((d) => d.id),
  );
  return {
    skillsDir,
    skillCount: docs.length,
    pairs,
    findings,
    worstPair: pairs[0],
    breadths,
    blackHoles,
    sizeFinding,
    focusFindings,
  };
}

export function serializeSkillAuditReport(report: SkillAuditReport): string {
  return JSON.stringify(
    {
      ok: report.findings.length === 0,
      skillsDir: report.skillsDir,
      skillCount: report.skillCount,
      worstPair: report.worstPair ?? null,
      findings: report.findings.map((f) => ({
        a: f.pair.a,
        b: f.pair.b,
        similarity: Number(f.pair.similarity.toFixed(4)),
        severity: f.severity,
      })),
      blackHoles: report.blackHoles.map((b) => ({
        id: b.id,
        breadth: Number(b.breadth.toFixed(4)),
        cutoff: Number(b.cutoff.toFixed(4)),
        severity: b.severity,
      })),
      sizeFinding: report.sizeFinding ?? null,
      focusFindings: report.focusFindings.map((f) => ({
        id: f.id,
        docCount: f.docCount,
        bodyChars: f.bodyChars,
        reasons: f.reasons,
        severity: f.severity,
      })),
    },
    null,
    2,
  );
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function renderBlackHolesAndSize(report: SkillAuditReport): void {
  for (const bh of report.blackHoles) {
    console.log(
      `  [WARN] black-hole: ${bh.id}  (breadth ${formatPercent(bh.breadth)} ≥ cutoff ${formatPercent(bh.cutoff)})`,
    );
  }
  if (report.blackHoles.length > 0) {
    console.log(
      "  Over-generic descriptions hijack routing — narrow the trigger to its specific domain.",
    );
  }
  if (report.sizeFinding) {
    console.log(
      `  [WARN] library size: ${report.sizeFinding.skillCount} skills (> ${report.sizeFinding.threshold}).`,
    );
    console.log(
      "  Routing accuracy decays as the library grows — consolidate overlapping skills.",
    );
  }
  for (const f of report.focusFindings) {
    const parts = [
      f.reasons.includes("docs")
        ? `${f.docCount} reference docs > ${FOCUS_DOC_WARN_THRESHOLD}`
        : null,
      f.reasons.includes("body")
        ? `SKILL.md ${f.bodyChars} chars > ${FOCUS_BODY_WARN_THRESHOLD}`
        : null,
    ].filter(Boolean);
    console.log(`  [WARN] bundle: ${f.id}  (${parts.join(", ")})`);
  }
  if (report.focusFindings.length > 0) {
    console.log(
      "  Focused skills outperform bundles — split sprawling skills into narrower ones.",
    );
  }
}

export function renderSkillAuditReport(report: SkillAuditReport): void {
  console.log(`\nSkill boundary audit  (skills: ${report.skillCount})`);
  console.log(`  source: ${report.skillsDir}\n`);
  if (report.skillCount < 2) {
    console.log("  Not enough skills installed to compute pair similarity.");
    return;
  }
  if (report.findings.length === 0) {
    const worst = report.worstPair;
    console.log("  PASS — no pair in warn or fail band.");
    if (worst) {
      console.log(
        `  closest pair: ${worst.a} ↔ ${worst.b} (${formatPercent(worst.similarity)})`,
      );
    }
    renderBlackHolesAndSize(report);
    return;
  }
  for (const finding of report.findings) {
    const tag = finding.severity === "fail" ? "FAIL" : "WARN";
    console.log(
      `  [${tag}] ${finding.pair.a} ↔ ${finding.pair.b}  (${formatPercent(finding.pair.similarity)})`,
    );
  }
  console.log(
    `\n  Thresholds: warn ≥ ${formatPercent(SKILLS_AUDIT_WARN_THRESHOLD)}, fail ≥ ${formatPercent(SKILLS_AUDIT_FAIL_THRESHOLD)}`,
  );
  console.log(
    "  Rewrite frontmatter `description:` to differentiate triggers, domains, or boundaries.",
  );
  renderBlackHolesAndSize(report);
}

export function runSkillsAudit(jsonMode = false): void {
  const report = auditSkills(process.cwd());
  if (jsonMode) {
    console.log(serializeSkillAuditReport(report));
  } else {
    renderSkillAuditReport(report);
  }
  const hasFail = report.findings.some((f) => f.severity === "fail");
  if (hasFail) process.exit(1);
}
