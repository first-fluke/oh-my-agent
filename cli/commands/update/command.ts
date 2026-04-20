import type { Command } from "commander";
import { runAction } from "../../cli-kit/cli-framework.js";
import { update } from "./update.js";

export { update } from "./update.js";

export function registerUpdate(program: Command): void {
  program
    .command("update")
    .description("Update skills to latest version from registry")
    .option("-f, --force", "Overwrite user-customized config files")
    .option("--ci", "Run in non-interactive CI mode (skip prompts)")
    .action(
      runAction(async (options: { force?: boolean; ci?: boolean }) => {
        await update(options.force ?? false, options.ci ?? false);
      }),
    );
}
