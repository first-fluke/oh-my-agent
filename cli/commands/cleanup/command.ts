import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../cli-kit/cli-framework.js";
import { cleanup } from "./cleanup.js";

export function registerCleanup(program: Command): void {
  addOutputOptions(
    program
      .command("cleanup")
      .description("Clean up orphaned subagent processes and temp files")
      .option("--dry-run", "Show what would be cleaned without making changes")
      .option("-y, --yes", "Skip confirmation prompts and clean everything"),
  ).action(
    runAction(
      async (options) => {
        await cleanup(options.dryRun, resolveJsonMode(options), options.yes);
      },
      { supportsJsonOutput: true },
    ),
  );
}
