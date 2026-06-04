// Resolve a usable Playwright install + report its readiness, and drive a
// one-time cache install. Mirrors `remotion-project.ts` / `mpt-project.ts`.
//
// Boundary: the live web-capture driver (`resources/playwright/record.mjs`) runs
// as a SUBPROCESS under the resolved Playwright (its node_modules on NODE_PATH,
// its dir as cwd) — oma's CLI NEVER imports `playwright`. Locating an install on
// disk + verifying its chromium browser is the whole boundary.
//
// Resolution order (design 014 §6):
//   1. OMA_VIDEO_PLAYWRIGHT_DIR  — explicit override wins (its node_modules)
//   2. reuse: walk cwd / module-dir / homedir upward for a project whose
//      node_modules contains `playwright` (or `@playwright/test`) at/above the
//      minimum version, with a chromium browser already downloaded
//   3. cache: ~/.cache/oma-video/playwright (installed by doctor --install-playwright)
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCapture } from "./exec.js";

/** Minimum Playwright major.minor we accept for the reuse path. */
export const PLAYWRIGHT_MIN_VERSION = "1.40.0";

/** Run-relative path of the in-repo Playwright capture driver. */
export const PLAYWRIGHT_DRIVER_RELATIVE =
  ".agents/skills/oma-video/resources/playwright/record.mjs";

/** Default cache location for the doctor-installed Playwright — OUTSIDE the repo. */
export function defaultPlaywrightCacheDir(): string {
  return join(homedir(), ".cache", "oma-video", "playwright");
}

export interface PlaywrightProjectStatus {
  /** Absolute path of the dir whose node_modules holds the resolved Playwright. */
  dir: string | null;
  /** Where it came from: a reused project, the cache install, or nothing. */
  source: "reuse" | "cache" | null;
  /** Whether a chromium browser has been downloaded for that install. */
  browserReady: boolean;
  /** Resolved playwright version string, when discoverable. */
  version: string | null;
}

/** Compare two semver-ish `a.b.c` strings; -1 / 0 / 1. Non-numeric parts → 0. */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

/** Read the `version` from a package.json, or null when unreadable. */
function readPackageVersion(pkgJsonPath: string): string | null {
  try {
    const parsed = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as {
      version?: string;
    };
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the playwright (or @playwright/test) version installed under
 * `<dir>/node_modules`, or null when neither package is present. Prefers the
 * core `playwright` package; falls back to `@playwright/test`.
 */
export function playwrightVersionAt(dir: string): string | null {
  for (const pkg of ["playwright", join("@playwright", "test")]) {
    const pkgJson = join(dir, "node_modules", pkg, "package.json");
    if (existsSync(pkgJson)) {
      const version = readPackageVersion(pkgJson);
      if (version) return version;
    }
  }
  return null;
}

/**
 * True when a chromium browser has been downloaded for the Playwright install
 * rooted at `dir`. Playwright stores browsers in `<dir>/node_modules/.cache/ms-playwright`
 * (modern) or the global `~/.cache/ms-playwright` (PLAYWRIGHT_BROWSERS_PATH
 * default on Linux/mac). We accept either, keyed on a `chromium*` entry.
 */
export function playwrightBrowserReady(dir: string): boolean {
  const candidates = [
    join(dir, "node_modules", ".cache", "ms-playwright"),
    join(homedir(), ".cache", "ms-playwright"),
    join(homedir(), "Library", "Caches", "ms-playwright"),
  ];
  for (const browsersDir of candidates) {
    try {
      const entries = readdirSync(browsersDir);
      if (entries.some((name) => /^chromium/.test(name))) return true;
    } catch {
      // dir absent — try the next candidate
    }
  }
  return false;
}

/** True when `dir` has a usable, version-checked Playwright install. */
function isUsablePlaywrightDir(dir: string): boolean {
  const version = playwrightVersionAt(dir);
  if (!version) return false;
  return compareVersions(version, PLAYWRIGHT_MIN_VERSION) >= 0;
}

/**
 * Walk upward from `startDir` for the nearest ancestor whose `node_modules`
 * holds an acceptable Playwright. Returns that dir, or null.
 */
function walkUpForPlaywright(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    if (existsSync(join(dir, "node_modules")) && isUsablePlaywrightDir(dir)) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break; // filesystem root
    dir = parent;
  }
  return null;
}

/**
 * Resolve a usable Playwright install dir + where it came from. Layout-agnostic:
 * works from the repo root, `cli/`, a bundled `cli/bin/`, or any nested cwd.
 * The override and reuse paths must pass the min-version check; the cache path
 * is whatever doctor installed.
 */
export function getPlaywrightStatus(): PlaywrightProjectStatus {
  // 1. Explicit override — accepted only when it actually holds Playwright.
  const override = process.env.OMA_VIDEO_PLAYWRIGHT_DIR?.trim();
  if (override && override.length > 0) {
    const version = playwrightVersionAt(override);
    if (version) {
      return {
        dir: override,
        source: "reuse",
        browserReady: playwrightBrowserReady(override),
        version,
      };
    }
    return { dir: null, source: null, browserReady: false, version: null };
  }

  // 2. Reuse: upward-walk from cwd / module-dir / homedir.
  const startDirs: string[] = [process.cwd()];
  try {
    startDirs.push(dirname(fileURLToPath(import.meta.url)));
  } catch {
    // import.meta.url unavailable in some test runners — skip
  }
  for (const startDir of startDirs) {
    const found = walkUpForPlaywright(startDir);
    if (found) {
      return {
        dir: found,
        source: "reuse",
        browserReady: playwrightBrowserReady(found),
        version: playwrightVersionAt(found),
      };
    }
  }

  // 3. Cache: the doctor-installed Playwright outside the repo.
  const cache = defaultPlaywrightCacheDir();
  const cacheVersion = playwrightVersionAt(cache);
  if (cacheVersion) {
    return {
      dir: cache,
      source: "cache",
      browserReady: playwrightBrowserReady(cache),
      version: cacheVersion,
    };
  }

  return { dir: null, source: null, browserReady: false, version: null };
}

/**
 * Resolve the in-repo Playwright driver script (`resources/playwright/record.mjs`).
 * The driver ships with the oma-video skill (in-repo, boundary-safe). Upward
 * walk mirrors the Remotion / MPT resolvers.
 */
export function resolvePlaywrightDriverPath(): string | null {
  const override = process.env.OMA_VIDEO_PLAYWRIGHT_DRIVER?.trim();
  if (override && override.length > 0) {
    return existsSync(override) ? override : null;
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
      const candidate = join(dir, PLAYWRIGHT_DRIVER_RELATIVE);
      if (existsSync(candidate)) return candidate;
      const parent = dirname(dir);
      if (parent === dir) break; // filesystem root
      dir = parent;
    }
  }
  return null;
}

export interface PlaywrightInstallResult {
  ok: boolean;
  dir: string | null;
  detail: string;
}

/**
 * One-time, opt-in install of Playwright into the cache dir OUTSIDE the repo:
 * `npm i playwright` then `npx playwright install chromium`. Boundary-safe:
 * runs npm/npx as subprocesses, never imports Playwright. Idempotent: the deps
 * install is a near no-op when present; `playwright install chromium` is a
 * no-op when the browser is already downloaded.
 *
 * If a usable Playwright is already resolvable via reuse/override, that is
 * reported as ready without touching the cache.
 */
export async function installPlaywright(): Promise<PlaywrightInstallResult> {
  // Already resolvable (override/reuse) + browser ready — nothing to do.
  const existing = getPlaywrightStatus();
  if (existing.dir && existing.source === "reuse" && existing.browserReady) {
    return {
      ok: true,
      dir: existing.dir,
      detail: `reusing project Playwright ${existing.version ?? ""}`.trim(),
    };
  }

  const dir = defaultPlaywrightCacheDir();

  // 1. Install the `playwright` package into the cache dir if absent/outdated.
  if (!isUsablePlaywrightDir(dir)) {
    // `npm init`/`npm i` run with `cwd: dir`; npm does not create its working
    // directory, so the cache dir must exist first (critical on a fresh machine).
    mkdirSync(dir, { recursive: true });
    // `npm i` needs a package.json to anchor the install in the cache dir.
    await runCapture("npm", ["init", "-y"], {
      cwd: dir,
      timeoutMs: 30_000,
      env: process.env,
    }).catch(() => undefined);
    const deps = await runCapture(
      "npm",
      ["install", "--no-audit", "--no-fund", "playwright"],
      {
        cwd: dir,
        timeoutMs: 600_000,
        env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" },
      },
    );
    if (deps.timedOut) {
      return {
        ok: false,
        dir,
        detail: "npm install playwright timed out (600s)",
      };
    }
    if (deps.code !== 0 || !playwrightVersionAt(dir)) {
      const tail = (deps.stderr || deps.stdout).trim().split("\n").slice(-3);
      return {
        ok: false,
        dir,
        detail: `npm install playwright exit ${deps.code}: ${tail.join(" | ") || "no output"}`,
      };
    }
  }

  // 2. Download the chromium browser if absent.
  if (!playwrightBrowserReady(dir)) {
    const browser = await runCapture(
      "npx",
      ["playwright", "install", "chromium"],
      { cwd: dir, timeoutMs: 600_000, env: process.env },
    );
    if (browser.timedOut) {
      return {
        ok: false,
        dir,
        detail: "playwright install chromium timed out (600s)",
      };
    }
    if (browser.code !== 0 || !playwrightBrowserReady(dir)) {
      const tail = (browser.stderr || browser.stdout)
        .trim()
        .split("\n")
        .slice(-3);
      return {
        ok: false,
        dir,
        detail: `playwright install chromium exit ${browser.code}: ${tail.join(" | ") || "no output"}`,
      };
    }
  }

  return { ok: true, dir, detail: "installed (playwright + chromium)" };
}
