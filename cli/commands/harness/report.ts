import type { HarnessEvaluation } from "./types.js";

function percentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function serializeHarnessEvaluation(
  evaluation: HarnessEvaluation,
): string {
  return JSON.stringify(evaluation, null, 2);
}

export function renderHarnessEvaluation(evaluation: HarnessEvaluation): void {
  const { score } = evaluation;
  console.log(`\nHarness evaluation: ${evaluation.suiteId}`);
  console.log(`  mode: ${evaluation.executionMode ?? "legacy"}`);
  console.log(`  evidence: ${evaluation.evidenceStatus ?? "legacy"}`);
  for (const limitation of evaluation.replayLimitations ?? [])
    console.log(`  replay limitation: ${limitation}`);
  console.log(`  partition: ${evaluation.partition}`);
  console.log(`  promotion ready: ${evaluation.promotionReady}`);
  for (const blocker of evaluation.promotionBlockers)
    console.log(`  limitation: ${blocker}`);
  console.log(`  vendor: ${evaluation.vendor}`);
  const manifest = evaluation.manifest;
  if (manifest) {
    console.log(
      `  conditions (${evaluation.conditions ?? "current"}): ${manifest.vendor} ${manifest.dispatchMode}` +
        ` model=${manifest.model ?? "vendor-session"} cli=${manifest.cliVersion ?? manifest.cliVersionStatus}` +
        ` oma=${manifest.omaVersion}`,
    );
    console.log(
      `  environment: allowlist passed=${manifest.environmentPolicy.passed.length}` +
        ` dropped=${manifest.environmentPolicy.dropped} forced=${manifest.environmentPolicy.forced.join(",")}` +
        `${manifest.environmentPolicy.vendorKnown ? "" : " (vendor prefixes unknown)"}`,
    );
  } else {
    console.log("  conditions: unavailable");
  }
  if (evaluation.traceSession)
    console.log(`  trace session: ${evaluation.traceSession}`);
  if (evaluation.usage) {
    const u = evaluation.usage;
    console.log(
      `  usage: ${u.dispatches} dispatches, ${u.inputTokens} in / ${u.outputTokens} out, ` +
        (u.status === "unknown"
          ? "cost unknown"
          : `$${u.costUsd.toFixed(4)}${u.status === "partial" ? "+ (partial)" : ""}`),
    );
  }
  console.log(`  tasks: ${score.scoredTaskCount}/${score.taskCount}`);
  console.log(`  baseline: ${percentage(score.baselineScore)}`);
  console.log(`  candidate: ${percentage(score.candidateScore)}`);
  console.log(`  lift: ${score.lift >= 0 ? "+" : ""}${percentage(score.lift)}`);
  console.log(
    `  corrected: ${score.correctedTaskIds.length > 0 ? score.correctedTaskIds.join(", ") : "none"}`,
  );
  console.log(
    `  regressed: ${score.regressedTaskIds.length > 0 ? score.regressedTaskIds.join(", ") : "none"}`,
  );
  console.log(`  coverage: ${score.coverage}`);
  console.log(`  decision: ${score.decision.toUpperCase()}`);

  const errors = evaluation.runs.filter((run) => run.dispatchError);
  for (const run of errors) {
    console.warn(`  ${run.taskId}/${run.arm}: ${run.dispatchError}`);
    if (run.diagnostics && run.trace) {
      console.warn(
        `    exit=${run.diagnostics.exitCode ?? "?"} timedOut=${run.diagnostics.timedOut}` +
          ` output=${run.trace.output} stderr=${run.trace.stderr} artifacts=${run.trace.artifacts}` +
          ` changed=${run.trace.changedPaths.length}${run.trace.changedPathsTruncated ? "+" : ""}`,
      );
    }
  }
}
