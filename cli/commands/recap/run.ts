import * as pc from "picocolors";
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
    // Open the browser once the server is listening; `url` holds the bound
    // port from then on. A failed bind opens nothing.
    void dashboard.ready.then(
      () => openUrl(dashboard.url),
      (err: unknown) => {
        console.error(
          pc.red(
            `Dashboard failed to start: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        process.exitCode = 1;
      },
    );
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
