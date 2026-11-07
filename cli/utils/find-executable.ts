import { accessSync, existsSync, constants as fsConstants } from "node:fs";
import { join } from "node:path";

// Cross-platform executable lookup for doctor-style presence checks.
// POSIX: PATH is ':'-separated and the file must carry the execute bit.
// Windows: PATH is ';'-separated (and may be spelled `Path`), drive letters
// contain ':', and launchers live under PATHEXT names (oma.exe, foo.cmd) —
// splitting on ':' or probing the bare name never matches there.

export interface FindExecutableOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  /** Extra directories searched after PATH (e.g. well-known install dirs). */
  extraDirs?: string[];
}

function pathValue(env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string {
  if (platform !== "win32") return env.PATH ?? "";
  const key = Object.keys(env).find((k) => k.toUpperCase() === "PATH");
  return key ? (env[key] ?? "") : "";
}

export function executableSearchDirs(
  options: FindExecutableOptions = {},
): string[] {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const separator = platform === "win32" ? ";" : ":";
  return [
    ...pathValue(env, platform).split(separator),
    ...(options.extraDirs ?? []),
  ]
    .map((dir) => dir.trim().replace(/^"(.*)"$/, "$1"))
    .filter((dir, index, dirs) => dir && dirs.indexOf(dir) === index);
}

function executableNames(
  command: string,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): string[] {
  if (platform !== "win32") return [command];
  const pathExt = (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .map((ext) => ext.trim().toLowerCase())
    .filter(Boolean);
  const lower = command.toLowerCase();
  if (pathExt.some((ext) => lower.endsWith(ext))) return [command];
  // Bare name last: Git Bash / MSYS shims (e.g. ~/.bun/bin/oma) are
  // extension-less but still runnable from the bash hook wrapper.
  return [...pathExt.map((ext) => `${command}${ext}`), command];
}

function isExecutable(path: string, platform: NodeJS.Platform): boolean {
  if (!existsSync(path)) return false;
  // Windows has no execute bit; X_OK degrades to an existence check there.
  if (platform === "win32") return true;
  try {
    accessSync(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function findExecutable(
  command: string,
  options: FindExecutableOptions = {},
): string | undefined {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const names = executableNames(command, env, platform);
  const hasDirectory =
    command.includes("/") || (platform === "win32" && command.includes("\\"));
  if (hasDirectory) {
    return names.find((name) => isExecutable(name, platform));
  }
  for (const dir of executableSearchDirs(options)) {
    for (const name of names) {
      const candidate = join(dir, name);
      if (isExecutable(candidate, platform)) return candidate;
    }
  }
  return undefined;
}
