// Shared by installed hooks and the CLI; no CLI or package dependencies.
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

function absoluteHome(value: string, variable: string): string {
  const hasControl = Array.from(value).some((char) => {
    const code = char.charCodeAt(0);
    return code < 32 || code === 127;
  });
  if (!isAbsolute(value) || hasControl) {
    throw new Error(
      `${variable} must be an absolute path without control characters`,
    );
  }
  return resolve(value);
}

/** OMA-owned global data. Project install locations and vendor HOME are separate. */
export function omaHome(
  env: NodeJS.ProcessEnv = process.env,
  homeDir = homedir(),
): string {
  return absoluteHome(env.OMA_HOME || join(homeDir, ".oma"), "OMA_HOME");
}

/** Explicit profile-only override; otherwise profiles share the OMA home. */
export function profileStateHome(
  env: NodeJS.ProcessEnv = process.env,
  homeDir = homedir(),
): string {
  return env.OMA_STATE_HOME === undefined
    ? omaHome(env, homeDir)
    : absoluteHome(env.OMA_STATE_HOME, "OMA_STATE_HOME");
}
