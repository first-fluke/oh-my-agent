import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { runHarnessEval } from "./run.js";

export function registerHarnessCommand(program: Command): void {
  const harness = program
    .command("harness")
    .description(
      "Evaluate OMA harness overlays against isolated repository tasks",
    );

  addOutputOptions(
    harness
      .command("eval")
      .description(
        "Compare a candidate .agents overlay with the current baseline",
      )
      .requiredOption("--suite <path>", "Harness evaluation suite YAML")
      .requiredOption(
        "--candidate <path>",
        "Candidate root containing .agents/",
      )
      .option("--mock", "Replay a matching recorded run (default)")
      .option(
        "--live",
        "Run baseline and candidate arms through the target agent",
      )
      .option("--record", "Record a live run for deterministic replay")
      .option("--record-file <path>", "Override the recording path")
      .option("--yes", "Skip live-run cost confirmation")
      .option(
        "--timeout-minutes <n>",
        "Timeout for each live arm",
        Number.parseFloat,
        15,
      )
      .option(
        "--require-coverage",
        "Exit non-zero when fewer than five paired tasks are scored",
      ),
    "Output the full evaluation as JSON",
  ).action(
    runAction(
      async (rawOptions) => {
        const options = rawOptions as Parameters<typeof runHarnessEval>[1] & {
          json?: boolean;
          output?: string;
        };
        await runHarnessEval(resolveJsonMode(options), options);
      },
      { supportsJsonOutput: true },
    ),
  );
}
