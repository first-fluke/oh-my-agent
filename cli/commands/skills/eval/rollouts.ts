import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { resolveEffectiveSkill } from "../../../platform/skill-overlays.js";
import { evalConcurrency, mapWithLimit } from "./concurrency.js";
import {
  awaitDispatchResult,
  type DispatchUsage,
  unwrapVendorEnvelope,
} from "./envelope.js";
import {
  JUDGE_DEFAULT_RUBRIC,
  type JudgeDispatchFn,
  type LiveDispatchFn,
  type RolloutEntry,
  type RolloutExpectation,
  SKILL_EVAL_PROTOCOL_REVISION,
  type TaskCheckerJudge,
  type TaskFixture,
} from "./types.js";

// --- Live execution (M2) ---

/**
 * Load SKILL.md body for a given skill from the installed skills directory.
 * Returns empty string when the file does not exist.
 */
export function loadSkillMdBody(skillId: string, workspace: string): string {
  try {
    return resolveEffectiveSkill(workspace, skillId).body;
  } catch {
    return "";
  }
}

/**
 * Deterministic short content hash (sha256, first 16 hex chars).
 * Used for rollout provenance (SKILL.md body, task prompt) so `--mock` can tell
 * a recording apart from one made against different inputs.
 */
export function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** Pin the effective checker and protocol so cached judge scores cannot survive evaluator changes. */
export function taskFixtureHash(task: TaskFixture): string {
  const checker =
    task.checker.type === "judge"
      ? { type: "judge", rubric: task.checker.rubric ?? JUDGE_DEFAULT_RUBRIC }
      : task.checker;
  return contentHash(
    JSON.stringify({
      protocolRevision: SKILL_EVAL_PROTOCOL_REVISION,
      id: task.id,
      skill: task.skill,
      domain: task.domain,
      prompt: task.prompt,
      checker,
      weight: task.weight,
    }),
  );
}

/**
 * Build the {@link RolloutExpectation} describing the inputs currently on disk,
 * for `loadRolloutEntries` to validate recorded rollouts against.
 *
 * Pass `skillMdBody: undefined` when there is no single body to compare — the
 * `_all` aggregate spans many skills — which skips body validation while still
 * checking the task/evaluator contract and prompt drift.
 */
export function buildRolloutExpectation(
  tasks: TaskFixture[],
  skillMdBody: string | undefined,
): RolloutExpectation {
  return {
    skillBodyHash:
      skillMdBody === undefined ? undefined : contentHash(skillMdBody),
    promptHashes: new Map(tasks.map((t) => [t.id, contentHash(t.prompt)])),
    taskHashes: new Map(tasks.map((task) => [task.id, taskFixtureHash(task)])),
  };
}

/**
 * Compute a deterministic hash for a set of task IDs (sorted).
 * Used to name rollout files so replay is hash-addressed and not date/random-based.
 */
export function taskSetHash(taskIds: string[]): string {
  const sorted = [...taskIds].sort();
  return createHash("sha256")
    .update(sorted.join("\n"))
    .digest("hex")
    .slice(0, 16);
}

/** Judge responses are kept for audit; a verdict alone cannot be reviewed. */
export const JUDGE_RESPONSE_LIMIT = 2_000;

export interface JudgeVerdict {
  score: 0 | 1;
  /** Unwrapped judge text, bounded to JUDGE_RESPONSE_LIMIT characters. */
  response: string;
  usage: DispatchUsage;
}

/**
 * Parse a PASS/FAIL verdict from judge text. The leading token decides when
 * present; otherwise the first occurrence wins; anything else is a FAIL.
 */
export function parseJudgeVerdict(text: string): 0 | 1 {
  const upper = unwrapVendorEnvelope(text).trim().toUpperCase();
  if (upper.startsWith("PASS")) return 1;
  if (upper.startsWith("FAIL")) return 0;
  const passIdx = upper.indexOf("PASS");
  const failIdx = upper.indexOf("FAIL");
  if (passIdx === -1) return 0;
  if (failIdx === -1) return 1;
  return passIdx < failIdx ? 1 : 0;
}

/**
 * Grade a single arm's output using an LLM judge and keep the judge's text.
 *
 * Judge prompt format (design 016):
 *   task prompt + candidate output + rubric + "Answer with exactly PASS or FAIL"
 *
 * The candidate output and the judge response are unwrapped from vendor
 * envelopes first, so grading and parsing see answers rather than JSON
 * bookkeeping. Deterministic for a fixed dispatchFn.
 */
export async function judgeVerdict(
  taskPrompt: string,
  output: string,
  rubric: string,
  dispatchFn: JudgeDispatchFn,
): Promise<JudgeVerdict> {
  const gradingPrompt = [
    "You are a grading judge. Evaluate whether the following output correctly answers the task.",
    "",
    "## Task prompt",
    taskPrompt,
    "",
    "## Candidate output",
    unwrapVendorEnvelope(output),
    "",
    "## Grading rubric",
    rubric,
    "",
    "Answer with exactly PASS or FAIL (no other text).",
  ].join("\n");

  const result = await awaitDispatchResult(dispatchFn(gradingPrompt));
  const response = unwrapVendorEnvelope(result.output);
  return {
    score: parseJudgeVerdict(response),
    response: response.slice(0, JUDGE_RESPONSE_LIMIT),
    usage: result.usage,
  };
}

/** Verdict only; see judgeVerdict for the recorded response. */
export async function judgeScore(
  taskPrompt: string,
  output: string,
  rubric: string,
  dispatchFn: JudgeDispatchFn,
): Promise<0 | 1> {
  return (await judgeVerdict(taskPrompt, output, rubric, dispatchFn)).score;
}

/**
 * Run TWO arms (baseline + treatment) for each task fixture using the provided
 * dispatch function. Returns a flat array of RolloutEntry[].
 *
 * - baseline: task.prompt alone (skill withheld)
 * - treatment: SKILL.md body prepended to task.prompt (skill loaded)
 *
 * For judge-checker tasks, when a judgeDispatchFn is provided the verdict
 * (0|1) is computed immediately after each arm completes and stored in
 * entry.score. This enables deterministic --mock replay without re-calling
 * the LLM (design 016 amendment 2026-06-04).
 *
 * Every arm runs in its own empty directory under a session temp directory.
 * cleanupTmp() removes all of them, including failed comparisons.
 */
export const MAX_TRIALS = 10;

export async function collectLiveRollouts(
  tasks: TaskFixture[],
  skillMdBody: string,
  dispatchFn: LiveDispatchFn,
  workspace: string,
  judgeDispatchFn?: JudgeDispatchFn,
  trials = 1,
): Promise<{ rollouts: RolloutEntry[]; cleanupTmp: () => void }> {
  if (!Number.isInteger(trials) || trials < 1 || trials > MAX_TRIALS)
    throw new Error(`trials must be an integer between 1 and ${MAX_TRIALS}`);
  // Create a throwaway temp workspace so arms cannot modify project files
  const tmpBase = mkdtempSync(join(tmpdir(), "oma-eval-live-"));
  const cleanupTmp = () => {
    try {
      rmSync(tmpBase, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  };

  // Provenance for staleness detection at replay time. The body hash is fixed
  // for the whole run; the prompt hash is per task.
  const bodyHash = contentHash(skillMdBody);

  const collectTask = async (task: TaskFixture): Promise<RolloutEntry[]> => {
    const collected: RolloutEntry[] = [];
    try {
      const promptHash = contentHash(task.prompt);
      const taskHash = taskFixtureHash(task);
      const isJudgeTask = task.checker.type === "judge";
      const rubric = isJudgeTask
        ? ((task.checker as TaskCheckerJudge).rubric ?? JUDGE_DEFAULT_RUBRIC)
        : JUDGE_DEFAULT_RUBRIC;
      // Trust boundary: both skillMdBody (SKILL.md) and task.prompt are user-authored
      // content from the local workspace. The --live flag is an explicit opt-in; this
      // concat does not introduce external/untrusted input beyond what the user controls.
      const treatmentPrompt = skillMdBody
        ? `${skillMdBody}\n\n---\n\n${task.prompt}`
        : task.prompt;

      const runArm = async (
        arm: "baseline" | "treatment",
        trial: number,
      ): Promise<RolloutEntry> => {
        const armDir = mkdtempSync(join(tmpBase, `${arm}-`));
        const { output, usage } = await awaitDispatchResult(
          dispatchFn(
            arm,
            arm === "baseline" ? task.prompt : treatmentPrompt,
            armDir,
          ),
        );
        const entry: RolloutEntry = {
          taskId: task.id,
          arm,
          output,
          ...(usage.status === "actual" ? { usage } : {}),
          // No skillBodyHash on the baseline: it withholds the skill, so editing
          // SKILL.md does not invalidate that arm.
          ...(arm === "treatment" ? { skillBodyHash: bodyHash } : {}),
          promptHash,
          taskHash,
          ...(trials > 1 ? { trial } : {}),
        };
        if (isJudgeTask && judgeDispatchFn) {
          const verdict = await judgeVerdict(
            task.prompt,
            output,
            rubric,
            judgeDispatchFn,
          );
          entry.score = verdict.score;
          entry.judgeResponse = verdict.response;
          if (verdict.usage.status === "actual")
            entry.judgeUsage = verdict.usage;
        }
        return entry;
      };

      for (let trial = 0; trial < trials; trial += 1) {
        // Both arms of a trial run together in separate directories; the
        // arm started first alternates so position cannot favor one arm.
        const order: Array<"baseline" | "treatment"> =
          trial % 2 === 0
            ? ["baseline", "treatment"]
            : ["treatment", "baseline"];
        const pair = await Promise.all(order.map((arm) => runArm(arm, trial)));
        collected.push(...pair.sort((a, b) => a.arm.localeCompare(b.arm)));
      }
      return collected;
    } catch (error) {
      console.warn(
        `[oma skill eval] task ${task.id} could not be measured: ${error instanceof Error ? error.message : String(error)}. Excluding both arms.`,
      );
      return [];
    }
  };

  const perTask = await mapWithLimit(tasks, evalConcurrency(), collectTask);
  const rollouts: RolloutEntry[] = perTask.flat();

  // Pass tmpBase back as workspace context (unused after collection)
  void workspace;

  return { rollouts, cleanupTmp };
}

/**
 * Write captured rollouts to `<taskDir>/_rollouts/<hash>.json`.
 * Filename is a deterministic hash of the task ID set — no Date.now/random.
 * Entries are sorted by (taskId, arm) for byte-identical output on repeated runs.
 * Judge verdicts (entry.score) are included so --mock replay is fully offline.
 *
 * Entries carry provenance (`skillBodyHash` on treatment; `promptHash` and full
 * `taskHash` on both) so replay rejects changed skill bodies, task/checker
 * contracts, or evaluator protocol revisions. See `loadRolloutEntries`.
 */
export function writeRolloutRecord(
  taskDir: string,
  rollouts: RolloutEntry[],
): string {
  const taskIds = [...new Set(rollouts.map((r) => r.taskId))];
  const hash = taskSetHash(taskIds);
  const rolloutsDir = join(taskDir, "_rollouts");
  mkdirSync(rolloutsDir, { recursive: true });

  // Sort entries for deterministic JSON
  const sorted = [...rollouts].sort((a, b) => {
    const idCmp = a.taskId.localeCompare(b.taskId);
    if (idCmp !== 0) return idCmp;
    const armCmp = a.arm.localeCompare(b.arm);
    if (armCmp !== 0) return armCmp;
    return (a.trial ?? 0) - (b.trial ?? 0);
  });

  const filePath = join(rolloutsDir, `${hash}.json`);
  writeFileSync(filePath, JSON.stringify(sorted, null, 2), "utf-8");
  return filePath;
}

/**
 * Prompt the user for a yes/no confirmation on stdin.
 * Returns a Promise<boolean> that resolves to true on "y"/"yes" (case-insensitive).
 * Resolves to false on any other input or when stdin is not a TTY.
 */
export function promptConfirm(question: string): Promise<boolean> {
  return new Promise((res) => {
    if (!process.stdin.isTTY) {
      // Non-interactive: reject by default (safe)
      res(false);
      return;
    }
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      res(
        answer.trim().toLowerCase() === "y" ||
          answer.trim().toLowerCase() === "yes",
      );
    });
  });
}
