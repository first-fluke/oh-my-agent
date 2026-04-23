import type { Command } from "commander";
import { runAction } from "../../cli-kit/cli-framework.js";
import { install } from "./install.js";

export { install } from "./install.js";

export function registerInstall(program: Command): void {
  program
    .command("install")
    .description("Install oh-my-agent skills and configurations")
    .option(
      "--update-defaults",
      "Overwrite .agents/config/defaults.yaml with the bundled version",
    )
    .action(
      runAction(async (options: { updateDefaults?: boolean }) => {
        await install({ updateDefaults: options.updateDefaults });
      }),
    );
}

export function registerDefaultInstallAction(program: Command): void {
  program.action(
    runAction(async (options: { updateDefaults?: boolean }) => {
      await install({ updateDefaults: options.updateDefaults });
    }),
  );
}
