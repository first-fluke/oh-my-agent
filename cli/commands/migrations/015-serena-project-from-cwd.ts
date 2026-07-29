/**
 * Migration 015: Replace serena's `--project .` with `--project-from-cwd`.
 *
 * serena's own `client_setup` ships `--project-from-cwd` for CLI agents: it
 * walks up from the working directory to find `.serena/project.yml` or `.git`
 * (graceful CWD fallback), which is more robust than `--project .` (the literal
 * cwd, no walk-up) for both per-workspace and global MCP configs. The two flags
 * are mutually exclusive — serena raises a UsageError if both are present — so
 * this strips `--project <value>` before inserting `--project-from-cwd`.
 *
 * Touches the same serena config locations as migration 009, plus the
 * Antigravity-derived `.agents/mcp_config.json`:
 *   - .mcp.json / .agents/mcp.json / .agents/mcp_config.json
 *   - .qwen/settings.json / .cursor/mcp.json
 *   - .codex/config.toml
 *   - ~/.claude.json
 *
 * Idempotent: skips entries already using `--project-from-cwd`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CliVendor } from "../../types/index.js";
import { isRecord } from "../../utils/type-guards.js";
import {
  parseCodexConfig,
  serializeCodexConfig,
} from "../../vendors/codex/settings.js";
import { withSerenaProjectFromCwd } from "../../vendors/serena.js";
import type { Migration } from "./index.js";
import { allowsVendor, type MigrationContext } from "./vendor-scope.js";

interface SerenaEntry {
  command?: unknown;
  args?: unknown;
  env?: Record<string, unknown>;
  [key: string]: unknown;
}

/** True for a serena entry still pinned to `--project <value>` (not from-cwd). */
function needsProjectFromCwd(entry: unknown): entry is SerenaEntry {
  if (!isRecord(entry)) return false;
  if (entry.command !== "serena") return false;
  if (!Array.isArray(entry.args)) return false;
  return (
    entry.args.includes("--project") &&
    !entry.args.includes("--project-from-cwd")
  );
}

function migrateJsonFile(path: string): boolean {
  if (!existsSync(path)) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return false;
  }
  if (!isRecord(parsed)) return false;
  const servers = parsed.mcpServers;
  if (!isRecord(servers)) return false;
  if (!needsProjectFromCwd(servers.serena)) return false;

  servers.serena = withSerenaProjectFromCwd(servers.serena as SerenaEntry);
  writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`);
  return true;
}

function migrateCodexToml(path: string): boolean {
  if (!existsSync(path)) return false;
  const parsed = parseCodexConfig(readFileSync(path, "utf-8"));
  const servers = parsed.mcp_servers;
  if (!servers) return false;
  if (!needsProjectFromCwd(servers.serena)) return false;

  const migrated = withSerenaProjectFromCwd(servers.serena as SerenaEntry);
  parsed.mcp_servers = {
    ...servers,
    serena: {
      command: migrated.command as string,
      args: migrated.args as string[],
      ...(migrated.env ? { env: migrated.env as Record<string, string> } : {}),
    },
  };
  writeFileSync(path, `${serializeCodexConfig(parsed)}\n`);
  return true;
}

export const migrateSerenaProjectFromCwd: Migration = {
  name: "015-serena-project-from-cwd",
  up(cwd: string, ctx?: MigrationContext): string[] {
    const actions: string[] = [];
    const note = "serena --project . → --project-from-cwd";

    // `vendor: undefined` marks an oma-owned path (`.agents/**`), which exists
    // only because oma created it and therefore needs no selection gate.
    const jsonTargets: Array<{
      path: string;
      label: string;
      vendor?: CliVendor;
    }> = [
      { path: join(cwd, ".mcp.json"), label: ".mcp.json", vendor: "claude" },
      { path: join(cwd, ".agents", "mcp.json"), label: ".agents/mcp.json" },
      {
        path: join(cwd, ".agents", "mcp_config.json"),
        label: ".agents/mcp_config.json",
      },
      {
        path: join(cwd, ".qwen", "settings.json"),
        label: ".qwen/settings.json",
        vendor: "qwen",
      },
      {
        path: join(cwd, ".cursor", "mcp.json"),
        label: ".cursor/mcp.json",
        vendor: "cursor",
      },
      {
        path: join(homedir(), ".claude.json"),
        label: "~/.claude.json",
        vendor: "claude",
      },
    ];

    for (const { path, label, vendor } of jsonTargets) {
      if (vendor && !allowsVendor(ctx, vendor)) continue;
      if (migrateJsonFile(path)) actions.push(`${label} (${note})`);
    }

    if (
      allowsVendor(ctx, "codex") &&
      migrateCodexToml(join(cwd, ".codex", "config.toml"))
    ) {
      actions.push(`.codex/config.toml (${note})`);
    }

    return actions;
  },
};
