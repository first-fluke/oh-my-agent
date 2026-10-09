import { type Command, Option } from "commander";
import { runAction } from "../../utils/cli-framework.js";
import { omaHome, profileStateHome } from "../../utils/oma-home.js";
import { bridge } from "./run.js";

export function registerBridge(program: Command): void {
  program
    .command("bridge [url]")
    .description(
      "Proxy MCP stdio to a shared per-project Serena server (started on demand)",
    )
    .option(
      "--context <name>",
      "Serena context for the shared daemon (daemons are keyed by it)",
      "ide",
    )
    .addOption(
      new Option("--oma-home <path>", "Pinned global storage root").hideHelp(),
    )
    .addOption(
      new Option(
        "--oma-state-home <path>",
        "Pinned explicit profile root",
      ).hideHelp(),
    )
    .action(
      runAction(
        async (
          url,
          options: {
            context?: string;
            omaHome?: string;
            omaStateHome?: string;
          },
        ) => {
          if (options.omaHome !== undefined)
            process.env.OMA_HOME = omaHome({ OMA_HOME: options.omaHome });
          if (options.omaStateHome !== undefined)
            process.env.OMA_STATE_HOME = profileStateHome({
              OMA_STATE_HOME: options.omaStateHome,
            });
          await bridge(url, { context: options.context });
        },
      ),
    );
}
