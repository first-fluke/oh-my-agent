import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { INSTALLED_SKILLS_DIR } from "../../constants/vendors.js";
import { parseFrontmatter } from "../../utils/frontmatter.js";

// Skill smell detector (Anatomy-to-Smells — Hong, Imani & Ahmed 2026,
// arXiv:2607.01456). Authoring-practice violations ("skill smells") are
// near-universal in the wild (>99% of SKILL.md files) and persist as skills
// evolve; the paper's remedy is an automated detector. Generic smells apply
// to every skill; SSL-lite structure smells apply only when the body opts
// into the format (has a `## Scheduling` heading), so third-party skills
// are not held to a format they never adopted.

export const LINT_MIN_DESCRIPTION_CHARS = 40;

// Anthropic's skill authoring guide caps the SKILL.md body at 500 lines; past
// that, content belongs in `resources/` behind progressive disclosure. The body
// is measured with frontmatter excluded, since only the body is loaded on
// trigger.
export const LINT_MAX_BODY_LINES = 500;

const SSL_LITE_SECTIONS = [
  "Scheduling",
  "Structural Flow",
  "Logical Operations",
  "References",
];

const RESOURCE_REF_PATTERN =
  /(?:^|[\s`("'])((?:resources|config|scripts|assets)\/[\w\-./]+\.\w+)/gm;

export interface SkillLintSmell {
  skill: string;
  smell: string;
  severity: "warn" | "fail";
  detail: string;
}

export interface SkillLintReport {
  skillsDir: string;
  skillCount: number;
  sslLiteCount: number;
  smells: SkillLintSmell[];
  cleanCount: number;
}

/** Drop fenced code blocks so headings/placeholders inside them are ignored. */
function stripFences(body: string): string {
  const out: string[] = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) out.push(line);
  }
  return out.join("\n");
}

function stripInlineCode(text: string): string {
  return text.replace(/`[^`\n]*`/g, "");
}

function topLevelHeadings(strippedBody: string): string[] {
  const headings: string[] = [];
  for (const line of strippedBody.split("\n")) {
    const match = /^## (.+?)\s*$/.exec(line);
    if (match?.[1]) headings.push(match[1]);
  }
  return headings;
}

function lintGeneric(
  skill: string,
  skillDir: string,
  frontmatter: Record<string, unknown>,
  body: string,
  stripped: string,
): SkillLintSmell[] {
  const smells: SkillLintSmell[] = [];
  const name = typeof frontmatter.name === "string" ? frontmatter.name : "";
  const description =
    typeof frontmatter.description === "string" ? frontmatter.description : "";

  if (name.trim().length === 0) {
    smells.push({
      skill,
      smell: "missing-name",
      severity: "fail",
      detail: "frontmatter `name` is missing or empty",
    });
  }
  if (description.trim().length === 0) {
    smells.push({
      skill,
      smell: "missing-description",
      severity: "fail",
      detail:
        "frontmatter `description` is missing or empty — routing depends on it",
    });
  } else if (description.trim().length < LINT_MIN_DESCRIPTION_CHARS) {
    smells.push({
      skill,
      smell: "weak-description",
      severity: "warn",
      detail: `frontmatter \`description\` is ${description.trim().length} chars (< ${LINT_MIN_DESCRIPTION_CHARS}) — too thin to route on`,
    });
  }

  const bodyLines = body.replace(/\n$/, "").split("\n").length;
  if (bodyLines > LINT_MAX_BODY_LINES) {
    smells.push({
      skill,
      smell: "body-too-long",
      severity: "warn",
      detail: `SKILL.md body is ${bodyLines} lines (> ${LINT_MAX_BODY_LINES}) — move detail into \`resources/\` and keep navigation here`,
    });
  }

  const placeholderSource = stripInlineCode(stripped);
  const placeholders = placeholderSource.match(/\{[A-Z][^{}\n]{2,60}\}/g);
  if (placeholders && placeholders.length > 0) {
    smells.push({
      skill,
      smell: "template-placeholder",
      severity: "warn",
      detail: `leftover template placeholder(s): ${[...new Set(placeholders)].slice(0, 3).join(", ")}`,
    });
  }

  const seen = new Set<string>();
  for (const match of body.matchAll(RESOURCE_REF_PATTERN)) {
    const ref = match[1];
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    if (ref.includes("*") || ref.includes("{")) continue;
    if (!existsSync(join(skillDir, ref))) {
      smells.push({
        skill,
        smell: "broken-reference",
        severity: "fail",
        detail: `references \`${ref}\` but the file does not exist`,
      });
    }
  }
  return smells;
}

function lintSslLite(skill: string, stripped: string): SkillLintSmell[] {
  const smells: SkillLintSmell[] = [];
  const headings = topLevelHeadings(stripped);
  const expected = SSL_LITE_SECTIONS.join(" → ");
  if (headings.join(" → ") !== expected) {
    smells.push({
      skill,
      smell: "ssl-structure",
      severity: "fail",
      detail: `top-level sections are [${headings.join(", ")}]; SSL-lite requires exactly [${SSL_LITE_SECTIONS.join(", ")}]`,
    });
  }

  const canonicalCount = (
    stripped.match(/^### Canonical (command|workflow) path$/gm) ?? []
  ).length;
  if (canonicalCount !== 1) {
    smells.push({
      skill,
      smell: "canonical-path",
      severity: "fail",
      detail: `found ${canonicalCount} canonical path sections; exactly one \`### Canonical command path\` or \`### Canonical workflow path\` is required`,
    });
  }

  if (!/^### When NOT to use$/m.test(stripped)) {
    smells.push({
      skill,
      smell: "missing-boundaries",
      severity: "warn",
      detail:
        "no `### When NOT to use` section — boundary-less skills hijack routing",
    });
  }

  // SkillLens failure-mechanism encoding: the section must exist and carry
  // content in either convention — bullet items, or table rows beyond header.
  const failureSection =
    /### Failure and recovery\n([\s\S]*?)(?=\n### |\n## |$)/.exec(stripped);
  const lines = (failureSection?.[1] ?? "").split("\n");
  const bulletRows = lines.filter((line) => /^\s*[-*] /.test(line));
  const tableRows = lines.filter(
    (line) => /^\|/.test(line) && !/^\|[\s\-|]+\|$/.test(line),
  );
  if (!failureSection || (bulletRows.length < 1 && tableRows.length < 2)) {
    smells.push({
      skill,
      smell: "empty-failure-recovery",
      severity: "warn",
      detail:
        "`### Failure and recovery` is missing or has no failure rows — encode why the agent fails here, with an executable remedy",
    });
  }
  return smells;
}

export function lintSkills(
  workspace: string,
  skillFilter?: string,
): SkillLintReport {
  const skillsDir = join(workspace, INSTALLED_SKILLS_DIR);
  const smells: SkillLintSmell[] = [];
  let skillCount = 0;
  let sslLiteCount = 0;
  let cleanCount = 0;

  let entries: string[] = [];
  if (existsSync(skillsDir)) {
    entries = readdirSync(skillsDir).filter((name) => {
      if (name.startsWith("_")) return false;
      if (skillFilter && name !== skillFilter) return false;
      try {
        return statSync(join(skillsDir, name)).isDirectory();
      } catch {
        return false;
      }
    });
  }

  for (const name of entries) {
    const skillDir = join(skillsDir, name);
    const skillMdPath = join(skillDir, "SKILL.md");
    if (!existsSync(skillMdPath)) continue;
    let raw: string;
    try {
      raw = readFileSync(skillMdPath, "utf-8");
    } catch {
      continue;
    }
    if (raw.includes("<!-- oma:generated -->")) continue;
    skillCount += 1;

    const { frontmatter, body } = parseFrontmatter(raw);
    const stripped = stripFences(body);
    const found = lintGeneric(name, skillDir, frontmatter, body, stripped);
    if (/^## Scheduling$/m.test(stripped)) {
      sslLiteCount += 1;
      found.push(...lintSslLite(name, stripped));
    }
    if (found.length === 0) cleanCount += 1;
    smells.push(...found);
  }

  smells.sort((a, b) =>
    a.severity === b.severity
      ? a.skill.localeCompare(b.skill)
      : a.severity === "fail"
        ? -1
        : 1,
  );
  return { skillsDir, skillCount, sslLiteCount, smells, cleanCount };
}

export function serializeSkillLintReport(report: SkillLintReport): string {
  return JSON.stringify(
    {
      ok: !report.smells.some((s) => s.severity === "fail"),
      skillsDir: report.skillsDir,
      skillCount: report.skillCount,
      sslLiteCount: report.sslLiteCount,
      cleanCount: report.cleanCount,
      smells: report.smells,
    },
    null,
    2,
  );
}

export function renderSkillLintReport(report: SkillLintReport): void {
  console.log(
    `\nSkill smell lint  (skills: ${report.skillCount}, ssl-lite: ${report.sslLiteCount})`,
  );
  console.log(`  source: ${report.skillsDir}\n`);
  if (report.skillCount === 0) {
    console.log("  No skills found to lint.");
    return;
  }
  if (report.smells.length === 0) {
    console.log("  PASS — no skill smells detected.");
    return;
  }
  for (const smell of report.smells) {
    const tag = smell.severity === "fail" ? "FAIL" : "WARN";
    console.log(`  [${tag}] ${smell.skill}: ${smell.smell} — ${smell.detail}`);
  }
  console.log(
    `\n  ${report.cleanCount}/${report.skillCount} skills clean. Smells are authoring-practice violations (arXiv:2607.01456) — fix FAILs before shipping a skill.`,
  );
}

export function runSkillsLint(
  jsonMode = false,
  options: { skill?: string } = {},
): void {
  const report = lintSkills(process.cwd(), options.skill);
  if (jsonMode) {
    console.log(serializeSkillLintReport(report));
  } else {
    renderSkillLintReport(report);
  }
  const hasFail = report.smells.some((s) => s.severity === "fail");
  if (hasFail) process.exit(1);
}
