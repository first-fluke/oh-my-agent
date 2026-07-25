/**
 * Migration 019: cut per-session MCP process cost.
 *
 * Every concurrent agent session spawns its own copy of every configured stdio
 * MCP server, so the process count is (sessions × servers × subprocesses). Two
 * fixes that need no behaviour change from the user:
 *
 *  1. context7 over HTTP. The npx entry costs two local processes per session
 *     (`npm exec` wrapper + the server). Upstash hosts the same server at
 *     https://mcp.context7.com/mcp, so the local pair becomes zero. Any API key
 *     configured in the old entry's `env` is carried over as a header.
 *
 *  2. Repair `.serena/project.yml` for serena 1.6.1. 1.6.2 renamed the language
 *     list from `languages` to `language_servers` and rewrites the file under
 *     the new name; 1.6.1 treats `languages` as required and dies with
 *     `KeyError: 'languages'` before its MCP server starts. On a machine
 *     running both — an IDE on `uvx --from git+…serena`, oma on a stable
 *     `uv tool install` — the newer one silently disables the older one. Adding
 *     the legacy key back (both versions accept the pair) restores it.
 *
 * Idempotent: entries already on HTTP and files that already carry the legacy
 * key are left untouched.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  parseProjectYmlLanguages,
  reconcileSerenaLanguages,
} from "../../io/serena.js";
import { isRecord } from "../../utils/type-guards.js";
import type { Migration } from "./index.js";

const CONTEXT7_URL = "https://mcp.context7.com/mcp";

/** True for a context7 entry still launching the package locally via npx. */
function isLocalContext7(entry: unknown): entry is Record<string, unknown> {
  if (!isRecord(entry)) return false;
  if (typeof entry.command !== "string") return false;
  if (!Array.isArray(entry.args)) return false;
  return entry.args.some(
    (arg) => typeof arg === "string" && arg.includes("@upstash/context7-mcp"),
  );
}

/**
 * Recover a Context7 API key from the old entry so the remote server keeps the
 * caller's rate limit. Keys appear either in `env` or inline as
 * `--api-key <value>`.
 */
function extractApiKey(entry: Record<string, unknown>): string | undefined {
  const env = isRecord(entry.env) ? entry.env : undefined;
  const fromEnv = env?.CONTEXT7_API_KEY;
  if (typeof fromEnv === "string" && fromEnv.length > 0) return fromEnv;

  const args = Array.isArray(entry.args) ? entry.args : [];
  const idx = args.indexOf("--api-key");
  const inline = idx === -1 ? undefined : args[idx + 1];
  return typeof inline === "string" && inline.length > 0 ? inline : undefined;
}

/**
 * Build the remote entry. Antigravity renamed `url` to `serverUrl` and reads no
 * `type`, so `.agents/mcp_config.json` gets its own shape.
 */
function remoteContext7(
  apiKey: string | undefined,
  flavor: "standard" | "antigravity",
): Record<string, unknown> {
  const entry: Record<string, unknown> =
    flavor === "antigravity"
      ? { serverUrl: CONTEXT7_URL }
      : { type: "http", url: CONTEXT7_URL };
  if (apiKey) entry.headers = { CONTEXT7_API_KEY: apiKey };
  return entry;
}

function migrateContext7(
  path: string,
  flavor: "standard" | "antigravity",
): boolean {
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
  if (!isLocalContext7(servers.context7)) return false;

  servers.context7 = remoteContext7(extractApiKey(servers.context7), flavor);
  writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`);
  return true;
}

/**
 * Give a `language_servers:`-only project.yml a `languages:` mirror.
 *
 * Delegates to the reconcile path, which reads whichever key is authoritative
 * and keeps every present key in sync. Passing the file's own current list as
 * the derived set makes this a pure repair: no language is added or removed,
 * only the missing legacy key materializes.
 */
function migrateProjectYml(path: string): boolean {
  if (!existsSync(path)) return false;

  const existing = readFileSync(path, "utf-8");
  const current = parseProjectYmlLanguages(existing);
  if (current.length === 0) return false;

  const updated = reconcileSerenaLanguages(existing, current);
  if (updated === null) return false;

  writeFileSync(path, updated);
  return true;
}

export const migrateMcpProcessCost: Migration = {
  name: "019-mcp-process-cost",
  up(cwd: string): string[] {
    const actions: string[] = [];
    const note = "context7 npx → hosted HTTP";

    const targets: Array<{
      path: string;
      label: string;
      flavor: "standard" | "antigravity";
    }> = [
      { path: join(cwd, ".mcp.json"), label: ".mcp.json", flavor: "standard" },
      {
        path: join(cwd, ".agents", "mcp.json"),
        label: ".agents/mcp.json",
        flavor: "standard",
      },
      {
        path: join(cwd, ".agents", "mcp_config.json"),
        label: ".agents/mcp_config.json",
        flavor: "antigravity",
      },
      {
        path: join(cwd, ".cursor", "mcp.json"),
        label: ".cursor/mcp.json",
        flavor: "standard",
      },
      {
        path: join(cwd, ".kimi-code", "mcp.json"),
        label: ".kimi-code/mcp.json",
        flavor: "standard",
      },
      {
        path: join(homedir(), ".claude.json"),
        label: "~/.claude.json",
        flavor: "standard",
      },
    ];

    for (const { path, label, flavor } of targets) {
      if (migrateContext7(path, flavor)) actions.push(`${label} (${note})`);
    }

    if (migrateProjectYml(join(cwd, ".serena", "project.yml"))) {
      actions.push(
        ".serena/project.yml (restored languages: key — serena 1.6.1 cannot start without it)",
      );
    }

    return actions;
  },
};
