import type { Command } from "commander";
import { runAction } from "../../utils/cli-framework.js";
import { runMigrations } from "./index.js";

type MigrateOptions = {
  from?: string;
};

export function registerMigrate(program: Command): void {
  program
    .command("migrate")
    .description("Migrate configurations from legacy environments")
    .option(
      "--from <source>",
      "Legacy source to migrate from (e.g. gemini-cli)",
    )
    .action(
      runAction((options: MigrateOptions) => {
        if (options.from !== "gemini-cli") {
          throw new Error(
            "Error: Only migration '--from gemini-cli' is supported.",
          );
        }
        console.log("Running migrations from gemini-cli...");
        const actions = runMigrations(process.cwd());
        if (actions.length === 0) {
          console.log("No legacy configurations to migrate.");
          return;
        }
        console.log("Migration completed successfully:");
        for (const action of actions) {
          console.log(`- ${action}`);
        }
      }),
    );
}
