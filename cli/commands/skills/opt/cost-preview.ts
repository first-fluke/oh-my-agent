import { createInterface } from "node:readline";
import type { TaskFixture } from "../eval.js";

export interface LiveDispatchProfile {
  train: TaskFixture[];
  val: TaskFixture[];
  test: TaskFixture[];
}

function scoreDispatchCalls(tasks: TaskFixture[]): number {
  const judgeTasks = tasks.filter((task) => task.checker.type === "judge");
  return tasks.length * 2 + judgeTasks.length * 2;
}

// --- Live cost preview + confirmation ---

/**
 * Estimate the total number of LLM dispatch calls for a live run.
 *
 * Per epoch: 1 train-score + K candidate-score-on-val + 1 maintainer-call
 * + 1 optimizer-call = editsPerEpoch + 3 dispatch groups, plus two runner-owned
 * final-test scores after evolution.
 *
 * This is a rough upper-bound; actual calls may be fewer if edits are
 * rejected early (LR budget, validation) or early-stop fires.
 *
 * Returns the estimated call count.
 */
export function estimateLiveDispatchCalls(
  maxEpochs: number,
  editsPerEpoch: number,
  profile?: LiveDispatchProfile,
): number {
  if (!profile) {
    // Score/maintenance groups when task cardinality is not available.
    return maxEpochs * (editsPerEpoch + 3) + 3;
  }
  const trainCalls = scoreDispatchCalls(profile.train);
  const valCalls = scoreDispatchCalls(profile.val);
  const testCalls = scoreDispatchCalls(profile.test);
  return (
    valCalls +
    maxEpochs * (trainCalls + 2 + editsPerEpoch * valCalls) +
    2 * testCalls
  );
}

/**
 * Print the live-run cost preview and, unless `yes` is true, prompt the user
 * to confirm before proceeding.
 *
 * Returns a Promise<boolean>: true = proceed, false = user declined.
 * When `yes` is true, prints the preview but skips the prompt (returns true).
 *
 * Uses readline for the interactive prompt (injectable via `_readline` for
 * tests).
 */
export async function confirmLiveRun(
  maxEpochs: number,
  editsPerEpoch: number,
  yes: boolean,
  _readline?: (prompt: string) => Promise<string>,
  profile?: LiveDispatchProfile,
): Promise<boolean> {
  const calls = estimateLiveDispatchCalls(maxEpochs, editsPerEpoch, profile);
  const callUnit = profile ? "underlying model calls" : "dispatch groups";
  console.log(
    `[oma skill opt] --live cost preview: up to ${calls} ${callUnit}` +
      ` (${maxEpochs} epochs; two arms per task, plus judge calls where configured).` +
      " Includes the initial validation baseline and 2 runner-owned final-test scores." +
      ` This incurs real model cost.`,
  );

  if (yes) {
    return true;
  }

  const ask =
    _readline ??
    ((prompt: string): Promise<string> => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
          rl.close();
          resolve(answer);
        });
      });
    });

  const answer = await ask("Proceed? [y/N] ");
  return answer.trim().toLowerCase() === "y";
}
