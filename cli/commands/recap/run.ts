import { startDashboard } from "../../dashboard.js";
import { openUrl } from "../../utils/open-url.js";
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
    setTimeout(() => openUrl(dashboard.url), 500);
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
