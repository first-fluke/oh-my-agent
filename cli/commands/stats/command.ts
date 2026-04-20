import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../cli-kit/cli-framework.js";
import { stats } from "./stats.js";

export function registerStats(program: Command): void {
  addOutputOptions(
    program
      .command("stats")
      .description("View productivity metrics")
      .option("--reset", "Reset metrics data"),
  ).action(
    runAction(
      async (options) => {
        await stats(resolveJsonMode(options), options.reset);
      },
      { supportsJsonOutput: true },
    ),
  );
}
