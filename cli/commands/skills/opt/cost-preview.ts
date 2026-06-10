import { createInterface } from "node:readline";

// --- Live cost preview + confirmation ---

/**
 * Estimate the total number of LLM dispatch calls for a live run.
 *
 * Per epoch: 1 train-score + K candidate-score-on-val + 1 optimizer-call
 *   = editsPerEpoch + 2 scoring calls
 *
 * This is a rough upper-bound; actual calls may be fewer if edits are
 * rejected early (LR budget, validation) or early-stop fires.
 *
 * Returns the estimated call count.
 */
export function estimateLiveDispatchCalls(
  maxEpochs: number,
  editsPerEpoch: number,
): number {
  // Per epoch: 1 optimizer call + 1 train-score + editsPerEpoch val-scores
  return maxEpochs * (1 + 1 + editsPerEpoch);
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
): Promise<boolean> {
  const calls = estimateLiveDispatchCalls(maxEpochs, editsPerEpoch);
  console.log(
    `[oma skills opt] --live cost preview: up to ${calls} model dispatch calls` +
      ` (${maxEpochs} epochs × (1 optimizer + 1 train-score + ${editsPerEpoch} val-scores)).` +
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
