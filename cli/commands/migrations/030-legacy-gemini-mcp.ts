import { existsSync, lstatSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { isRecord } from "../../utils/type-guards.js";
import { browserMcpDocument } from "../../vendors/browser-mcp-document.js";
import {
  RECOMMENDED_ASIDE_MCP,
  RECOMMENDED_CHROME_DEVTOOLS_MCP,
  RECOMMENDED_FIREFOX_DEVTOOLS_MCP,
} from "../../vendors/serena.js";
import type { Migration } from "./index.js";
import { allowsVendor, type MigrationContext } from "./vendor-scope.js";

/** Match shipped launchers exactly; custom arguments and settings remain user-owned. */
function isLegacyOmaSerena(entry: unknown): boolean {
  if (!isRecord(entry)) return false;
  if (
    Object.keys(entry).some((key) => !["command", "args", "env"].includes(key))
  )
    return false;
  if (
    entry.env !== undefined &&
    !isDeepStrictEqual(entry.env, { SERENA_LOG_LEVEL: "info" })
  )
    return false;
  const contexts = ["ide", "agent", "oma"];
  if (entry.command === "oma")
    return contexts.some((context) =>
      isDeepStrictEqual(entry.args, ["bridge", "--context", context]),
    );
  const prefix =
    entry.command === "serena"
      ? []
      : entry.command === "uvx"
        ? ["--from", "git+https://github.com/oraios/serena", "serena"]
        : undefined;
  if (!prefix) return false;
  for (const context of contexts) {
    for (const project of [[], ["--project", "."], ["--project-from-cwd"]]) {
      for (const dashboard of [[], ["--open-web-dashboard", "false"]]) {
        if (
          isDeepStrictEqual(entry.args, [
            ...prefix,
            "start-mcp-server",
            "--context",
            context,
            ...project,
            ...dashboard,
          ])
        )
          return true;
      }
    }
  }
  return false;
}

const BROWSERS = {
  aside: RECOMMENDED_ASIDE_MCP,
  "chrome-devtools": RECOMMENDED_CHROME_DEVTOOLS_MCP,
  "firefox-devtools": RECOMMENDED_FIREFOX_DEVTOOLS_MCP,
};

export const migrateLegacyGeminiMcp: Migration = {
  name: "030-legacy-gemini-mcp",
  // Cleanup needs no downloaded assets and must not force same-version updates.
  requiresReconcile: false,
  up(cwd: string, ctx?: MigrationContext): string[] {
    // Gemini was retired in favor of Antigravity. Keep the successor's vendor gate.
    if (!allowsVendor(ctx, "antigravity")) return [];
    const root = resolve(cwd);
    const path = join(root, ".gemini", "settings.json");
    let doc: ReturnType<typeof browserMcpDocument>;
    try {
      const home = existsSync(homedir())
        ? realpathSync(homedir())
        : resolve(homedir());
      if (realpathSync(root) === home) return [];
      if (!lstatSync(path).isFile()) return [];
      if (
        realpathSync(path) !==
        join(realpathSync(root), ".gemini", "settings.json")
      )
        return [];
      doc = browserMcpDocument({ path, keys: ["mcpServers"], format: "json" });
    } catch {
      return [];
    }
    const servers = doc.get(["mcpServers"]);
    if (!isRecord(servers)) return [];
    const removed: string[] = [];
    if (isLegacyOmaSerena(servers.serena)) removed.push("serena");
    for (const [name, defaults] of Object.entries(BROWSERS)) {
      if (isDeepStrictEqual(servers[name], defaults)) removed.push(name);
    }
    for (const name of removed) doc.set(["mcpServers", name], undefined);
    const change = doc.result();
    if (!change) return [];
    writeFileSync(path, change.content);
    return [
      `.gemini/settings.json (removed legacy OMA MCP: ${removed.join(", ")})`,
    ];
  },
};
