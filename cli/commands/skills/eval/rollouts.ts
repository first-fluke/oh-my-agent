import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { INSTALLED_SKILLS_DIR } from "../../../constants/vendors.js";
import {
  JUDGE_DEFAULT_RUBRIC,
  type JudgeDispatchFn,
  type LiveDispatchFn,
  type RolloutEntry,
  type TaskCheckerJudge,
  type TaskFixture,
} from "./types.js";

// --- Live execution (M2) ---

/**
 * Load SKILL.md body for a given skill from the installed skills directory.
 * Returns empty string when the file does not exist.
 */
export function loadSkillMdBody(skillId: string, workspace: string): string {
  const skillMdPath = join(
    workspace,
    INSTALLED_SKILLS_DIR,
    skillId,
    "SKILL.md",
  );
  if (!existsSync(skillMdPath)) return "";
  try {
    return readFileSync(skillMdPath, "utf-8");
  } catch {
    return "";
  }
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

/**
 * Grade a single arm's output using an LLM judge.
 * Returns 1 (PASS) or 0 (FAIL/ambiguous). Deterministic for a fixed
 * dispatchFn — the grading prompt is structured to elicit exactly "PASS"
 * or "FAIL".
 *
 * Judge prompt format (design 016):
 *   task prompt + candidate output + rubric + "Answer with exactly PASS or FAIL"
 *
 * Verdict parsing: first occurrence of PASS → 1; FAIL → 0; ambiguous → 0.
 * When both appear, whichever is first wins.
 */
export function judgeScore(
  taskPrompt: string,
  output: string,
  rubric: string,
  dispatchFn: JudgeDispatchFn,
): 0 | 1 {
  const gradingPrompt = [
    "You are a grading judge. Evaluate whether the following output correctly answers the task.",
    "",
    "## Task prompt",
    taskPrompt,
    "",
    "## Candidate output",
    output,
    "",
    "## Grading rubric",
    rubric,
    "",
    "Answer with exactly PASS or FAIL (no other text).",
  ].join("\n");

  const response = dispatchFn(gradingPrompt);
  // Parse verdict: PASS → 1, FAIL → 0, ambiguous → 0
  const upper = response.toUpperCase();
  const passIdx = upper.indexOf("PASS");
  const failIdx = upper.indexOf("FAIL");
  if (passIdx === -1 && failIdx === -1) return 0;
  if (passIdx !== -1 && failIdx === -1) return 1;
  if (failIdx !== -1 && passIdx === -1) return 0;
  // Both present: whichever appears first in the response wins
  return passIdx < failIdx ? 1 : 0;
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
 * Both arms run in a per-session temp directory for isolation; the temp dir
 * is cleaned up when cleanupTmp() is called (returned from this function).
 */
export function collectLiveRollouts(
  tasks: TaskFixture[],
  skillMdBody: string,
  dispatchFn: LiveDispatchFn,
  workspace: string,
  judgeDispatchFn?: JudgeDispatchFn,
): { rollouts: RolloutEntry[]; cleanupTmp: () => void } {
  // Create a throwaway temp workspace so arms cannot modify project files
  const tmpBase = mkdtempSync(join(tmpdir(), "oma-eval-live-"));
  const cleanupTmp = () => {
    try {
      rmSync(tmpBase, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  };

  const rollouts: RolloutEntry[] = [];

  for (const task of tasks) {
    const isJudgeTask = task.checker.type === "judge";
    const rubric = isJudgeTask
      ? ((task.checker as TaskCheckerJudge).rubric ?? JUDGE_DEFAULT_RUBRIC)
      : JUDGE_DEFAULT_RUBRIC;

    // --- Baseline arm: prompt alone (no skill context) ---
    const baselineOutput = dispatchFn("baseline", task.prompt, tmpBase);
    const baselineEntry: RolloutEntry = {
      taskId: task.id,
      arm: "baseline",
      output: baselineOutput,
    };
    if (isJudgeTask && judgeDispatchFn) {
      baselineEntry.score = judgeScore(
        task.prompt,
        baselineOutput,
        rubric,
        judgeDispatchFn,
      );
    }
    rollouts.push(baselineEntry);

    // --- Treatment arm: SKILL.md prepended to the prompt ---
    // Trust boundary: both skillMdBody (SKILL.md) and task.prompt are user-authored
    // content from the local workspace. The --live flag is an explicit opt-in; this
    // concat does not introduce external/untrusted input beyond what the user controls.
    const treatmentPrompt = skillMdBody
      ? `${skillMdBody}\n\n---\n\n${task.prompt}`
      : task.prompt;
    const treatmentOutput = dispatchFn("treatment", treatmentPrompt, tmpBase);
    const treatmentEntry: RolloutEntry = {
      taskId: task.id,
      arm: "treatment",
      output: treatmentOutput,
    };
    if (isJudgeTask && judgeDispatchFn) {
      treatmentEntry.score = judgeScore(
        task.prompt,
        treatmentOutput,
        rubric,
        judgeDispatchFn,
      );
    }
    rollouts.push(treatmentEntry);
  }

  // Pass tmpBase back as workspace context (unused after collection)
  void workspace;

  return { rollouts, cleanupTmp };
}

/**
 * Write captured rollouts to `<taskDir>/_rollouts/<hash>.json`.
 * Filename is a deterministic hash of the task ID set — no Date.now/random.
 * Entries are sorted by (taskId, arm) for byte-identical output on repeated runs.
 * Judge verdicts (entry.score) are included so --mock replay is fully offline.
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
    return a.arm.localeCompare(b.arm);
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
