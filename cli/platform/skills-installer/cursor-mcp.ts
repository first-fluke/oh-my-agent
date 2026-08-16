import * as fs from "node:fs";
import { join } from "node:path";
import { isRecord } from "../../utils/type-guards.js";
import { applyRecommendedCursorSettings } from "../../vendors/cursor/settings.js";

/**
 * Generate Cursor's `.cursor/mcp.json` from the SSOT `.agents/mcp.json`, but
 * with the serena entry overridden to `--context=ide` (Cursor is an IDE
 * extension client per serena upstream docs). Replaces legacy symlinks that
 * previously pointed at `.agents/mcp.json`.
 *
 * oma owns only the servers it ships in the SSOT: any other entry already in
 * `.cursor/mcp.json` (user-added servers, extra top-level keys) is merged
 * through, so an update never drops hand-configured MCP servers.
 *
 * Skips if `.agents/mcp.json` is missing.
 */
export function applyCursorMcpConfig(installRoot: string): void {
  const agentsMcp = join(installRoot, ".agents", "mcp.json");
  if (!fs.existsSync(agentsMcp)) return;

  const cursorDir = join(installRoot, ".cursor");
  const cursorMcp = join(cursorDir, "mcp.json");

  let baseConfig: Record<string, unknown> = {};
  try {
    const raw = fs.readFileSync(agentsMcp, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      baseConfig = parsed as Record<string, unknown>;
    }
  } catch {
    return;
  }

  // Read what Cursor already has so user-added servers survive the rewrite. A
  // legacy symlink is skipped on purpose: it resolves to `.agents/mcp.json`, so
  // reading it would drag the oma-only keys into Cursor's file.
  let existing: Record<string, unknown> = {};
  let isLegacySymlink = false;
  try {
    isLegacySymlink = fs.lstatSync(cursorMcp).isSymbolicLink();
    if (!isLegacySymlink) {
      const parsed = JSON.parse(fs.readFileSync(cursorMcp, "utf-8"));
      if (isRecord(parsed)) existing = parsed;
    }
  } catch {
    // missing or unparseable — treat as empty and regenerate
  }

  // Cursor reads only `mcpServers`; oma-only keys (memoryConfig, toolGroups)
  // stay out of the generated file. SSOT entries win over the existing ones so
  // oma-managed servers keep getting updated; everything else is preserved.
  const cursorOnly: Record<string, unknown> = { ...existing };
  cursorOnly.mcpServers = {
    ...(isRecord(existing.mcpServers) ? existing.mcpServers : {}),
    ...(isRecord(baseConfig.mcpServers) ? baseConfig.mcpServers : {}),
  };

  const next = applyRecommendedCursorSettings(cursorOnly);

  // If a legacy symlink exists, replace it with a real file.
  if (isLegacySymlink) {
    try {
      fs.unlinkSync(cursorMcp);
    } catch {
      // already gone — no-op
    }
  }

  fs.mkdirSync(cursorDir, { recursive: true });
  fs.writeFileSync(cursorMcp, `${JSON.stringify(next, null, 2)}\n`);
}

/**
 * @deprecated Replaced by `applyCursorMcpConfig`. Kept as a thin alias for
 * any external consumers; will be removed in a future major.
 */
export function applyCursorMcpSymlink(installRoot: string): void {
  applyCursorMcpConfig(installRoot);
}
