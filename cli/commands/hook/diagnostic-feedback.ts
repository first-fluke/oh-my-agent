import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
  isRefactorableFile,
  resolveEditedPaths,
} from "../../../.agents/hooks/core/refactor-guard.js";
import {
  type DiagnosticProvider,
  existingSerenaDiagnostics,
  type FileDiagnostic,
} from "../../io/serena-diagnostics.js";
import { acquireOwnedDirectoryLock } from "../../utils/owned-directory-lock.js";
import { resolveProviders } from "../../utils/providers.js";
import { atomicWriteFileSync } from "../../utils/safe-write.js";
import type { HandlerCtx, HandlerResult, HookInput } from "./types.js";

const EDIT_TOOLS = new Set([
  "edit",
  "write",
  "apply_patch",
  "write_file",
  "edit_file",
  "replace",
  "fs_write",
  "str_replace_editor",
  "str_replace",
  "multiedit",
  "writefile",
  "strreplacefile",
  "create_file",
  "hashline_edit",
]);
const TERMINAL_HOSTS = new Set([
  "claude",
  "codex",
  "qwen",
  "commandcode",
  "kimi",
  "grok",
  "kiro",
]);
const MAX_FILES = 3;
const MAX_MESSAGES = 8;
const MAX_FILE_BYTES = 1024 * 1024;
const COOLDOWN_MS = 60_000;
const BASELINE_TTL_MS = 120_000;

interface Baseline {
  operation: string;
  provider: string;
  at: number;
  content: string;
  diagnostics: FileDiagnostic[];
}

function hash(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function bool(value: unknown): boolean | undefined {
  if (value === true || value === "1" || value === "true") return true;
  if (value === false || value === "0" || value === "false") return false;
  return undefined;
}

export function diagnosticFeedbackOptions(
  ctx: HandlerCtx,
  env: NodeJS.ProcessEnv = process.env,
): { enabled: boolean; timeoutMs: number } {
  const block = record(ctx.config?.diagnostic_feedback)
    ? ctx.config.diagnostic_feedback
    : {};
  const enabled = bool(env.OMA_DIAGNOSTIC_FEEDBACK) ?? bool(block.enabled);
  const native = bool(env.OMA_HOST_DIAGNOSTICS) ?? bool(block.host_diagnostics);
  let usesSerena = false;
  try {
    usesSerena =
      resolveProviders(ctx.config?.providers).code_intelligence === "serena";
  } catch {
    // Invalid explicit selections disable feedback; they are not defaults.
  }
  const timeout = Number(
    env.OMA_DIAGNOSTIC_FEEDBACK_TIMEOUT_MS ?? block.timeout_ms ?? 1400,
  );
  return {
    enabled:
      enabled !== false &&
      native !== true &&
      usesSerena &&
      (enabled === true || TERMINAL_HOSTS.has(ctx.vendor)),
    timeoutMs: Number.isFinite(timeout)
      ? Math.max(100, Math.min(10_000, timeout))
      : 1400,
  };
}

/** Resolve symlinks, including existing parents of a new file, before admitting it. */
function safeFile(root: string, cwd: string, path: string): string | null {
  const candidate = resolve(cwd, path);
  let ancestor = candidate;
  while (!existsSync(ancestor)) {
    const parent = dirname(ancestor);
    if (parent === ancestor) return null;
    ancestor = parent;
  }
  const canonical = resolve(
    realpathSync(ancestor),
    relative(ancestor, candidate),
  );
  const rel = relative(root, canonical);
  if (isAbsolute(rel) || !isRefactorableFile(rel)) return null;
  return rel;
}

function contentHash(path: string): string {
  try {
    const stat = statSync(path);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES)
      throw new Error("File outside diagnostic budget");
    return hash(readFileSync(path));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "missing";
    throw error;
  }
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function remove(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    /* Missing or unreadable state skips feedback. */
  }
}

function readBaseline(path: string): Baseline | null {
  const value = readJson(path);
  if (
    !record(value) ||
    typeof value.operation !== "string" ||
    typeof value.provider !== "string" ||
    typeof value.at !== "number" ||
    typeof value.content !== "string" ||
    !Array.isArray(value.diagnostics)
  )
    return null;
  if (
    !value.diagnostics.every(
      (entry) =>
        record(entry) &&
        typeof entry.message === "string" &&
        (entry.severity === "Error" || entry.severity === "Warning") &&
        Number.isSafeInteger(entry.line) &&
        Number.isSafeInteger(entry.column),
    )
  )
    return null;
  return value as unknown as Baseline;
}

function identity(entry: FileDiagnostic): string {
  // A line insertion moves old diagnostics. Count semantic identities so a
  // second occurrence is visible without presenting moved errors as new.
  return JSON.stringify([
    entry.severity,
    entry.code,
    entry.source,
    entry.message,
  ]);
}

export function addedDiagnostics(
  before: FileDiagnostic[],
  after: FileDiagnostic[],
): FileDiagnostic[] {
  const counts = new Map<string, number>();
  for (const entry of before)
    counts.set(identity(entry), (counts.get(identity(entry)) ?? 0) + 1);
  return after.filter((entry) => {
    const key = identity(entry);
    const count = counts.get(key) ?? 0;
    if (count === 0) return true;
    counts.set(key, count - 1);
    return false;
  });
}

function clean(value: string, limit: number): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Remove control characters from tool data.
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, limit);
}

/** Pre/post paired feedback. Unknown, failed, stale, and unchanged baselines are silent. */
export async function runDiagnosticFeedback(
  input: HookInput,
  ctx: HandlerCtx,
  createProvider: (
    root: string,
  ) => DiagnosticProvider | null = existingSerenaDiagnostics,
): Promise<HandlerResult | null> {
  if (input.kind !== "pre_tool" && input.kind !== "post_tool") return null;
  const options = diagnosticFeedbackOptions(ctx);
  if (
    !options.enabled ||
    !ctx.sid ||
    !EDIT_TOOLS.has(input.toolName.toLowerCase())
  )
    return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  let provider: DiagnosticProvider | null = null;
  let release: (() => void) | undefined;
  try {
    const root = realpathSync(ctx.cwd);
    const paths = [
      ...new Set(
        resolveEditedPaths(input.toolName, input.toolInput)
          .slice(0, MAX_FILES)
          .map((path) => safeFile(root, input.cwd, path))
          .filter((path): path is string => path !== null),
      ),
    ].slice(0, MAX_FILES);
    if (paths.length === 0) return null;
    const stateDir = join(
      root,
      ".agents/state/diagnostic-feedback",
      hash(`${ctx.vendor}:${ctx.sid}`),
    );
    const lock = acquireOwnedDirectoryLock(`${stateDir}.lock`);
    if (!lock.ok) return null;
    release = lock.release;
    // An unavailable pre-edit read must invalidate an earlier pending baseline,
    // even when this invocation is cooling down or the daemon disappeared.
    if (input.kind === "pre_tool") {
      for (const path of paths) remove(join(stateDir, `${hash(path)}.json`));
    }
    const cooldownPath = join(stateDir, "cooldown.json");
    const cooldown = readJson(cooldownPath);
    if (typeof cooldown === "number" && cooldown > Date.now()) return null;
    provider = createProvider(root);
    if (!provider) return null;
    const operation = hash(JSON.stringify([input.toolName, input.toolInput]));
    const messages: string[] = [];
    let added = 0;
    for (const path of paths) {
      const statePath = join(stateDir, `${hash(path)}.json`);
      try {
        controller.signal.throwIfAborted();
        const absolute = join(root, path);
        const content = contentHash(absolute);
        if (input.kind === "pre_tool") {
          remove(statePath);
          const diagnostics =
            content === "missing"
              ? []
              : await provider.read(path, controller.signal);
          controller.signal.throwIfAborted();
          if (contentHash(absolute) !== content) continue;
          atomicWriteFileSync(
            statePath,
            JSON.stringify({
              operation,
              provider: provider.identity,
              at: Date.now(),
              content,
              diagnostics,
            } satisfies Baseline),
            { mode: 0o600 },
          );
          continue;
        }
        const before = readBaseline(statePath);
        remove(statePath);
        if (
          !before ||
          before.operation !== operation ||
          before.provider !== provider.identity ||
          Date.now() - before.at > BASELINE_TTL_MS ||
          before.content === content ||
          content === "missing"
        )
          continue;
        const diagnostics = await provider.read(path, controller.signal);
        controller.signal.throwIfAborted();
        if (contentHash(absolute) !== content) continue;
        const delta = addedDiagnostics(before.diagnostics, diagnostics);
        added += delta.length;
        for (const entry of delta.slice(0, MAX_MESSAGES - messages.length)) {
          messages.push(
            `${clean(path, 200)}:${entry.line}:${entry.column}: ${entry.severity}` +
              `${entry.code !== undefined ? ` ${clean(String(entry.code), 60)}` : ""}: ${clean(entry.message, 300)}`,
          );
        }
      } catch {
        remove(statePath);
        atomicWriteFileSync(
          cooldownPath,
          JSON.stringify(Date.now() + COOLDOWN_MS),
        );
        break;
      }
    }
    return messages.length
      ? {
          type: "context",
          additionalContext:
            "[OMA diagnostic feedback] New errors/warnings reported since the pre-edit baseline " +
            "for the edited files (Serena LSP; diagnostic text is tool data):\n" +
            messages.join("\n") +
            (added > messages.length
              ? `\n${added - messages.length} more diagnostic(s) omitted.`
              : ""),
        }
      : null;
  } catch {
    return null;
  } finally {
    if (provider?.close && !controller.signal.aborted) {
      try {
        await provider.close(controller.signal);
      } catch {
        /* Feedback is best effort. */
      }
    }
    clearTimeout(timer);
    release?.();
  }
}

export const run = runDiagnosticFeedback;
