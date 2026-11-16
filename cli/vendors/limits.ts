/**
 * Resource limits oh-my-agent lifts in every selected vendor CLI — the one
 * place they are listed.
 *
 * Each entry is a guard the vendor applies by default that stops, refuses, or
 * queues work that is still healthy: a background shell reaped under memory
 * pressure, a deadline on background tasks, a cap on concurrent subagents.
 * Timeouts that only cut off a hung request are left alone.
 *
 * "Add when absent": a key the user already set — under any spelling, to any
 * value — is never touched. Each key goes to the file its vendor honors it
 * from; a HOME file is skipped while the vendor's config directory does not
 * exist yet (the CLI was never run), and a file that does not parse is
 * reported and left as it is.
 *
 *   claude   env.CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP = "1"   .claude/settings.json
 *            env.BASH_MAX_TIMEOUT_MS = "86400000"
 *            env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS = "50"
 *            env.MCP_SERVER_CONNECTION_BATCH_SIZE = "10"
 *            env.CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS = "7200000"
 *   codex    [agents] max_concurrent_threads_per_session = 16      .codex/config.toml
 *   kiro     "api.subagentTimeout" = 0                             .kiro/settings/cli.json
 *   kimi     [background] bash_task_timeout_s = 0                  ~/.kimi-code/config.toml
 *            [subagent] timeout_ms = 0
 *   copilot  workflows.maxConcurrentRuns = 16                      ~/.copilot/settings.json
 *
 * Keys and stock values were read from the installed CLIs (Claude Code
 * 2.1.325, Codex 0.167.1, Kiro 3.2.1, Kimi 0.29.0, Copilot 1.0.109). Claude's
 * file-read token ceiling predates this module and stays with the rest of
 * `vendors/claude/settings.ts`.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { CliVendor } from "../types/index.js";
import { warnUnmergeable } from "../utils/merge-read.js";
import { safeWriteFile } from "../utils/safe-write.js";
import { browserMcpDocument } from "./browser-mcp-document.js";
import { kiroHome } from "./kiro/trust.js";

export type VendorLimitOptions = {
  global?: boolean;
  dryRun?: boolean;
  home?: string;
};

export type VendorLimit = {
  /** Path of the key; one segment may itself contain a dot (kiro). */
  keys: string[];
  /** The value that lifts the limit. */
  value: string | number;
  /** Other spellings of the same setting; any one present counts as set. */
  aliases?: string[][];
};

export type VendorLimitTarget = {
  path: string;
  format: "jsonc" | "toml";
  /** Lives in the vendor's HOME config rather than under the project. */
  home: boolean;
  limits: VendorLimit[];
};

/** Native file and keys of every limit oma lifts, per vendor. */
export function vendorLimitTargets(
  root: string,
  vendors: readonly string[],
  options: VendorLimitOptions = {},
): VendorLimitTarget[] {
  const home = options.home ?? homedir();
  const global = options.global === true;
  const envDir = (name: string, fallback: string): string =>
    process.env[name]?.trim() || join(home, fallback);
  const target = (
    path: string,
    inHome: boolean,
    limits: VendorLimit[],
  ): VendorLimitTarget => ({
    path,
    format: path.endsWith(".toml") ? "toml" : "jsonc",
    home: inHome,
    limits,
  });
  // Honored from the project config: the project file for a project install.
  const scoped = (
    local: string,
    globalPath: string,
    limits: VendorLimit[],
  ): VendorLimitTarget[] => [
    target(global ? globalPath : join(root, local), global, limits),
  ];
  // Read from the vendor's user config only, whatever the install mode.
  const user = (path: string, limits: VendorLimit[]): VendorLimitTarget[] => [
    target(path, true, limits),
  ];
  // Exhaustive by design: a new OMA vendor must state its limits (or none).
  const targets: Record<CliVendor, () => VendorLimitTarget[]> = {
    // Claude Code reads these from its own environment at launch, which is
    // where settings.json `env` lands; values are strings.
    claude: () =>
      scoped(
        ".claude/settings.json",
        join(envDir("CLAUDE_CONFIG_DIR", ".claude"), "settings.json"),
        [
          // Backgrounded shells are stopped when the host is critically low
          // on memory and the session has been idle.
          {
            keys: ["env", "CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP"],
            value: "1",
          },
          // Ceiling on the `timeout` a Bash call may request (stock 10 min);
          // also what lets a backgrounded command outlive the stock 2 h, after
          // which it is stopped. Only a call that asks for longer gets it.
          { keys: ["env", "BASH_MAX_TIMEOUT_MS"], value: "86400000" },
          // Subagents that may run at once (stock 20); past it a launch is
          // refused rather than queued.
          {
            keys: ["env", "CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS"],
            value: "50",
          },
          // stdio MCP servers connected in parallel at startup (stock 3).
          { keys: ["env", "MCP_SERVER_CONNECTION_BATCH_SIZE"], value: "10" },
          // How long `claude -p` — `oma agent spawn` — waits on background
          // tasks after the main turn (stock 10 min). `0` waits forever, so a
          // forgotten dev server would hang a spawn; 2 h bounds it.
          {
            keys: ["env", "CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS"],
            value: "7200000",
          },
        ],
      ),
    // A spawn is refused once this many agent threads are open (stock 6).
    // `max_threads` is the same setting under its earlier name.
    codex: () =>
      scoped(
        ".codex/config.toml",
        join(envDir("CODEX_HOME", ".codex"), "config.toml"),
        [
          {
            keys: ["agents", "max_concurrent_threads_per_session"],
            value: 16,
            aliases: [["agents", "max_threads"]],
          },
        ],
      ),
    // A subagent with no progress for this many seconds is cancelled (stock
    // 3600); 0 disables. kiro-cli stores settings as flat dotted keys, and the
    // project file is the `--workspace` scope of `kiro-cli settings`.
    kiro: () =>
      scoped(
        ".kiro/settings/cli.json",
        join(kiroHome(process.env, home), "settings", "cli.json"),
        [{ keys: ["api.subagentTimeout"], value: 0 }],
      ),
    // A background Bash task is stopped 600 s after it starts and a subagent
    // after 2 h, progress or not; 0 arms no timer (what Kimi's own print mode
    // fills in). An explicit per-call `timeout` is still honored.
    kimi: () =>
      user(join(envDir("KIMI_CODE_HOME", ".kimi-code"), "config.toml"), [
        { keys: ["background", "bash_task_timeout_s"], value: 0 },
        { keys: ["subagent", "timeout_ms"], value: 0 },
      ]),
    // Top-level workflow runs at once (stock 4, range 1-16); further runs wait.
    copilot: () =>
      user(join(envDir("COPILOT_HOME", ".copilot"), "settings.json"), [
        { keys: ["workflows", "maxConcurrentRuns"], value: 16 },
      ]),
    // The background-agent cap (10) is an environment variable only.
    qwen: () => [],
    // The subagent cap is already 32 and background work has no deadline.
    grok: () => [],
    // Background commands have no timeout and agent steps are uncapped.
    opencode: () => [],
    kilo: () => [],
    // No background shells or subagents in core.
    pi: () => [],
    // Turn caps and tool timeouts are CLI flags or environment variables only.
    commandcode: () => [],
    // No resource, timeout, or concurrency key in the settings schema.
    cursor: () => [],
    antigravity: () => [],
    // No limit key known.
    zcode: () => [],
    hermes: () => [],
  };
  const result: VendorLimitTarget[] = [];
  for (const vendor of new Set(vendors)) {
    if (!Object.hasOwn(targets, vendor)) continue;
    result.push(...targets[vendor as CliVendor]());
  }
  return result;
}

/**
 * Lift the limits of every selected vendor and return the files that changed
 * (or would change, under `dryRun`).
 *
 * A file that does not parse is reported and skipped, never rewritten, and one
 * vendor's failure does not stop the others.
 */
export function syncVendorLimits(
  root: string,
  vendors: readonly string[],
  options: VendorLimitOptions = {},
): string[] {
  const changed: string[] = [];
  for (const target of vendorLimitTargets(root, vendors, options)) {
    if (target.home && !existsSync(dirname(target.path))) continue;
    try {
      const doc = browserMcpDocument({
        path: target.path,
        keys: [],
        format: target.format,
      });
      for (const limit of target.limits) {
        const spellings = [limit.keys, ...(limit.aliases ?? [])];
        if (spellings.some((keys) => doc.get(keys) !== undefined)) continue;
        doc.set(limit.keys, limit.value);
      }
      const change = doc.result();
      if (!change) continue;
      if (!options.dryRun) safeWriteFile(change.path, change.content);
      changed.push(change.path);
    } catch (error) {
      warnUnmergeable(
        target.path,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  return changed;
}
