import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../cli-kit/cli-framework.js";
import { exportRules } from "./export.js";

export function registerExport(program: Command): void {
  addOutputOptions(
    program
      .command("export <format>")
      .description("Export skills for external IDEs (cursor)")
      .option("-d, --dir <path>", "Target directory", process.cwd()),
  ).action(
    runAction(
      async (format, options) => {
        await exportRules(format, options.dir, resolveJsonMode(options));
      },
      { supportsJsonOutput: true },
    ),
  );
}
