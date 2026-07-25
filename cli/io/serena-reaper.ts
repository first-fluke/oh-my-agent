/**
 * serena-reaper.ts
 *
 * Serena LSP Memory Reaper — external idle-shutdown for language servers that
 * Serena spawns per project.  Serena's `_ensure_functional_ls` self-heals on
 * the next tool call, so killing idle LSP children externally is safe.
 *
 * Design: docs/plans/designs/021-serena-memory-reaper.md
 *
 * Architecture:
 *   discover (pure) → activity signal (pure, 3-tier) → policy (pure)
 *   → kill adapter (thin, injectable)
 *
 * All core functions are pure (input = strings/arrays); side-effecting kill
 * lives in a thin adapter so tests can mock it.
 */

import { parse as parseYaml } from "yaml";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single process row parsed from `ps -axo pid,ppid,rss,command` output. */
export interface PsRow {
  pid: number;
  ppid: number;
  /** Resident Set Size in kilobytes (as reported by ps). */
  rssKb: number;
  command: string;
}

/** An LSP child process under a Serena root. */
export interface LspProc {
  pid: number;
  /** Short name extracted from the command (e.g. "tsserver", "pyright"). */
  name: string;
  rssMb: number;
}

/** A Serena MCP root process (`serena start-mcp-server`). */
export interface SerenaRoot {
  pid: number;
  ppid: number;
  project: string;
  /** Epoch ms of the most recent known activity (from log / mtime / cpu). */
  lastActivityMs: number;
  /** Signal source used to determine lastActivityMs. */
  signalSource: ActivitySignalSource;
  lspChildren: LspProc[];
  rssMb: number;
}

/** A reap plan entry — one Serena root whose LSP children should be killed. */
export interface ReapTarget {
  root: SerenaRoot;
  reason: string;
  projectedFreedRssMb: number;
}

/** Result of the 3-tier activity signal resolution. */
export interface ActivitySignal {
  lastActivityMs: number;
  signalSource: ActivitySignalSource;
}

export type ActivitySignalSource = "log" | "mtime" | "cpu";

/** Reaper configuration (from `serena_reaper` block in oma-config.yaml). */
export interface SerenaReaperConfig {
  enabled: boolean;
  policy: "lru" | "idle";
  keepWarm: number;
  idleMinutes: number;
  graceSeconds: number;
}

/** Kill adapter interface — injectable for tests. */
export interface KillAdapter {
  /** Send a signal to a process. Returns true if the signal was sent. */
  kill(pid: number, signal: NodeJS.Signals): boolean;
  /** Check if a process is still alive. */
  isAlive(pid: number): boolean;
  /** Wait for up to `ms` milliseconds. */
  sleep(ms: number): Promise<void>;
  /**
   * Read the current command line for a pid, or undefined if unavailable.
   * Used to re-validate process identity before SIGKILL escalation so a
   * reused PID is not killed (QA F1). Optional: when absent, escalation
   * proceeds (back-compat for test adapters that only model a single process).
   */
  readCommand?(pid: number): string | undefined;
}

/** Result of a kill attempt for one LSP process. */
export interface KillResult {
  pid: number;
  name: string;
  success: boolean;
  skippedReason?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default reaper configuration — opt-in disabled. */
export const DEFAULT_SERENA_REAPER_CONFIG: SerenaReaperConfig = {
  enabled: false,
  policy: "lru",
  keepWarm: 2,
  idleMinutes: 10,
  graceSeconds: 90,
};

/**
 * Allow-list regex for LSP process names that the reaper may kill.
 * Must match the short name (basename) extracted from the command.
 *
 * Names are enumerated explicitly — NO `.*-language-server` wildcard. A broad
 * wildcard would match any binary ending in `-language-server` living under
 * `~/.serena/` (QA F2), so every known Serena-supported LSP is listed by name.
 */
export const LSP_ALLOW_LIST_PATTERN =
  /^(tsserver|typescript-language-server|vtsls|vue-language-server|pyright|pylsp|python-language-server|gopls|rust-analyzer|jdtls|bash-language-server|clangd|omnisharp|solargraph|lua-language-server|zls|terraform-ls|intelephense)$/;

/**
 * Block-list: commands that the reaper must NEVER kill.
 * Matches the full command string.
 */
const SERENA_ROOT_BLOCK_PATTERN = /serena\s+start-mcp-server/;

/**
 * Regex to identify a Serena root process command.
 */
const SERENA_ROOT_COMMAND_PATTERN = /serena\s+start-mcp-server/;

/**
 * Regex to extract the `--project` argument value from a serena command.
 */
const SERENA_PROJECT_ARG_PATTERN = /--project[= ](['"]?)([^\s'"]+)\1/;

/**
 * Path patterns under which LSP executables must reside for the kill to be
 * allowed. Checked against the full command string.
 */
const LSP_EXEC_PATH_PATTERNS: RegExp[] = [
  /[/\\]\.serena[/\\]/,
  /serena-agent[/\\]/,
];

/**
 * Regex that matches a `CallToolRequest` line in a Serena log file.
 * Captures an ISO-8601 timestamp at the start of the line.
 *
 * Example line:
 *   2026-06-15T12:34:56.789Z CallToolRequest tool_name ...
 */
const CALL_TOOL_REQUEST_LINE_PATTERN =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s+CallToolRequest/;

// ---------------------------------------------------------------------------
// Task 1: Process discovery (pure)
// ---------------------------------------------------------------------------

/**
 * Parse the text output of `ps -axo pid,ppid,rss,command` into row structs.
 * Lines that cannot be parsed (header, blank) are silently skipped.
 */
export function parsePsOutput(psOutput: string): PsRow[] {
  const rows: PsRow[] = [];
  for (const rawLine of psOutput.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    // The first three tokens are numeric fields; everything after is the command.
    const match = line.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
    if (!match) continue;
    const [, pidStr, ppidStr, rssStr, command] = match;
    const pid = Number(pidStr);
    const ppid = Number(ppidStr);
    const rssKb = Number(rssStr);
    if (
      !Number.isFinite(pid) ||
      !Number.isFinite(ppid) ||
      !Number.isFinite(rssKb)
    )
      continue;
    rows.push({ pid, ppid, rssKb, command: (command ?? "").trim() });
  }
  return rows;
}

/**
 * Build a pid→ppid ancestry map from a list of ps rows.
 */
export function buildAncestryMap(rows: PsRow[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const row of rows) {
    map.set(row.pid, row.ppid);
  }
  return map;
}

/**
 * Return true if `descendantPid` has `ancestorPid` anywhere in its ancestry
 * chain (using the provided pid→ppid map).
 */
export function isDescendantOf(
  descendantPid: number,
  ancestorPid: number,
  ancestryMap: Map<number, number>,
): boolean {
  let current = descendantPid;
  const visited = new Set<number>();
  while (true) {
    const parent = ancestryMap.get(current);
    if (parent === undefined) return false;
    if (parent === ancestorPid) return true;
    if (visited.has(parent)) return false; // cycle guard
    visited.add(parent);
    current = parent;
  }
}

/**
 * Extract the short LSP name from a command string, if it matches the allow-list.
 * Returns undefined if the command does not match any allowed LSP name.
 */
export function extractLspName(command: string): string | undefined {
  const tokens = command.split(/\s+/);
  for (const token of tokens) {
    const parts = token.split(/[/\\]/);
    const basename = parts[parts.length - 1];
    if (basename && LSP_ALLOW_LIST_PATTERN.test(basename)) {
      return basename;
    }
  }
  return undefined;
}

/**
 * Extract the project path from a Serena root command, using --project arg.
 * Falls back to the log-filename PID mapping hint (provide as `logProjectHint`).
 * Returns "<unknown>" if no project can be determined.
 */
export function extractProjectFromCommand(
  command: string,
  logProjectHint?: string,
): string {
  const match = SERENA_PROJECT_ARG_PATTERN.exec(command);
  if (match?.[2]) return match[2];
  if (logProjectHint) return logProjectHint;
  return "<unknown>";
}

/**
 * Discover Serena roots and their LSP children from ps output.
 *
 * @param psOutput - Raw output of `ps -axo pid,ppid,rss,command`
 * @param activityResolver - Function that resolves lastActivityMs for a root pid.
 *   Receives the root pid; returns an ActivitySignal.
 * @param logProjectHints - Optional map from root PID to project path
 *   (derived from parsing Serena log filenames).
 */
export function discoverSerenaRoots(
  psOutput: string,
  activityResolver: (rootPid: number) => ActivitySignal,
  logProjectHints?: Map<number, string>,
): SerenaRoot[] {
  const rows = parsePsOutput(psOutput);
  const ancestryMap = buildAncestryMap(rows);

  const rootRows = rows.filter((r) =>
    SERENA_ROOT_COMMAND_PATTERN.test(r.command),
  );

  return rootRows.map((rootRow): SerenaRoot => {
    const project = extractProjectFromCommand(
      rootRow.command,
      logProjectHints?.get(rootRow.pid),
    );

    const activitySignal = activityResolver(rootRow.pid);

    const lspChildren: LspProc[] = rows
      .filter((r) => {
        if (r.pid === rootRow.pid) return false;
        if (!isDescendantOf(r.pid, rootRow.pid, ancestryMap)) return false;
        return extractLspName(r.command) !== undefined;
      })
      .map(
        (r): LspProc => ({
          pid: r.pid,
          name: extractLspName(r.command) as string,
          rssMb: r.rssKb / 1024,
        }),
      );

    return {
      pid: rootRow.pid,
      ppid: rootRow.ppid,
      project,
      lastActivityMs: activitySignal.lastActivityMs,
      signalSource: activitySignal.signalSource,
      lspChildren,
      rssMb: rootRow.rssKb / 1024,
    };
  });
}

// ---------------------------------------------------------------------------
// Task 2: Last-activity signal (3-tier fallback, pure)
// ---------------------------------------------------------------------------

/**
 * Tier 1: Parse the last `CallToolRequest` timestamp from a log file's content.
 * Returns undefined if no matching line is found.
 */
export function parseLastCallToolRequest(
  logContent: string,
): number | undefined {
  const lines = logContent.split("\n");
  let lastTimestamp: number | undefined;
  for (const line of lines) {
    const match = CALL_TOOL_REQUEST_LINE_PATTERN.exec(line);
    if (match?.[1]) {
      const ms = Date.parse(match[1]);
      if (!Number.isNaN(ms)) {
        lastTimestamp = ms;
      }
    }
  }
  return lastTimestamp;
}

/**
 * Tier 2: Use a file's mtime as the activity signal.
 *
 * @param mtimeMs - The file's mtime in epoch milliseconds.
 */
export function activityFromMtime(mtimeMs: number): ActivitySignal {
  return { lastActivityMs: mtimeMs, signalSource: "mtime" };
}

/**
 * Tier 3 (CPU-idle proxy): Given two CPU-time samples for a process, determine
 * if it has been idle.
 *
 * If the CPU delta exceeds the threshold the process was active at sample2
 * (return sample2WallMs). Otherwise treat it as idle since sample1 (return
 * sample1WallMs).
 *
 * @param sample1CpuMs - CPU time (ms) at first sample
 * @param sample2CpuMs - CPU time (ms) at second sample (taken later)
 * @param sample1WallMs - Wall-clock epoch ms of first sample
 * @param sample2WallMs - Wall-clock epoch ms of second sample
 * @param idleThresholdCpuMs - CPU delta below which the process is considered idle (default 10ms)
 */
export function activityFromCpuSamples(
  sample1CpuMs: number,
  sample2CpuMs: number,
  sample1WallMs: number,
  sample2WallMs: number,
  idleThresholdCpuMs = 10,
): ActivitySignal {
  const cpuDelta = sample2CpuMs - sample1CpuMs;
  const lastActivityMs =
    cpuDelta > idleThresholdCpuMs ? sample2WallMs : sample1WallMs;
  return { lastActivityMs, signalSource: "cpu" };
}

/**
 * Resolve the activity signal for a Serena root using the 3-tier fallback:
 *   1. Log file last CallToolRequest timestamp (most precise)
 *   2. Log file mtime
 *   3. CPU-idle proxy (caller-supplied samples)
 *
 * @param logContent - Content of the mcp_*_<PID>.txt log file; undefined if not found
 * @param logMtimeMs - mtime of the log file in epoch ms; undefined if not found
 * @param cpuSamples - Optional CPU samples for tier-3 fallback
 * @param nowMs - Current time in epoch ms (default Date.now()); used as last-resort fallback
 */
export function resolveActivitySignal(
  logContent: string | undefined,
  logMtimeMs: number | undefined,
  cpuSamples?: {
    sample1CpuMs: number;
    sample2CpuMs: number;
    sample1WallMs: number;
    sample2WallMs: number;
  },
  nowMs: number = Date.now(),
): ActivitySignal {
  // Tier 1: parse log content
  if (logContent !== undefined) {
    const ts = parseLastCallToolRequest(logContent);
    if (ts !== undefined) {
      return { lastActivityMs: ts, signalSource: "log" };
    }
  }

  // Tier 2: log file mtime
  if (logMtimeMs !== undefined) {
    return activityFromMtime(logMtimeMs);
  }

  // Tier 3: CPU-idle proxy
  if (cpuSamples) {
    return activityFromCpuSamples(
      cpuSamples.sample1CpuMs,
      cpuSamples.sample2CpuMs,
      cpuSamples.sample1WallMs,
      cpuSamples.sample2WallMs,
    );
  }

  // No signal available — assume active now (safe default: avoid surprise kills)
  return { lastActivityMs: nowMs, signalSource: "cpu" };
}

// ---------------------------------------------------------------------------
// Task 3: Policy engine (pure)
// ---------------------------------------------------------------------------

/**
 * Effective activity timestamp for a root: max(lastActivityMs, parent claude
 * cpu activity). This keeps LSPs warm while the user is active in a project
 * even without recent Serena tool calls (T1-1).
 */
function effectiveActivityMs(
  root: SerenaRoot,
  parentClaudeActivityMs?: Map<number, number>,
): number {
  const claudeActivity = parentClaudeActivityMs?.get(root.pid) ?? 0;
  return Math.max(root.lastActivityMs, claudeActivity);
}

/**
 * Determine which Serena roots are reap targets given a policy config.
 *
 * LRU-N: Sort roots by effective activity descending. Keep top `keepWarm`;
 *   the rest are candidates. Grace window protects any root with recent activity.
 *
 * Idle-timeout: Any root whose effective lastActivity is older than
 *   `idleMinutes` ago (and outside the grace window) is a target.
 *
 * Grace window: Never mark a root as a reap target if its effective activity
 *   is within `graceSeconds` of `nowMs` (in-flight protection).
 *
 * @param roots - Discovered Serena roots
 * @param config - Reaper configuration
 * @param parentClaudeActivityMs - Optional map from root PID to the most
 *   recent CPU activity timestamp of its parent Claude process (T1-1).
 * @param nowMs - Current time in epoch ms (injectable for determinism)
 */
export function computeReapTargets(
  roots: SerenaRoot[],
  config: SerenaReaperConfig,
  parentClaudeActivityMs?: Map<number, number>,
  nowMs: number = Date.now(),
  protectedPids?: Set<number>,
): ReapTarget[] {
  if (roots.length === 0) return [];

  const graceWindowMs = config.graceSeconds * 1000;

  // A protected root (a shared daemon with attached MCP clients) counts as
  // active RIGHT NOW, whatever the log/mtime/cpu signals say — those signals
  // cannot see a client that is simply between tool calls. Folding it into the
  // activity value (rather than filtering the root out) keeps LRU semantics
  // honest: protected daemons rank at the top and consume keep-warm slots, so
  // "keep at most N stacks warm" still means N.
  const activityMs = (root: SerenaRoot): number =>
    protectedPids?.has(root.pid)
      ? nowMs
      : effectiveActivityMs(root, parentClaudeActivityMs);

  function withinGrace(root: SerenaRoot): boolean {
    return nowMs - activityMs(root) < graceWindowMs;
  }

  function projectedFreedRssMb(root: SerenaRoot): number {
    return root.lspChildren.reduce((sum, lsp) => sum + lsp.rssMb, 0);
  }

  if (config.policy === "lru") {
    const sorted = [...roots].sort((a, b) => activityMs(b) - activityMs(a));
    const keepCount = Math.min(config.keepWarm, sorted.length);
    const candidates = sorted.slice(keepCount);

    return candidates
      .filter((root) => !withinGrace(root))
      .map(
        (root): ReapTarget => ({
          root,
          reason: `lru: ranked outside top-${config.keepWarm} by activity`,
          projectedFreedRssMb: projectedFreedRssMb(root),
        }),
      );
  }

  if (config.policy === "idle") {
    const idleThresholdMs = config.idleMinutes * 60 * 1000;
    return roots
      .filter((root) => {
        const idleMs = nowMs - activityMs(root);
        return idleMs >= idleThresholdMs && !withinGrace(root);
      })
      .map((root): ReapTarget => {
        const idleMinutes = Math.floor((nowMs - activityMs(root)) / 60000);
        return {
          root,
          reason: `idle: ${idleMinutes}m idle (threshold: ${config.idleMinutes}m)`,
          projectedFreedRssMb: projectedFreedRssMb(root),
        };
      });
  }

  return [];
}

// ---------------------------------------------------------------------------
// Task 4: Kill adapter with 3-fold safety (T1-2)
// ---------------------------------------------------------------------------

/**
 * Validate whether a candidate process is safe to kill.
 *
 * 3-fold check (all three required):
 *   (a) Target PID ancestry includes the Serena root PID
 *   (b) Process name matches the LSP allow-list regex
 *   (c) Exec path under ~/.serena/ or serena-agent/
 *
 * Explicit block-list: never kill a `serena start-mcp-server` process.
 *
 * This function is pure and has no side effects.
 */
export function validateKillTarget(
  candidatePid: number,
  candidateCommand: string,
  serenaRootPid: number,
  ancestryMap: Map<number, number>,
): { safe: boolean; reason?: string } {
  // Block-list: never kill a serena root
  if (SERENA_ROOT_BLOCK_PATTERN.test(candidateCommand)) {
    return { safe: false, reason: "block-list: serena root process" };
  }

  // (a) Ancestry check
  if (!isDescendantOf(candidatePid, serenaRootPid, ancestryMap)) {
    return {
      safe: false,
      reason: `ancestry: PID ${candidatePid} is not a descendant of serena root PID ${serenaRootPid}`,
    };
  }

  // (b) Name allow-list check
  const lspName = extractLspName(candidateCommand);
  if (!lspName) {
    return {
      safe: false,
      reason: `allow-list: command does not match any allowed LSP name: ${candidateCommand}`,
    };
  }

  // (c) Exec path check
  const pathMatches = LSP_EXEC_PATH_PATTERNS.some((pattern) =>
    pattern.test(candidateCommand),
  );
  if (!pathMatches) {
    return {
      safe: false,
      reason: `exec-path: command path not under ~/.serena/ or serena-agent/: ${candidateCommand}`,
    };
  }

  return { safe: true };
}

/**
 * Kill an LSP process using SIGTERM → wait graceSeconds → SIGKILL if still alive.
 * Validation is performed before any kill attempt.
 * The actual process.kill is delegated to the injectable `killAdapter`.
 */
export async function killLspProcess(
  lsp: LspProc,
  serenaRootPid: number,
  candidateCommand: string,
  ancestryMap: Map<number, number>,
  graceSeconds: number,
  killAdapter: KillAdapter,
): Promise<KillResult> {
  const validation = validateKillTarget(
    lsp.pid,
    candidateCommand,
    serenaRootPid,
    ancestryMap,
  );

  if (!validation.safe) {
    return {
      pid: lsp.pid,
      name: lsp.name,
      success: false,
      skippedReason: validation.reason,
    };
  }

  const termSent = killAdapter.kill(lsp.pid, "SIGTERM");
  if (!termSent) {
    return {
      pid: lsp.pid,
      name: lsp.name,
      success: false,
      skippedReason: "SIGTERM failed (process may already be gone)",
    };
  }

  await killAdapter.sleep(graceSeconds * 1000);

  if (killAdapter.isAlive(lsp.pid)) {
    // PID-reuse guard (QA F1): during the grace sleep the OS may have freed
    // this PID and assigned it to an unrelated process. Re-validate identity
    // before SIGKILL — only escalate when the live command still matches the
    // command we validated (or when the adapter can't tell, for back-compat).
    const currentCommand = killAdapter.readCommand?.(lsp.pid);
    if (currentCommand !== undefined && currentCommand !== candidateCommand) {
      return {
        pid: lsp.pid,
        name: lsp.name,
        success: false,
        skippedReason:
          "PID reused by another process after SIGTERM; SIGKILL skipped",
      };
    }
    // Report SIGKILL outcome honestly (QA F4): a false return means the
    // process was not killed (EPERM / already gone), so do not claim success.
    const killed = killAdapter.kill(lsp.pid, "SIGKILL");
    if (!killed) {
      return {
        pid: lsp.pid,
        name: lsp.name,
        success: false,
        skippedReason: "SIGKILL failed (EPERM or process already gone)",
      };
    }
  }

  return { pid: lsp.pid, name: lsp.name, success: true };
}

/**
 * Execute a reap plan: kill LSP children for all reap targets.
 *
 * @param targets - Reap targets from `computeReapTargets`
 * @param psOutput - Raw ps output (used to rebuild ancestry map and resolve full commands)
 * @param graceSeconds - Grace period before SIGKILL escalation
 * @param killAdapter - Injectable kill adapter
 */
export async function executeReapPlan(
  targets: ReapTarget[],
  psOutput: string,
  graceSeconds: number,
  killAdapter: KillAdapter,
): Promise<KillResult[]> {
  const rows = parsePsOutput(psOutput);
  const ancestryMap = buildAncestryMap(rows);
  const pidToCommand = new Map<number, string>(
    rows.map((r) => [r.pid, r.command]),
  );

  const results: KillResult[] = [];

  for (const target of targets) {
    for (const lsp of target.root.lspChildren) {
      const command = pidToCommand.get(lsp.pid) ?? lsp.name;
      const result = await killLspProcess(
        lsp,
        target.root.pid,
        command,
        ancestryMap,
        graceSeconds,
        killAdapter,
      );
      results.push(result);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Task 5: Config schema + loader
// ---------------------------------------------------------------------------

type RawSerenaReaperBlock = {
  enabled?: unknown;
  policy?: unknown;
  keep_warm?: unknown;
  idle_minutes?: unknown;
  grace_seconds?: unknown;
};

type RawConfigWithReaper = {
  serena_reaper?: RawSerenaReaperBlock;
};

/**
 * Parse and validate the `serena_reaper` block from raw YAML-parsed config.
 * Unknown or invalid fields are silently ignored; defaults apply.
 */
export function parseSerenaReaperConfig(raw: unknown): SerenaReaperConfig {
  const defaults = { ...DEFAULT_SERENA_REAPER_CONFIG };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;

  const block = raw as RawSerenaReaperBlock;

  const enabled =
    typeof block.enabled === "boolean" ? block.enabled : defaults.enabled;

  const policy =
    block.policy === "lru" || block.policy === "idle"
      ? (block.policy as SerenaReaperConfig["policy"])
      : defaults.policy;

  const keepWarm =
    typeof block.keep_warm === "number" && block.keep_warm >= 0
      ? block.keep_warm
      : defaults.keepWarm;

  const idleMinutes =
    typeof block.idle_minutes === "number" && block.idle_minutes > 0
      ? block.idle_minutes
      : defaults.idleMinutes;

  const graceSeconds =
    typeof block.grace_seconds === "number" && block.grace_seconds >= 0
      ? block.grace_seconds
      : defaults.graceSeconds;

  return { enabled, policy, keepWarm, idleMinutes, graceSeconds };
}

/**
 * Load the `serena_reaper` config block from oma-config.yaml content.
 * Returns defaults if the content cannot be parsed or the block is absent.
 *
 * Follows the same pattern as `loadQuotaCap` in session-cost.ts.
 */
export function loadSerenaReaperConfigFromContent(
  yamlContent: string,
): SerenaReaperConfig {
  try {
    const parsed = parseYaml(yamlContent);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...DEFAULT_SERENA_REAPER_CONFIG };
    }
    const raw = parsed as RawConfigWithReaper;
    return parseSerenaReaperConfig(raw.serena_reaper);
  } catch {
    return { ...DEFAULT_SERENA_REAPER_CONFIG };
  }
}

/**
 * Select Serena roots that have been orphaned — their parent (the MCP client,
 * e.g. `claude`) has exited, so the process was reparented to init
 * (`ppid === 1`). An orphaned root has no client connection, so the root AND
 * its LSP children are pure waste and always safe to kill. Used by
 * `oma cleanup` (the safe, no-opt-in slice), distinct from the reaper's
 * idle-but-live LRU policy.
 */
export function selectOrphanedSerenaRoots(roots: SerenaRoot[]): SerenaRoot[] {
  return roots.filter((root) => root.ppid === 1);
}

/**
 * Opt-in gate for the `oma serena reap` command (T1-4).
 *
 * The automatic/scheduled invocation (`--quiet`) must honor
 * `serena_reaper.enabled`: if a user installed the periodic task but left
 * enabled=false, the scheduled run must be a no-op. An interactive run (no
 * `--quiet`) is an explicit request and always proceeds; `--dry-run` never
 * kills, so it is always allowed through.
 *
 * @returns true when the run should be skipped entirely.
 */
export function shouldSkipScheduledReap(
  quiet: boolean,
  dryRun: boolean,
  enabled: boolean,
): boolean {
  return quiet && !dryRun && !enabled;
}
