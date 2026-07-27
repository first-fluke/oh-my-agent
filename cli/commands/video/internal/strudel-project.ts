// Resolve the vendored Strudel BGM renderer + report its install status.
//
// LICENSE BOUNDARY (the reason this file exists): `@strudel/*` is
// AGPL-3.0-or-later, the oma CLI is MIT. The CLI therefore NEVER imports
// Strudel and never ships it — it locates `resources/strudel/` on disk, whose
// deps are installed on demand, and spawns `render.mjs` as a SUBPROCESS. Same
// boundary `remotion-project.ts` / `playwright-project.ts` use.
//
// Resolution order mirrors `remotion-project.ts`:
//   1. OMA_VIDEO_STRUDEL_DIR      — explicit override wins
//   2. process.cwd() upward       — user's project root (installed skill tree)
//   3. dirname(import.meta.url)   — module location (source or bundled cli/bin)
//   4. os.homedir()               — global ~/.agents install
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCapture } from "./exec.js";

/** Relative path of the vendored Strudel renderer under a project root. */
export const STRUDEL_PROJECT_RELATIVE =
  ".agents/skills/oma-video/resources/strudel";

/** Driver script inside the project dir. */
export const STRUDEL_DRIVER = "render.mjs";

// A file that only exists in the real project dir — the sentinel the upward
// walk looks for, so we never match an empty/partial directory.
const SENTINEL = STRUDEL_DRIVER;

export interface StrudelProjectStatus {
  /** Absolute path of the resolved project dir, or null when not found. */
  dir: string | null;
  /** Whether `@strudel/web` is installed in the project dir. */
  installed: boolean;
}

function walkUpForProject(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, STRUDEL_PROJECT_RELATIVE);
    if (existsSync(join(candidate, SENTINEL))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break; // filesystem root
    dir = parent;
  }
  return null;
}

/**
 * Resolve the vendored Strudel project directory, or null when it cannot be
 * found on disk. Layout-agnostic: works from the repo root, `cli/`, a bundled
 * `cli/bin/`, or any nested cwd.
 */
export function resolveStrudelProjectDir(): string | null {
  const override = process.env.OMA_VIDEO_STRUDEL_DIR;
  if (override && override.trim().length > 0) {
    const dir = override.trim();
    return existsSync(join(dir, SENTINEL)) ? dir : null;
  }

  const startDirs: string[] = [process.cwd()];
  try {
    startDirs.push(dirname(fileURLToPath(import.meta.url)));
  } catch {
    // import.meta.url unavailable in some test runners — skip
  }
  startDirs.push(homedir());

  for (const startDir of startDirs) {
    const found = walkUpForProject(startDir);
    if (found) return found;
  }
  return null;
}

/** True when the project's AGPL deps are installed (`@strudel/web` resolvable). */
export function isStrudelProjectInstalled(projectDir: string): boolean {
  return existsSync(join(projectDir, "node_modules", "@strudel", "web"));
}

/** Resolve the project dir + whether it is installed, in one call. */
export function getStrudelProjectStatus(): StrudelProjectStatus {
  const dir = resolveStrudelProjectDir();
  return { dir, installed: dir ? isStrudelProjectInstalled(dir) : false };
}

export interface StrudelInstallResult {
  ok: boolean;
  dir: string | null;
  detail: string;
}

/**
 * One-time `npm install` of the vendored renderer's deps. Opt-in via
 * `oma video doctor --install-strudel` — never implicit, because it pulls
 * AGPL-licensed packages onto the user's disk.
 */
export async function installStrudelProject(): Promise<StrudelInstallResult> {
  const dir = resolveStrudelProjectDir();
  if (!dir) {
    return {
      ok: false,
      dir: null,
      detail:
        "strudel project not found (set OMA_VIDEO_STRUDEL_DIR or install the oma-video skill)",
    };
  }
  if (isStrudelProjectInstalled(dir)) {
    return { ok: true, dir, detail: "already installed" };
  }
  const res = await runCapture("npm", ["install", "--no-audit", "--no-fund"], {
    cwd: dir,
    timeoutMs: 600_000,
  });
  if (res.timedOut) {
    return { ok: false, dir, detail: "npm install timed out (600s)" };
  }
  if (res.code !== 0 || !isStrudelProjectInstalled(dir)) {
    const tail = (res.stderr || res.stdout).trim().split("\n").slice(-3);
    return {
      ok: false,
      dir,
      detail: `npm install exit ${res.code}: ${tail.join(" | ")}`,
    };
  }
  return {
    ok: true,
    dir,
    detail: "@strudel/web installed (AGPL-3.0-or-later)",
  };
}
