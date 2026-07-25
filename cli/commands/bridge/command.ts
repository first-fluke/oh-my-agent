import type { Command } from "commander";
import { runAction } from "../../utils/cli-framework.js";
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
    .action(
      runAction(async (url, options: { context?: string }) => {
        await bridge(url, { context: options.context });
      }),
    );
}
