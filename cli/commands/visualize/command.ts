import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { visualize } from "./view.js";

export function registerVisualize(program: Command): void {
  addOutputOptions(
    program
      .command("visualize")
      .alias("viz")
      .description("Visualize project structure as a dependency graph")
      .option(
        "--focus <node-or-path>",
        "Select only required references (transitive)",
      )
      .option(
        "--affected <paths...>",
        "Find definitions, workflows and checks affected by changes",
      ),
  ).action(
    runAction(
      async (options) => {
        await visualize({
          json: resolveJsonMode(options),
          focus: options.focus,
          affected: options.affected,
        });
      },
      { supportsJsonOutput: true },
    ),
  );
}
