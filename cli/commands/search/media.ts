import { spawn } from "node:child_process";
import type { FetchContext, FetchResult } from "./types.js";

/**
 * Media extraction — wraps yt-dlp (supports ~1,858 sites).
 * YouTube auto-subtitles in 100+ languages; other sites expose
 * subtitles only when the provider publishes them.
 */

interface YtDlpOptions {
  subtitles?: boolean;
  subLangs?: string[];
  format?: string;
}

function ytDlpBinary(): string {
  return process.env.OMA_YTDLP ?? "yt-dlp";
}

async function runYtDlp(
  args: string[],
  ctx: FetchContext,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(ytDlpBinary(), args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    const onAbort = () => child.kill("SIGTERM");
    ctx.signal?.addEventListener("abort", onAbort);
    child.on("close", (code) => {
      ctx.signal?.removeEventListener("abort", onAbort);
      resolve({ code, stdout, stderr });
    });
    child.on("error", (err) => {
      ctx.signal?.removeEventListener("abort", onAbort);
      resolve({
        code: -1,
        stdout,
        stderr: `${stderr}\nspawn_error:${err.message}`,
      });
    });
  });
}

export async function fetchMedia(
  url: URL,
  ctx: FetchContext,
  options: YtDlpOptions = {},
): Promise<FetchResult> {
  const started = performance.now();
  const args = ["--dump-json", "--no-warnings", "--skip-download"];
  if (options.format) args.push("-f", options.format);
  if (options.subtitles) {
    args.push("--write-sub", "--write-auto-sub", "--sub-format", "vtt");
    if (options.subLangs?.length) {
      args.push("--sub-lang", options.subLangs.join(","));
    }
  }
  args.push(url.toString());

  const { code, stdout, stderr } = await runYtDlp(args, ctx);
  const elapsedMs = Math.round(performance.now() - started);

  if (code === null || code !== 0) {
    const normalized = stderr.trim();
    if (/executable not found|ENOENT/i.test(normalized)) {
      return {
        url: url.toString(),
        status: "error",
        strategy: "api",
        platform: "media",
        content: "",
        elapsedMs,
        signals: [],
        error:
          "yt-dlp not installed. Install via `pip install yt-dlp` or `brew install yt-dlp`.",
      };
    }
    return {
      url: url.toString(),
      status: "error",
      strategy: "api",
      platform: "media",
      content: stdout,
      elapsedMs,
      signals: [],
      error: normalized || `yt-dlp exited with code ${code}`,
    };
  }

  return {
    url: url.toString(),
    status: "ok",
    strategy: "api",
    platform: "media",
    content: stdout.trim(),
    contentType: "application/json",
    elapsedMs,
    signals: [],
  };
}
