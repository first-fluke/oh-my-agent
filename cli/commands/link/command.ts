import type { Command } from "commander";
import { runAction } from "../../utils/cli-framework.js";
import { link } from "./run.js";

export function registerLink(program: Command): void {
  program
    .command("link [vendors...]")
    .description(
      "Regenerate vendor files (.claude/, .cursor/, etc.) from .agents/ SSOT",
    )
    .option("--dry-run", "Preview what would be written without changing files")
    .action(
      runAction((vendors: string[], opts: { dryRun?: boolean }) => {
        link({
          vendorFilter: vendors.length > 0 ? vendors : undefined,
          dryRun: opts.dryRun,
        });
      }),
    );
}
