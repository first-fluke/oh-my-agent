// Refactor guard — force a refactor pass when a turn leaves an edited code
// file over the line budget (default 500). Two-phase design:
//
//   post_tool (PostToolUse) — SILENT RECORDER. After Edit/Write/etc. lands,
//     the touched file path is appended to the session's state marker. Never
//     blocks: mid-turn the agent may legitimately grow a file it is about to
//     split, and interrupting every edit would also fight the very
//     refactor-engineer subagent this guard dispatches (subagent tool calls
//     fire the same hooks under the same session id).
//   stop (Stop) — ENFORCER. When the turn tries to end, recorded files are
//     re-counted; any still over budget blocks the stop with an instruction
//     to dispatch the `refactor-engineer` subagent. The block reason re-enters
//     the loop, so the turn cannot end until the file is split (bounded by
//     MAX_STOP_BLOCKS per file to guarantee termination).
//
// Works with every hook vendor: Claude Code, Codex CLI, Qwen Code,
// Command Code, Kimi Code, Cursor (afterFileEdit), Grok CLI, Antigravity,
// Kiro. The recorder needs only the post-tool event to FIRE with tool info
// on stdin — its output may be ignored (kimi: fire-and-forget per source;
// agy: audit-only `{}` contract). Enforcement needs a Stop block channel:
// claude/codex/qwen/commandcode/kimi block via decision keys, cursor via
// followup_message, grok via {decision:"block"} (verified from the grok
// binary's embedded docs — Stop/SubagentStop CAN block), agy via
// {decision:"continue"}. kiro's Stop output is not processed by the host,
// so there the enforcer direct-dispatches `oma agent:spawn
// refactor-engineer` (detached) instead of relying on the block reason.
//
// OFF by default (opt-in). The guard only fires when the project enables it:
//     # .agents/oma-config.yaml
//     refactor_guard:
//       enabled: true      # default false — forced refactor is opt-in
//       max_lines: 500     # line budget (default 500)
// Defaults apply when the file or keys are absent.

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { agyConversationId, agyProjectDir, isAgyInput } from "./agy-input.ts";
import { toPosixPath } from "./fs-utils.ts";
import { makeBlockOutput } from "./hook-output.ts";
import { atomicWriteJson } from "./state-marker.ts";
import type { HandlerCtx, HandlerResult, HookInput, Vendor } from "./types.ts";
import { getProjectDir } from "./vendor-detect.ts";

// --- Defaults ---

export const DEFAULT_MAX_LINES = 500;

/** Stop blocks emitted per file before giving up (termination guarantee). */
export const MAX_STOP_BLOCKS = 2;

/**
 * Vendors whose Stop hook output cannot block the stop (kiro: hook output is
 * not processed — aws/amazon-q lineage; verified 2026-08). A blocking reason
 * cannot force the model there, so the enforcer dispatches the refactor agent
 * DIRECTLY via a detached `oma agent:spawn refactor-engineer` on the first
 * block of each offending file.
 */
const DIRECT_DISPATCH_VENDORS = new Set<string>(["kiro"]);

const MAIN_CONFIG_RELPATH = join(".agents", "oma-config.yaml");
const STATE_RELDIR = join(".agents", "state", "refactor-guard");

/**
 * File-editing tool names across vendor dialects, lowercase (matched
 * case-insensitively — Command Code reports canonical display names like
 * WRITE/EDIT). codex reports `apply_patch`, whose paths come from the patch
 * body instead of a file_path input (see extractPatchPaths).
 */
const EDIT_TOOLS = new Set([
  "edit", // claude, codex alias, commandcode
  "write", // claude, codex alias, commandcode
  "notebookedit", // claude
  "multiedit", // claude (legacy builds)
  "write_file", // qwen, grok
  "replace", // qwen
  "edit_file", // generic, grok
  "apply_patch", // codex, grok (codex patch format)
  "writefile", // kimi (WriteFile)
  "strreplacefile", // kimi (StrReplaceFile)
  "write_to_file", // antigravity (args.TargetFile)
  "replace_file_content", // antigravity (args.TargetFile)
  "notebook_edit", // antigravity
  "hashline_edit", // grok (args.path)
  "create_file", // grok
  "str_replace", // grok
  "fs_write", // kiro
]);

/** Extensions the guard treats as refactorable source code. */
const CODE_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "go",
  "rs",
  "java",
  "kt",
  "kts",
  "swift",
  "dart",
  "rb",
  "php",
  "c",
  "cc",
  "cpp",
  "h",
  "hpp",
  "cs",
  "scala",
  "vue",
  "svelte",
  "m",
  "mm",
]);

/** Path segments that mark generated / dependency / artifact trees. */
const EXCLUDED_SEGMENTS = [
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  ".git",
  ".next",
  ".agents/results",
  ".agents/state",
];

// --- Config loading (regex-based, consistent with scm-guard's yaml handling) ---

export interface GuardConfig {
  enabled: boolean;
  maxLines: number;
}

/**
 * Strip a trailing `# comment` and surrounding whitespace/quotes from a scalar.
 * The config template documents every key with an inline comment, so a value
 * copied straight out of it (`enabled: true      # opt-in`) must still parse —
 * a mismatch here fails silently back to "off", which reads as a broken flag.
 */
function scalarValue(raw: string): string {
  return raw
    .replace(/\s+#.*$/, "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

/**
 * Extract `enabled` / `max_lines` from the `refactor_guard:` block of
 * oma-config.yaml without a yaml dependency — core handlers stay standalone.
 */
export function loadGuardConfig(projectDir: string): GuardConfig {
  // Forced refactoring is opt-in: enabled stays false until the project sets
  // `refactor_guard.enabled: true` in oma-config.yaml.
  const defaults: GuardConfig = { enabled: false, maxLines: DEFAULT_MAX_LINES };
  const configPath = join(projectDir, MAIN_CONFIG_RELPATH);
  if (!existsSync(configPath)) return defaults;
  try {
    const content = readFileSync(configPath, "utf-8");
    const lines = content.split(/\r?\n/);
    const start = lines.findIndex((l) => /^refactor_guard:\s*(#.*)?$/.test(l));
    if (start === -1) return defaults;
    const config = { ...defaults };
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (/^\s*(#|$)/.test(line)) continue; // comments / blanks inside block
      if (!/^\s/.test(line)) break; // end of the indented block
      const enabled = line.match(/^\s+enabled:\s*(\S.*)$/)?.[1];
      if (enabled) {
        // YAML 1.1 booleans, since that is what the surrounding config uses.
        const value = scalarValue(enabled).toLowerCase();
        if (/^(true|yes|on)$/.test(value)) config.enabled = true;
        else if (/^(false|no|off)$/.test(value)) config.enabled = false;
      }
      const maxLines = line.match(/^\s+max_lines:\s*(\S.*)$/)?.[1];
      if (maxLines) {
        const value = scalarValue(maxLines);
        if (/^\d+$/.test(value)) config.maxLines = Number.parseInt(value, 10);
      }
    }
    return config;
  } catch {
    return defaults;
  }
}

// --- File classification ---

export function isRefactorableFile(relPath: string): boolean {
  const posix = toPosixPath(relPath);
  if (posix.startsWith("..")) return false; // outside the project
  const ext = posix.match(/\.([^./]+)$/)?.[1]?.toLowerCase();
  if (!ext || !CODE_EXTENSIONS.has(ext)) return false;
  if (posix.endsWith(".d.ts")) return false; // generated declarations
  return !EXCLUDED_SEGMENTS.some(
    (seg) =>
      posix === seg ||
      posix.startsWith(`${seg}/`) ||
      posix.includes(`/${seg}/`),
  );
}

export function countLines(content: string): number {
  if (content.length === 0) return 0;
  const parts = content.split(/\r?\n/);
  // A trailing newline yields one empty final element — not a line.
  return parts[parts.length - 1] === "" ? parts.length - 1 : parts.length;
}

// --- Session state (touched files + per-file stop-block counts) ---

interface GuardState {
  /** Project-relative POSIX paths of code files edited this session. */
  touched: Record<string, { lines: number; ts: string }>;
  /** Stop blocks already emitted per file (capped at MAX_STOP_BLOCKS). */
  stopBlocks: Record<string, number>;
}

function statePath(projectDir: string, sid: string): string {
  // sid comes from the vendor payload; sanitize for filesystem use.
  const safeSid = sid.replace(/[^A-Za-z0-9._-]/g, "_") || "unknown";
  return join(projectDir, STATE_RELDIR, `${safeSid}.json`);
}

function readState(projectDir: string, sid: string): GuardState {
  const path = statePath(projectDir, sid);
  if (!existsSync(path)) return { touched: {}, stopBlocks: {} };
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as GuardState;
    return {
      touched: parsed.touched ?? {},
      stopBlocks: parsed.stopBlocks ?? {},
    };
  } catch {
    return { touched: {}, stopBlocks: {} };
  }
}

// --- Tool input parsing ---

/**
 * Resolve edited file paths from the tool input across vendor dialects.
 * Most tools carry a single path field; codex's `apply_patch` embeds paths
 * in the patch body (`*** Add File:` / `*** Update File:` markers).
 */
export function resolveEditedPaths(
  toolName: string,
  toolInput: Record<string, unknown>,
): string[] {
  if (toolName.toLowerCase() === "apply_patch") {
    for (const value of Object.values(toolInput)) {
      if (typeof value !== "string" || !value.includes("*** ")) continue;
      const paths = extractPatchPaths(value);
      if (paths.length > 0) return paths;
    }
    return [];
  }
  const cand =
    toolInput.file_path ??
    toolInput.filePath ??
    toolInput.notebook_path ??
    toolInput.path ??
    // antigravity tool args use PascalCase (write_to_file /
    // replace_file_content carry TargetFile — verified from the agy binary).
    toolInput.TargetFile;
  return typeof cand === "string" && cand.length > 0 ? [cand] : [];
}

/** Extract Add/Update file paths from an apply_patch body (deletes ignored). */
export function extractPatchPaths(patch: string): string[] {
  const paths: string[] = [];
  for (const line of patch.split(/\r?\n/)) {
    const m = line.match(/^\*{3} (?:Add|Update) File: (.+)$/);
    if (m?.[1]) paths.push(m[1].trim());
  }
  return paths;
}

// ── Pure handler (canonical ABI) ─────────────────────────────

/**
 * post_tool → record touched code files (always returns null).
 * stop      → block the stop while a recorded file is over budget
 *             (null once everything fits or MAX_STOP_BLOCKS is exhausted).
 */
export async function run(
  input: HookInput,
  ctx: HandlerCtx,
): Promise<HandlerResult | null> {
  if (input.kind === "post_tool") return recordTouched(input, ctx);
  if (input.kind === "stop") return enforceOnStop(input, ctx);
  return null;
}

function recordTouched(
  input: HookInput & { kind: "post_tool" },
  ctx: HandlerCtx,
): null {
  const { toolName, toolInput, cwd: projectDir } = input;
  if (!projectDir) return null;
  if (!EDIT_TOOLS.has(toolName.toLowerCase())) return null;

  // Opt-in gate — with the default (disabled) config nothing below runs.
  const config = loadGuardConfig(projectDir);
  if (!config.enabled) return null;

  const sid = ctx.sid ?? "unknown";
  let state: GuardState | null = null;
  for (const rawPath of resolveEditedPaths(toolName, toolInput)) {
    const absPath = isAbsolute(rawPath)
      ? rawPath
      : resolve(projectDir, rawPath);
    const relPath = toPosixPath(relative(projectDir, absPath));
    if (!isRefactorableFile(relPath)) continue;
    if (!existsSync(absPath)) continue;

    let lineCount: number;
    try {
      lineCount = countLines(readFileSync(absPath, "utf-8"));
    } catch {
      continue;
    }
    state ??= readState(projectDir, sid);
    state.touched[relPath] = { lines: lineCount, ts: new Date().toISOString() };
  }
  if (state) {
    try {
      atomicWriteJson(statePath(projectDir, sid), state);
    } catch {
      // Recorder is best-effort; never fail the tool result.
    }
  }
  return null;
}

function enforceOnStop(
  input: HookInput & { kind: "stop" },
  ctx: HandlerCtx,
): HandlerResult | null {
  const projectDir = input.cwd;
  if (!projectDir) return null;

  const config = loadGuardConfig(projectDir);
  if (!config.enabled) return null;

  const sid = ctx.sid ?? "unknown";
  const state = readState(projectDir, sid);
  // Cursor's documented stop payload carries no session id while its
  // afterFileEdit payload may — merge the "unknown" bucket so a recorder/
  // enforcer sid mismatch cannot silently skip enforcement. The merge is
  // PER FILE and only for files the sid bucket does not know: pulling
  // unknown's stop-block counts wholesale would let one session's exhausted
  // budget suppress enforcement for every later session in the project.
  const overflow = sid !== "unknown" ? readState(projectDir, "unknown") : null;
  const overflowFiles = new Set<string>();
  if (overflow) {
    for (const [k, v] of Object.entries(overflow.touched)) {
      if (k in state.touched) continue;
      state.touched[k] = v;
      state.stopBlocks[k] = overflow.stopBlocks[k] ?? 0;
      overflowFiles.add(k);
    }
  }
  const touched = Object.keys(state.touched);
  if (touched.length === 0) return null;

  const offenders: Array<{ relPath: string; lines: number }> = [];
  for (const relPath of touched) {
    const absPath = join(projectDir, relPath);
    if (!existsSync(absPath)) continue;
    let lineCount: number;
    try {
      lineCount = countLines(readFileSync(absPath, "utf-8"));
    } catch {
      continue;
    }
    // Re-count at stop time — the recorder's snapshot may be stale (the file
    // may have been split back under budget later in the turn).
    state.touched[relPath] = { lines: lineCount, ts: new Date().toISOString() };
    if (lineCount <= config.maxLines) continue;
    if ((state.stopBlocks[relPath] ?? 0) >= MAX_STOP_BLOCKS) continue;
    offenders.push({ relPath, lines: lineCount });
  }

  if (offenders.length > 0) {
    for (const { relPath } of offenders) {
      state.stopBlocks[relPath] = (state.stopBlocks[relPath] ?? 0) + 1;
    }
    // Non-blocking-stop vendors: the returned block below is ignored by the
    // host, so force the refactor out-of-band. Only on each file's FIRST
    // block (count just became 1) to avoid duplicate spawns.
    if (DIRECT_DISPATCH_VENDORS.has(ctx.vendor)) {
      const firstTimers = offenders.filter(
        (o) => state.stopBlocks[o.relPath] === 1,
      );
      if (firstTimers.length > 0) {
        spawnRefactorAgent(projectDir, sid, firstTimers, config.maxLines);
      }
    }
  }
  try {
    atomicWriteJson(statePath(projectDir, sid), state);
    // Reflect updated counts for unknown-origin files back into the unknown
    // bucket so a later id-less stop keeps a consistent (bounded) count.
    if (overflow && overflowFiles.size > 0) {
      for (const k of overflowFiles) {
        const touchedEntry = state.touched[k];
        if (touchedEntry) overflow.touched[k] = touchedEntry;
        overflow.stopBlocks[k] = state.stopBlocks[k] ?? 0;
      }
      atomicWriteJson(statePath(projectDir, "unknown"), overflow);
    }
  } catch {
    // State write failure must not swallow the block itself.
  }
  if (offenders.length === 0) return null;

  const fileList = offenders
    .map((o) => `${o.relPath} (${o.lines} lines)`)
    .join(", ");
  return {
    type: "block",
    reason:
      `[oma refactor-guard] Edited file(s) exceed the ${config.maxLines}-line ` +
      `budget: ${fileList}. Before ending this turn, dispatch the ` +
      `\`refactor-engineer\` subagent to split each file into smaller, ` +
      `cohesive modules (native Agent tool when the runtime supports it, ` +
      `otherwise \`oma agent:spawn refactor-engineer\`). The refactor must be ` +
      `behavior-preserving and land as refactor-only changes. Adjust via ` +
      `\`refactor_guard.max_lines\` / \`refactor_guard.enabled\` in ` +
      `.agents/oma-config.yaml.`,
  };
}

/**
 * Detached, fire-and-forget cross-vendor dispatch of the refactor agent.
 * Resolves `oma` from PATH; silently skips when unavailable (fail-open — the
 * hook must never crash the host loop). stdio is ignored so the child cannot
 * outlive-block the hook process.
 */
function spawnRefactorAgent(
  projectDir: string,
  sid: string,
  offenders: Array<{ relPath: string; lines: number }>,
  maxLines: number,
): void {
  try {
    const files = offenders
      .map((o) => `${o.relPath} (${o.lines} lines)`)
      .join(", ");
    const prompt =
      `Refactor the following file(s) so each is at most ${maxLines} lines, ` +
      `splitting them into smaller cohesive modules. The refactor must be ` +
      `behavior-preserving and land as refactor-only changes: ${files}`;
    const child = spawn(
      "oma",
      ["agent:spawn", "refactor-engineer", prompt, sid, "-w", projectDir],
      { detached: true, stdio: "ignore" },
    );
    // ENOENT (oma not on PATH) surfaces as an async 'error' event, not a
    // synchronous throw — swallow it or it crashes the hook process.
    child.on("error", () => {});
    child.unref();
  } catch {
    // Synchronous spawn failure — fail-open.
  }
}

// ── Standalone entry (pi subprocess / direct bun invocation) ──

interface StandaloneInput {
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
  session_id?: string;
  sessionId?: string;
  [key: string]: unknown;
}

function main() {
  const inputFile = process.env.OMA_HOOK_INPUT_FILE;
  const raw = inputFile
    ? readFileSync(inputFile, "utf-8")
    : readFileSync(0, "utf-8");
  if (!raw.trim()) process.exit(0);

  const parsed: StandaloneInput = JSON.parse(raw);

  // agy runs core hooks standalone (no `oma hook` router): its envelope is
  // camelCase with a nested toolCall (verified against the agy 1.1.13 binary).
  const toolCall = parsed.toolCall as
    | { name?: unknown; args?: unknown }
    | undefined;
  if (isAgyInput(parsed) || (toolCall && typeof toolCall.name === "string")) {
    const vendor: Vendor = "antigravity";
    const projectDir =
      agyProjectDir(parsed) || ((parsed.cwd as string | undefined) ?? "");
    const sid = agyConversationId(parsed) ?? undefined;
    const isPostTool = typeof toolCall?.name === "string";
    const hookInput: HookInput = isPostTool
      ? {
          kind: "post_tool",
          toolName: toolCall?.name as string,
          toolInput: (toolCall?.args as Record<string, unknown>) ?? {},
          cwd: projectDir,
        }
      : { kind: "stop", cwd: projectDir };

    run(hookInput, { vendor, cwd: projectDir, sid })
      .then((result) => {
        // agy PostToolUse contract: print a literal `{}` (recorder is silent).
        if (isPostTool) console.log("{}");
        else if (result && result.type === "block") {
          console.log(makeBlockOutput(vendor, result.reason));
        }
        process.exit(0);
      })
      .catch(() => {
        if (isPostTool) console.log("{}");
        process.exit(0);
      });
    return;
  }

  // Standalone path is vendor-agnostic here; claude covers the common dialect.
  const vendor: Vendor = "claude";
  const projectDir = getProjectDir(vendor, parsed);
  const sid = parsed.session_id ?? parsed.sessionId;

  // Stop payloads carry no tool_name; anything with one is the recorder path.
  const hookInput: HookInput = parsed.tool_name
    ? {
        kind: "post_tool",
        toolName: parsed.tool_name,
        toolInput: { ...(parsed.tool_input ?? {}) },
        toolResponse: parsed.tool_response,
        cwd: projectDir,
      }
    : { kind: "stop", cwd: projectDir };

  run(hookInput, { vendor, cwd: projectDir, sid })
    .then((result) => {
      if (result && result.type === "block") {
        console.log(makeBlockOutput(vendor, result.reason));
      }
      process.exit(0);
    })
    .catch(() => process.exit(0));
}

if (import.meta.main) {
  main();
}
