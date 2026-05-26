/**
 * fetch-video.ts — oma slide fetch-video <url> --dir [--output-name]
 *
 * Downloads a video via yt-dlp into <dir>/assets/ and prints the
 * ./assets/<file> reference for the user to embed in their slide HTML.
 *
 * Reuses the yt-dlp spawn pattern from cli/commands/search/media.ts.
 * yt-dlp respects OMA_YTDLP env var for custom binary path.
 *
 * Exit codes: 0 ok · 1 error · 4 invalid-input · 6 timeout
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import color from "picocolors";
import { resolveWorkspace } from "./workspace.js";

// ─── yt-dlp helpers ────────────────────────────────────────────────────────────

function ytDlpBinary(): string {
  return process.env.OMA_YTDLP ?? "yt-dlp";
}

/** Check if yt-dlp is available by spawning --version. */
async function isYtDlpAvailable(): Promise<boolean> {
  return new Promise((res) => {
    const child = spawn(ytDlpBinary(), ["--version"], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    child.on("error", () => res(false));
    child.on("close", (code) => res(code === 0));
  });
}

interface YtDlpResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

async function runYtDlp(args: string[]): Promise<YtDlpResult> {
  return new Promise((res) => {
    const child = spawn(ytDlpBinary(), args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      res({
        code: -1,
        stdout,
        stderr: `${stderr}\nspawn_error:${err.message}`,
      });
    });
    child.on("close", (code) => res({ code, stdout, stderr }));
  });
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export interface FetchVideoOptions {
  url: string;
  dir?: string;
  outputName?: string;
}

export async function runSlideFetchVideo(
  opts: FetchVideoOptions,
): Promise<number> {
  const { url } = opts;

  // Validate URL minimally
  if (!url?.trim()) {
    console.error(color.red("URL is required."));
    return 4;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    // Ensure it's an http/https URL (not file:// or arbitrary schemes)
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
    }
  } catch (err) {
    console.error(color.red(`Invalid URL: ${(err as Error).message}`));
    return 4;
  }

  // Resolve workspace — dir is optional; default to cwd/assets if not set
  let assetsDir: string;
  if (opts.dir) {
    let ws: ReturnType<typeof resolveWorkspace>;
    try {
      ws = resolveWorkspace(opts.dir);
    } catch (err) {
      console.error(color.red((err as Error).message));
      return 4;
    }
    assetsDir = join(ws.dir, "assets");
  } else {
    // No --dir provided: place into a local assets/ folder in cwd
    assetsDir = resolve(process.cwd(), "assets");
  }

  mkdirSync(assetsDir, { recursive: true });

  // Check yt-dlp availability
  const ytDlpOk = await isYtDlpAvailable();
  if (!ytDlpOk) {
    console.error(
      color.red(
        "yt-dlp not found. Install with: pip install yt-dlp  OR  brew install yt-dlp",
      ),
    );
    console.error(
      color.dim(
        "  Alternatively, set the OMA_YTDLP env var to the binary path.",
      ),
    );
    return 1;
  }

  console.log(color.bold(`Fetching video: ${parsedUrl.toString()}`));
  console.log(color.dim(`  Output directory: ${assetsDir}`));

  // Build yt-dlp args
  // --no-playlist: avoid accidentally downloading a full playlist
  // --restrict-filenames: safe ASCII filenames (no spaces/special chars)
  // -o: template for output name
  const outputTemplate = opts.outputName
    ? join(assetsDir, opts.outputName)
    : join(assetsDir, "%(title)s.%(ext)s");

  const args = [
    "--no-playlist",
    "--restrict-filenames",
    "-o",
    outputTemplate,
    parsedUrl.toString(),
  ];

  // First, get the expected filename via --print filename (dry-run)
  const dryArgs = [
    "--no-playlist",
    "--restrict-filenames",
    "--print",
    "filename",
    "-o",
    outputTemplate,
    parsedUrl.toString(),
  ];

  let expectedFilename: string | null = null;
  try {
    const dryResult = await runYtDlp(dryArgs);
    if (dryResult.code === 0) {
      expectedFilename = dryResult.stdout.trim().split("\n")[0] ?? null;
    }
  } catch {
    // Dry-run failed — proceed with download, we'll find the file after
  }

  // Download the video
  const result = await runYtDlp(args);

  if (result.code !== 0) {
    const stderr = result.stderr.trim();
    if (
      /executable not found|ENOENT/i.test(stderr) ||
      /spawn_error/.test(stderr)
    ) {
      console.error(
        color.red(
          "yt-dlp not found. Install with: pip install yt-dlp  OR  brew install yt-dlp",
        ),
      );
      return 1;
    }
    console.error(color.red(`yt-dlp failed (exit ${result.code}):`));
    if (stderr) console.error(color.dim(stderr));
    return 1;
  }

  // Find the downloaded file(s) in assetsDir
  let downloadedFile: string | null = null;

  if (expectedFilename && existsSync(expectedFilename)) {
    downloadedFile = expectedFilename;
  }

  if (!downloadedFile) {
    // Parse yt-dlp stdout for "[download] Destination:" or "[Merger] Merging..."
    const destMatch = result.stdout.match(
      /\[download\] Destination: (.+)|Merging formats into "(.+)"/,
    );
    if (destMatch) {
      const candidate = (destMatch[1] ?? destMatch[2] ?? "").trim();
      if (candidate && existsSync(candidate)) {
        downloadedFile = candidate;
      }
    }
  }

  if (!downloadedFile) {
    // Last resort: look for the most-recently-modified file in assetsDir
    // (yt-dlp writes to assetsDir, so the new file should be there)
    try {
      const { readdirSync, statSync } = await import("node:fs");
      const files = readdirSync(assetsDir)
        .map((f) => ({
          f,
          mtime: statSync(join(assetsDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);
      if (files.length > 0 && files[0]) {
        downloadedFile = join(assetsDir, files[0].f);
      }
    } catch {
      // Ignore
    }
  }

  if (!downloadedFile) {
    console.warn(
      color.yellow(
        "  Download appears to have succeeded, but the output file could not be located.",
      ),
    );
    console.warn(color.dim(`  Check ${assetsDir} for the downloaded file.`));
    return 0;
  }

  // Print the ./assets/<file> reference for embedding in slides
  const fileName = basename(downloadedFile);
  const ref = `./assets/${fileName}`;

  console.log(color.green(`\nDownloaded: ${downloadedFile}`));
  console.log();
  console.log(color.bold("To embed in a slide:"));
  console.log(
    color.cyan(`  <video src="${ref}" controls autoplay muted loop></video>`),
  );
  console.log();
  console.log(color.dim(`  Local reference: ${ref}`));
  console.log(
    color.dim("  Note: videos cannot be inlined into single-file bundles."),
  );
  console.log(
    color.dim("  The bundle will warn if the deck contains video references."),
  );

  return 0;
}
