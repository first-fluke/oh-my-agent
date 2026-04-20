import type { Command } from "commander";
import { runAction } from "../../cli-kit/cli-framework.js";
import { star } from "./star.js";

export function registerStar(program: Command): void {
  program
    .command("star")
    .description("Star oh-my-agent on GitHub")
    .action(
      runAction(async () => {
        await star();
      }),
    );
}
