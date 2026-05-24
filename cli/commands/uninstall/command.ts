import type { Command } from "commander";
import { runAction } from "../../utils/cli-framework.js";
import { uninstall } from "./uninstall.js";

export function registerUninstall(program: Command): void {
  program
    .command("uninstall")
    .description(
      "Remove oh-my-agent's owned files (preserves oma-config.yaml, mcp.json, and user-authored skills)",
    )
    .option("--dry-run", "Preview what would be removed without deleting")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(
      runAction(async (opts: { dryRun?: boolean; yes?: boolean }) => {
        const globalOpts = program.opts<{ global?: boolean }>();
        await uninstall({
          yes: opts.yes,
          dryRun: opts.dryRun,
          global: globalOpts.global,
        });
      }),
    );
}
