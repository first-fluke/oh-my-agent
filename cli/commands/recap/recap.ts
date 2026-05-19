import { spawn } from "node:child_process";
import { startDashboard } from "../../dashboard.js";
import { formatJson } from "./internal/formatters/json.js";
import { formatMermaid } from "./internal/formatters/mermaid.js";
import { formatTerminal } from "./internal/formatters/terminal.js";
import { collectRecap, type RecapOptions } from "./internal/index.js";

export async function recap(
  jsonMode = false,
  options: RecapOptions & { mermaid?: boolean; graph?: boolean } = {},
): Promise<void> {
  if (options.graph) {
    const dashboard = startDashboard({ route: "/recap" });
    // Open browser after a short delay to let server start
    setTimeout(() => {
      const opener =
        process.platform === "darwin"
          ? { command: "open", args: [dashboard.url] }
          : process.platform === "win32"
            ? { command: "cmd", args: ["/c", "start", "", dashboard.url] }
            : { command: "xdg-open", args: [dashboard.url] };
      const child = spawn(opener.command, opener.args, {
        detached: true,
        stdio: "ignore",
      });
      child.on("error", () => undefined);
      child.unref();
    }, 500);
    return;
  }

  const output = await collectRecap(options);

  if (jsonMode) {
    console.log(formatJson(output));
    return;
  }

  if (options.mermaid) {
    console.log(formatMermaid(output));
    return;
  }

  formatTerminal(output);
}
