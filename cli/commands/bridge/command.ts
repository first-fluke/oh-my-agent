import type { Command } from "commander";
import { runAction } from "../../cli-kit/cli-framework.js";
import { bridge } from "./bridge.js";

export function registerBridge(program: Command): void {
  program
    .command("bridge [url]")
    .description("Bridge MCP stdio to Streamable HTTP (for Serena)")
    .action(
      runAction(async (url) => {
        await bridge(url);
      }),
    );
}
