// Subprocess + binary-discovery helpers, intentionally local to the video
// slice: commands/<x> must not import from commands/<y> (see cli/ARCHITECTURE.md).
// The image slice has a near-identical `runCapture`; duplicating ~30 lines here
// keeps the boundary clean instead of reaching across to image's provider code.
import { spawn } from "node:child_process";

export interface Captured {
  code: number;
  stdout: string;
  stderr: string;
  signal?: NodeJS.Signals | null;
  timedOut?: boolean;
}

export interface RunCaptureOptions {
  cwd?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

/**
 * Spawn a binary and capture its output without ever throwing. Mirrors the
 * image slice contract: `code: 124` + `timedOut` on timeout, `code` from the
 * child otherwise. stdio is fully buffered (no inherited streams) so callers
 * can parse `--format json` output deterministically.
 */
export function runCapture(
  bin: string,
  args: string[],
  options: RunCaptureOptions = {},
): Promise<Captured> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: options.cwd,
      signal: options.signal,
      env: options.env ?? process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    const timer = options.timeoutMs
      ? setTimeout(() => {
          child.kill("SIGTERM");
          resolve({ code: 124, stdout, stderr, timedOut: true });
        }, options.timeoutMs)
      : null;
    timer?.unref?.();
    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: stderr || (err as Error).message });
    });
    child.on("close", (code, sig) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr, signal: sig });
    });
  });
}

/** True when the binary resolves and exits 0 for the given probe args. */
export async function binaryAvailable(
  bin: string,
  args: string[] = ["--version"],
  timeoutMs = 5000,
): Promise<{ ok: boolean; detail: string }> {
  const res = await runCapture(bin, args, { timeoutMs });
  if (res.timedOut) return { ok: false, detail: "probe timed out" };
  if (res.code === 0) {
    return {
      ok: true,
      detail: (res.stdout || res.stderr).trim().split("\n")[0] ?? "",
    };
  }
  return { ok: false, detail: res.stderr.trim() || `exit ${res.code}` };
}

/**
 * Resolve the `oma` CLI entrypoint used to call sibling commands (image, slide)
 * as deterministic subprocesses. Cross-slice composition via the CLI surface —
 * not a TS import — is the boundary-safe way to reuse another slice's logic.
 *
 * Order: `OMA_VIDEO_OMA_BIN` env override → the running entrypoint
 * (`process.argv[1]`) when it looks like an oma build → `oma` on PATH.
 */
export function resolveOmaInvocation(): { bin: string; prefixArgs: string[] } {
  const override = process.env.OMA_VIDEO_OMA_BIN;
  if (override && override.trim().length > 0) {
    return { bin: override.trim(), prefixArgs: [] };
  }
  const entry = process.argv[1];
  if (
    entry &&
    /(?:^|[\\/])(?:cli\.ts|cli\.js|oma)(?:\.[cm]?[jt]s)?$/.test(entry)
  ) {
    return { bin: process.execPath, prefixArgs: [entry] };
  }
  return { bin: "oma", prefixArgs: [] };
}
