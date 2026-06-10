import * as p from "@clack/prompts";
import pc from "picocolors";
import type { DoctorReport } from "../types.js";

function evalCoverageLine(report: DoctorReport): string {
  const { skillsWithEval, totalSkills } = report.skillEval;
  if (totalSkills === 0) return "";
  if (skillsWithEval === 0) {
    return pc.dim(
      `eval coverage: 0/${totalSkills} skills have eval fixtures — run: oma skills eval`,
    );
  }
  return pc.dim(
    `eval coverage: ${skillsWithEval}/${totalSkills} skills have eval fixtures (oma skills eval)`,
  );
}

function skillScalingLines(report: DoctorReport): string[] {
  const audit = report.skillAudit;
  const lines: string[] = [];
  for (const bh of audit.blackHoles) {
    const pct = `${(bh.breadth * 100).toFixed(1)}%`;
    lines.push(
      `${pc.yellow("WARN")} black-hole ${bh.id}  ${pc.dim(`breadth ${pct}`)}`,
    );
  }
  if (audit.blackHoles.length > 0) {
    lines.push(
      pc.dim(
        "Over-generic descriptions hijack routing — narrow the trigger to its domain.",
      ),
    );
  }
  if (audit.sizeFinding) {
    lines.push(
      `${pc.yellow("WARN")} library size ${audit.sizeFinding.skillCount} skills ${pc.dim(`(> ${audit.sizeFinding.threshold})`)}`,
    );
    lines.push(
      pc.dim(
        "Routing accuracy decays as the library grows — consolidate overlapping skills.",
      ),
    );
  }
  return lines;
}

export function renderSkillBoundaries(report: DoctorReport): void {
  const audit = report.skillAudit;
  if (audit.skillCount < 2) return;
  const scalingLines = skillScalingLines(report);
  const coverageLine = evalCoverageLine(report);
  if (audit.findings.length === 0) {
    const worst = audit.worstPair;
    const worstLine = worst
      ? `\n${pc.dim(`closest pair: ${worst.a} ↔ ${worst.b} (${(worst.similarity * 100).toFixed(1)}%)`)}`
      : "";
    const body =
      scalingLines.length > 0
        ? [
            `${pc.green("✅")} No skill description collisions${worstLine}`,
            "",
            ...scalingLines,
          ]
        : [`${pc.green("✅")} No skill description collisions${worstLine}`];
    if (coverageLine) body.push(coverageLine);
    p.note(body.join("\n"), "Skill Boundaries");
    return;
  }
  const lines = audit.findings.map((f) => {
    const tag = f.severity === "fail" ? pc.red("FAIL") : pc.yellow("WARN");
    const pct = `${(f.pair.similarity * 100).toFixed(1)}%`;
    return `${tag} ${f.pair.a} ↔ ${f.pair.b}  ${pc.dim(pct)}`;
  });
  p.note(
    [
      ...lines,
      ...(scalingLines.length > 0 ? ["", ...scalingLines] : []),
      "",
      pc.dim(
        "Rewrite frontmatter `description:` to differentiate triggers, domains, or boundaries.",
      ),
      pc.dim("Run: oma skills audit --json"),
      ...(coverageLine ? [coverageLine] : []),
    ].join("\n"),
    "Skill Boundaries",
  );
}
