/**
 * cursor-agent workspace trust for oh-my-agent project installs.
 *
 * cursor-agent (2026.10) refuses to start a session in a directory the user
 * has not trusted: the TUI shows "Workspace Trust Required", and headless
 * `cursor-agent -p` exits 1 ("Pass --trust, --yolo, or -f"). The project's
 * `.cursor/hooks.json` therefore never runs until the user trusts the folder.
 *
 * The trust record is a marker file whose existence is all that is checked
 * (`src/workspace/approval.tsx`):
 *
 *   ${CURSOR_DATA_DIR || ~/.cursor}/projects/<slug(cwd)>/.workspace-trusted
 *
 * where `slug` replaces every non-alphanumeric run with `-` and trims dashes.
 * `--trust` writes the same marker with `{trustedAt, workspacePath}`. Running
 * `oma install` in a project is the user's explicit intent to run oma's hooks
 * there, so — like vendors/claude/trust.ts — oma writes that marker.
 *
 * Skipped when the Cursor data dir does not exist (Cursor not installed or
 * never run). The Cursor IDE only gates project hooks when the user enables
 * `security.workspace.trust.enabled` (off by default); that store is not
 * touched.
 */

import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface CursorTrustResult {
  changed: boolean;
  alreadyTrusted: boolean;
  reason?: string;
}

/** `$CURSOR_DATA_DIR`, default `~/.cursor`. */
export function cursorDataDir(): string {
  return process.env.CURSOR_DATA_DIR || join(homedir(), ".cursor");
}

/** cursor-agent's per-project directory name for an absolute workspace path. */
export function cursorProjectSlug(workspacePath: string): string {
  return workspacePath
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const CURSOR_TRUST_MARKER = ".workspace-trusted";

/**
 * Write the workspace-trust marker for `projectRoot` (and its realpath, when
 * different — cursor-agent keys by the unresolved cwd) under `dataDir`.
 */
export function trustCursorWorkspace(
  dataDir: string,
  projectRoot: string,
  now: Date = new Date(),
): CursorTrustResult {
  if (!existsSync(dataDir)) {
    return {
      changed: false,
      alreadyTrusted: false,
      reason: `${dataDir} not found (cursor-agent not initialized) — skipped`,
    };
  }
  let resolved = projectRoot;
  try {
    resolved = realpathSync(projectRoot);
  } catch {
    // Keep the given path.
  }
  let changed = false;
  for (const workspacePath of new Set([projectRoot, resolved])) {
    const dir = join(dataDir, "projects", cursorProjectSlug(workspacePath));
    const marker = join(dir, CURSOR_TRUST_MARKER);
    if (existsSync(marker)) continue;
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      marker,
      `${JSON.stringify({ trustedAt: now.toISOString(), workspacePath }, null, 2)}\n`,
    );
    changed = true;
  }
  return { changed, alreadyTrusted: !changed };
}

/** Pre-accept cursor-agent's workspace trust for a project install. */
export function ensureCursorWorkspaceTrust(
  projectRoot: string,
): CursorTrustResult {
  return trustCursorWorkspace(cursorDataDir(), projectRoot);
}
