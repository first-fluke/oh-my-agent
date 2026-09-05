import type { Command } from "commander";
import { runAction } from "../../utils/cli-framework.js";
import { updateMcp } from "./mcp.js";
import { update } from "./run.js";

export { update } from "./run.js";

export function registerUpdate(program: Command): void {
  const command = program
    .command("update")
    .description("Update skills to latest version from registry")
    .option("-f, --force", "Overwrite user-customized config files")
    .option(
      "--with-new-skills",
      "Also install skills that are new in this release (default: refresh only the skills already installed)",
    )
    .option("--ci", "Run in non-interactive CI mode (skip prompts)")
    .option("-y, --yes", "Skip prompts")
    .option("--all", "Create/update all supported project-scoped vendors")
    .option(
      "--vendor <vendors>",
      "Create/update specific vendors (comma-separated, e.g. claude,qwen)",
    )
    .action(
      runAction(
        async (options: {
          force?: boolean;
          withNewSkills?: boolean;
          ci?: boolean;
          yes?: boolean;
          all?: boolean;
          vendor?: string;
        }) => {
          const globalFlag = program.opts<{ global?: boolean }>().global;
          await update({
            force: options.force,
            withNewSkills: options.withNewSkills,
            ci: options.ci,
            yes: options.yes,
            global: globalFlag,
            all: options.all,
            vendor: options.vendor,
          });
        },
      ),
    );

  command
    .command("mcp")
    .description(
      "Choose browser MCP servers (Aside, Chrome DevTools, Firefox DevTools)",
    )
    .option("-y, --yes", "Keep saved selection, or use Aside by default")
    .option("--ci", "Run without prompts")
    .option("--all", "Update all supported project-scoped vendors")
    .option("--vendor <vendors>", "Update specific vendors (comma-separated)")
    .action(
      runAction(async (_options, subcommand: Command) => {
        await updateMcp(subcommand.optsWithGlobals());
      }),
    );
}
