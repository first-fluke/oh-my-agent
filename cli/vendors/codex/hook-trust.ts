/**
 * Codex CLI hook trust for oh-my-agent's own hooks.
 *
 * Codex (0.167) runs a hook only after two approvals, both stored in the user
 * config `$CODEX_HOME/config.toml` (a project config cannot approve itself):
 *
 *  1. Project trust — a project's `.codex/` layer (config.toml, hooks.json)
 *     is loaded but disabled until `[projects."<realpath>"] trust_level =
 *     "trusted"`; `--dangerously-bypass-hook-trust` does not lift this.
 *  2. Per-hook trust — every non-managed hook, project or user scope, needs
 *     `[hooks.state."<hooks.json path>:<event>:<group>:<handler>"]
 *     trusted_hash = "sha256:…"` matching its current declaration. A new or
 *     changed hook shows "Hooks need review" in the TUI and is silently left
 *     out by `codex exec`, so every oma update that touches a hook command
 *     would otherwise switch the hooks off until the user reviews them.
 *
 * oma writes both for its own hooks only (`oma-hook-*` name or the
 * `oma-hook.sh` wrapper): a user's hooks in the same file stay theirs to
 * review. An explicit `trust_level = "untrusted"` or a hook the user disabled
 * (`enabled = false`) is never overridden.
 *
 * The hash mirrors codex-rs `hooks/src/engine/discovery.rs::hook_hash` +
 * `config/src/fingerprint.rs::version_for_toml`: the normalized identity
 * `{event_name, matcher?, hooks: [handler]}` serialized as key-sorted compact
 * JSON, SHA-256, `sha256:` prefix.
 *
 * `config.toml` is Codex-owned and often large, so it is edited as text: only
 * the affected tables are touched, and the result is re-parsed and compared
 * with the intended change before it is written — anything unexpected leaves
 * the file alone.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { safeWriteFile } from "../../utils/safe-write.js";
import {
  editTomlTables,
  type TomlTableEdit,
} from "../../utils/toml-table-edit.js";
import { isRecord } from "../../utils/type-guards.js";

/** Codex hook event (hooks.json key) → persisted state-key label. */
const EVENT_LABELS: Readonly<Record<string, string>> = {
  PreModelRequest: "pre_model_request",
  PostModelRequest: "post_model_request",
  PreToolUse: "pre_tool_use",
  PermissionRequest: "permission_request",
  PostToolUse: "post_tool_use",
  PreCompact: "pre_compact",
  PostCompact: "post_compact",
  SessionStart: "session_start",
  SessionEnd: "session_end",
  UserPromptSubmit: "user_prompt_submit",
  SubagentStart: "subagent_start",
  SubagentStop: "subagent_stop",
  Stop: "stop",
  Interrupt: "interrupt",
};

/** Events whose group matcher is part of the identity (`matcher_pattern_for_event`). */
const MATCHER_EVENTS = new Set([
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "SessionStart",
  "SessionEnd",
  "SubagentStart",
  "SubagentStop",
  "PreCompact",
  "PostCompact",
]);

/** Events that may carry `additionalContextLimit`. */
const CONTEXT_LIMIT_EVENTS = new Set([
  "PreToolUse",
  "PostToolUse",
  "SessionStart",
  "UserPromptSubmit",
  "SubagentStart",
]);

const DEFAULT_TIMEOUT_SEC = 600;
const SESSION_END_DEFAULT_TIMEOUT_SEC = 1;
const SESSION_END_MAX_TIMEOUT_SEC = 3;
const DEFAULT_HOOK_OUTPUT_TOKEN_LIMIT = 2500;

/** `$CODEX_HOME`, default `~/.codex`. */
export function codexHome(): string {
  return process.env.CODEX_HOME || join(homedir(), ".codex");
}

function normalizedTimeout(event: string, timeout: unknown): number {
  const value =
    typeof timeout === "number" && Number.isInteger(timeout) && timeout >= 0
      ? timeout
      : undefined;
  if (event === "SessionEnd" || event === "Interrupt") {
    return Math.min(
      Math.max(value ?? SESSION_END_DEFAULT_TIMEOUT_SEC, 1),
      SESSION_END_MAX_TIMEOUT_SEC,
    );
  }
  return Math.max(value ?? DEFAULT_TIMEOUT_SEC, 1);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!isRecord(value)) return value;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort())
    sorted[key] = sortKeys(value[key]);
  return sorted;
}

/**
 * The `trusted_hash` Codex expects for one command handler of `event` in a
 * group with `matcher`. Returns undefined for handlers Codex would not load
 * as a command hook.
 */
export function codexHookHash(
  event: string,
  matcher: unknown,
  handler: Record<string, unknown>,
): string | undefined {
  const label = EVENT_LABELS[event];
  if (!label) return undefined;
  if ((handler.type ?? "command") !== "command") return undefined;
  if (typeof handler.command !== "string" || !handler.command.trim()) {
    return undefined;
  }
  const normalized: Record<string, unknown> = {
    type: "command",
    command: handler.command,
    timeout: normalizedTimeout(event, handler.timeout),
    async: handler.async === true,
  };
  if (typeof handler.statusMessage === "string") {
    normalized.statusMessage = handler.statusMessage;
  }
  const limit = handler.additionalContextLimit;
  if (
    CONTEXT_LIMIT_EVENTS.has(event) &&
    typeof limit === "number" &&
    limit !== DEFAULT_HOOK_OUTPUT_TOKEN_LIMIT
  ) {
    normalized.additionalContextLimit = limit;
  }
  const identity: Record<string, unknown> = {
    event_name: label,
    hooks: [normalized],
  };
  if (MATCHER_EVENTS.has(event) && typeof matcher === "string") {
    identity.matcher = matcher;
  }
  const json = JSON.stringify(sortKeys(identity));
  return `sha256:${createHash("sha256").update(json).digest("hex")}`;
}

function isOmaHandler(handler: Record<string, unknown>): boolean {
  const name = typeof handler.name === "string" ? handler.name : "";
  const command = typeof handler.command === "string" ? handler.command : "";
  return name.startsWith("oma-hook-") || command.includes("oma-hook.sh");
}

export interface CodexHookTrustEntry {
  key: string;
  hash: string;
}

/**
 * State keys and hashes for the oma handlers in a parsed `hooks.json`, keyed
 * by `keySource` (the hooks.json path as Codex discovers it).
 */
export function codexOmaHookTrustEntries(
  hooksDoc: unknown,
  keySource: string,
): CodexHookTrustEntry[] {
  if (!isRecord(hooksDoc) || !isRecord(hooksDoc.hooks)) return [];
  const entries: CodexHookTrustEntry[] = [];
  for (const [event, groups] of Object.entries(hooksDoc.hooks)) {
    const label = EVENT_LABELS[event];
    if (!label || !Array.isArray(groups)) continue;
    groups.forEach((group, groupIndex) => {
      if (!isRecord(group) || !Array.isArray(group.hooks)) return;
      group.hooks.forEach((handler, handlerIndex) => {
        if (!isRecord(handler) || !isOmaHandler(handler)) return;
        const hash = codexHookHash(event, group.matcher, handler);
        if (!hash) return;
        entries.push({
          key: `${keySource}:${label}:${groupIndex}:${handlerIndex}`,
          hash,
        });
      });
    });
  }
  return entries;
}

export interface CodexHookTrustResult {
  changed: boolean;
  /** Hook-state keys newly trusted or re-trusted. */
  trusted: string[];
  /** Set when the config was left alone on purpose or could not be edited. */
  reason?: string;
}

export interface CodexHookTrustOptions {
  /** `$CODEX_HOME/config.toml`. */
  configPath: string;
  /** The hooks.json oma wrote. */
  hooksPath: string;
  /** Project root to trust; omit for a global (`~/.codex`) install. */
  projectRoot?: string;
}

function realpathOr(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/**
 * Record Codex trust for oma's hooks in `configPath`. Skips when Codex has no
 * home yet, when the project is explicitly untrusted, or when the edit would
 * not round-trip exactly.
 */
export function trustCodexOmaHooks(
  options: CodexHookTrustOptions,
): CodexHookTrustResult {
  const none = (reason?: string): CodexHookTrustResult => ({
    changed: false,
    trusted: [],
    ...(reason ? { reason } : {}),
  });
  const { configPath, hooksPath, projectRoot } = options;
  if (!existsSync(join(configPath, ".."))) {
    return none("Codex home not found (Codex not initialized) — skipped");
  }
  if (!existsSync(hooksPath)) return none();

  let hooksDoc: unknown;
  try {
    hooksDoc = JSON.parse(readFileSync(hooksPath, "utf-8"));
  } catch {
    return none(`${hooksPath} is not valid JSON — skipped`);
  }
  // Codex keys hooks by the discovered path (not realpath'd); cover a
  // symlinked checkout under both spellings.
  const keySources = [...new Set([hooksPath, realpathOr(hooksPath)])];
  const entries = keySources.flatMap((source) =>
    codexOmaHookTrustEntries(hooksDoc, source),
  );
  if (entries.length === 0) return none();

  const original = existsSync(configPath)
    ? readFileSync(configPath, "utf-8")
    : "";
  const edits: TomlTableEdit[] = [];
  const trustKey = projectRoot ? realpathOr(projectRoot) : undefined;
  if (trustKey) {
    edits.push({
      prefix: "projects",
      key: trustKey,
      fields: [{ name: "trust_level", value: "trusted" }],
      skip: (current) => current.trust_level === "untrusted",
    });
  }
  for (const entry of entries) {
    edits.push({
      prefix: "hooks.state",
      key: entry.key,
      fields: [{ name: "trusted_hash", value: entry.hash }],
      // A hook the user switched off stays off and unreviewed.
      skip: (current) => current.enabled === false,
    });
  }
  const result = editTomlTables(original, edits);
  if (!result.ok) {
    return none(`${configPath}: ${result.reason} — skipped`);
  }
  if (trustKey && result.outcomes[0] === "skipped") {
    return none(
      `${trustKey} is marked untrusted in ${configPath} — left as is`,
    );
  }
  const trusted = entries
    .filter(
      (_, index) => result.outcomes[index + (trustKey ? 1 : 0)] === "changed",
    )
    .map((entry) => entry.key);
  if (!result.outcomes.includes("changed")) return none();
  safeWriteFile(configPath, result.text);
  return { changed: true, trusted };
}

/** Trust oma's Codex hooks for a project (or, without a root, a global) install. */
export function ensureCodexHookTrust(
  hooksPath: string,
  projectRoot?: string,
): CodexHookTrustResult {
  return trustCodexOmaHooks({
    configPath: join(codexHome(), "config.toml"),
    hooksPath,
    ...(projectRoot ? { projectRoot } : {}),
  });
}
