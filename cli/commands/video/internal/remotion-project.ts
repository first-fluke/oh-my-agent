// Resolve the vendored Remotion compositor project + report its install status.
//
// The compositor invokes Remotion as a SUBPROCESS (`npx remotion render` in the
// project dir) and never imports it — so locating the project on disk is the
// whole boundary. Resolution order (design 013 §5):
//   1. OMA_VIDEO_REMOTION_DIR     — explicit override wins
//   2. process.cwd() upward       — user's project root (installed skill tree)
//   3. dirname(import.meta.url)    — module location (source: cli/commands/video;
//                                    bundled: cli/bin/ — walks up to repo root)
//   4. os.homedir()               — global ~/.agents install
//
// Mirrors the upward-search resolver in commands/slide/workspace.ts. We cannot
// import that resolver across slices (commands/<x> must not import commands/<y>),
// so the ~20-line walk is duplicated here to keep the boundary clean.
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCapture } from "./exec.js";

/** Relative path of the vendored Remotion project under a project root. */
export const REMOTION_PROJECT_RELATIVE =
  ".agents/skills/oma-video/resources/remotion";

// A file that only exists in the real Remotion project dir — the sentinel the
// upward walk looks for, so we never match an empty/partial directory.
const SENTINEL = "src/index.ts";

export interface RemotionProjectStatus {
  /** Absolute path of the resolved project dir, or null when not found. */
  dir: string | null;
  /** Whether the project's dependencies are installed (node_modules present). */
  installed: boolean;
  /** Whether Remotion's Chrome Headless Shell has been downloaded. */
  browserReady: boolean;
}

function walkUpForProject(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, REMOTION_PROJECT_RELATIVE);
    if (existsSync(join(candidate, SENTINEL))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break; // filesystem root
    dir = parent;
  }
  return null;
}

/**
 * Resolve the vendored Remotion project directory, or null when it cannot be
 * found on disk. Layout-agnostic: works from the repo root, `cli/`, a bundled
 * `cli/bin/`, or any nested cwd.
 */
export function resolveRemotionProjectDir(): string | null {
  const override = process.env.OMA_VIDEO_REMOTION_DIR;
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

/** True when the project's dependencies are installed (`remotion` resolvable). */
export function isRemotionProjectInstalled(projectDir: string): boolean {
  return existsSync(join(projectDir, "node_modules", "remotion"));
}

/**
 * True when Remotion's Chrome Headless Shell has been downloaded. This is the
 * supported, reliable render browser — far more stable than forcing the full
 * system Chrome via `--browser-executable` (which intermittently fails at
 * `makePage`/`getPool`). `oma video doctor --install` ensures it.
 */
export function isRemotionBrowserReady(projectDir: string): boolean {
  return existsSync(
    join(projectDir, "node_modules", ".remotion", "chrome-headless-shell"),
  );
}

/** Resolve the project dir + whether it is installed + browser-ready, in one call. */
export function getRemotionProjectStatus(): RemotionProjectStatus {
  const dir = resolveRemotionProjectDir();
  return {
    dir,
    installed: dir ? isRemotionProjectInstalled(dir) : false,
    browserReady: dir ? isRemotionBrowserReady(dir) : false,
  };
}

export interface RemotionInstallResult {
  ok: boolean;
  dir: string | null;
  detail: string;
}

/**
 * One-time, opt-in install of the vendored Remotion project: `npm install` the
 * deps, then `npx remotion browser ensure` to download Remotion's Chrome
 * Headless Shell (the reliable render browser). Boundary-safe: runs npm/npx as
 * subprocesses, never imports the project. The deps install skips the puppeteer
 * Chromium download; the headless shell is fetched explicitly by `browser
 * ensure`. Idempotent: deps are a no-op when present; `browser ensure` is a
 * no-op when the shell is already downloaded.
 */
export async function installRemotionProject(): Promise<RemotionInstallResult> {
  const dir = resolveRemotionProjectDir();
  if (!dir) {
    return {
      ok: false,
      dir: null,
      detail:
        "remotion project not found (set OMA_VIDEO_REMOTION_DIR or install the oma-video skill)",
    };
  }
  if (!isRemotionProjectInstalled(dir)) {
    const res = await runCapture(
      "npm",
      ["install", "--no-audit", "--no-fund"],
      {
        cwd: dir,
        timeoutMs: 600_000,
        env: {
          ...process.env,
          REMOTION_SKIP_BROWSER_DOWNLOAD: "1",
          PUPPETEER_SKIP_DOWNLOAD: "1",
        },
      },
    );
    if (res.timedOut) {
      return { ok: false, dir, detail: "npm install timed out (600s)" };
    }
    if (res.code !== 0 || !isRemotionProjectInstalled(dir)) {
      const tail = (res.stderr || res.stdout).trim().split("\n").slice(-3);
      return {
        ok: false,
        dir,
        detail: `npm install exit ${res.code}: ${tail.join(" | ")}`,
      };
    }
  }

  // Ensure Remotion's Chrome Headless Shell (the reliable render browser).
  if (!isRemotionBrowserReady(dir)) {
    const browser = await runCapture("npx", ["remotion", "browser", "ensure"], {
      cwd: dir,
      timeoutMs: 300_000,
    });
    if (browser.timedOut) {
      return { ok: false, dir, detail: "remotion browser ensure timed out" };
    }
    if (browser.code !== 0 || !isRemotionBrowserReady(dir)) {
      const tail = (browser.stderr || browser.stdout)
        .trim()
        .split("\n")
        .slice(-3);
      return {
        ok: false,
        dir,
        detail: `deps installed, but "remotion browser ensure" failed: ${tail.join(" | ")}`,
      };
    }
  }

  return { ok: true, dir, detail: "installed (deps + headless shell)" };
}
