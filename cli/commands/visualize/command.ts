import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../cli-kit/cli-framework.js";
import { visualize } from "./visualize.js";

export function registerVisualize(program: Command): void {
  addOutputOptions(
    program
      .command("visualize")
      .alias("viz")
      .description("Visualize project structure as a dependency graph"),
  ).action(
    runAction(
      async (options) => {
        await visualize({ json: resolveJsonMode(options) });
      },
      { supportsJsonOutput: true },
    ),
  );
}
