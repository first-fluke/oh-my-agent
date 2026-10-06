import { dirname, resolve } from "node:path";
import { resolveOmaInvocation } from "../utils/oma-invocation.js";

/**
 * Absolute argv that re-runs the oma currently executing: the runtime binary
 * plus its entry script.
 *
 * Background services must not resolve bare `oma` through their own PATH: a
 * service PATH has no version-manager shims (mise, nvm, …), so it can land on
 * a stale global install. The entry is made absolute because a service runs
 * from another working directory. Installers re-render on each run, so a
 * moved or upgraded install is repointed the next time oma installs the
 * service.
 */
export function currentOmaInvocation(
  execPath: string = process.execPath,
  script: string | undefined = process.argv[1],
): string[] {
  const { command, prefixArgs } = resolveOmaInvocation(execPath, script);
  return [command, ...prefixArgs.map((arg) => resolve(arg))];
}

/** Service PATH with the pinned runtime's directory first. */
export function pinnedServicePath(
  invocation: readonly string[],
  fallbackPath: string,
): string {
  const [bin] = invocation;
  if (!bin || bin === "oma") return fallbackPath;
  return `${dirname(bin)}:${fallbackPath}`;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** launchd `ProgramArguments` entries for the invocation plus `args`. */
export function launchdProgramArguments(
  invocation: readonly string[],
  args: readonly string[],
): string {
  return [...invocation, ...args]
    .map((arg) => `<string>${escapeXml(arg)}</string>`)
    .join("");
}

/** systemd `ExecStart` value; every word is quoted so paths may hold spaces. */
export function systemdExecStart(
  invocation: readonly string[],
  args: readonly string[],
): string {
  const words = [...invocation, ...args].map(
    (arg) => `"${arg.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
  );
  // A bare `oma` fallback still needs a PATH lookup, which ExecStart lacks.
  return invocation[0] === "oma"
    ? `/usr/bin/env ${words.join(" ")}`
    : words.join(" ");
}

/** Windows Task Scheduler `<Command>` / `<Arguments>` pair. */
export function windowsTaskExec(
  invocation: readonly string[],
  args: readonly string[],
): { command: string; arguments: string } {
  const [command = "oma", ...rest] = invocation;
  return {
    command: escapeXml(command),
    arguments: escapeXml([...rest.map((arg) => `"${arg}"`), ...args].join(" ")),
  };
}
