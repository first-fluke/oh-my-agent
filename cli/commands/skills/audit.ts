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

export interface SkillAuditFinding {
  pair: SimilarityPair;
  severity: "warn" | "fail";
}

export interface SkillAuditReport {
  skillsDir: string;
  skillCount: number;
  pairs: SimilarityPair[];
  findings: SkillAuditFinding[];
  worstPair?: SimilarityPair;
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
  return {
    skillsDir,
    skillCount: docs.length,
    pairs,
    findings,
    worstPair: pairs[0],
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
    },
    null,
    2,
  );
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
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
