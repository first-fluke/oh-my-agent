/**
 * Migration 027: repair Antigravity Desktop's retired fixed-port bridge.
 *
 * Earlier OMA releases registered Serena in Antigravity Desktop at
 * `~/.gemini/antigravity/mcp_config.json` as
 * `npx … oh-my-agent bridge http://localhost:<port>/mcp`. That endpoint was a
 * transient daemon port, so later launches wait indefinitely when its process
 * has exited. Modern OMA bridge entries start or reuse the daemon themselves.
 *
 * The Desktop path is distinct from the Antigravity CLI path
 * (`~/.gemini/antigravity-cli/mcp_config.json`). Rewrite only OMA's exact
 * retired shape; all other Desktop MCP configuration remains user-owned.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { serenaTransportMode } from "../../utils/config.js";
import { isRecord } from "../../utils/type-guards.js";
import { serenaMcpEntry } from "../../vendors/serena.js";
import type { Migration } from "./index.js";
import { allowsVendor, type MigrationContext } from "./vendor-scope.js";

type McpServer = Record<string, unknown>;

function isRetiredOmaBridge(entry: unknown): entry is McpServer {
  if (!isRecord(entry) || typeof entry.command !== "string") return false;
  if (!entry.command.endsWith("npx") || !Array.isArray(entry.args)) {
    return false;
  }

  const args = entry.args;
  const packageIndex = args.findIndex(
    (arg) => typeof arg === "string" && arg.startsWith("oh-my-agent@"),
  );
  const bridgeIndex = args.indexOf("bridge");
  const endpoint = bridgeIndex === -1 ? undefined : args[bridgeIndex + 1];

  return (
    packageIndex !== -1 &&
    bridgeIndex > packageIndex &&
    typeof endpoint === "string" &&
    /^https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/mcp\/?$/.test(endpoint)
  );
}

export const migrateAntigravityDesktopSerenaBridge: Migration = {
  name: "027-antigravity-desktop-serena-bridge",
  up(cwd: string, ctx?: MigrationContext): string[] {
    if (!allowsVendor(ctx, "antigravity")) return [];

    const configPath = join(
      homedir(),
      ".gemini",
      "antigravity",
      "mcp_config.json",
    );
    if (!existsSync(configPath)) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(configPath, "utf-8"));
    } catch {
      return [];
    }
    if (!isRecord(parsed) || !isRecord(parsed.mcpServers)) return [];

    const current = parsed.mcpServers.serena;
    if (!isRetiredOmaBridge(current)) return [];

    parsed.mcpServers.serena = {
      ...current,
      ...serenaMcpEntry("antigravity", serenaTransportMode(cwd)),
    };
    writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
    return [
      "~/.gemini/antigravity/mcp_config.json (fixed retired Serena bridge)",
    ];
  },
};
