import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadRolloutEntries, loadTaskFixtures } from "./fixtures.js";
import {
  buildRolloutExpectation,
  contentHash,
  judgeVerdict,
  taskFixtureHash,
  writeRolloutRecord,
} from "./rollouts.js";
import { scoreChecker } from "./scoring.js";
import {
  JUDGE_DEFAULT_RUBRIC,
  type JudgeDispatchFn,
  type LiveDispatchFn,
  type NegativeTransfer,
  type NegativeTransferCoverage,
  type RolloutEntry,
  type RolloutExpectation,
  type TaskFixture,
} from "./types.js";

/** Find tasks belonging to other skills in the selected domains. */
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

type NeighborScores = { scoreWithoutX: number; scoreWithX: number };

/** Compatibility alias for the shared full task/evaluator contract hash. */
export function negativeTransferTaskHash(task: TaskFixture): string {
  return taskFixtureHash(task);
}

/** Candidate recordings are separate from the neighbor's own evaluation. */
export function negativeTransferRecordDir(
  evalRoot: string,
  skillId: string,
  otherSkill: string,
  body: string,
): string {
  return join(
    evalRoot,
    skillId,
    "_negative-transfer",
    otherSkill,
    contentHash(body),
  );
}

function scorePair(
  task: TaskFixture,
  entries: RolloutEntry[],
): NeighborScores | null {
  const baseline = entries.find((entry) => entry.arm === "baseline");
  const treatment = entries.find((entry) => entry.arm === "treatment");
  if (!baseline || !treatment) return null;
  try {
    const scoreWithoutX = scoreChecker(
      task.checker,
      baseline.output,
      baseline.score,
    );
    const scoreWithX = scoreChecker(
      task.checker,
      treatment.output,
      treatment.score,
    );
    if (!Number.isFinite(scoreWithoutX) || !Number.isFinite(scoreWithX))
      return null;
    return { scoreWithoutX, scoreWithX };
  } catch {
    console.warn(
      `[oma skill eval] neg-transfer: skipping neighbor task ${task.id}: missing or invalid checker score.`,
    );
    return null;
  }
}

/** Replay only a paired comparison explicitly recorded for this candidate. */
export function scoreNeighborInMock(
  task: TaskFixture,
  recordDir: string,
  expect?: RolloutExpectation,
  candidateSkill?: string,
): NeighborScores | null {
  if (!candidateSkill || !expect?.skillBodyHash) {
    console.warn(
      `[oma skill eval] neg-transfer: skipping neighbor task ${task.id}: candidate provenance is required.`,
    );
    return null;
  }
  const taskHash = negativeTransferTaskHash(task);
  const rollouts = loadRolloutEntries(recordDir, expect).filter(
    (entry) =>
      entry.taskId === task.id &&
      entry.candidateSkill === candidateSkill &&
      entry.skillBodyHash === expect.skillBodyHash &&
      entry.promptHash === contentHash(task.prompt) &&
      entry.taskHash === taskHash &&
      typeof entry.comparisonId === "string" &&
      entry.comparisonId.length > 0,
  );
  const comparisons = new Map<string, RolloutEntry[]>();
  for (const entry of rollouts) {
    const id = entry.comparisonId as string;
    comparisons.set(id, [...(comparisons.get(id) ?? []), entry]);
  }
  for (const pair of comparisons.values()) {
    // Duplicate or unmatched arms cannot prove one matched comparison.
    if (pair.length !== 2 || pair[0]?.arm === pair[1]?.arm) continue;
    const scores = scorePair(task, pair);
    if (scores) return scores;
  }
  console.warn(
    `[oma skill eval] neg-transfer: skipping neighbor task ${task.id}: no matched candidate recording; run --live --neg-transfer --record.`,
  );
  return null;
}

/** Run both arms now, with the same dispatch and separate empty workspaces. */
function collectNeighborPair(
  task: TaskFixture,
  body: string,
  dispatchFn: LiveDispatchFn,
  judgeDispatchFn: JudgeDispatchFn | undefined,
  candidateSkill: string,
): { scores: NeighborScores; rollouts: RolloutEntry[] } | null {
  if (task.checker.type === "judge" && !judgeDispatchFn) {
    console.warn(
      `[oma skill eval] neg-transfer: skipping judge neighbor task ${task.id}: no judge dispatch function.`,
    );
    return null;
  }
  const comparisonDir = mkdtempSync(join(tmpdir(), "oma-eval-neighbor-"));
  const comparisonId = randomUUID();
  const rollouts: RolloutEntry[] = [];
  try {
    for (const arm of ["baseline", "treatment"] as const) {
      const armDir = join(comparisonDir, arm);
      mkdirSync(armDir);
      const prompt =
        arm === "treatment" && body
          ? `${body}\n\n---\n\n${task.prompt}`
          : task.prompt;
      const output = dispatchFn(arm, prompt, armDir);
      const entry: RolloutEntry = {
        taskId: task.id,
        arm,
        output,
        candidateSkill,
        comparisonId,
        skillBodyHash: contentHash(body),
        promptHash: contentHash(task.prompt),
        taskHash: negativeTransferTaskHash(task),
      };
      if (task.checker.type === "judge" && judgeDispatchFn) {
        const verdict = judgeVerdict(
          task.prompt,
          output,
          task.checker.rubric ?? JUDGE_DEFAULT_RUBRIC,
          judgeDispatchFn,
        );
        entry.score = verdict.score;
        entry.judgeResponse = verdict.response;
      }
      rollouts.push(entry);
    }
    const scores = scorePair(task, rollouts);
    return scores ? { scores, rollouts } : null;
  } catch (error) {
    console.warn(
      `[oma skill eval] neg-transfer: neighbor task ${task.id} could not be measured: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  } finally {
    rmSync(comparisonDir, { recursive: true, force: true });
  }
}

/** Compatibility facade: previous recordings are never used for a live baseline. */
export function scoreNeighborInLive(
  task: TaskFixture,
  _neighborTaskDir: string,
  skillXBody: string,
  dispatchFn: LiveDispatchFn,
  judgeDispatchFn: JudgeDispatchFn | undefined,
  _tmpBase: string,
  _expect?: RolloutExpectation,
): NeighborScores | null {
  return (
    collectNeighborPair(task, skillXBody, dispatchFn, judgeDispatchFn, "")
      ?.scores ?? null
  );
}

export interface MeasureNegativeTransferOptions {
  skill: string;
  domains: Set<string>;
  evalRoot: string;
  mode: "mock" | "live";
  maxTasks?: number;
  body: string;
  dispatchFn?: LiveDispatchFn;
  judgeFn?: JudgeDispatchFn;
  record?: boolean;
}

/** Explicit coverage prevents an empty or partial result from meaning no regression. */
export function measureNegativeTransfer(
  options: MeasureNegativeTransferOptions,
): {
  entries: NegativeTransfer[];
  coverage: NegativeTransferCoverage;
} {
  const {
    skill,
    domains,
    evalRoot,
    mode,
    maxTasks,
    body,
    dispatchFn,
    judgeFn,
  } = options;
  const neighbors = discoverNeighborTasks(skill, domains, evalRoot);
  const sampled =
    maxTasks !== undefined && maxTasks > 0
      ? neighbors.slice(0, maxTasks)
      : neighbors;
  if (sampled.length < neighbors.length) {
    console.warn(
      `[oma skill eval] neg-transfer: ${neighbors.length} neighbor tasks found; capping at --max-tasks=${maxTasks} (${neighbors.length - sampled.length} dropped).`,
    );
  }
  const entries: NegativeTransfer[] = [];
  for (const { otherSkill, task } of sampled) {
    const recordDir = negativeTransferRecordDir(
      evalRoot,
      skill,
      otherSkill,
      body,
    );
    let scored: NeighborScores | null;
    if (mode === "mock") {
      scored = scoreNeighborInMock(
        task,
        recordDir,
        buildRolloutExpectation([task], body),
        skill,
      );
    } else if (dispatchFn) {
      const comparison = collectNeighborPair(
        task,
        body,
        dispatchFn,
        judgeFn,
        skill,
      );
      scored = comparison?.scores ?? null;
      if (comparison && options.record)
        writeRolloutRecord(recordDir, comparison.rollouts);
    } else {
      scored = null;
    }
    if (!scored) continue;
    entries.push({
      otherSkill,
      domain: task.domain,
      taskId: task.id,
      candidateSkill: skill,
      skillBodyHash: contentHash(body),
      delta: scored.scoreWithX - scored.scoreWithoutX,
    });
  }
  return {
    entries,
    coverage: {
      status:
        sampled.length > 0 && entries.length === sampled.length
          ? "measured"
          : "insufficient",
      expected: sampled.length,
      scored: entries.length,
    },
  };
}

/** Legacy array API; callers deciding adoption should use the coverage-aware API. */
export function computeNegativeTransfer(
  skillId: string,
  skillDomains: Set<string>,
  evalRoot: string,
  mode: "mock" | "live",
  maxTasks: number | undefined,
  skillXBody: string,
  dispatchFn: LiveDispatchFn | undefined,
  judgeDispatchFn: JudgeDispatchFn | undefined,
  _tmpBase: string,
  _workspace?: string,
): NegativeTransfer[] {
  return measureNegativeTransfer({
    skill: skillId,
    domains: skillDomains,
    evalRoot,
    mode,
    maxTasks,
    body: skillXBody,
    dispatchFn,
    judgeFn: judgeDispatchFn,
  }).entries;
}
