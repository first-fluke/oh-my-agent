/**
 * Module-singleton install context for oma install / update commands.
 *
 * Resolution priority: OMA_HOME > --global / OMA_INSTALL_GLOBAL=1 > process.cwd()
 *
 * The singleton is populated once per process by the commander `preAction` hook
 * at bootstrap and consumed by all downstream install / link / update functions
 * via `getInstallRoot()` / `getInstallMode()`.
 */

import * as fs from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

export type InstallMode = "project" | "global";

export type InstallContext = {
  installRoot: string;
  mode: InstallMode;
};

let _ctx: InstallContext | null = null;

export function setInstallContext(ctx: InstallContext): void {
  if (_ctx) throw new Error("install context already set in this process");
  _ctx = ctx;
}

export function getInstallContext(): InstallContext {
  if (_ctx === null) {
    throw new Error(
      "install context not set — entry point must call setInstallContext()",
    );
  }
  return _ctx;
}

export function getInstallRoot(): string {
  return getInstallContext().installRoot;
}

export function getInstallMode(): InstallMode {
  return getInstallContext().mode;
}

/**
 * Like {@link getInstallMode} but never throws: returns `"project"` when the
 * install context has not been set yet (early bootstrap or unit tests that
 * don't initialise it). Use at call sites that must degrade gracefully rather
 * than fail when the context is absent.
 */
export function safeGetInstallMode(): InstallMode {
  try {
    return getInstallMode();
  } catch {
    return "project";
  }
}

/**
 * Like {@link getInstallRoot} but never throws: returns `process.cwd()` when
 * the install context has not been set yet (early bootstrap or unit tests that
 * don't initialise it). Use at call sites that must degrade gracefully rather
 * than fail when the context is absent — note this mirrors the project-mode
 * default of {@link resolveInstallContext}.
 */
export function safeGetInstallRoot(): string {
  try {
    return getInstallRoot();
  } catch {
    return process.cwd();
  }
}

/** Test-only — resets the module-level singleton between vitest cases. */
export function _resetInstallContext(): void {
  _ctx = null;
}

export function resolveInstallContext(opts: {
  global?: boolean;
}): InstallContext {
  const omaHome = process.env.OMA_HOME;
  const isGlobal =
    opts.global === true || process.env.OMA_INSTALL_GLOBAL === "1";

  if (omaHome !== undefined && omaHome !== "") {
    validateOmaHome(omaHome);
    return {
      installRoot: omaHome,
      mode: isGlobal ? "global" : "project",
    };
  }

  if (isGlobal) {
    return { installRoot: homedir(), mode: "global" };
  }

  return { installRoot: process.cwd(), mode: "project" };
}

const FORBIDDEN_OMA_HOME_PREFIXES = [
  "/etc",
  "/usr",
  "/bin",
  "/boot",
  "/sys",
  "/proc",
] as const;

export function validateOmaHome(p: string): void {
  if (!path.isAbsolute(p)) {
    throw new Error("OMA_HOME must be absolute path");
  }

  // Pre-realpath deny check — catches symlinks like macOS /etc → /private/etc
  // where the realpath would not match the deny-list literal.
  for (const pf of FORBIDDEN_OMA_HOME_PREFIXES) {
    if (p === pf || p.startsWith(pf + path.sep)) {
      throw new Error(`OMA_HOME=${p} is forbidden (system path ${pf})`);
    }
  }

  let real: string;
  try {
    real = fs.realpathSync(p);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`OMA_HOME=${p}: ${msg}`);
  }

  // Post-realpath deny check — catches symlinks pointing INTO system paths.
  for (const pf of FORBIDDEN_OMA_HOME_PREFIXES) {
    if (real === pf || real.startsWith(pf + path.sep)) {
      throw new Error(`OMA_HOME=${real} is forbidden (system path ${pf})`);
    }
  }

  try {
    fs.accessSync(real, fs.constants.W_OK);
  } catch {
    throw new Error(`OMA_HOME=${real} is not writable`);
  }
}
