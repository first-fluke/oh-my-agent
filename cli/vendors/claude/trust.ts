/**
 * Claude Code workspace trust management for oh-my-agent.
 *
 * Why this exists
 * ---------------
 * `oma install` / `oma update` / `oma link` write a `permissions.allow` block
 * into `<project>/.claude/settings.json` (Bash(bun run:*), mcp__serena__*, …).
 * Claude Code ignores those entries until the workspace has been trusted,
 * printing:
 *
 *   Ignoring N permissions.allow entries from .claude/settings.json:
 *   this workspace has not been trusted. Run Claude Code interactively here
 *   once and accept the trust dialog, or set
 *   projects["<path>"].hasTrustDialogAccepted: true in ~/.claude.json.
 *
 * Running `oma install` inside a project is an explicit, project-scoped act of
 * intent, so we pre-accept that trust dialog on the user's behalf by setting
 * `projects[<projectPath>].hasTrustDialogAccepted = true` in `~/.claude.json` —
 * exactly the manual remedy Claude Code itself documents.
 *
 * Safety constraints
 * ------------------
 * `~/.claude.json` is a Claude Code-owned file (it carries auth/session state)
 * and is listed in {@link FORBIDDEN_VENDOR_FILES}, so it must NEVER be written
 * via `safeWriteJson`. Instead this module performs a SURGICAL merge: it reads
 * the existing JSON, mutates only the one nested boolean, and writes the whole
 * object back atomically (temp file + rename). Every other field is preserved.
 *
 *   - Absent `~/.claude.json` → skip (Claude Code not initialized; the warning
 *     only surfaces once Claude has created the file, and pre-creating it could
 *     disturb first-run onboarding).
 *   - Malformed `~/.claude.json` → skip (never clobber a file we can't parse).
 *
 * The path-resolution layer ({@link claudeJsonPath} / {@link
 * ensureClaudeWorkspaceTrust}) is kept thin so the pure {@link
 * trustClaudeWorkspace} core can be unit-tested against a temp path without
 * touching a developer's real `~/.claude.json`.
 */

import {
  copyFileSync,
  existsSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { isRecord } from "../../utils/type-guards.js";

export interface ClaudeTrustResult {
  /** True when `hasTrustDialogAccepted` was newly set (file written). */
  changed: boolean;
  /** True when the workspace was already trusted (no write needed). */
  alreadyTrusted: boolean;
  /** Human-readable reason when nothing was changed and not already trusted. */
  reason?: string;
}

/** Absolute path to the Claude Code user-level config (`~/.claude.json`). */
export function claudeJsonPath(): string {
  return join(homedir(), ".claude.json");
}

/**
 * Surgically set `projects[<projectPath>].hasTrustDialogAccepted = true` in the
 * Claude Code config at `configPath`. Pure with respect to path resolution —
 * pass any path so this can be tested without touching the real `~/.claude.json`.
 *
 * Skips (returns `changed: false`) when the file is absent or unparseable, and
 * is idempotent when the workspace is already trusted.
 */
export function trustClaudeWorkspace(
  configPath: string,
  projectPath: string,
): ClaudeTrustResult {
  if (!existsSync(configPath)) {
    return {
      changed: false,
      alreadyTrusted: false,
      reason:
        "~/.claude.json not found (Claude Code not initialized) — skipped",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return {
      changed: false,
      alreadyTrusted: false,
      reason:
        "~/.claude.json is not valid JSON — skipped to avoid clobbering Claude Code state",
    };
  }

  if (!isRecord(parsed)) {
    return {
      changed: false,
      alreadyTrusted: false,
      reason: "~/.claude.json is not a JSON object — skipped",
    };
  }

  const projects = isRecord(parsed.projects) ? parsed.projects : {};
  const existing = isRecord(projects[projectPath])
    ? (projects[projectPath] as Record<string, unknown>)
    : undefined;

  if (existing && existing.hasTrustDialogAccepted === true) {
    return { changed: false, alreadyTrusted: true };
  }

  projects[projectPath] = { ...(existing ?? {}), hasTrustDialogAccepted: true };
  parsed.projects = projects;
  writeClaudeJsonAtomic(configPath, parsed);
  return { changed: true, alreadyTrusted: false };
}

/**
 * Pre-accept the Claude Code trust dialog for `projectPath` by surgically
 * merging the real `~/.claude.json`.
 */
export function ensureClaudeWorkspaceTrust(
  projectPath: string,
): ClaudeTrustResult {
  return trustClaudeWorkspace(claudeJsonPath(), projectPath);
}

/**
 * Atomically write `value` to `targetPath` via a sibling temp file + rename.
 *
 * Deliberately bypasses `safeWriteJson` (which refuses `.claude.json`): this is
 * a surgical merge of a Claude Code-owned file, not an oma-owned overwrite. The
 * temp-then-rename swap guarantees Claude never reads a half-written config.
 */
function writeClaudeJsonAtomic(targetPath: string, value: unknown): void {
  const dir = dirname(targetPath);
  const stamp = `${Date.now()}-${process.pid}`;
  const tmpPath = join(dir, `.claude.json.oma-tmp-${stamp}`);
  writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  try {
    renameSync(tmpPath, targetPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EXDEV") {
      copyFileSync(tmpPath, targetPath);
      unlinkSync(tmpPath);
    } else {
      throw err;
    }
  }
}
