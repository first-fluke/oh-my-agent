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
      ok:
        report.coverage === "ok" &&
        report.decision === "pass" &&
        report.negativeTransferCoverage?.status !== "insufficient",
      skill: report.skill,
      taskCount: report.taskCount,
      skippedFiles: report.skippedFiles,
      coverage: report.coverage,
      decision: report.decision,
      baselineScore: Number(report.baselineScore.toFixed(4)),
      treatmentScore: Number(report.treatmentScore.toFixed(4)),
      utilityLift: Number(report.utilityLift.toFixed(4)),
      utilityStdDev: Number(report.utilityStdDev.toFixed(4)),
      repeatability: report.repeatability
        ? {
            ...report.repeatability,
            liftCi95: report.repeatability.liftCi95
              ? {
                  lower: Number(report.repeatability.liftCi95.lower.toFixed(4)),
                  upper: Number(report.repeatability.liftCi95.upper.toFixed(4)),
                }
              : null,
            withinTaskStdDev:
              report.repeatability.withinTaskStdDev === null
                ? null
                : Number(report.repeatability.withinTaskStdDev.toFixed(4)),
          }
        : undefined,
      findings: report.findings.map((f) => ({
        taskId: f.taskId,
        baseline: Number(f.baseline.toFixed(4)),
        treatment: Number(f.treatment.toFixed(4)),
        lift: Number(f.lift.toFixed(4)),
        trials: f.trials ?? 1,
        liftStdDev: Number((f.liftStdDev ?? 0).toFixed(4)),
        ...(f.routing ? { routing: f.routing } : {}),
      })),
      ...(report.usage
        ? {
            usage: {
              ...report.usage,
              costUsd: Number(report.usage.costUsd.toFixed(4)),
              judge: {
                ...report.usage.judge,
                costUsd: Number(report.usage.judge.costUsd.toFixed(4)),
              },
            },
          }
        : {}),
      ...(report.routing
        ? {
            routing: {
              ...report.routing,
              activationRate: Number(report.routing.activationRate.toFixed(4)),
            },
          }
        : {}),
      negativeTransfer: report.negativeTransfer,
      negativeTransferCoverage: report.negativeTransferCoverage,
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
  const transferCoverage = report.negativeTransferCoverage;
  if (transferCoverage && transferCoverage.status !== "not-requested") {
    console.log(
      `  negative-transfer coverage: ${transferCoverage.status} (${transferCoverage.scored}/${transferCoverage.expected})`,
    );
  }
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
  const rep = report.repeatability ?? {
    trials: 1,
    liftCi95: null,
    withinTaskStdDev: null,
    status: "single-trial" as const,
  };
  const ci = rep.liftCi95
    ? `[${(rep.liftCi95.lower * 100).toFixed(1)}%, ${(rep.liftCi95.upper * 100).toFixed(1)}%]`
    : "n/a";
  const within =
    rep.withinTaskStdDev === null
      ? "n/a"
      : `${(rep.withinTaskStdDev * 100).toFixed(1)}%`;
  console.log(
    `  repeatability: ${rep.status}  trials: ${rep.trials}  lift 95% CI: ${ci}  within-task stddev: ${within}`,
  );
  if (report.usage) {
    const u = report.usage;
    const cost = (value: number, status: string): string =>
      status === "unknown"
        ? "unknown"
        : `$${value.toFixed(4)}${status === "partial" ? "+" : ""}`;
    console.log(
      `  usage: arms ${u.dispatches} dispatches, ${u.inputTokens} in / ${u.outputTokens} out, ${cost(u.costUsd, u.status)}` +
        `; judge ${u.judge.dispatches} dispatches, ${cost(u.judge.costUsd, u.judge.status)}`,
    );
  }
  if (report.routing) {
    const r = report.routing;
    const misrouted = Object.entries(r.misroutedTo)
      .map(([name, count]) => `${name}×${count}`)
      .join(", ");
    console.log(
      `  routing: ${r.status}  activated ${r.activated}/${r.measured} (${(r.activationRate * 100).toFixed(0)}%)  misrouted ${r.misrouted}${misrouted ? ` [${misrouted}]` : ""}  none ${r.none}  unparsed ${r.unparsed}  catalog ${r.catalogSize}`,
    );
  }

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
