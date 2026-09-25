import { spawn } from "node:child_process";
import { chmodSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { SERENA_ASSETS } from "../../io/serena-adapter.js";
import {
  daemonKey,
  detachClient,
  ensureSerenaDaemon,
  resolveProjectRoot,
} from "../../io/serena-daemon.js";
import { prepareSerenaRuntime } from "../../io/serena-managed-runtime.js";
import { serenaTransportMode } from "../../utils/config.js";
import { validateSerenaConfigs } from "../bridge/serena-config.js";

export interface DartCheckOptions {
  project: string;
  dartSdk?: string;
  timeout: string;
  staged?: boolean;
}

export async function checkDart(options: DartCheckOptions): Promise<number> {
  const root = realpathSync(resolveProjectRoot(process.cwd()));
  const key = daemonKey(root, "oma");
  try {
    if (serenaTransportMode(root) !== "bridge")
      throw new Error(
        "oma serena check requires serena.mode: bridge to reuse the shared server",
      );
    const seconds = Number(options.timeout);
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 120)
      throw new Error("--timeout must be between 1 and 120");
    const project =
      relative(root, realpathSync(resolve(root, options.project))) || ".";
    if (
      project === ".." ||
      project.startsWith("../") ||
      project.startsWith("..\\")
    )
      throw new Error("--project must be inside the repository");
    validateSerenaConfigs(root);
    const runtime = prepareSerenaRuntime(root, true);
    const sdk = options.dartSdk ? realpathSync(options.dartSdk) : runtime.sdk;
    if (!sdk || sdk !== runtime.sdk)
      throw new Error("--dart-sdk differs from the configured Serena SDK");
    const daemon = await ensureSerenaDaemon({
      root,
      context: "oma",
      runtimeRevision: runtime.runtimeRevision,
      timeoutMs: seconds * 1000,
    });
    if (!daemon || !runtime.adapter.python)
      throw new Error("Shared Serena is unavailable; run oma doctor");
    const args = [
      join(SERENA_ASSETS, "dart_check.py"),
      "--root",
      root,
      "--url",
      daemon.url,
      "--project",
      project,
      "--dart-sdk",
      sdk,
      "--timeout",
      String(seconds),
      ...(options.staged ? ["--staged"] : []),
    ];
    return await new Promise<number>((resolveResult, reject) => {
      const child = spawn(runtime.adapter.python as string, args, {
        cwd: root,
        stdio: "inherit",
      });
      const timer = setTimeout(
        () => child.kill("SIGKILL"),
        (seconds + 5) * 1000,
      );
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        resolveResult(code === 0 || code === 1 ? code : 2);
      });
    });
  } catch (error) {
    console.error(
      `Serena Dart check incomplete: ${error instanceof Error ? error.message : error}`,
    );
    return 2;
  } finally {
    detachClient(key);
  }
}

/** Migrate existing hooks to the managed CLI without building a local bundle. */
export function installDartCheckLauncher(
  path = join(homedir(), ".local/bin/oma-dart-check"),
  runtime = process.execPath,
  entrypoint = process.argv[1],
): string {
  if (process.platform === "win32")
    throw new Error("Use oma serena check directly on Windows");
  if (!entrypoint) throw new Error("OMA entrypoint was not found");
  const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `#!/bin/sh\nexec ${quote(runtime)} ${quote(realpathSync(entrypoint))} serena check "$@"\n`,
  );
  chmodSync(path, 0o755);
  return path;
}
