/**
 * Migration 035: Remove `toolGroups` from `.agents/mcp.json`.
 *
 * `toolGroups` named sets of MCP tools for the retired `/tools` workflow to
 * switch between. Nothing reads it: no host enforces it and vendor MCP configs
 * never carry it. The key is dropped whole, including groups a project added,
 * because a group has no effect without a reader.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isRecord } from "../../utils/type-guards.js";
import type { Migration } from "./index.js";

export const migrateRemoveMcpToolGroups: Migration = {
  name: "035-remove-mcp-tool-groups",
  up(cwd: string): string[] {
    const configPath = join(cwd, ".agents", "mcp.json");
    if (!existsSync(configPath)) return [];

    try {
      const parsed: unknown = JSON.parse(readFileSync(configPath, "utf-8"));
      if (!isRecord(parsed) || !("toolGroups" in parsed)) return [];
      delete parsed.toolGroups;
      writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`);
      return [".agents/mcp.json (removed unused toolGroups)"];
    } catch {
      // Best-effort: leave an unreadable or malformed config untouched.
      return [];
    }
  },
};
