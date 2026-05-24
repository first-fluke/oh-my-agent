/**
 * Migration 009: Migrate legacy `uvx --from git+https://github.com/oraios/serena`
 * Serena MCP entries to the new `serena start-mcp-server` form.
 *
 * Background: Serena's official install guide moved from ephemeral git-based
 * `uvx --from git+...` invocations to a persistent `uv tool install -p 3.13
 * serena-agent@latest --prerelease=allow` flow. The MCP transport now invokes
 * the globally-installed `serena` binary directly. Per the upstream client
 * matrix, each vendor gets its own `--context`:
 *   - Claude Code → claude-code
 *   - Codex       → codex
 *   - Cursor/IDE  → ide
 *   - Qwen/Gemini → ide (terminal clients)
 *
 * Touches:
 *   - .codex/config.toml      (mcp_servers.serena)
 *   - .qwen/settings.json     (mcpServers.serena, also bumps context=agent→ide)
 *   - .gemini/settings.json   (mcpServers.serena — stdio variant)
 *   - .agents/mcp.json        (project-local SSOT, mcpServers.serena, context→claude-code)
 *   - ~/.claude.json          (top-level mcpServers.serena, context→claude-code)
 *
 * Idempotent: skips entries already using the new `serena` command with the
 * vendor-appropriate context.
 */
import {
  existsSync,
  lstatSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadSerenaConfig } from "../../utils/config.js";
import {
  applyClaudeMcp,
  needsClaudeMcpUpdate,
} from "../../vendors/claude/mcp.js";
import {
  parseCodexConfig,
  serializeCodexConfig,
} from "../../vendors/codex/settings.js";
import { LEGACY_GEMINI_BRIDGE_URL } from "../../vendors/gemini/settings.js";
import type { Migration } from "./index.js";

const LEGACY_GIT_FRAGMENT = "git+https://github.com/oraios/serena";

interface SerenaEntry {
  command?: unknown;
  args?: unknown;
  env?: Record<string, unknown>;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLegacySerenaEntry(entry: unknown): entry is SerenaEntry {
  if (!isRecord(entry)) return false;
  if (entry.command !== "uvx") return false;
  if (!Array.isArray(entry.args)) return false;
  return entry.args.some(
    (arg) => typeof arg === "string" && arg.includes(LEGACY_GIT_FRAGMENT),
  );
}

/**
 * True when the entry already uses the new `serena` binary but has a stale
 * `--context` value (e.g. the old `agent` context for Qwen, or `ide` where
 * `claude-code` is now recommended).
 */
function hasStaleContext(
  entry: unknown,
  expectedContext: string | undefined,
): entry is SerenaEntry {
  if (!expectedContext) return false;
  if (!isRecord(entry)) return false;
  if (entry.command !== "serena") return false;
  if (!Array.isArray(entry.args)) return false;
  const idx = entry.args.indexOf("--context");
  if (idx === -1) return true;
  return entry.args[idx + 1] !== expectedContext;
}

/**
 * Strip the leading `--from git+... serena` arguments from a legacy uvx args
 * array. The remaining tail (e.g. `start-mcp-server --context codex ...`) is
 * exactly what the new `serena` binary expects.
 */
function tailAfterLegacyPrefix(args: unknown[]): string[] {
  const stringArgs = args.filter((a): a is string => typeof a === "string");
  let i = 0;
  if (stringArgs[i] === "--from") i += 2; // skip --from <url>
  if (stringArgs[i] === "serena") i += 1;
  return stringArgs.slice(i);
}

function migrateEntry(
  entry: SerenaEntry,
  contextOverride?: string,
): SerenaEntry {
  const args = Array.isArray(entry.args) ? entry.args : [];
  const tail = tailAfterLegacyPrefix(args);
  const finalArgs = tail.length > 0 ? tail : ["start-mcp-server"];
  if (contextOverride) {
    const idx = finalArgs.indexOf("--context");
    if (idx !== -1 && idx + 1 < finalArgs.length) {
      finalArgs[idx + 1] = contextOverride;
    } else {
      finalArgs.push("--context", contextOverride);
    }
  }
  return {
    ...entry,
    command: "serena",
    args: finalArgs,
  };
}

function migrateJsonFile(
  path: string,
  parent: "mcpServers" | "mcp_servers",
  contextOverride?: string,
): boolean {
  if (!existsSync(path)) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return false;
  }
  if (!isRecord(parsed)) return false;

  const servers = parsed[parent];
  if (!isRecord(servers)) return false;
  const serena = servers.serena;
  const legacy = isLegacySerenaEntry(serena);
  const staleCtx = !legacy && hasStaleContext(serena, contextOverride);
  if (!legacy && !staleCtx) return false;

  servers.serena = migrateEntry(serena as SerenaEntry, contextOverride);
  writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`);
  return true;
}

function migrateCodexToml(path: string): boolean {
  if (!existsSync(path)) return false;
  const raw = readFileSync(path, "utf-8");
  const parsed = parseCodexConfig(raw);
  const servers = parsed.mcp_servers;
  if (!servers) return false;
  const serena = servers.serena as SerenaEntry | undefined;
  const legacy = isLegacySerenaEntry(serena);
  const staleCtx = !legacy && hasStaleContext(serena, "codex");
  if (!legacy && !staleCtx) return false;

  const migrated = migrateEntry(serena as SerenaEntry, "codex");
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

/**
 * Migrate the legacy Gemini bridge URL (`{url: http://localhost:12341/mcp}`)
 * to direct stdio. Only fires when oma-config serena.mode is stdio (default)
 * — if the user opted into bridge mode with bridge_host=gemini, the URL is
 * intentional and left alone.
 */
function migrateGeminiLegacyBridge(cwd: string): boolean {
  const path = join(cwd, ".gemini", "settings.json");
  if (!existsSync(path)) return false;

  const cfg = loadSerenaConfig(cwd);
  if (cfg.mode === "bridge" && cfg.bridgeHost === "gemini") return false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return false;
  }
  if (!isRecord(parsed)) return false;
  const servers = isRecord(parsed.mcpServers)
    ? (parsed.mcpServers as Record<string, unknown>)
    : null;
  if (!servers) return false;
  const serena = servers.serena;
  if (!isRecord(serena)) return false;
  if (
    serena.url !== LEGACY_GEMINI_BRIDGE_URL &&
    serena.httpUrl !== LEGACY_GEMINI_BRIDGE_URL
  )
    return false;

  servers.serena = {
    command: "serena",
    args: ["start-mcp-server", "--context", "ide", "--project", "."],
    env: { SERENA_LOG_LEVEL: "info" },
  };
  parsed.mcpServers = servers;
  writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`);
  return true;
}

/**
 * Migrate the legacy `.cursor/mcp.json` symlink (pointing at .agents/mcp.json)
 * to a regular file with serena `--context=ide`. This breaks the symlink
 * sharing — Cursor now has its own MCP config so it can use the IDE-optimized
 * context while .agents/mcp.json (Claude Code's template) uses claude-code.
 */
function migrateCursorSymlink(cwd: string): boolean {
  const cursorMcp = join(cwd, ".cursor", "mcp.json");
  let isSymlink = false;
  try {
    isSymlink = lstatSync(cursorMcp).isSymbolicLink();
  } catch {
    return false;
  }
  if (!isSymlink) return false;

  const agentsMcp = join(cwd, ".agents", "mcp.json");
  if (!existsSync(agentsMcp)) return false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(agentsMcp, "utf-8"));
  } catch {
    return false;
  }
  if (!isRecord(parsed)) return false;

  const mcpServers = isRecord(parsed.mcpServers)
    ? (parsed.mcpServers as Record<string, unknown>)
    : {};
  const cursorConfig: Record<string, unknown> = {
    mcpServers: {
      ...mcpServers,
      serena: {
        command: "serena",
        args: ["start-mcp-server", "--context", "ide", "--project", "."],
        env: { SERENA_LOG_LEVEL: "info" },
      },
    },
  };

  unlinkSync(cursorMcp);
  writeFileSync(cursorMcp, `${JSON.stringify(cursorConfig, null, 2)}\n`);
  return true;
}

export const migrateSerenaUvTool: Migration = {
  name: "009-serena-uv-tool",
  up(cwd: string): string[] {
    const actions: string[] = [];

    if (migrateCodexToml(join(cwd, ".codex", "config.toml"))) {
      actions.push(".codex/config.toml (Serena uvx → uv tool install)");
    }

    if (
      migrateJsonFile(join(cwd, ".qwen", "settings.json"), "mcpServers", "ide")
    ) {
      actions.push(".qwen/settings.json (Serena uvx → uv tool install)");
    }

    if (
      migrateJsonFile(
        join(cwd, ".gemini", "settings.json"),
        "mcpServers",
        "ide",
      )
    ) {
      actions.push(".gemini/settings.json (Serena uvx → uv tool install)");
    }

    if (migrateGeminiLegacyBridge(cwd)) {
      actions.push(".gemini/settings.json (bridge URL → direct stdio)");
    }

    if (
      migrateJsonFile(
        join(cwd, ".agents", "mcp.json"),
        "mcpServers",
        "claude-code",
      )
    ) {
      actions.push(".agents/mcp.json (Serena uvx → uv tool install)");
    }

    if (migrateCursorSymlink(cwd)) {
      actions.push(".cursor/mcp.json (symlink → regular file, --context=ide)");
    }

    // Claude Code project-level MCP config (`.mcp.json` at project root).
    // Refresh only when the file already exists and is stale (legacy uvx
    // or wrong --context). We don't auto-create on bare repos — `oma link`
    // owns the creation path so users opt in explicitly via the claude
    // vendor. Existing custom servers are preserved because
    // applyClaudeMcp merges instead of overwriting non-serena
    // entries.
    const claudeMcpPath = join(cwd, ".mcp.json");
    if (existsSync(claudeMcpPath)) {
      let claudeMcp: unknown = {};
      try {
        claudeMcp = JSON.parse(readFileSync(claudeMcpPath, "utf-8"));
      } catch {
        claudeMcp = {};
      }
      if (needsClaudeMcpUpdate(claudeMcp)) {
        writeFileSync(
          claudeMcpPath,
          `${JSON.stringify(applyClaudeMcp(claudeMcp), null, 2)}\n`,
        );
        actions.push(".mcp.json (Claude Code project MCP refreshed)");
      }
    }

    // ~/.claude.json (user-global Claude Code MCP config). Only touched when
    // it contains the legacy uvx form, to avoid clobbering user customizations.
    if (
      migrateJsonFile(
        join(homedir(), ".claude.json"),
        "mcpServers",
        "claude-code",
      )
    ) {
      actions.push("~/.claude.json (Serena uvx → uv tool install)");
    }

    return actions;
  },
};
