/**
 * Qwen Code project-hook approvals for oh-my-agent.
 *
 * Why this exists
 * ---------------
 * Qwen Code treats the hooks in a project's `.qwen/settings.json` as commands
 * written by whoever controls the repository: it does not run them until the
 * user approves that exact configuration. The first interactive start lists
 * them and asks; non-interactive runs (`qwen -p`, `--acp`) never ask and just
 * print "Project hooks in .qwen/settings.json were not loaded". The decision
 * is stored in `~/.qwen/hookApprovals.json` as
 *
 *   { "<project root>": { "hash": "<sha256>", "status": "approved" } }
 *
 * keyed by the resolved project root (lower-cased on Windows) and bound to a
 * hash of the raw `hooks` block, the project `.env` file Qwen would load, and
 * the settings `env` block, so any change asks again.
 *
 * `oma install` / `oma link qwen` write those hooks at the user's request, so
 * a fresh Qwen session that then withholds them (or asks the user to review
 * the hooks oma just generated) is a surprise. Qwen's own documentation points
 * platform embedders at recording the approval in the home they manage, which
 * is what {@link ensureQwenHookApproval} does, with two limits:
 *
 *   - only when every runnable project hook is an oma hook (`oma-hook-*`), so
 *     a repository's foreign hooks are never approved on the user's behalf;
 *   - never over a rejection: a `rejected` entry stays until the user removes
 *     it, whatever its hash.
 *
 * The hash is computed exactly like Qwen Code 0.26 (`hashProjectHooks`):
 * `JSON.stringify({ hooks, env: { files, settings } })` with object keys
 * sorted recursively, SHA-256, hex. `files` maps the one project env file Qwen
 * discovers (walking up from the workspace and stopping at the first
 * `.qwen/.env` or `.env`, counted only when it lies inside the workspace) to
 * its dotenv-parsed contents, or `null` when unreadable.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import {
  dirname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from "node:path";
import { atomicWriteFileSync } from "../../utils/safe-write.js";
import { isRecord } from "../../utils/type-guards.js";

export const QWEN_HOOK_APPROVALS_FILENAME = "hookApprovals.json";
/** Name prefix of every hook oma writes into `.qwen/settings.json`. */
export const OMA_QWEN_HOOK_PREFIX = "oma-hook-";

export interface QwenApprovalContext {
  /** User home (`os.homedir()` by default). */
  home?: string;
  /** Environment used for `QWEN_HOME` / `QWEN_CODE_HOOK_APPROVALS_PATH`. */
  env?: NodeJS.ProcessEnv;
  /** Platform deciding the case-folding of the project-root key. */
  platform?: NodeJS.Platform;
}

export type QwenHookApprovalStatus = "approved" | "rejected" | "pending";

export interface QwenHookApprovalResult {
  /** True when an approval entry was written. */
  changed: boolean;
  /** True when the current configuration was already approved. */
  alreadyApproved: boolean;
  /** The approvals file consulted or written. */
  path: string;
  /** Human-readable reason when nothing was written and not already approved. */
  reason?: string;
}

function expandHome(value: string, home: string): string {
  return value === "~" || value.startsWith(`~${sep}`) || value.startsWith("~/")
    ? join(home, value.slice(1))
    : value;
}

/** Qwen's global config dir: `$QWEN_HOME` or `~/.qwen`. */
export function qwenGlobalDir(context: QwenApprovalContext = {}): string {
  const home = context.home ?? homedir();
  const env = context.env ?? process.env;
  return env.QWEN_HOME
    ? resolve(expandHome(env.QWEN_HOME, home))
    : join(home, ".qwen");
}

/** Where Qwen reads and writes hook approvals. */
export function qwenHookApprovalsPath(
  context: QwenApprovalContext = {},
): string {
  const env = context.env ?? process.env;
  return (
    env.QWEN_CODE_HOOK_APPROVALS_PATH ||
    join(qwenGlobalDir(context), QWEN_HOOK_APPROVALS_FILENAME)
  );
}

/** The approvals-file key for a project: resolved, lower-cased on Windows. */
export function normalizeQwenProjectRoot(
  root: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const resolved = resolve(root);
  return platform === "win32" ? resolved.toLowerCase() : resolved;
}

// dotenv's line grammar (the version Qwen Code bundles), reproduced so the
// parsed values hash identically.
const DOTENV_LINE =
  /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;

/** `dotenv.parse` as Qwen Code applies it to the env files it hashes. */
export function parseDotenv(source: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  const lines = source.replace(/\r\n?/gm, "\n");
  const pattern = new RegExp(DOTENV_LINE.source, "gm");
  let match: RegExpExecArray | null = pattern.exec(lines);
  while (match !== null) {
    const key = match[1] as string;
    let value = (match[2] ?? "").trim();
    const quote = value[0];
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");
    if (quote === '"')
      value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    parsed[key] = value;
    match = pattern.exec(lines);
  }
  return parsed;
}

function isWithinRoot(filePath: string, root: string): boolean {
  const rel = relative(root, filePath);
  return (
    rel === "" ||
    (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
  );
}

/**
 * The project env files Qwen binds the approval to: it walks up from the
 * workspace, stops at the first `.qwen/.env` or `.env`, and keeps it only when
 * it lies inside the workspace and is not a user-level file. A trusted
 * workspace is assumed, which is the only state in which Qwen can show (or
 * honour) the approval at all.
 */
export function readQwenProjectEnvFiles(
  root: string,
  context: QwenApprovalContext = {},
): Record<string, Record<string, string> | null> {
  const home = context.home ?? homedir();
  const userLevel = new Set([
    normalize(join(home, ".env")),
    normalize(join(qwenGlobalDir(context), ".env")),
    normalize(join(home, ".qwen", ".env")),
  ]);
  let workspaceRoot = resolve(root);
  try {
    workspaceRoot = realpathSync(workspaceRoot);
  } catch {
    // Keep the resolved path: Qwen does the same when realpath fails.
  }
  const files: Record<string, Record<string, string> | null> = {};
  let current = workspaceRoot;
  while (current !== home) {
    for (const candidate of [
      join(current, ".qwen", ".env"),
      join(current, ".env"),
    ]) {
      if (!existsSync(candidate)) continue;
      let inside = false;
      try {
        inside = isWithinRoot(realpathSync(candidate), workspaceRoot);
      } catch {
        inside = false;
      }
      if (!userLevel.has(normalize(candidate)) && inside) {
        try {
          files[candidate] = parseDotenv(readFileSync(candidate, "utf-8"));
        } catch {
          files[candidate] = null;
        }
      }
      return files; // Qwen stops at the first env file it finds.
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return files;
}

export interface QwenHookApproval {
  hooks: Record<string, unknown>;
  env: {
    files: Record<string, Record<string, string> | null>;
    settings: unknown;
  };
}

/** Qwen Code's `hashProjectHooks`: sorted-key JSON of hooks + env, SHA-256. */
export function hashQwenProjectHooks(approval: QwenHookApproval): string {
  const stable = JSON.stringify(
    { hooks: approval.hooks, env: approval.env },
    (_key, value: unknown) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const sorted: Record<string, unknown> = Object.create(null);
        const record = value as Record<string, unknown>;
        for (const key of Object.keys(record).sort()) sorted[key] = record[key];
        return sorted;
      }
      return value;
    },
  );
  return createHash("sha256").update(stable).digest("hex");
}

const REQUIRED_FIELD: Record<string, string> = {
  command: "command",
  http: "url",
  prompt: "prompt",
};

/** Every hook definition Qwen would run (`{type, <required field>}`) with its name. */
export function runnableQwenHooks(
  hooks: Record<string, unknown>,
): Array<{ event: string; name: string | undefined }> {
  const runnable: Array<{ event: string; name: string | undefined }> = [];
  for (const [event, definitions] of Object.entries(hooks)) {
    if (!Array.isArray(definitions)) continue;
    for (const definition of definitions) {
      if (!isRecord(definition) || !Array.isArray(definition.hooks)) continue;
      for (const hook of definition.hooks) {
        if (!isRecord(hook) || typeof hook.type !== "string") continue;
        const field = REQUIRED_FIELD[hook.type];
        if (field === undefined || !hook[field]) continue;
        runnable.push({
          event,
          name: typeof hook.name === "string" ? hook.name : undefined,
        });
      }
    }
  }
  return runnable;
}

/** True when every runnable project hook carries an oma hook name. */
export function isOmaManagedQwenHooks(hooks: Record<string, unknown>): boolean {
  const runnable = runnableQwenHooks(hooks);
  return (
    runnable.length > 0 &&
    runnable.every((hook) => hook.name?.startsWith(OMA_QWEN_HOOK_PREFIX))
  );
}

function readApprovals(
  path: string,
): { config: Record<string, unknown> } | { error: string } {
  if (!existsSync(path)) return { config: {} };
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf-8"));
    if (!isRecord(parsed)) return { error: "not a JSON object" };
    return { config: { ...parsed } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * The approval Qwen would look up for `root`'s project hooks, or undefined
 * when the project declares no runnable hooks.
 */
export function qwenProjectHookApproval(
  root: string,
  context: QwenApprovalContext = {},
): { approval: QwenHookApproval; omaManaged: boolean } | undefined {
  const settingsPath = join(root, ".qwen", "settings.json");
  if (!existsSync(settingsPath)) return undefined;
  let settings: unknown;
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return undefined;
  }
  if (!isRecord(settings) || !isRecord(settings.hooks)) return undefined;
  const hooks = settings.hooks;
  if (runnableQwenHooks(hooks).length === 0) return undefined;
  return {
    approval: {
      hooks,
      env: {
        files: readQwenProjectEnvFiles(root, context),
        settings: settings.env ?? null,
      },
    },
    omaManaged: isOmaManagedQwenHooks(hooks),
  };
}

/** What Qwen would decide for the project's current hooks. */
export function qwenHookApprovalState(
  root: string,
  context: QwenApprovalContext = {},
): QwenHookApprovalStatus | undefined {
  const project = qwenProjectHookApproval(root, context);
  if (!project) return undefined;
  const read = readApprovals(qwenHookApprovalsPath(context));
  if ("error" in read) return "pending";
  const entry = read.config[normalizeQwenProjectRoot(root, context.platform)];
  if (!isRecord(entry) || entry.hash !== hashQwenProjectHooks(project.approval))
    return "pending";
  return entry.status === "approved" || entry.status === "rejected"
    ? entry.status
    : "pending";
}

/**
 * Record Qwen's approval for the oma hooks in `<root>/.qwen/settings.json`.
 * Idempotent; surgical (other projects' entries are preserved); refuses to
 * approve hooks oma did not write and never overrides a rejection.
 */
export function ensureQwenHookApproval(
  root: string,
  context: QwenApprovalContext = {},
): QwenHookApprovalResult {
  const path = qwenHookApprovalsPath(context);
  const project = qwenProjectHookApproval(root, context);
  if (!project) {
    return {
      changed: false,
      alreadyApproved: false,
      path,
      reason: ".qwen/settings.json declares no runnable hooks — skipped",
    };
  }
  if (!project.omaManaged) {
    return {
      changed: false,
      alreadyApproved: false,
      path,
      reason:
        ".qwen/settings.json declares hooks oma did not write — review them in Qwen Code (/hooks)",
    };
  }
  const read = readApprovals(path);
  if ("error" in read) {
    return {
      changed: false,
      alreadyApproved: false,
      path,
      reason: `${path} is not valid JSON (${read.error}) — skipped to avoid clobbering Qwen state`,
    };
  }
  const key = normalizeQwenProjectRoot(root, context.platform);
  const hash = hashQwenProjectHooks(project.approval);
  const existing = read.config[key];
  if (isRecord(existing)) {
    if (existing.status === "rejected") {
      return {
        changed: false,
        alreadyApproved: false,
        path,
        reason: `project hooks were rejected in Qwen Code — remove the entry from ${path} to reconsider`,
      };
    }
    if (existing.status === "approved" && existing.hash === hash) {
      return { changed: false, alreadyApproved: true, path };
    }
  }
  read.config[key] = { hash, status: "approved" };
  // Same shape and permissions as Qwen's own writer (0600, no trailing newline).
  atomicWriteFileSync(path, JSON.stringify(read.config, null, 2), {
    mode: 0o600,
  });
  return { changed: true, alreadyApproved: false, path };
}
