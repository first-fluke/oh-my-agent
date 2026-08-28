/**
 * Migration 025: converge every OMA-managed Serena client on one context.
 *
 * The shared context is a fixed capability boundary: code search, diagnostics,
 * and symbol-aware edits remain available; memory/onboarding state does not.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import type { CliVendor } from "../../types/index.js";
import { isRecord } from "../../utils/type-guards.js";
import {
  OMA_SERENA_CONTEXT,
  OMA_SERENA_FIXED_TOOLS,
  withSerenaContext,
} from "../../vendors/serena.js";
import type { Migration } from "./index.js";
import { allowsVendor, type MigrationContext } from "./vendor-scope.js";

interface SerenaEntry {
  command?: unknown;
  args?: unknown;
  [key: string]: unknown;
}

const SERENA_TOOL_GROUPS = {
  "code-analysis": [
    "get_symbols_overview",
    "find_symbol",
    "find_referencing_symbols",
    "find_implementations",
    "find_declaration",
    "search_for_pattern",
  ],
  "code-diagnostics": ["get_diagnostics_for_file"],
  "code-edit": [
    "replace_symbol_body",
    "insert_after_symbol",
    "insert_before_symbol",
    "rename_symbol",
    "safe_delete_symbol",
    "replace_in_files",
  ],
  "file-ops": ["list_dir", "find_file"],
  "serena-support": ["initial_instructions"],
} as const;

function migrateSerenaEntry(entry: unknown): SerenaEntry | null {
  if (!isRecord(entry) || !Array.isArray(entry.args)) return null;
  const index = entry.args.indexOf("--context");
  const isManagedLauncher =
    entry.command === "serena" ||
    (entry.command === "oma" && entry.args.includes("bridge"));
  if (!isManagedLauncher) return null;
  const currentContext =
    index !== -1 && typeof entry.args[index + 1] === "string"
      ? entry.args[index + 1]
      : OMA_SERENA_CONTEXT;
  const migrated = withSerenaContext(entry as SerenaEntry, currentContext);
  return migrated === entry ? null : migrated;
}

function arraysEqual(left: unknown, right: readonly string[]): boolean {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function syncSerenaCatalog(parsed: Record<string, unknown>): boolean {
  if (!isRecord(parsed.mcpServers)) return false;
  const serena = parsed.mcpServers.serena;
  if (!isRecord(serena)) return false;
  if (!Array.isArray(serena.args)) return false;
  const contextIndex = serena.args.indexOf("--context");
  if (serena.args[contextIndex + 1] !== OMA_SERENA_CONTEXT) return false;

  let changed = false;
  if (!arraysEqual(serena.available_tools, OMA_SERENA_FIXED_TOOLS)) {
    serena.available_tools = [...OMA_SERENA_FIXED_TOOLS];
    changed = true;
  }

  if (!isRecord(parsed.toolGroups)) return changed;
  for (const [group, tools] of Object.entries(SERENA_TOOL_GROUPS)) {
    if (!arraysEqual(parsed.toolGroups[group], tools)) {
      parsed.toolGroups[group] = [...tools];
      changed = true;
    }
  }
  for (const obsolete of ["project", "thinking", "memory"]) {
    if (obsolete in parsed.toolGroups) {
      delete parsed.toolGroups[obsolete];
      changed = true;
    }
  }
  return changed;
}

function migrateJsonFile(path: string, syncCatalog: boolean): boolean {
  if (!existsSync(path)) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return false;
  }
  if (!isRecord(parsed) || !isRecord(parsed.mcpServers)) return false;

  let changed = false;
  const migrated = migrateSerenaEntry(parsed.mcpServers.serena);
  if (migrated) {
    parsed.mcpServers.serena = migrated;
    changed = true;
  }
  if (syncCatalog && syncSerenaCatalog(parsed)) changed = true;
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
  const migrated = migrateSerenaEntry(parsed.mcp_servers.serena);
  if (!migrated) return false;

  parsed.mcp_servers.serena = migrated;
  writeFileSync(path, `${stringifyToml(parsed)}\n`, "utf-8");
  return true;
}

export const migrateUnifiedSerenaContext: Migration = {
  name: "025-unify-serena-context",
  up(cwd: string, ctx?: MigrationContext): string[] {
    const actions: string[] = [];
    const note = "serena context unified";
    const jsonTargets: Array<{
      path: string;
      label: string;
      vendor?: CliVendor;
      catalog?: boolean;
    }> = [
      {
        path: join(cwd, ".agents", "mcp.json"),
        label: ".agents/mcp.json",
        catalog: true,
      },
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
      if (migrateJsonFile(target.path, target.catalog === true)) {
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

    return actions;
  },
};
