import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const RECOMMENDED_CHROME_DEVTOOLS_MCP = {
  command: "npx",
  args: [
    "-y",
    "chrome-devtools-mcp@latest",
    "--no-usage-statistics",
    "--isolated",
  ] as string[],
} as const;

export const RECOMMENDED_FIREFOX_DEVTOOLS_MCP = {
  command: "npx",
  args: [
    "-y",
    "@mozilla/firefox-devtools-mcp@latest",
    "--autoProfile",
  ] as string[],
} as const;

export const RECOMMENDED_ASIDE_MCP = {
  command: "aside",
  args: ["mcp"] as string[],
} as const;

export type DevToolsBrowser = "aside" | "chrome" | "firefox";

export function syncDevToolsMcp(
  installRoot: string,
  browsers: DevToolsBrowser[],
): void {
  const mcpFiles = [
    join(installRoot, ".agents", "mcp.json"),
    join(installRoot, ".agents", "mcp_config.json"),
    join(installRoot, ".mcp.json"),
  ];

  const browserList = Array.isArray(browsers) ? browsers : [];

  for (const file of mcpFiles) {
    if (!existsSync(file)) continue;
    try {
      const data = JSON.parse(readFileSync(file, "utf-8"));
      if (!data || typeof data !== "object" || !data.mcpServers) continue;

      const mcpServers = data.mcpServers as Record<string, unknown>;

      if (browserList.includes("aside")) {
        mcpServers.aside = { ...RECOMMENDED_ASIDE_MCP };
      } else {
        delete mcpServers.aside;
      }

      if (browserList.includes("chrome")) {
        mcpServers["chrome-devtools"] = { ...RECOMMENDED_CHROME_DEVTOOLS_MCP };
      } else {
        delete mcpServers["chrome-devtools"];
      }

      if (browserList.includes("firefox")) {
        mcpServers["firefox-devtools"] = {
          ...RECOMMENDED_FIREFOX_DEVTOOLS_MCP,
        };
      } else {
        delete mcpServers["firefox-devtools"];
      }

      writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    } catch {
      // ignore parse errors
    }
  }
}

export type SerenaMcpServerLike = {
  command?: unknown;
  args?: unknown;
};

export function isLegacyUvxSerena(
  server: SerenaMcpServerLike | undefined,
): boolean {
  if (server?.command !== "uvx") return false;
  if (!Array.isArray(server.args)) return false;
  return server.args.some(
    (arg) =>
      typeof arg === "string" &&
      arg.includes("git+https://github.com/oraios/serena"),
  );
}

const DISABLE_DASHBOARD_OPEN_ARGS = ["--open-web-dashboard", "false"] as const;
export const SERENA_NO_MEMORY_MODE_ARGS = [
  "--add-mode",
  "no-memories",
] as const;

/** Built-in client contexts that OMA maps to its shared Serena context. */
export const OMA_SERENA_BASE_CONTEXTS = [
  "codex",
  "ide",
  "claude-code",
  "antigravity",
] as const;

const OMA_SERENA_BASE_CONTEXT_SET = new Set<string>(OMA_SERENA_BASE_CONTEXTS);
export const OMA_SERENA_CONTEXT = "oma" as const;

/**
 * Serena capabilities exposed by OMA's shared code-intelligence context.
 *
 * The allowlist deliberately retains search, diagnostics, and symbol-aware
 * edits. Memory and onboarding are absent because OMA owns session/workflow
 * state under `.agents/`.
 */
export const OMA_SERENA_FIXED_TOOLS = [
  "list_dir",
  "find_file",
  "search_for_pattern",
  "get_symbols_overview",
  "find_symbol",
  "find_referencing_symbols",
  "find_implementations",
  "find_declaration",
  "get_diagnostics_for_file",
  "replace_symbol_body",
  "insert_after_symbol",
  "insert_before_symbol",
  "rename_symbol",
  "safe_delete_symbol",
  "replace_in_files",
  "initial_instructions",
] as const;

const OMA_SERENA_LEGACY_CONTEXT_SET = new Set<string>(
  OMA_SERENA_BASE_CONTEXTS.map((context) => `oma-${context}`),
);

/** Resolve every OMA-managed client context to the shared OMA context. */
export function omaSerenaContext(context: string): string {
  if (
    context === OMA_SERENA_CONTEXT ||
    OMA_SERENA_BASE_CONTEXT_SET.has(context) ||
    OMA_SERENA_LEGACY_CONTEXT_SET.has(context)
  ) {
    return OMA_SERENA_CONTEXT;
  }
  return context;
}

export function serenaStartMcpArgs(context: string): string[] {
  return [
    "start-mcp-server",
    "--context",
    omaSerenaContext(context),
    "--project-from-cwd",
    ...SERENA_NO_MEMORY_MODE_ARGS,
    ...DISABLE_DASHBOARD_OPEN_ARGS,
  ];
}

export function serenaDaemonMcpArgs(
  context: string,
  root: string,
  port: number,
): string[] {
  return [
    "start-mcp-server",
    "--transport",
    "streamable-http",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--project",
    root,
    "--context",
    omaSerenaContext(context),
    ...SERENA_NO_MEMORY_MODE_ARGS,
    ...DISABLE_DASHBOARD_OPEN_ARGS,
  ];
}

export interface SerenaMcpEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
  /** Vendor configs carry extra per-server keys; keep the shape assignable. */
  [key: string]: unknown;
}

/**
 * The serena entry oma writes into a vendor's MCP config.
 *
 * Default is `bridge`: a small stdio proxy that connects the session to one
 * shared, project-pinned serena HTTP server, starting it on first use. Sessions
 * on the same project then share a single language-server stack instead of each
 * paying for its own, which is what makes several concurrent agents affordable.
 * The proxy falls back to a session-local stdio serena whenever the daemon
 * cannot be reached, so the worst case is today's behaviour.
 *
 * `stdio` restores the unshared form for anyone who wants it
 * (`serena.mode: stdio` in oma-config.yaml).
 */
export function serenaMcpEntry(
  context: string,
  mode: "bridge" | "stdio" = "bridge",
): SerenaMcpEntry {
  if (mode === "stdio") {
    return {
      command: "serena",
      args: serenaStartMcpArgs(context),
      env: { SERENA_LOG_LEVEL: "info" },
    };
  }

  // Always the bare `oma` binary, never an absolute path. An earlier version
  // baked `process.execPath` + the script path in — but several of these
  // configs are COMMITTED files (Claude's `.mcp.json`, often
  // `.codex/config.toml`), so a machine-specific `/Users/<name>/...mise...`
  // path broke every other checkout of the repo and churned with every node
  // version bump. Bare `oma` carries exactly the same PATH assumption as the
  // bare `serena` these entries have always shipped with.
  return {
    command: "oma",
    args: ["bridge", "--context", omaSerenaContext(context)],
    env: { SERENA_LOG_LEVEL: "info" },
  };
}

/** True for an oma-managed serena entry in bridge form. */
export function isBridgeSerenaEntry(
  server: SerenaMcpServerLike | undefined,
): boolean {
  if (!server || !Array.isArray(server.args)) return false;
  return server.args.includes("bridge") && server.args.includes("--context");
}

/**
 * True for an entry that launches serena in any form oma recognizes:
 * the `oma bridge` proxy, the `serena` binary, or a `uv`/`uvx` invocation of the
 * package.
 *
 * All of these are the same server reached by a different route, so oma owns
 * their transport — leaving one behind would silently keep that install paying
 * for a full serena stack per session while every other install shares one.
 *
 * What this deliberately does NOT match is an entry oma cannot recognize: a
 * fork, a wrapper script with bespoke env, or a remote `url` entry. Those are
 * genuine customization and are left exactly as the user wrote them.
 */
export function isSerenaLauncherEntry(
  server: SerenaMcpServerLike | undefined,
): boolean {
  if (!server) return false;
  if (isBridgeSerenaEntry(server)) return true;
  if (server.command === "serena") return true;
  if (server.command === "uvx" || server.command === "uv") {
    return (
      Array.isArray(server.args) &&
      server.args.some(
        (arg) => typeof arg === "string" && arg.includes("serena"),
      )
    );
  }
  return false;
}

/**
 * True when an oma-written entry disagrees with what oma would write now:
 * wrong transport for the configured mode, or a bridge entry that still
 * launches oma by absolute path.
 *
 * Every vendor's "does this config need rewriting?" check has to consult this.
 * The entries left behind by earlier oma versions are otherwise perfectly
 * valid, so without it the switch to (or away from) the shared daemon — and
 * the repair of 11.0.0's machine-specific-path entries — would never reach an
 * install that already has serena working.
 */
export function hasStaleSerenaTransport(
  server: SerenaMcpServerLike | undefined,
  mode: "bridge" | "stdio",
): boolean {
  if (!isSerenaLauncherEntry(server)) return false;
  if ((mode === "bridge") !== isBridgeSerenaEntry(server)) return true;
  if (!hasOmaSerenaContext(server)) return true;
  if (mode === "stdio" && !hasSerenaNoMemories(server)) return true;
  // 11.0.0 briefly wrote bridge entries as `<abs node> <abs script> bridge …`.
  // Those are machine-specific (and committed, for Claude's .mcp.json), so any
  // bridge entry not invoking the bare `oma` binary is due for a rewrite.
  return isBridgeSerenaEntry(server) && server?.command !== "oma";
}

/** True when a managed launcher selects OMA's shared context. */
export function hasOmaSerenaContext(
  server: SerenaMcpServerLike | undefined,
): boolean {
  if (!server || !Array.isArray(server.args)) return false;
  const idx = server.args.indexOf("--context");
  if (idx === -1 || typeof server.args[idx + 1] !== "string") return false;
  const context = server.args[idx + 1] as string;
  // Unknown custom contexts remain user-owned. Built-ins and OMA's superseded
  // per-client contexts are stale; only the shared `oma` context is current.
  return (
    context === OMA_SERENA_CONTEXT ||
    (!OMA_SERENA_BASE_CONTEXT_SET.has(context) &&
      !OMA_SERENA_LEGACY_CONTEXT_SET.has(context))
  );
}

export function hasSerenaDashboardOpenDisabled(
  server: SerenaMcpServerLike | undefined,
): boolean {
  if (server?.command !== "serena" || !Array.isArray(server.args)) {
    return true;
  }
  const idx = server.args.indexOf("--open-web-dashboard");
  return idx !== -1 && String(server.args[idx + 1]).toLowerCase() === "false";
}

export function hasSerenaNoMemories(
  server: SerenaMcpServerLike | undefined,
): boolean {
  if (server?.command !== "serena" || !Array.isArray(server.args)) {
    return true;
  }
  const args = server.args;
  return args.some(
    (arg, index) =>
      (arg === "--add-mode" || arg === "--mode") &&
      args[index + 1] === "no-memories",
  );
}

/** Restrict direct Serena launches to code intelligence only. */
export function withSerenaNoMemories<T extends SerenaMcpServerLike>(
  server: T,
): T {
  if (server.command !== "serena" || !Array.isArray(server.args)) return server;
  if (hasSerenaNoMemories(server)) return server;
  return {
    ...server,
    args: [...server.args, ...SERENA_NO_MEMORY_MODE_ARGS],
  } as T;
}

export function withSerenaDashboardOpenDisabled<T extends SerenaMcpServerLike>(
  server: T,
): T {
  if (server.command !== "serena" || !Array.isArray(server.args)) return server;
  if (hasSerenaDashboardOpenDisabled(server)) return server;

  const idx = server.args.indexOf("--open-web-dashboard");
  if (idx !== -1) {
    const nextArgs = [...server.args];
    nextArgs[idx + 1] = "false";
    return { ...server, args: nextArgs } as T;
  }

  return {
    ...server,
    args: [...server.args, ...DISABLE_DASHBOARD_OPEN_ARGS],
  } as T;
}

/**
 * Resolve and stamp a managed Serena entry's `--context`, inserting the flag
 * when absent. OMA's known client and legacy contexts converge on `oma`;
 * unknown custom contexts remain unchanged.
 */
export function withSerenaContext<T extends SerenaMcpServerLike>(
  server: T,
  context: string,
): T {
  // Applies to both entry shapes: `serena … --context X` and the bridge's
  // `oma bridge --context X`.
  const isManaged =
    server.command === "serena" ||
    (server.command === "oma" &&
      Array.isArray(server.args) &&
      server.args.includes("bridge"));
  if (!isManaged || !Array.isArray(server.args)) return server;

  const resolvedContext = omaSerenaContext(context);
  const idx = server.args.indexOf("--context");
  if (idx === -1) {
    return {
      ...server,
      args: [...server.args, "--context", resolvedContext],
    } as T;
  }
  if (server.args[idx + 1] === resolvedContext) return server;

  const nextArgs = [...server.args];
  nextArgs[idx + 1] = resolvedContext;
  return { ...server, args: nextArgs } as T;
}

/**
 * Force a serena entry to resolve its project from the working directory.
 *
 * `--project .` pins the literal cwd as the project (no walk-up), whereas
 * `--project-from-cwd` searches upward for `.serena/project.yml` or `.git`
 * (graceful CWD fallback) — the form serena's own `client_setup` ships for
 * Claude Code / Codex. The two flags are mutually exclusive (serena raises a
 * UsageError when both are present), so this strips any `--project <value>`
 * before inserting `--project-from-cwd`. No-op for non-serena entries or when
 * `--project-from-cwd` is already set.
 */
export function withSerenaProjectFromCwd<T extends SerenaMcpServerLike>(
  server: T,
): T {
  if (server.command !== "serena" || !Array.isArray(server.args)) return server;
  if (server.args.includes("--project-from-cwd")) return server;

  const idx = server.args.indexOf("--project");
  if (idx === -1) {
    return { ...server, args: [...server.args, "--project-from-cwd"] } as T;
  }

  const nextArgs = [...server.args];
  // Drop `--project` plus its value when the next token is a value (not a flag).
  const hasValue =
    idx + 1 < nextArgs.length && !String(nextArgs[idx + 1]).startsWith("--");
  nextArgs.splice(idx, hasValue ? 2 : 1, "--project-from-cwd");
  return { ...server, args: nextArgs } as T;
}
