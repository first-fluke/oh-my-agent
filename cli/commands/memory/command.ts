import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import {
  initMemory,
  printAgentMemoryStatus,
  printMemoryRetryDrain,
} from "./memory.js";

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

  addOutputOptions(
    program
      .command("memory:status")
      .description("Show AgentMemory provider health"),
  ).action(
    runAction(
      async (options) => {
        await printAgentMemoryStatus(resolveJsonMode(options));
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    program
      .command("memory:retry-drain")
      .description("Drain queued AgentMemory observe retries")
      .option("--dry-run", "Inspect retry queue without modifying it"),
  ).action(
    runAction(
      async (options) => {
        await printMemoryRetryDrain(resolveJsonMode(options), options.dryRun);
      },
      { supportsJsonOutput: true },
    ),
  );
}
