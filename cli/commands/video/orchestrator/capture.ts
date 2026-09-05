import { realpathSync } from "node:fs";
import { copyFile } from "node:fs/promises";
import path from "node:path";
import { CaptureRequiredError } from "../errors.js";
import { runCapture } from "../internal/exec.js";
import { collectAssetRecord } from "../manifest.js";
import { GuidedCaptureProvider } from "../providers/capture.js";
import { outputFileName } from "../types.js";
import type { RunContext } from "./run-context.js";

/** Demo recordings use guided capture and validated file ingestion. */
export async function handleCapture(
  cwd: string,
  ctx: RunContext,
): Promise<void> {
  await handleFileCapture(ctx.normalized.capture, cwd, ctx);
}

async function handleFileCapture(
  capturePath: string | undefined,
  cwd: string,
  ctx: RunContext,
): Promise<void> {
  const provider = new GuidedCaptureProvider(cwd);
  ctx.providers.capture = provider.id;
  if (!capturePath) {
    const guide = await provider.guide({ mode: "demo" });
    ctx.warnings.push(`capture: ${guide.message}`);
    throw new CaptureRequiredError(guide.message);
  }
  const footage = await provider.ingest(capturePath);
  ctx.capturedFootage = runRelative(ctx.runDir, footage.path);
  ctx.warnings.push(
    `capture: ingested human recording ${footage.path} (capture is performed by a human)`,
  );
}

/**
 * Raw demo output: the captured footage IS the deliverable. Copy it to a
 * stable output name in the run dir and record it as the output. No compositor
 * involved (raw default; --polish is the overlay path). Confined to the run
 * dir; the source footage already passed the capture-path guard.
 */
export async function emitRawDemoOutput(
  runDir: string,
  ctx: RunContext,
  slug?: string,
): Promise<void> {
  if (!ctx.capturedFootage) return;
  const src = path.resolve(runDir, ctx.capturedFootage);
  const outName = outputFileName({ composition: "Demo", slug });
  const dest = path.resolve(runDir, outName);
  if (src !== dest) {
    await copyFile(src, dest);
  }
  ctx.providers.compositor = "raw-capture";
  ctx.outputs.video = outName;
  const probed = await probeDurationSec(dest);
  if (probed !== null) ctx.outputs.durationSec = probed;
  const record = await collectAssetRecord(runDir, outName, ctx.normalized.seed);
  ctx.assets.push(record);
  ctx.outputs.sha256 = record.sha256;
}

/**
 * Run-dir-relative path for a captured footage file, robust to filesystem
 * canonicalization (e.g. macOS /var → /private/var). Canonicalizes both sides
 * before relativizing; returns the canonical absolute path only when the footage
 * genuinely lives outside the run dir.
 */
function runRelative(runDir: string, footagePath: string): string {
  const canonicalRun = realCanonical(runDir);
  const canonicalFootage = realCanonical(footagePath);
  const rel = path.relative(canonicalRun, canonicalFootage);
  return rel.startsWith("..") || path.isAbsolute(rel) ? canonicalFootage : rel;
}

function realCanonical(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

/** Read the real container duration via ffprobe; null when unavailable. */
async function probeDurationSec(absPath: string): Promise<number | null> {
  const res = await runCapture(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      absPath,
    ],
    { timeoutMs: 15_000 },
  );
  if (res.code !== 0) return null;
  const seconds = Number.parseFloat(res.stdout.trim());
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** Mask a URL for warnings/manifest: keep scheme+host+path, drop query/hash. */
export function maskUrl(value: string): string {
  try {
    const u = new URL(value);
    const auth = u.username ? "***@" : "";
    const query = u.search ? "?<redacted>" : "";
    const hash = u.hash ? "#<redacted>" : "";
    return `${u.protocol}//${auth}${u.host}${u.pathname}${query}${hash}`;
  } catch {
    return value
      .replace(/([?&][^=\s]+=)[^&\s]+/g, "$1<redacted>")
      .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "<redacted>");
  }
}
