import * as p from "@clack/prompts";
import type { DevToolsBrowser } from "../vendors/serena.js";

export async function promptDevToolsBrowsers(
  nonInteractive: boolean,
  cleanup: () => void,
  defaultBrowsers: DevToolsBrowser[] = ["aside"],
): Promise<DevToolsBrowser[]> {
  if (nonInteractive) {
    return defaultBrowsers;
  }

  const selected = await p.multiselect({
    message: "Select browser MCP servers (Space to select, Enter to continue):",
    options: [
      {
        value: "aside",
        label: "Aside",
        hint: "aside mcp (automatically installs Aside if missing)",
      },
      {
        value: "chrome",
        label: "Chrome DevTools MCP",
        hint: "npx -y chrome-devtools-mcp@latest --no-usage-statistics --isolated",
      },
      {
        value: "firefox",
        label: "Firefox DevTools MCP",
        hint: "npx -y @mozilla/firefox-devtools-mcp@latest --autoProfile",
      },
    ],
    initialValues: defaultBrowsers,
    required: false,
  });

  if (p.isCancel(selected)) {
    cleanup();
    p.cancel("Cancelled.");
    process.exit(0);
  }

  return (selected as DevToolsBrowser[]) ?? defaultBrowsers;
}
