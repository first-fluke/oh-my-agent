import type { Command } from "commander";
import {
  hasBlockingGlobalHomeMigration,
  migrateGlobalHome,
} from "../../io/global-home-migration.js";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { omaPaths, profileStateHome } from "../../utils/oma-home.js";

export function registerHome(program: Command): void {
  const home = program
    .command("home")
    .description("Inspect and migrate OMA global storage");
  addOutputOptions(home).action(
    runAction(
      (options) => {
        const paths = { ...omaPaths(), profiles: profileStateHome() };
        if (resolveJsonMode(options))
          console.log(JSON.stringify(paths, null, 2));
        else
          for (const [name, value] of Object.entries(paths))
            console.log(`${name}: ${value}`);
      },
      { supportsJsonOutput: true },
    ),
  );
  addOutputOptions(
    home
      .command("migrate")
      .description("Copy legacy OMA global files; preserve originals")
      .option(
        "--dry-run",
        "Preview files, conflicts, and deferred live data without writing",
      ),
  ).action(
    runAction(
      async (options) => {
        const result = await migrateGlobalHome({
          dryRun: options.dryRun === true,
        });
        if (resolveJsonMode(options))
          console.log(JSON.stringify(result, null, 2));
        else {
          console.log(
            `${options.dryRun ? "Would copy" : "Copied"}: ${result.copied.length}; conflicts: ${result.conflicts.length}; deferred: ${result.deferred.length}`,
          );
          for (const [kind, entries] of Object.entries(result))
            for (const entry of entries) console.log(`${kind}: ${entry}`);
        }
        if (hasBlockingGlobalHomeMigration(result)) process.exitCode = 1;
      },
      { supportsJsonOutput: true },
    ),
  );
}
