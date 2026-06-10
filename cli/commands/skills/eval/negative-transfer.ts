import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadRolloutEntries, loadTaskFixtures } from "./fixtures.js";
import { judgeScore } from "./rollouts.js";
import { scoreChecker } from "./scoring.js";
import {
  JUDGE_DEFAULT_RUBRIC,
  type JudgeDispatchFn,
  type LiveDispatchFn,
  type NegativeTransfer,
  type TaskCheckerJudge,
  type TaskFixture,
} from "./types.js";

// --- Negative-transfer neighbor discovery ---

/**
 * Discover neighbor tasks from OTHER skills whose `domain` overlaps with the
 * given `domains` set.
 *
 * Scans `.agents/eval/<otherSkill>/` for every installed skill directory
 * other than `skillId`. Any task whose `domain` is in `domains` is a
 * candidate neighbor. Returns a flat list of `{ otherSkill, task }` pairs.
 *
 * Only tasks with at least one recorded rollout arm score are usable in mock
 * mode; caller is responsible for filtering further.
 *
 * @param skillId  - The skill under evaluation (excluded from scan).
 * @param domains  - Set of domain strings from skillId's tasks.
 * @param evalRoot - Absolute path to `.agents/eval/`.
 */
export function discoverNeighborTasks(
  skillId: string,
  domains: Set<string>,
  evalRoot: string,
): Array<{ otherSkill: string; task: TaskFixture }> {
  if (!existsSync(evalRoot)) return [];
  let entries: string[];
  try {
    entries = readdirSync(evalRoot);
  } catch {
    return [];
  }

  const neighbors: Array<{ otherSkill: string; task: TaskFixture }> = [];

  for (const entry of entries.sort()) {
    if (entry === skillId) continue; // skip self
    const otherDir = join(evalRoot, entry);
    // Only scan directories
    try {
      const stat = readdirSync(otherDir);
      void stat; // confirm it's a directory (readdirSync throws on files)
    } catch {
      continue;
    }

    const { fixtures } = loadTaskFixtures(otherDir);
    for (const task of fixtures) {
      if (domains.has(task.domain)) {
        neighbors.push({ otherSkill: entry, task });
      }
    }
  }

  return neighbors;
}

/**
 * Score a single neighbor task in the "treatment with skill X" arm.
 *
 * - Mock mode: looks up the neighbor's recorded baseline score from its own
 *   `_rollouts/` as `scoreWithoutX`, and the recorded treatment score as
 *   `scoreWithX`. If either is missing, skip and warn (never calls LLM in mock).
 * - Live mode: uses the neighbor's recorded baseline score as `scoreWithoutX`,
 *   and runs the neighbor task WITH skillX's SKILL.md body prepended as
 *   `scoreWithX` via the provided live dispatch function.
 *
 * Returns `null` when the task cannot be scored (missing data).
 */
export function scoreNeighborInMock(
  task: TaskFixture,
  neighborTaskDir: string,
): { scoreWithoutX: number; scoreWithX: number } | null {
  const rollouts = loadRolloutEntries(neighborTaskDir);
  // Find rollout entries for this specific task
  const baselineEntry = rollouts.find(
    (r) => r.taskId === task.id && r.arm === "baseline",
  );
  const treatmentEntry = rollouts.find(
    (r) => r.taskId === task.id && r.arm === "treatment",
  );

  if (task.checker.type === "judge") {
    // Judge tasks require recorded scores for deterministic mock
    if (
      baselineEntry?.score === undefined ||
      treatmentEntry?.score === undefined
    ) {
      console.warn(
        `[oma skills eval] neg-transfer: skipping neighbor task ${task.id} (${task.skill}): no recorded judge score; run --live --record on ${task.skill} to populate.`,
      );
      return null;
    }
    // scoreWithoutX = baseline score of the neighbor (without ANY skill injection)
    // scoreWithX = treatment score of the neighbor (was run WITH the neighbor's own skill)
    // We approximate: if neighbor's own skill improved it, the treatment score is the
    // "with neighbor-skill" score. For negative-transfer we use the neighbor's OWN
    // baseline as scoreWithoutX and re-run with skill X for scoreWithX.
    // In mock mode, we only have the neighbor's recorded scores — use treatment
    // as the "neighbor's own baseline" (already-loaded context baseline),
    // but design requires scoreWithoutX = neighbor's baseline (no skill injection).
    return {
      scoreWithoutX: baselineEntry.score,
      scoreWithX: treatmentEntry.score,
    };
  }

  // assert / regex: score deterministically from output
  if (!baselineEntry || !treatmentEntry) {
    console.warn(
      `[oma skills eval] neg-transfer: skipping neighbor task ${task.id} (${task.skill}): no recorded rollout arms.`,
    );
    return null;
  }

  try {
    const scoreWithoutX = scoreChecker(task.checker, baselineEntry.output);
    const scoreWithX = scoreChecker(task.checker, treatmentEntry.output);
    return { scoreWithoutX, scoreWithX };
  } catch {
    return null;
  }
}

/**
 * Score a neighbor task in live mode: run task WITH skillX SKILL.md injected
 * (treatment arm) and get scoreWithoutX from the neighbor's recorded baseline.
 *
 * Returns `null` when:
 * - The neighbor has no recorded baseline rollout (we need a prior --live --record run)
 * - The dispatch function throws
 */
export function scoreNeighborInLive(
  task: TaskFixture,
  neighborTaskDir: string,
  skillXBody: string,
  dispatchFn: LiveDispatchFn,
  judgeDispatchFn: JudgeDispatchFn | undefined,
  tmpBase: string,
): { scoreWithoutX: number; scoreWithX: number } | null {
  const rollouts = loadRolloutEntries(neighborTaskDir);
  const baselineEntry = rollouts.find(
    (r) => r.taskId === task.id && r.arm === "baseline",
  );

  // We need a recorded baseline to establish the "without-X" score
  if (!baselineEntry) {
    console.warn(
      `[oma skills eval] neg-transfer: skipping neighbor task ${task.id} (${task.skill}): no recorded baseline; run --live --record on ${task.skill} first.`,
    );
    return null;
  }

  // scoreWithoutX: use the recorded baseline score or re-score from output
  let scoreWithoutX: number;
  if (task.checker.type === "judge") {
    if (baselineEntry.score === undefined) {
      console.warn(
        `[oma skills eval] neg-transfer: skipping neighbor task ${task.id} (${task.skill}): baseline has no recorded judge score.`,
      );
      return null;
    }
    scoreWithoutX = baselineEntry.score;
  } else {
    try {
      scoreWithoutX = scoreChecker(task.checker, baselineEntry.output);
    } catch {
      return null;
    }
  }

  // scoreWithX: run task WITH skillX body prepended (treatment arm)
  const treatmentPrompt = skillXBody
    ? `${skillXBody}\n\n---\n\n${task.prompt}`
    : task.prompt;

  let treatmentOutput: string;
  try {
    treatmentOutput = dispatchFn("treatment", treatmentPrompt, tmpBase);
  } catch {
    return null;
  }

  let scoreWithX: number;
  if (task.checker.type === "judge") {
    if (!judgeDispatchFn) {
      console.warn(
        `[oma skills eval] neg-transfer: skipping judge neighbor task ${task.id}: no judge dispatch function.`,
      );
      return null;
    }
    const rubric =
      (task.checker as TaskCheckerJudge).rubric ?? JUDGE_DEFAULT_RUBRIC;
    scoreWithX = judgeScore(
      task.prompt,
      treatmentOutput,
      rubric,
      judgeDispatchFn,
    );
  } else {
    try {
      scoreWithX = scoreChecker(task.checker, treatmentOutput);
    } catch {
      return null;
    }
  }

  return { scoreWithoutX, scoreWithX };
}

/**
 * Compute negative-transfer entries for skill X by running same-domain neighbor
 * tasks WITH skill X loaded and comparing to the neighbor's recorded baseline.
 *
 * delta = scoreWithX - scoreWithoutX
 * delta < 0 = regression (negative transfer)
 *
 * @param skillId        - Skill under evaluation.
 * @param skillDomains   - Set of domain strings from skillId's own tasks.
 * @param evalRoot       - Absolute path to `.agents/eval/`.
 * @param mode           - "mock" or "live".
 * @param maxTasks       - Max number of neighbor tasks to sample (hard cap).
 * @param skillXBody     - SKILL.md content of skill X (for live treatment arm).
 * @param dispatchFn     - Live dispatch function (for live mode).
 * @param judgeDispatchFn - Judge dispatch function (for live mode + judge tasks).
 * @param tmpBase        - Temp directory for live dispatch.
 */
export function computeNegativeTransfer(
  skillId: string,
  skillDomains: Set<string>,
  evalRoot: string,
  mode: "mock" | "live",
  maxTasks: number | undefined,
  skillXBody: string,
  dispatchFn: LiveDispatchFn | undefined,
  judgeDispatchFn: JudgeDispatchFn | undefined,
  tmpBase: string,
): NegativeTransfer[] {
  const allNeighbors = discoverNeighborTasks(skillId, skillDomains, evalRoot);

  // Apply maxTasks cap with logged warning (no silent truncation — design T1-c)
  let sampledNeighbors = allNeighbors;
  if (
    maxTasks !== undefined &&
    maxTasks > 0 &&
    allNeighbors.length > maxTasks
  ) {
    const dropped = allNeighbors.length - maxTasks;
    console.warn(
      `[oma skills eval] neg-transfer: ${allNeighbors.length} neighbor tasks found; capping at --max-tasks=${maxTasks} (${dropped} dropped).`,
    );
    sampledNeighbors = allNeighbors.slice(0, maxTasks);
  }

  const entries: NegativeTransfer[] = [];

  for (const { otherSkill, task } of sampledNeighbors) {
    const neighborTaskDir = join(evalRoot, otherSkill);

    let scored: { scoreWithoutX: number; scoreWithX: number } | null;
    if (mode === "mock") {
      scored = scoreNeighborInMock(task, neighborTaskDir);
    } else {
      if (!dispatchFn) {
        console.warn(
          `[oma skills eval] neg-transfer: skipping neighbor task ${task.id}: no live dispatch function.`,
        );
        continue;
      }
      scored = scoreNeighborInLive(
        task,
        neighborTaskDir,
        skillXBody,
        dispatchFn,
        judgeDispatchFn,
        tmpBase,
      );
    }

    if (scored === null) continue;

    const delta = scored.scoreWithX - scored.scoreWithoutX;
    entries.push({
      otherSkill,
      domain: task.domain,
      delta,
    });
  }

  return entries;
}
