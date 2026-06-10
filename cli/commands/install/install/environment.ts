import { readFileSync } from "node:fs";

export type InstallOptions = {
  /**
   * Non-interactive mode. Skips every prompt and falls back to safe
   * defaults (language=existing|en, model_preset=existing|claude,
   * project_type=all, vendors=all non-HOME-base). HOME-base vendor consent
   * stays opt-in (skipped), competitor uninstall is skipped, GitHub star
   * prompt is skipped.
   *
   * Also activated by `OMA_YES=1` or `CI=true` env vars.
   */
  yes?: boolean;
};

/**
 * True when the user explicitly opted into "yes to everything" via the
 * `--yes` flag or `OMA_YES` env. Distinct from CI auto-detection because
 * explicit opt-in also enables affirmative side-effects (e.g. GitHub star).
 */
export function isExplicitYes(options: InstallOptions = {}): boolean {
  if (options.yes) return true;
  if (process.env.OMA_YES === "1" || process.env.OMA_YES === "true")
    return true;
  return false;
}

export function isNonInteractive(options: InstallOptions = {}): boolean {
  if (isExplicitYes(options)) return true;
  if (process.env.CI === "true" || process.env.CI === "1") return true;
  return false;
}

/**
 * Detects if the current process is running inside Windows Subsystem for Linux
 * by checking the Microsoft/WSL signature in /proc/version.
 */
export function detectWsl(
  readProcVersion: () => string = () => readFileSync("/proc/version", "utf-8"),
): boolean {
  if (process.platform !== "linux") return false;
  try {
    return /microsoft|wsl/i.test(readProcVersion());
  } catch {
    return false;
  }
}
