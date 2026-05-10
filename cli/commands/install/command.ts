import type { Command } from "commander";
import { runAction } from "../../utils/cli-framework.js";
import { install } from "./install.js";

export { install } from "./install.js";

const YES_FLAG_DESC =
  "Skip prompts and use defaults (also honors OMA_YES=1 and CI=true)";

export function registerInstall(program: Command): void {
  program
    .command("install")
    .description("Install oh-my-agent skills and configurations")
    .option("-y, --yes", YES_FLAG_DESC)
    .action(
      runAction(async (opts: { yes?: boolean }) => {
        await install({ yes: Boolean(opts?.yes) });
      }),
    );
}

export function registerDefaultInstallAction(program: Command): void {
  program.option("-y, --yes", YES_FLAG_DESC).action(
    runAction(async (opts: { yes?: boolean }) => {
      await install({ yes: Boolean(opts?.yes) });
    }),
  );
}
