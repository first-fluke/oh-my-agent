import type { SkillOptResult } from "./types.js";

// --- Serialization ---

export function serializeSkillOptResult(result: SkillOptResult): string {
  return JSON.stringify(
    {
      ok: result.applied || result.finalLift > result.baselineLift,
      skill: result.skill,
      baselineLift: Number(result.baselineLift.toFixed(4)),
      finalLift: Number(result.finalLift.toFixed(4)),
      epochCount: result.epochs.length,
      acceptedEdits: result.acceptedEdits,
      rejectedCount: result.rejectedCount,
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
  console.log(
    `  baselineLift: ${(result.baselineLift * 100).toFixed(1)}%  finalLift: ${(result.finalLift * 100).toFixed(1)}%`,
  );
  console.log(
    `  epochs: ${result.epochs.length}  acceptedEdits: ${result.acceptedEdits.length}  rejected: ${result.rejectedCount}`,
  );
  if (result.diff) {
    console.log(`\n  diff:\n${result.diff}`);
  }
}
