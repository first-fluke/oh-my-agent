// Resolve the cloned MoneyPrinterTurbo (MPT) checkout + report its install
// status, and drive its one-time install. Mirrors `remotion-project.ts` for the
// alternative shorts compositor (design 013 §5).
//
// Boundary: the compositor invokes MPT as a SUBPROCESS — the MPT venv's python
// running `resources/mpt/driver.py` — and NEVER imports it. Locating the clone
// on disk + its venv is the whole boundary.
//
// Unlike the Remotion project (which is vendored INSIDE the repo under
// `.agents/skills/oma-video/resources/remotion`), the MPT checkout is ~1GB
// (repo + venv) and MUST NOT be vendored into git. It is cloned to a cache dir
// OUTSIDE the repo. Resolution order:
//   1. OMA_VIDEO_MPT_DIR  — explicit override wins
//   2. $HOME/.cache/oma-video/MoneyPrinterTurbo — the default cache clone
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCapture } from "./exec.js";

/** Upstream repo cloned by `oma video doctor --install-mpt`. */
export const MPT_REPO_URL =
  "https://github.com/harry0703/MoneyPrinterTurbo.git";

/** Default cache location for the MPT clone — OUTSIDE the oma git repo. */
export function defaultMptCacheDir(): string {
  return join(homedir(), ".cache", "oma-video", "MoneyPrinterTurbo");
}

// A file that only exists in a real MPT checkout — the sentinel we verify so we
// never match an empty/partial directory.
const SENTINEL = join("app", "services", "task.py");

/** Run-relative path of the in-repo MPT driver shipped with the oma-video skill. */
export const MPT_DRIVER_RELATIVE =
  ".agents/skills/oma-video/resources/mpt/driver.py";

export interface MptProjectStatus {
  /** Absolute path of the resolved MPT checkout, or null when not found. */
  dir: string | null;
  /** Whether the checkout's venv python + MPT package are present. */
  installed: boolean;
  /** Absolute path of the venv python interpreter, or null when absent. */
  venvPython: string | null;
}

/** Absolute path of the venv python inside an MPT checkout (may not exist). */
export function mptVenvPython(dir: string): string {
  return join(dir, ".venv", "bin", "python");
}

/**
 * Resolve the MPT checkout directory, or null when it cannot be found on disk.
 * Only directories that contain the MPT sentinel are accepted.
 */
export function resolveMptProjectDir(): string | null {
  const override = process.env.OMA_VIDEO_MPT_DIR;
  if (override && override.trim().length > 0) {
    const dir = override.trim();
    return existsSync(join(dir, SENTINEL)) ? dir : null;
  }
  const cache = defaultMptCacheDir();
  return existsSync(join(cache, SENTINEL)) ? cache : null;
}

/** True when the checkout's venv python + MPT package are present (installed). */
export function isMptProjectInstalled(dir: string): boolean {
  return existsSync(mptVenvPython(dir)) && existsSync(join(dir, SENTINEL));
}

/** Resolve the checkout dir + whether it is installed + venv python, in one call. */
export function getMptProjectStatus(): MptProjectStatus {
  const dir = resolveMptProjectDir();
  const installed = dir ? isMptProjectInstalled(dir) : false;
  return {
    dir,
    installed,
    venvPython: dir && installed ? mptVenvPython(dir) : null,
  };
}

/**
 * Resolve the in-repo MPT driver script (`resources/mpt/driver.py`). The driver
 * ships with the oma-video skill, not the MPT clone, so it stays in-repo and
 * boundary-safe. Layout-agnostic upward walk mirrors the Remotion resolver:
 * works from the repo root, `cli/`, a bundled `cli/bin/`, or any nested cwd.
 */
export function resolveMptDriverPath(): string | null {
  const override = process.env.OMA_VIDEO_MPT_DRIVER;
  if (override && override.trim().length > 0) {
    const p = override.trim();
    return existsSync(p) ? p : null;
  }
  const startDirs: string[] = [process.cwd()];
  try {
    startDirs.push(dirname(fileURLToPath(import.meta.url)));
  } catch {
    // import.meta.url unavailable in some test runners — skip
  }
  startDirs.push(homedir());
  for (const startDir of startDirs) {
    let dir = startDir;
    while (true) {
      const candidate = join(dir, MPT_DRIVER_RELATIVE);
      if (existsSync(candidate)) return candidate;
      const parent = dirname(dir);
      if (parent === dir) break; // filesystem root
      dir = parent;
    }
  }
  return null;
}

export interface MptInstallResult {
  ok: boolean;
  dir: string | null;
  detail: string;
}

/**
 * One-time, opt-in install of the MPT checkout into the cache dir OUTSIDE the
 * repo: clone the repo, create a python 3.13 venv with `uv`, `uv pip install`
 * the requirements, and copy `config.example.toml` -> `config.toml`. Boundary-
 * safe: runs git/uv/cp as subprocesses, never imports MPT. Idempotent: the
 * clone is skipped when the checkout exists; the venv + deps are skipped when
 * the venv python already resolves.
 *
 * Requires `git` and `uv` on PATH. The install downloads ~1GB of python deps;
 * the timeout is generous.
 */
export async function installMptProject(): Promise<MptInstallResult> {
  const dir = resolveMptProjectDir() ?? defaultMptCacheDir();

  // 1. Clone the repo into the cache dir if the checkout is absent.
  if (!existsSync(join(dir, SENTINEL))) {
    const clone = await runCapture(
      "git",
      ["clone", "--depth", "1", MPT_REPO_URL, dir],
      { timeoutMs: 300_000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } },
    );
    if (clone.timedOut) {
      return { ok: false, dir, detail: "git clone timed out (300s)" };
    }
    if (clone.code !== 0 || !existsSync(join(dir, SENTINEL))) {
      const tail = (clone.stderr || clone.stdout).trim().split("\n").slice(-3);
      return {
        ok: false,
        dir,
        detail: `git clone exit ${clone.code}: ${tail.join(" | ") || "no output"}`,
      };
    }
  }

  // 2. Create the venv + install deps if the venv python is absent.
  const python = mptVenvPython(dir);
  if (!existsSync(python)) {
    const venv = await runCapture("uv", ["venv", "--python", "3.13", ".venv"], {
      cwd: dir,
      timeoutMs: 180_000,
    });
    if (venv.code !== 0 || !existsSync(python)) {
      const tail = (venv.stderr || venv.stdout).trim().split("\n").slice(-3);
      return {
        ok: false,
        dir,
        detail: `uv venv exit ${venv.code}: ${tail.join(" | ") || "no output"}`,
      };
    }
    const pip = await runCapture(
      "uv",
      ["pip", "install", "-r", "requirements.txt", "--python", python],
      { cwd: dir, timeoutMs: 600_000 },
    );
    if (pip.timedOut) {
      return { ok: false, dir, detail: "uv pip install timed out (600s)" };
    }
    if (pip.code !== 0 || !isMptProjectInstalled(dir)) {
      const tail = (pip.stderr || pip.stdout).trim().split("\n").slice(-3);
      return {
        ok: false,
        dir,
        detail: `uv pip install exit ${pip.code}: ${tail.join(" | ") || "no output"}`,
      };
    }
  }

  // 3. Seed config.toml (key-free defaults: subtitle_provider=edge) if absent.
  if (!existsSync(join(dir, "config.toml"))) {
    await runCapture("cp", ["config.example.toml", "config.toml"], {
      cwd: dir,
      timeoutMs: 10_000,
    });
  }

  return { ok: true, dir, detail: "installed (clone + venv + deps)" };
}
