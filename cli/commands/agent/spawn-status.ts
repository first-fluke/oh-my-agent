import { spawn as spawnProcess } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { IPty } from "node-pty";
import color from "picocolors";
import { lookupFinding, recordFinding } from "../../io/findings-cache.js";
import { planDispatch } from "../../io/runtime-dispatch.js";
import {
  checkCap,
  formatPromptMessage,
  loadQuotaCap,
  recordUsage,
} from "../../io/session-cost.js";
import { detectWorkspace } from "../../io/workspaces.js";
import {
  createWorktree,
  formatWorktreeSummary,
  type WorktreeHandle,
} from "../../io/worktree.js";
import {
  loadExecutionProtocol,
  resolvePromptContent,
  resolvePromptFlag,
  resolveVendor,
} from "../../platform/agent-config.js";
import {
  classifyDifficulty,
  type Difficulty,
} from "../../platform/context-loader.js";
import { registerSignalCleanup } from "../../utils/process-signals.js";
import { isProcessRunning } from "./common.js";

// ---------------------------------------------------------------------------
// T12 + T16: Difficulty classification hints
// All fields are optional — callers that don't provide hints get Medium
// difficulty by default (no CHARTER_CHECK strip, no resource stripping).
// ---------------------------------------------------------------------------

export interface TaskHints {
  /** Number of acceptance criteria in the task (used for complexity scoring) */
  acCount?: number;
  /** Number of files in scope (used for complexity scoring) */
  filesInScope?: number;
}

/**
 * Classify difficulty from the prompt and optional task hints.
 * Returns "Medium" when hints are absent (backwards-compatible default).
 *
 * T12 integration: classifyDifficulty drives context bundle selection.
 * T16 integration: "Simple" difficulty strips the CHARTER_CHECK block in
 *   buildMarkdownAgentFile (agent-composer.ts) at install time — the same
 *   difficulty value should be forwarded there via installVendorAgents callers.
 */
export function classifySpawnDifficulty(
  taskDescription: string,
  hints?: TaskHints,
): Difficulty {
  const acCount = hints?.acCount ?? 3; // default: Medium-range
  const filesInScope = hints?.filesInScope ?? 2; // default: Medium-range
  return classifyDifficulty(taskDescription, acCount, filesInScope);
}

// ---------------------------------------------------------------------------
// T11: Findings cache directory pre-creation + handle export
// ---------------------------------------------------------------------------

const MEMORIES_BASE = ".serena/memories";
const AGY_DEFAULT_PRINT_TIMEOUT_MS = 5 * 60 * 1000;
const AGY_TIMEOUT_GRACE_MS = 10 * 1000;
const AGY_PTY_EXIT_GRACE_MS = 2 * 1000;

type SpawnExitHandler = (code: number | null) => void;

type SpawnedAgentProcess = {
  pid?: number;
  kill: () => void;
  onExit: (handler: SpawnExitHandler) => void;
};

type AntigravityPtyModule = typeof import("node-pty");

function findOnPath(executableNames: string[]): string | null {
  const pathValue = process.env.PATH ?? process.env.Path ?? "";
  const entries = pathValue.split(path.delimiter).filter(Boolean);

  for (const entry of entries) {
    for (const executableName of executableNames) {
      const candidate = path.join(entry, executableName);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return null;
}

function isExplicitWindowsCommand(command: string): boolean {
  const ext = path.extname(command).toLowerCase();
  return (
    command.includes("\\") ||
    command.includes("/") ||
    ext === ".exe" ||
    ext === ".cmd"
  );
}

export function normalizeWindowsInvocation(
  command: string,
  args: string[],
): { command: string; args: string[] } {
  if (process.platform !== "win32") return { command, args };

  const normalizedCommand = path.basename(command).toLowerCase();
  if (["agy", "agy.exe", "agy.cmd"].includes(normalizedCommand)) {
    if (isExplicitWindowsCommand(command)) return { command, args };
    const resolvedAgy = findOnPath(["agy.exe", "agy.cmd", "agy"]);
    return resolvedAgy ? { command: resolvedAgy, args } : { command, args };
  }

  if (
    ["antigravity", "antigravity.exe", "antigravity.cmd"].includes(
      normalizedCommand,
    )
  ) {
    if (isExplicitWindowsCommand(command)) return { command, args };
    const resolvedAntigravity = findOnPath([
      "antigravity.exe",
      "antigravity.cmd",
      "antigravity",
    ]);
    return resolvedAntigravity
      ? { command: resolvedAntigravity, args }
      : { command, args };
  }

  return { command, args };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findAgentResultFile(
  rootPath: string,
  agentId: string,
  sessionId?: string,
): string | null {
  const dir = path.join(rootPath, MEMORIES_BASE);
  if (!fs.existsSync(dir)) return null;

  const exactSessionFile = sessionId
    ? path.join(dir, `result-${agentId}-${sessionId}.md`)
    : null;
  if (exactSessionFile && fs.existsSync(exactSessionFile)) {
    return exactSessionFile;
  }

  try {
    const pattern = new RegExp(
      `^result-${escapeRegExp(agentId)}(?:-[\\w.-]+)?\\.md$`,
    );
    const matches = fs
      .readdirSync(dir)
      .filter((file) => pattern.test(file))
      .filter((file) => file !== `result-${agentId}.md`)
      .sort()
      .reverse();
    if (matches[0]) return path.join(dir, matches[0]);
  } catch {
    // Ignore unreadable compatibility directories.
  }

  const unsuffixedFile = path.join(dir, `result-${agentId}.md`);
  return fs.existsSync(unsuffixedFile) ? unsuffixedFile : null;
}

function readFileIfExists(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf-8").trim();
  } catch {
    return null;
  }
}

function buildFallbackResultContent(input: {
  agentId: string;
  sessionId: string;
  status: "completed" | "failed";
  source: string;
  body: string;
}): string {
  const body = input.body.trim() || "(no output captured)";
  return [
    `# Result: ${input.agentId}`,
    "",
    `## Status: ${input.status}`,
    `Session: ${input.sessionId}`,
    `Agent: ${input.agentId}`,
    `Generated: ${new Date().toISOString()}`,
    `Source: ${input.source}`,
    "",
    "## Charter",
    "",
    "CHARTER_CHECK: auto-generated by OMA spawn-status (no charter block supplied by agent)",
    "",
    "## Output",
    "",
    body,
    "",
  ].join("\n");
}

function cleanAgyOutput(text: string): string {
  const lines = text.split("\n");
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("⟳ Checking for updates...")) return false;
    if (trimmed.startsWith("✓ You are already on the latest version."))
      return false;
    return true;
  });
  return filtered.join("\n").trim();
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping terminal OSC escapes from agy PTY output requires literal ESC/BEL control chars.
const OSC_SEQUENCE = /\x1b\][^\x07]*(?:\x07|\x1b\\)/g;
// biome-ignore format: keep regex on one line so the lint suppression below targets it.
// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping terminal ANSI/CSI escapes from agy PTY output requires literal ESC/CSI control chars.
const ANSI_SEQUENCE = /[\x1b\x9b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

function stripAnsi(text: string): string {
  return text.replace(OSC_SEQUENCE, "").replace(ANSI_SEQUENCE, "");
}

function sanitizeAgyOutput(text: string): string {
  return cleanAgyOutput(stripAnsi(text));
}

function parseDurationMs(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  let total = 0;
  let matched = "";
  const pattern = /(\d+(?:\.\d+)?)(ms|s|m|h)/g;
  for (const match of trimmed.matchAll(pattern)) {
    const amount = Number(match[1]);
    const unit = match[2];
    matched += match[0];
    if (unit === "ms") total += amount;
    if (unit === "s") total += amount * 1000;
    if (unit === "m") total += amount * 60 * 1000;
    if (unit === "h") total += amount * 60 * 60 * 1000;
  }

  return matched === trimmed.replace(/\s+/g, "") && total > 0
    ? Math.round(total)
    : null;
}

function resolveAgyPrintTimeoutMs(args: string[]): number {
  let configured: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--print-timeout") {
      configured = args[i + 1];
      break;
    }
    if (arg?.startsWith("--print-timeout=")) {
      configured = arg.slice("--print-timeout=".length);
      break;
    }
  }

  return (
    (parseDurationMs(configured) ?? AGY_DEFAULT_PRINT_TIMEOUT_MS) +
    AGY_TIMEOUT_GRACE_MS
  );
}

async function loadAntigravityPtyModule(): Promise<AntigravityPtyModule> {
  try {
    return await import("node-pty");
  } catch (err) {
    throw new Error(
      [
        "Antigravity PTY spawn requires the optional native dependency `node-pty`.",
        "Run `cd cli && bun install` and rebuild OMA so the externalized dependency is present.",
        `Original error: ${String(err)}`,
      ].join(" "),
    );
  }
}

function wrapStdioChildProcess(
  child: ReturnType<typeof spawnProcess>,
): SpawnedAgentProcess {
  return {
    pid: child.pid,
    kill: () => {
      if (child.pid && isProcessRunning(child.pid)) {
        process.kill(child.pid);
      }
    },
    onExit: (handler) => {
      child.on("exit", (code) => handler(code));
    },
  };
}

async function spawnAntigravityPtyProcess(input: {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  logFile: string;
}): Promise<SpawnedAgentProcess> {
  const pty = await loadAntigravityPtyModule();
  const outputChunks: string[] = [];
  fs.writeFileSync(input.logFile, "", "utf-8");

  const child: IPty = pty.spawn(input.command, input.args, {
    name: "xterm-256color",
    cols: 120,
    rows: 40,
    cwd: input.cwd,
    env: input.env,
    ...(process.platform === "win32" ? { useConpty: true } : {}),
  });

  child.onData((data) => {
    outputChunks.push(data);
  });

  const writeCapturedOutput = () => {
    fs.writeFileSync(
      input.logFile,
      sanitizeAgyOutput(outputChunks.join("")),
      "utf-8",
    );
  };

  return {
    pid: child.pid,
    kill: () => {
      child.kill();
    },
    onExit: (handler) => {
      let timedOut = false;
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      let exitGraceTimeout: ReturnType<typeof setTimeout> | undefined;
      const timeoutMs = resolveAgyPrintTimeoutMs(input.args);
      const finish = (code: number | null) => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        if (exitGraceTimeout) clearTimeout(exitGraceTimeout);
        writeCapturedOutput();
        handler(code);
      };

      timeout = setTimeout(() => {
        timedOut = true;
        outputChunks.push(
          `\n[OMA] Antigravity PTY timed out after ${timeoutMs}ms.\n`,
        );
        writeCapturedOutput();
        try {
          child.kill();
        } catch {
          // ignore kill failures; the grace timer reports a failed timeout
        }
        exitGraceTimeout = setTimeout(() => finish(124), AGY_PTY_EXIT_GRACE_MS);
        exitGraceTimeout.unref?.();
      }, timeoutMs);
      timeout.unref?.();

      child.onExit(({ exitCode }) => {
        const mappedExitCode =
          timedOut && (exitCode === 0 || exitCode === null) ? 124 : exitCode;
        finish(mappedExitCode);
      });
    },
  };
}

function ensureResultMemoriesDir(cwd: string): string | null {
  const memoriesDir = path.join(cwd, MEMORIES_BASE);
  try {
    if (!fs.existsSync(memoriesDir)) {
      fs.mkdirSync(memoriesDir, { recursive: true });
    }
    return memoriesDir;
  } catch (err) {
    console.warn(
      `[spawn] Could not pre-create memories dir ${memoriesDir}: ${String(err)}`,
    );
    return null;
  }
}

function ensureFallbackResultArtifact(input: {
  resultsDir: string | null;
  agentId: string;
  sessionId: string;
  code: number | null;
  logFile: string;
  vendor?: string;
}): void {
  if (!input.resultsDir) return;
  const unsuffixed = path.join(input.resultsDir, `result-${input.agentId}.md`);
  const target = path.join(
    input.resultsDir,
    `result-${input.agentId}-${input.sessionId}.md`,
  );
  if (fs.existsSync(unsuffixed) || fs.existsSync(target)) return;

  let logOutput = readFileIfExists(input.logFile);
  if (logOutput && input.vendor === "antigravity") {
    logOutput = sanitizeAgyOutput(logOutput);
  }
  const body = logOutput || "";
  const hasBody = body.trim().length > 0;
  const status =
    input.vendor === "antigravity"
      ? input.code === 0 && hasBody
        ? "completed"
        : "failed"
      : input.code === 0
        ? "completed"
        : "failed";
  const source =
    input.vendor === "antigravity" ? "antigravity pty stdout" : "subagent log";

  try {
    fs.writeFileSync(
      target,
      buildFallbackResultContent({
        agentId: input.agentId,
        sessionId: input.sessionId,
        status,
        source,
        body,
      }),
      "utf-8",
    );
  } catch (err) {
    console.warn(
      `[${input.agentId}] Could not write fallback result ${target}: ${String(err)}`,
    );
  }
}

/**
 * Ensure the session memories directory exists for the given sessionId.
 * Called before spawn so agent processes can write to it immediately.
 * Non-fatal: logs a warning on failure rather than aborting spawn.
 */
export function ensureSessionMemoriesDir(cwd: string = process.cwd()): void {
  ensureResultMemoriesDir(cwd);
}

/**
 * Returns a findings cache handle bound to the given sessionId.
 * Downstream agents and orchestrator code can import this to record/lookup
 * findings without needing to manage the sessionId themselves.
 *
 * Usage:
 *   import { getFindingsHandle } from "./spawn-status.js";
 *   const findings = getFindingsHandle(sessionId);
 *   findings.record({ symbol: "ModelSpec", kind: "symbol", result: {...} });
 *   findings.lookup("ModelSpec", "symbol");
 *
 * To use findings-cache directly (e.g. from a different module):
 *   import { recordFinding, lookupFinding } from "../../io/findings-cache.js";
 */
export function getFindingsHandle(sessionId: string) {
  return {
    record: (
      entry: Omit<
        import("../../io/findings-cache.js").FindingRecord,
        "recordedAt"
      >,
    ) =>
      recordFinding(sessionId, {
        ...entry,
        recordedAt: new Date().toISOString(),
      }),
    lookup: (
      symbol: string,
      kind?: import("../../io/findings-cache.js").FindingRecord["kind"],
    ) => lookupFinding(sessionId, symbol, kind),
  };
}

export function markSpawnFailure(agentId: string): void {
  console.error(color.red(`[${agentId}] Failed to spawn process`));
  process.exitCode = 1;
}

export async function spawnAgent(
  agentId: string,
  prompt: string,
  sessionId: string,
  workspace: string,
  vendorOverride?: string,
  taskHints?: TaskHints,
  isolation?: string,
) {
  let worktreeHandle: WorktreeHandle | null = null;
  if (isolation === "worktree") {
    worktreeHandle = createWorktree(sessionId, agentId);
    console.log(
      color.blue(
        `[${agentId}] Isolated worktree: ${worktreeHandle.path} (branch ${worktreeHandle.branch})`,
      ),
    );
  } else if (isolation && isolation !== "none") {
    throw new Error(
      `Unknown --isolation mode: ${JSON.stringify(isolation)}. Supported: worktree`,
    );
  }

  const effectiveWorkspace = worktreeHandle
    ? worktreeHandle.path
    : workspace === "."
      ? detectWorkspace(agentId)
      : workspace;
  const resolvedWorkspace = path.resolve(effectiveWorkspace);

  if (!fs.existsSync(resolvedWorkspace)) {
    fs.mkdirSync(resolvedWorkspace, { recursive: true });
    console.log(
      color.dim(`[${agentId}] Created workspace: ${resolvedWorkspace}`),
    );
  } else if (!worktreeHandle && effectiveWorkspace !== workspace) {
    console.log(
      color.blue(`[${agentId}] Auto-detected workspace: ${effectiveWorkspace}`),
    );
  }

  const logFile = path.join(tmpdir(), `subagent-${sessionId}-${agentId}.log`);
  const pidFile = path.join(tmpdir(), `subagent-${sessionId}-${agentId}.pid`);

  // T11: Pre-create .serena/memories/ so agent subprocesses can write findings
  // immediately without having to create the directory themselves.
  const resultsDir = ensureResultMemoriesDir(resolvedWorkspace);

  const rawPromptContent = resolvePromptContent(prompt);

  // T12: Classify difficulty from the task description + optional hints.
  // The resulting difficulty value can be forwarded to buildMarkdownAgentFile
  // via installVendorAgents callers at install time (same classifySpawnDifficulty
  // export), enabling T16's CHARTER_CHECK strip for Simple tasks.
  const difficulty = classifySpawnDifficulty(rawPromptContent, taskHints);
  console.log(color.dim(`  Difficulty: ${difficulty}`));

  // T15: Check quota cap BEFORE spawning the subprocess.
  // If loadQuotaCap() returns null (no cap configured), skip gating entirely.
  // If exceeded, print the message and throw so orchestrators can catch/halt.
  try {
    const cap = loadQuotaCap(process.cwd());
    if (cap !== null) {
      const capResult = checkCap(sessionId, cap);
      if (capResult.exceeded) {
        const msg = formatPromptMessage(capResult);
        console.error(color.red(`[${agentId}] ${msg}`));
        throw new Error(
          `[session-cost] Quota cap exceeded for session ${sessionId}: ${capResult.reason} ` +
            `(current: ${capResult.current}, limit: ${capResult.limit})`,
        );
      }
    }
  } catch (err) {
    // Re-throw quota exceeded errors — they are intentional blocking signals.
    if (err instanceof Error && err.message.startsWith("[session-cost]")) {
      throw err;
    }
    // Downgrade unexpected session-cost I/O errors to WARN and continue (non-fatal).
    console.warn(
      `[${agentId}] session-cost checkCap error (non-fatal): ${String(err)}`,
    );
  }

  const { vendor, config } = resolveVendor(agentId, vendorOverride);
  const executionProtocol = loadExecutionProtocol(vendor, process.cwd());
  const promptContent = executionProtocol
    ? `${rawPromptContent}\n\n${executionProtocol}`
    : rawPromptContent;

  const vendorConfig = config?.vendors?.[vendor] || {};
  const logStream = vendor === "antigravity" ? null : fs.openSync(logFile, "w");
  let logStreamClosed = false;
  const closeLogStream = () => {
    if (logStream === null || logStreamClosed) return;
    logStreamClosed = true;
    try {
      fs.closeSync(logStream);
    } catch {
      // ignore
    }
  };

  console.log(color.blue(`[${agentId}] Spawning subagent...`));
  console.log(color.dim(`  Vendor: ${vendor}`));
  console.log(color.dim(`  Workspace: ${resolvedWorkspace}`));
  console.log(color.dim(`  Log: ${logFile}`));

  const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);
  const dispatch = planDispatch(
    agentId,
    vendor,
    vendorConfig,
    promptFlag,
    promptContent,
  );
  const { env } = dispatch.invocation;
  const { command, args } = normalizeWindowsInvocation(
    dispatch.invocation.command,
    dispatch.invocation.args,
  );
  console.log(
    color.dim(
      `  Dispatch: ${dispatch.mode} (${dispatch.runtimeVendor} -> ${dispatch.targetVendor}, ${dispatch.reason})`,
    ),
  );

  let child: SpawnedAgentProcess;
  try {
    child =
      vendor === "antigravity"
        ? await spawnAntigravityPtyProcess({
            command,
            args,
            cwd: resolvedWorkspace,
            env,
            logFile,
          })
        : wrapStdioChildProcess(
            spawnProcess(command, args, {
              cwd: resolvedWorkspace,
              stdio: ["ignore", logStream, logStream],
              detached: false,
              env,
            }),
          );
  } catch (err) {
    closeLogStream();
    const spawnError =
      vendor === "antigravity"
        ? [
            `Antigravity PTY spawn failed for command ${JSON.stringify(command)}.`,
            "Confirm `agy` resolves on PATH and `node-pty` is installed for this OMA bundle.",
            `Details: ${String(err)}`,
          ].join(" ")
        : String(err);
    fs.writeFileSync(logFile, spawnError, "utf-8");
    console.error(
      color.red(`[${agentId}] Failed to spawn process: ${spawnError}`),
    );
    ensureFallbackResultArtifact({
      resultsDir,
      agentId,
      sessionId,
      code: 1,
      logFile,
      vendor,
    });
    markSpawnFailure(agentId);
    return;
  }

  if (!child.pid) {
    closeLogStream();
    fs.writeFileSync(
      logFile,
      `Spawned process for command ${JSON.stringify(command)} did not return a PID.`,
      "utf-8",
    );
    ensureFallbackResultArtifact({
      resultsDir,
      agentId,
      sessionId,
      code: 1,
      logFile,
      vendor,
    });
    markSpawnFailure(agentId);
    return;
  }

  fs.writeFileSync(pidFile, child.pid.toString());
  console.log(color.green(`[${agentId}] Started with PID ${child.pid}`));

  const cleanup = () => {
    try {
      closeLogStream();
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch {
      // ignore
    }
  };

  const cleanAndExit = () => {
    child.kill();
    unregisterSignalCleanup();
    cleanup();
    process.exit();
  };

  const unregisterSignalCleanup = registerSignalCleanup(
    cleanAndExit,
    cleanAndExit,
  );

  child.onExit((code: number | null) => {
    unregisterSignalCleanup();
    closeLogStream();
    console.log(color.blue(`[${agentId}] Exited with code ${code}`));
    if (code !== 0 && fs.existsSync(logFile)) {
      const log = fs.readFileSync(logFile, "utf-8").trim();
      if (log) {
        console.log(color.red(`[${agentId}] Log output:`));
        console.log(log);
      }
    }

    // T15: Record usage after subprocess exits.
    // Token estimate: conservative approximation using prompt character count.
    // (Math.ceil(charCount / 4) ≈ input token count; no subprocess instrumentation.)
    // Errors here are non-fatal — we downgrade to WARN and continue cleanup.
    try {
      recordUsage(sessionId, {
        vendor,
        agentId,
        tokens: Math.ceil(promptContent.length / 4),
        estimatedCostNote: `difficulty:${difficulty}`,
      });
    } catch (err) {
      console.warn(
        `[${agentId}] session-cost recordUsage error (non-fatal): ${String(err)}`,
      );
    }

    ensureFallbackResultArtifact({
      resultsDir,
      agentId,
      sessionId,
      code,
      logFile,
      vendor,
    });

    if (worktreeHandle) {
      console.log(color.blue(`[${agentId}] Worktree retained for review:`));
      for (const line of formatWorktreeSummary(worktreeHandle).split("\n")) {
        console.log(color.dim(`  ${line}`));
      }
    }

    cleanup();
    process.exit(code ?? 0);
  });
}

export async function checkStatus(
  sessionId: string,
  agentIds: string[],
  rootPath: string = process.cwd(),
) {
  const results: Record<string, string> = {};

  for (const agent of agentIds) {
    const resultFile = findAgentResultFile(rootPath, agent, sessionId);
    const pidFile = path.join(tmpdir(), `subagent-${sessionId}-${agent}.pid`);

    if (resultFile && fs.existsSync(resultFile)) {
      const content = fs.readFileSync(resultFile, "utf-8");
      const match = content.match(/^## Status:\s*(\S+)/m);
      results[agent] = match?.[1] ? match[1] : "completed";
    } else if (fs.existsSync(pidFile)) {
      const pidContent = fs.readFileSync(pidFile, "utf-8").trim();
      const pid = Number.parseInt(pidContent, 10);
      results[agent] =
        !Number.isNaN(pid) && isProcessRunning(pid) ? "running" : "crashed";
    } else {
      results[agent] = "crashed";
    }
  }

  for (const [agent, status] of Object.entries(results)) {
    console.log(`${agent}:${status}`);
  }
}
