import type { SkillOptResult } from "./types.js";

// --- Serialization ---

export function serializeSkillOptResult(result: SkillOptResult): string {
  const improved = result.finalLift > result.baselineLift;
  const passedFinalTest =
    result.finalTest?.passed === true && result.promotion?.eligible === true;
  return JSON.stringify(
    {
      ok: (result.applied || improved) && passedFinalTest,
      skill: result.skill,
      baselineLift: Number(result.baselineLift.toFixed(4)),
      finalLift: Number(result.finalLift.toFixed(4)),
      epochCount: result.epochs.length,
      acceptedEdits: result.acceptedEdits,
      rejectedCount: result.rejectedCount,
      evolution: result.evolution,
      finalTest: result.finalTest,
      promotion: result.promotion,
      diagnostics: result.diagnostics,
      procedure: result.procedure,
      memory: result.memory,
      applied: result.applied,
      diff: result.diff,
    },
    null,
    2,
  );
}

// --- Rendering ---

export function renderSkillOptResult(result: SkillOptResult): void {
  console.log(`\nSkill opt  (skill: ${result.skill})`);
  console.log(`  applied: ${result.applied}`);
  if (result.promotion && !result.promotion.eligible)
    console.log(`  promotion blocked: ${result.promotion.reasons.join(", ")}`);
  for (const diagnostic of result.diagnostics ?? [])
    console.log(
      `  ${diagnostic.stage} ${diagnostic.status}: ${diagnostic.message}`,
    );
  console.log(
    `  baselineLift: ${(result.baselineLift * 100).toFixed(1)}%  finalLift: ${(result.finalLift * 100).toFixed(1)}%`,
  );
  console.log(
    `  epochs: ${result.epochs.length}  acceptedEdits: ${result.acceptedEdits.length}  rejected: ${result.rejectedCount}`,
  );
  if (result.procedure) {
    console.log(
      `  procedure: ${result.procedure.hash} (optimizer ${result.procedure.optimizer.source}, maintainer ${result.procedure.maintainer.source}, constitution ${result.procedure.constitution.source})  memory: ${result.memory ?? "recall"}`,
    );
  }
  if (result.evolution) {
    console.log(
      `  evolution: suite=${result.evolution.suiteHash} patterns=${result.evolution.persistentPatterns} rejectedHistory=${result.evolution.persistentRejectedEdits}`,
    );
  }
  if (result.finalTest) {
    console.log(
      `  finalTest: ${result.finalTest.passed ? "pass" : "fail"} baseline=${result.finalTest.baselineLift.toFixed(4)} candidate=${result.finalTest.candidateLift.toFixed(4)}`,
    );
  }
  if (result.diff) {
    console.log(`\n  diff:\n${result.diff}`);
  }
}
