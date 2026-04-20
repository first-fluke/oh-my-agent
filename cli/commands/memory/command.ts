import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../cli-kit/cli-framework.js";
import { initMemory } from "./memory.js";

export function registerMemory(program: Command): void {
  addOutputOptions(
    program
      .command("memory:init")
      .description("Initialize Serena memory schema in .serena/memories")
      .option("--force", "Overwrite empty or existing schema files"),
  ).action(
    runAction(
      async (options) => {
        await initMemory(resolveJsonMode(options), options.force);
      },
      { supportsJsonOutput: true },
    ),
  );
}
