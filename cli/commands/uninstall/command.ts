import { type Command, Option } from "commander";
import { runAction } from "../../utils/cli-framework.js";
import { type UninstallOptions, uninstall } from "./run.js";

export function registerUninstall(program: Command): void {
  program
    .command("uninstall")
    .description(
      "Remove oh-my-agent's owned files (preserves oma-config.yaml, mcp.json, and user-authored skills)",
    )
    .addOption(
      new Option(
        "--target <name>",
        "Installation target (default: project)",
      ).choices(["project", "grok-bot"]),
    )
    .option(
      "--workflows-dir <path>",
      "Grok Bot skill library (requires --target grok-bot)",
    )
    .option("--dry-run", "Preview what would be removed without deleting")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(
      runAction(async (opts: UninstallOptions) => {
        const globalOpts = program.opts<{ global?: boolean }>();
        await uninstall({
          yes: opts.yes,
          dryRun: opts.dryRun,
          global: globalOpts.global,
          target: opts.target,
          workflowsDir: opts.workflowsDir,
        });
      }),
    );
}
