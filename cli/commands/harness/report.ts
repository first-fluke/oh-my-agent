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
  console.log(`  vendor: ${evaluation.vendor}`);
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
  }
}
