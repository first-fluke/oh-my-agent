import { type Command, Option } from "commander";
import { PRESETS } from "../../constants/index.js";
import { createSearchProviderRegistry } from "../../platform/search-providers.js";
import { runAction } from "../../utils/cli-framework.js";
import type { InstallOptions } from "./environment.js";
import { install } from "./run.js";

export { install } from "./run.js";

const YES_FLAG_DESC =
  "Skip prompts and use defaults (also honors OMA_YES=1 and CI=true)";

/** Root-level `-y/--yes` is defined once on `program`; read it for subcommands too. */
export function resolveInstallYesFlag(
  program: Command,
  actionOpts?: { yes?: boolean },
): boolean {
  return Boolean(actionOpts?.yes ?? program.opts<{ yes?: boolean }>().yes);
}

export function registerInstall(program: Command): void {
  program
    .command("install")
    .description("Install oh-my-agent skills and configurations")
    .addOption(
      new Option(
        "--preset <name>",
        "Skill preset (overrides project prompt; default: all with --yes/CI)",
      ).choices(Object.keys(PRESETS)),
    )
    .addOption(
      new Option(
        "--web-search <provider>",
        "Web search provider (default: native; retains saved choice)",
      ).choices(
        createSearchProviderRegistry()
          .list("web")
          .map((provider) => provider.id),
      ),
    )
    .addOption(
      new Option(
        "--code-intelligence <provider>",
        "Code intelligence provider (default: Serena; retains saved choice)",
      ).choices(["serena", "gortex"]),
    )
    .addOption(
      new Option(
        "--semantic-memory <provider>",
        "Semantic memory provider (default: Agent Memory; retains saved choice)",
      ).choices(["agentmemory", "honcho", "none"]),
    )
    .option(
      "--honcho-url <url>",
      "Honcho API origin (new connection: http://127.0.0.1:8000)",
    )
    .option(
      "--honcho-workspace <id>",
      "Honcho workspace ID (new connection: oma)",
    )
    .action(
      runAction(async (opts: InstallOptions) => {
        await install({ ...opts, yes: resolveInstallYesFlag(program, opts) });
      }),
    );
}

export function registerDefaultInstallAction(program: Command): void {
  program.option("-y, --yes", YES_FLAG_DESC).action(
    runAction(async (opts: { yes?: boolean }) => {
      await install({ yes: resolveInstallYesFlag(program, opts) });
    }),
  );
}
