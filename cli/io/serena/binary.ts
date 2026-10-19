import { execFileSync } from "node:child_process";

/**
 * `uv` arguments that install the Serena binary the MCP transport invokes
 * (`command: "serena"`). Mirrors migration 009's `uv tool install` flow.
 */
const SERENA_INSTALL_UV_ARGS = [
  "tool",
  "install",
  "-p",
  "3.13",
  "serena-agent@latest",
  "--prerelease=allow",
] as const;

/** Human-readable form of {@link SERENA_INSTALL_UV_ARGS} for hints/doctor. */
export const SERENA_INSTALL_HINT = `uv ${SERENA_INSTALL_UV_ARGS.join(" ")}`;

/** Max wall-clock for `uv tool install` (cold runs fetch Python + serena). */
const SERENA_INSTALL_TIMEOUT_MS = 300_000;
const PROBE_TIMEOUT_MS = 5_000;

function probeCommand(command: string, args: string[]): boolean {
  try {
    execFileSync(command, args, {
      stdio: "ignore",
      timeout: PROBE_TIMEOUT_MS,
    });
    return true;
  } catch {
    return false;
  }
}

/** True when the `serena` binary is invokable on PATH. */
export function isSerenaBinaryAvailable(): boolean {
  return probeCommand("serena", ["--version"]);
}

/** True when the `uv` package manager is invokable on PATH. */
export function isUvAvailable(): boolean {
  return probeCommand("uv", ["--version"]);
}

export type SerenaBinaryOutcome =
  | { status: "present" }
  | { status: "installed" }
  | { status: "installed-not-on-path" }
  | { status: "install-failed"; error: string }
  | { status: "uv-missing" };

/**
 * Best-effort guarantee that the `serena` binary exists on PATH.
 *
 * Migration 009 switched the Serena MCP transport to `command: "serena"`, which
 * assumes a globally-installed binary. When it is missing (common on Windows /
 * fresh machines) the MCP server fails with an opaque `-32001` timeout. This
 * closes that gap by self-installing via `uv` when possible.
 *
 *  - `present`        — already on PATH; no-op.
 *  - `installed`      — installed via `uv` and verified on PATH.
 *  - `installed-not-on-path` — `uv` succeeded, but the binary is not runnable
 *                              from the current environment.
 *  - `install-failed` — `uv` present but the install errored (network, etc.).
 *  - `uv-missing`     — neither `serena` nor `uv` available; cannot self-install.
 *
 * Never throws — callers decide how to surface the outcome. `onInstallStart`
 * fires immediately before the (potentially slow) install so callers can log.
 */
export function ensureSerenaBinary(opts?: {
  onInstallStart?: () => void;
}): SerenaBinaryOutcome {
  if (isSerenaBinaryAvailable()) return { status: "present" };
  if (!isUvAvailable()) return { status: "uv-missing" };

  opts?.onInstallStart?.();
  try {
    execFileSync("uv", [...SERENA_INSTALL_UV_ARGS], {
      stdio: "ignore",
      timeout: SERENA_INSTALL_TIMEOUT_MS,
    });
    return isSerenaBinaryAvailable()
      ? { status: "installed" }
      : { status: "installed-not-on-path" };
  } catch (err) {
    return {
      status: "install-failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
