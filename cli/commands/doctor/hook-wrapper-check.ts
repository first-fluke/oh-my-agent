/**
 * Doctor check — oma-hook.sh binary resolvability (design 019 §T1-d).
 *
 * For each hook-model vendor, if `<projectDir>/<hookDir>/oma-hook.sh` is
 * present the check verifies that the oma binary is resolvable the same
 * way the wrapper does at runtime (any source is enough):
 *
 *   1. `$OMA_BIN`, when set to an executable
 *   2. `oma` on the current PATH
 *   3. The well-known install dirs the wrapper falls back to when PATH is
 *      minimal (both lists live in executableSearchPaths)
 *
 * Possible outcomes per vendor:
 *   - "skip"    — wrapper not installed (vendor not set up); check is silent / N/A.
 *   - "pass"    — oma is resolvable; hook will dispatch correctly.
 *   - "warning" — oma is NOT resolvable; reports advisory with remediation.
 *
 * Fail-open: this is a WARNING, never a hard error — the wrapper itself
 * exits 0 when oma is missing so the agent is never blocked.
 */

import { accessSync, existsSync, constants as fsConstants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { VARIANT_ROUTES } from "../hook/dispatch.js";

// ---------------------------------------------------------------------------
// Vendor → hookDir table — derived from the embedded variant route table so
// doctor coverage can never drift from what `oma hook` actually dispatches.
// antigravity is excluded: its `.agents/hooks.json` runs handlers directly via
// bun from `.agents/hooks/core` — no oma-hook.sh wrapper exists for it.
// ---------------------------------------------------------------------------

const PROJECT_HOOK_DIRS: Array<{ vendor: string; hookDir: string }> =
  Object.values(VARIANT_ROUTES)
    .filter((v) => v.vendor !== "antigravity")
    .map(({ vendor, hookDir }) => ({ vendor, hookDir }));

/** Filename written by generateOmaHookWrapper / installHooksFromVariant. */
const OMA_HOOK_WRAPPER_FILENAME = "oma-hook.sh";

// ---------------------------------------------------------------------------
// Binary resolution helpers (mirrors the wrapper's own resolution strategy)
// ---------------------------------------------------------------------------

function canExecute(filePath: string): boolean {
  try {
    accessSync(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Every directory the wrapper can find `oma` in: the current PATH first, then
 * the well-known install dirs it sweeps when PATH is minimal.
 *
 * Kept in sync with OMA_BIN_CANDIDATES in oma-hook-wrapper.ts — the mise
 * `installs/node/<version>` glob is the one candidate not expressible here, so
 * a mise-without-shims install can still warn while the hook works.
 */
function executableSearchPaths(env: NodeJS.ProcessEnv): string[] {
  const home = homedir();
  return [
    ...(env.PATH ?? "").split(":"),
    join(home, ".bun", "bin"),
    join(home, ".local", "bin"),
    join(home, ".local", "share", "mise", "shims"),
    join(home, ".volta", "bin"),
    join(home, ".npm-global", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ].filter((p, i, arr) => p && arr.indexOf(p) === i);
}

/**
 * True when the wrapper can find an oma to run: `$OMA_BIN`, then `oma` in any
 * searched directory.
 */
function omaResolvable(env: NodeJS.ProcessEnv): boolean {
  const override = env.OMA_BIN;
  if (override && existsSync(override) && canExecute(override)) return true;

  for (const dir of executableSearchPaths(env)) {
    const candidate = join(dir, "oma");
    if (existsSync(candidate) && canExecute(candidate)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type HookWrapperCheckStatus = "skip" | "pass" | "warning";

export interface HookWrapperCheck {
  vendor: string;
  wrapperPath: string;
  status: HookWrapperCheckStatus;
  /** Human-readable remediation hint, present when status === "warning". */
  remediation?: string;
}

// ---------------------------------------------------------------------------
// Per-vendor check
// ---------------------------------------------------------------------------

function checkWrapper(
  vendor: string,
  wrapperPath: string,
  env: NodeJS.ProcessEnv,
): HookWrapperCheck {
  if (!existsSync(wrapperPath)) {
    return { vendor, wrapperPath, status: "skip" };
  }

  if (omaResolvable(env)) {
    return { vendor, wrapperPath, status: "pass" };
  }

  return {
    vendor,
    wrapperPath,
    status: "warning",
    remediation:
      "Hooks can't find oma — reinstall it, or set OMA_BIN to its path",
  };
}

// ---------------------------------------------------------------------------
// Public collector
// ---------------------------------------------------------------------------

/**
 * Collect oma-hook.sh resolvability checks for all hook-model vendors.
 *
 * @param projectDir - The project root (process.cwd() in normal usage).
 * @param env - Process environment; defaults to `process.env`.
 *   Override in tests to control PATH and env vars.
 */
export function collectHookWrapperChecks(
  projectDir: string,
  env: NodeJS.ProcessEnv = process.env,
): HookWrapperCheck[] {
  const checks: HookWrapperCheck[] = [];

  for (const { vendor, hookDir } of PROJECT_HOOK_DIRS) {
    const wrapperPath = join(
      projectDir,
      ...hookDir.split("/"),
      OMA_HOOK_WRAPPER_FILENAME,
    );
    checks.push(checkWrapper(vendor, wrapperPath, env));
  }

  return checks;
}
