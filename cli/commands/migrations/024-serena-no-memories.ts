/**
 * Migration 024: Restrict direct Serena MCP launches to code intelligence.
 *
 * OMA owns workflow/session state under `.agents/state`; exposing Serena's
 * memory and onboarding tools creates a second writable state plane. OMA's
 * custom Serena contexts remove those tools at MCP registration time; the
 * built-in `no-memories` mode remains as defense in depth.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { reconcileSerenaToolExclusions } from "../../io/serena.js";
import type { CliVendor } from "../../types/index.js";
import { isRecord } from "../../utils/type-guards.js";
import {
  hasSerenaNoMemories,
  withSerenaContext,
  withSerenaNoMemories,
} from "../../vendors/serena.js";
import type { Migration } from "./index.js";
import { allowsVendor, type MigrationContext } from "./vendor-scope.js";

interface SerenaEntry {
  command?: unknown;
  args?: unknown;
  [key: string]: unknown;
}

function needsNoMemories(entry: unknown): entry is SerenaEntry {
  return (
    isRecord(entry) &&
    entry.command === "serena" &&
    Array.isArray(entry.args) &&
    !hasSerenaNoMemories(entry as SerenaEntry)
  );
}

function migrateSerenaEntry(entry: unknown): SerenaEntry | null {
  if (!isRecord(entry)) return null;
  let migrated = entry as SerenaEntry;

  if (needsNoMemories(migrated)) {
    migrated = withSerenaNoMemories(migrated);
  }

  if (Array.isArray(migrated.args)) {
    const idx = migrated.args.indexOf("--context");
    const context = migrated.args[idx + 1];
    if (idx !== -1 && typeof context === "string") {
      migrated = withSerenaContext(migrated, context);
    }
  }

  return migrated === entry ? null : migrated;
}

function migrateJsonFile(
  path: string,
  options: { removeMemoryToolGroup?: boolean } = {},
): boolean {
  if (!existsSync(path)) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return false;
  }
  if (!isRecord(parsed) || !isRecord(parsed.mcpServers)) return false;
  let changed = false;
  const migratedSerena = migrateSerenaEntry(parsed.mcpServers.serena);
  if (migratedSerena) {
    parsed.mcpServers.serena = migratedSerena;
    changed = true;
  }
  if (options.removeMemoryToolGroup && isRecord(parsed.toolGroups)) {
    if ("memory" in parsed.toolGroups) {
      delete parsed.toolGroups.memory;
      changed = true;
    }
    if (Array.isArray(parsed.toolGroups.project)) {
      const filtered = parsed.toolGroups.project.filter(
        (tool) =>
          tool !== "onboarding" && tool !== "check_onboarding_performed",
      );
      if (filtered.length !== parsed.toolGroups.project.length) {
        parsed.toolGroups.project = filtered;
        changed = true;
      }
    }
  }
  if (!changed) return false;
  writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
  return true;
}

function migrateTomlFile(path: string): boolean {
  if (!existsSync(path)) return false;
  let parsed: Record<string, unknown>;
  try {
    parsed = parseToml(readFileSync(path, "utf-8")) as Record<string, unknown>;
  } catch {
    return false;
  }
  if (!isRecord(parsed.mcp_servers)) return false;
  const migratedSerena = migrateSerenaEntry(parsed.mcp_servers.serena);
  if (!migratedSerena) return false;

  parsed.mcp_servers.serena = migratedSerena;
  writeFileSync(path, `${stringifyToml(parsed)}\n`, "utf-8");
  return true;
}

function migrateProjectYml(path: string): boolean {
  if (!existsSync(path)) return false;
  let current: string;
  try {
    current = readFileSync(path, "utf-8");
  } catch {
    return false;
  }
  const updated = reconcileSerenaToolExclusions(current);
  if (updated === null) return false;
  writeFileSync(path, updated, "utf-8");
  return true;
}

export const migrateSerenaNoMemories: Migration = {
  name: "024-serena-no-memories",
  up(cwd: string, ctx?: MigrationContext): string[] {
    const actions: string[] = [];
    const note = "serena memory tools disabled";
    const jsonTargets: Array<{
      path: string;
      label: string;
      vendor?: CliVendor;
    }> = [
      { path: join(cwd, ".agents", "mcp.json"), label: ".agents/mcp.json" },
      {
        path: join(cwd, ".agents", "mcp_config.json"),
        label: ".agents/mcp_config.json",
      },
      { path: join(cwd, ".mcp.json"), label: ".mcp.json", vendor: "claude" },
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
        path: join(cwd, ".kiro", "settings", "cli.json"),
        label: ".kiro/settings/cli.json",
        vendor: "kiro",
      },
      {
        path: join(cwd, ".kimi-code", "mcp.json"),
        label: ".kimi-code/mcp.json",
        vendor: "kimi",
      },
      {
        path: join(homedir(), ".claude.json"),
        label: "~/.claude.json",
        vendor: "claude",
      },
      {
        path: join(homedir(), ".kimi-code", "mcp.json"),
        label: "~/.kimi-code/mcp.json",
        vendor: "kimi",
      },
    ];

    for (const target of jsonTargets) {
      if (target.vendor && !allowsVendor(ctx, target.vendor)) continue;
      if (
        migrateJsonFile(target.path, {
          removeMemoryToolGroup: target.label === ".agents/mcp.json",
        })
      ) {
        actions.push(`${target.label} (${note})`);
      }
    }

    const tomlTargets: Array<{
      path: string;
      label: string;
      vendor: CliVendor;
    }> = [
      {
        path: join(cwd, ".codex", "config.toml"),
        label: ".codex/config.toml",
        vendor: "codex",
      },
      {
        path: join(cwd, ".grok", "config.toml"),
        label: ".grok/config.toml",
        vendor: "grok",
      },
      {
        path: join(homedir(), ".grok", "config.toml"),
        label: "~/.grok/config.toml",
        vendor: "grok",
      },
    ];

    for (const target of tomlTargets) {
      if (!allowsVendor(ctx, target.vendor)) continue;
      if (migrateTomlFile(target.path)) {
        actions.push(`${target.label} (${note})`);
      }
    }

    if (migrateProjectYml(join(cwd, ".serena", "project.yml"))) {
      actions.push(".serena/project.yml (serena memory tools hard-excluded)");
    }

    return actions;
  },
};
