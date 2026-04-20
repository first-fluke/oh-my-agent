import type { Command } from "commander";
import { runAction } from "../../cli-kit/cli-framework.js";
import { install } from "./install.js";

export { install } from "./install.js";

export function registerInstall(program: Command): void {
  program
    .command("install")
    .description("Install oh-my-agent skills and configurations")
    .action(
      runAction(async () => {
        await install();
      }),
    );
}

export function registerDefaultInstallAction(program: Command): void {
  program.action(
    runAction(async () => {
      await install();
    }),
  );
}
