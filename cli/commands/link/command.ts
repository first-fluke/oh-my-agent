import type { Command } from "commander";
import { runAction } from "../../cli-kit/cli-framework.js";
import { link } from "./link.js";

export function registerLink(program: Command): void {
  program
    .command("link [vendors...]")
    .description(
      "Regenerate vendor files (.claude/, .cursor/, etc.) from .agents/ SSOT",
    )
    .action(
      runAction((vendors: string[]) => {
        link(vendors.length > 0 ? vendors : undefined);
      }),
    );
}
