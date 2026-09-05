import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { isRecord } from "../utils/type-guards.js";
import { resolveAsideCommand } from "./aside.js";
import { browserMcpDocument } from "./browser-mcp-document.js";
import {
  type BrowserMcpOptions,
  browserMcpTargets,
  piAgentDir,
} from "./browser-mcp-targets.js";
import {
  type DevToolsBrowser,
  RECOMMENDED_ASIDE_MCP,
  RECOMMENDED_CHROME_DEVTOOLS_MCP,
  RECOMMENDED_FIREFOX_DEVTOOLS_MCP,
} from "./serena.js";

const SERVERS = {
  aside: { name: "aside", config: RECOMMENDED_ASIDE_MCP },
  chrome: { name: "chrome-devtools", config: RECOMMENDED_CHROME_DEVTOOLS_MCP },
  firefox: {
    name: "firefox-devtools",
    config: RECOMMENDED_FIREFOX_DEVTOOLS_MCP,
  },
} as const;

/** Reconcile all native vendor formats, then write only after every target validates. */
export function syncBrowserMcp(
  root: string,
  browsers: DevToolsBrowser[],
  vendors: readonly string[],
  options: BrowserMcpOptions = {},
): string[] {
  const changes: { path: string; content: string }[] = [];
  for (const target of browserMcpTargets(root, vendors, options)) {
    const doc = browserMcpDocument(target);
    const servers = doc.get(target.keys);
    if (servers !== undefined && !isRecord(servers)) {
      throw new Error(
        `Expected ${target.keys.join(".")} to be an object in ${target.path}`,
      );
    }
    for (const [browser, server] of Object.entries(SERVERS)) {
      const keys = [...target.keys, server.name];
      if (target.removeOnly || !browsers.includes(browser as DevToolsBrowser)) {
        doc.set(keys, undefined);
        continue;
      }
      const serverConfig =
        browser === "aside"
          ? { ...server.config, command: resolveAsideCommand() ?? "aside" }
          : server.config;
      const config =
        target.entry === "opencode"
          ? {
              type: "local",
              command: [serverConfig.command, ...serverConfig.args],
              enabled: true,
            }
          : target.entry === "copilot"
            ? { type: "local", ...serverConfig, tools: ["*"] }
            : target.entry === "stdio"
              ? { type: "stdio", ...serverConfig }
              : { ...serverConfig };
      const existing = doc.get(keys);
      // Repair the default launcher after installation outside PATH, while
      // retaining custom commands, arguments, environment and vendor flags.
      if (
        browser === "aside" &&
        isRecord(existing) &&
        serverConfig.command !== "aside"
      ) {
        const command = existing.command;
        const usesDefault =
          target.entry === "opencode"
            ? Array.isArray(command) &&
              command.length === 2 &&
              command[0] === "aside" &&
              command[1] === "mcp"
            : command === "aside" &&
              Array.isArray(existing.args) &&
              existing.args.length === 1 &&
              existing.args[0] === "mcp";
        doc.set(
          keys,
          usesDefault ? { ...existing, command: config.command } : existing,
        );
      } else {
        doc.set(keys, existing ?? config);
      }
    }
    const change = doc.result();
    if (change) changes.push(change);
  }

  if (vendors.includes("pi") && browsers.length > 0) {
    const path = options.global
      ? join(piAgentDir(options.home ?? homedir()), "settings.json")
      : join(root, ".pi", "settings.json");
    const doc = browserMcpDocument({ path, keys: [], format: "json" });
    const packages = doc.get(["packages"]) ?? [];
    if (!Array.isArray(packages))
      throw new Error(`Expected packages to be an array in ${path}`);
    const hasAdapter = packages.some((entry) => {
      const source = isRecord(entry) ? entry.source : entry;
      return (
        typeof source === "string" &&
        /^npm:pi-mcp-adapter(?:@[^/]+)?$/.test(source)
      );
    });
    if (!hasAdapter) doc.set(["packages"], [...packages, "npm:pi-mcp-adapter"]);
    const change = doc.result();
    if (change) changes.push(change);
  }

  if (!options.dryRun) {
    for (const { path, content } of changes) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    }
  }
  return changes.map(({ path }) => path);
}
