import * as fs from "node:fs";
import { join } from "node:path";
import { applyRecommendedCursorSettings } from "../../vendors/cursor/settings.js";

/**
 * Generate Cursor's `.cursor/mcp.json` from the SSOT `.agents/mcp.json`, but
 * with the serena entry overridden to `--context=ide` (Cursor is an IDE
 * extension client per serena upstream docs). Replaces legacy symlinks that
 * previously pointed at `.agents/mcp.json`.
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

  // Cursor reads only `mcpServers`; strip oma-only keys (memoryConfig, toolGroups).
  const cursorOnly: Record<string, unknown> = {};
  if (baseConfig.mcpServers) cursorOnly.mcpServers = baseConfig.mcpServers;

  const next = applyRecommendedCursorSettings(cursorOnly);

  // If a legacy symlink exists, replace it with a real file.
  try {
    const stat = fs.lstatSync(cursorMcp);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(cursorMcp);
    }
  } catch {
    // missing — no-op
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
