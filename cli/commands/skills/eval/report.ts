import {
  MIN_TASKS,
  type SkillUtilityReport,
  UTILITY_FAIL_LIFT,
  UTILITY_WARN_LIFT,
} from "./types.js";

// --- Serialization ---

export function serializeSkillUtilityReport(
  report: SkillUtilityReport,
): string {
  return JSON.stringify(
    {
      ok: report.coverage === "ok" && report.decision === "pass",
      skill: report.skill,
      taskCount: report.taskCount,
      skippedFiles: report.skippedFiles,
      coverage: report.coverage,
      decision: report.decision,
      baselineScore: Number(report.baselineScore.toFixed(4)),
      treatmentScore: Number(report.treatmentScore.toFixed(4)),
      utilityLift: Number(report.utilityLift.toFixed(4)),
      utilityStdDev: Number(report.utilityStdDev.toFixed(4)),
      findings: report.findings.map((f) => ({
        taskId: f.taskId,
        baseline: f.baseline,
        treatment: f.treatment,
        lift: Number(f.lift.toFixed(4)),
      })),
      negativeTransfer: report.negativeTransfer,
      isolation: report.isolation,
      isolationVendor: report.isolationVendor,
    },
    null,
    2,
  );
}

// --- Rendering ---

export function renderSkillUtilityReport(report: SkillUtilityReport): void {
  console.log(`\nSkill utility eval  (skill: ${report.skill})`);
  console.log(`  tasks: ${report.taskCount}`);
  if (report.isolation && report.isolation !== "n/a") {
    const vendorTag = report.isolationVendor
      ? ` [${report.isolationVendor}]`
      : "";
    const lowConfidence =
      report.isolation === "enforced"
        ? ""
        : "  ⚠ low-confidence (baseline may be contaminated)";
    console.log(`  isolation: ${report.isolation}${vendorTag}${lowConfidence}`);
  }
  console.log("");

  if (report.skippedFiles.length > 0) {
    console.log(
      `  skipped files: ${report.skippedFiles.length} (malformed or invalid schema)`,
    );
  }

  if (report.coverage === "insufficient") {
    console.log(
      `  INSUFFICIENT COVERAGE — fewer than ${MIN_TASKS} tasks found.`,
    );
    console.log(
      `  Add task fixtures to .agents/eval/${report.skill}/ and rollouts to _rollouts/.`,
    );
    return;
  }

  const liftPct = `${(report.utilityLift * 100).toFixed(1)}%`;
  const stdDevPct = `${(report.utilityStdDev * 100).toFixed(1)}%`;
  console.log(
    `  baseline: ${(report.baselineScore * 100).toFixed(1)}%  treatment: ${(report.treatmentScore * 100).toFixed(1)}%`,
  );
  console.log(`  utilityLift: ${liftPct}  (stddev: ${stdDevPct})`);

  const tag = report.decision.toUpperCase();
  console.log(`  [${tag}]`);

  if (report.decision === "fail") {
    console.log(
      `  No measurable lift (≤ ${(UTILITY_FAIL_LIFT * 100).toFixed(0)}%). Skill does not improve task outcomes.`,
    );
  } else if (report.decision === "warn") {
    console.log(
      `  Low lift (< ${(UTILITY_WARN_LIFT * 100).toFixed(0)}%). Skill shows marginal improvement.`,
    );
  } else {
    console.log(
      `  Skill shows positive utility lift ≥ ${(UTILITY_WARN_LIFT * 100).toFixed(0)}%.`,
    );
  }

  if (report.findings.length > 0) {
    console.log("\n  Per-task findings:");
    for (const f of report.findings) {
      const liftSign = f.lift >= 0 ? "+" : "";
      console.log(
        `    ${f.taskId}: baseline=${f.baseline} treatment=${f.treatment} lift=${liftSign}${f.lift.toFixed(3)}`,
      );
    }
  }

  if (report.negativeTransfer.length > 0) {
    console.log("\n  Negative transfer:");
    for (const nt of report.negativeTransfer) {
      console.log(
        `    ${nt.otherSkill} [${nt.domain}]: delta=${nt.delta.toFixed(3)}`,
      );
    }
  }

  console.log(
    `\n  Thresholds: fail ≤ ${(UTILITY_FAIL_LIFT * 100).toFixed(0)}%, warn < ${(UTILITY_WARN_LIFT * 100).toFixed(0)}%`,
  );
}
