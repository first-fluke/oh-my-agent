import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../cli-kit/cli-framework.js";
import { retro } from "./retro.js";

export function registerRetro(program: Command): void {
  addOutputOptions(
    program
      .command("retro [window]")
      .description("Engineering retrospective with metrics & trends")
      .option("--interactive", "Interactive mode (manual entry)")
      .option(
        "--compare",
        "Compare current window vs prior same-length window",
      ),
  ).action(
    runAction(
      async (window, options) => {
        await retro(window, {
          json: resolveJsonMode(options),
          compare: options.compare,
          interactive: options.interactive,
        });
      },
      { supportsJsonOutput: true },
    ),
  );
}
