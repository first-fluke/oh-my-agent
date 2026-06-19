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
import { existsSync, readdirSync, statSync } from "node:fs";
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

/** Platform binary name for Remotion's Chrome Headless Shell. */
function headlessShellBinaryName(): string {
  return process.platform === "win32"
    ? "chrome-headless-shell.exe"
    : "chrome-headless-shell";
}

/** Absolute path of the Chrome Headless Shell download dir for a project. */
function headlessShellDir(projectDir: string): string {
  return join(projectDir, "node_modules", ".remotion", "chrome-headless-shell");
}

/**
 * True when Remotion's Chrome Headless Shell is *actually usable* — the platform
 * binary has been extracted, not merely that the download directory exists.
 *
 * Remotion's `browser ensure` can leave a partial extraction (only ABOUT +
 * LICENSE, no binary) that still creates the directory. Checking dir existence
 * alone reports a false "ready" and the render then dies at
 * `internalOpenBrowser`. We require a >1MB binary named `chrome-headless-shell`.
 */
export function isRemotionBrowserReady(projectDir: string): boolean {
  const shellDir = headlessShellDir(projectDir);
  if (!existsSync(shellDir)) return false;
  const target = headlessShellBinaryName();
  let entries: string[];
  try {
    entries = readdirSync(shellDir, { recursive: true }) as string[];
  } catch {
    return false;
  }
  return entries.some((rel) => {
    if ((rel.split(/[\\/]/).pop() ?? "") !== target) return false;
    try {
      return statSync(join(shellDir, rel)).size > 1_000_000;
    } catch {
      return false;
    }
  });
}

/**
 * Self-heal a partial Chrome Headless Shell extraction: when `browser ensure`
 * downloaded the zip but failed to extract the binary, extract the zip in
 * place. No-op when already ready or when no zip is present. Returns whether
 * the binary is present after the attempt.
 */
async function repairHeadlessShellExtraction(
  projectDir: string,
): Promise<boolean> {
  if (isRemotionBrowserReady(projectDir)) return true;
  const shellDir = headlessShellDir(projectDir);
  if (!existsSync(shellDir)) return false;
  const zip = readdirSync(shellDir).find((file) =>
    file.toLowerCase().endsWith(".zip"),
  );
  if (!zip) return false;
  // zip is `chrome-headless-shell-<platform>.zip`; its sibling `<platform>` dir
  // is where Remotion expects the extracted tree.
  const platform = zip
    .replace(/^chrome-headless-shell-/i, "")
    .replace(/\.zip$/i, "");
  const destDir = join(shellDir, platform);
  const zipPath = join(shellDir, zip);
  const res =
    process.platform === "win32"
      ? await runCapture(
          "powershell",
          [
            "-NoProfile",
            "-Command",
            `Expand-Archive -Force -LiteralPath '${zipPath}' -DestinationPath '${destDir}'`,
          ],
          { timeoutMs: 120_000 },
        )
      : await runCapture("unzip", ["-o", "-q", zipPath, "-d", destDir], {
          timeoutMs: 120_000,
        });
  if (res.code !== 0) return false;
  return isRemotionBrowserReady(projectDir);
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
    // `browser ensure` can exit 0 while leaving a partial extraction (zip
    // present, binary missing). Self-heal by extracting the zip in place before
    // declaring failure.
    if (!isRemotionBrowserReady(dir)) {
      const repaired = await repairHeadlessShellExtraction(dir);
      if (!repaired) {
        const tail = (browser.stderr || browser.stdout)
          .trim()
          .split("\n")
          .slice(-3);
        return {
          ok: false,
          dir,
          detail: `deps installed, but Chrome Headless Shell binary is missing after "browser ensure" + zip repair: ${tail.join(" | ")}`,
        };
      }
    }
  }

  return { ok: true, dir, detail: "installed (deps + headless shell)" };
}
