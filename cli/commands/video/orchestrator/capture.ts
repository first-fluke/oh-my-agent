import { realpathSync } from "node:fs";
import { copyFile } from "node:fs/promises";
import path from "node:path";
import { messageForError } from "../errors.js";
import { runCapture } from "../internal/exec.js";
import { collectAssetRecord } from "../manifest.js";
import { GuidedCaptureProvider } from "../providers/capture.js";
import { PlaywrightCaptureProvider } from "../providers/capture-playwright.js";
import { dimensionsForAspect } from "./render-spec.js";
import type { RunContext } from "./run-context.js";

/**
 * Demo-mode capture handling, dispatched on --source.
 *
 * `web` + `--url`: live, human-supervised headed capture via
 * PlaywrightCaptureProvider.record(). Real branch only when Playwright is
 * ready AND a stop mode exists — i.e. an interactive TTY for the ENTER prompt,
 * or a non-interactive `--capture-stop`. When neither holds (no TTY / CI /
 * Playwright unresolvable), we fall back to the guided protocol WITHOUT
 * hanging (key-optional, design §7).
 *
 * `file` (default): the guided provider absolutizes + $PWD-guards +
 * format-validates a --capture path, or surfaces the guided protocol.
 */
export async function handleCapture(
  cwd: string,
  ctx: RunContext,
): Promise<void> {
  const n = ctx.normalized;
  if (n.source === "web" && n.url) {
    await handleWebCapture(cwd, ctx);
    return;
  }
  await handleFileCapture(n.capture, cwd, ctx);
}

/** Live web capture branch with a non-hanging guided fallback. */
async function handleWebCapture(cwd: string, ctx: RunContext): Promise<void> {
  const n = ctx.normalized;
  const web = new PlaywrightCaptureProvider(cwd);

  // Non-interactive stop is provided OR we have an interactive TTY for ENTER.
  // Without either, the driver's interactive prompt could hang — so we refuse
  // the real branch and fall back to guided (no hang).
  const hasStop = Boolean(n.captureStop);
  const hasTty = Boolean(process.stdin.isTTY) && !n.yes;
  const availability = await web.available();

  if (!availability.ok || (!hasStop && !hasTty)) {
    const reason = !availability.ok
      ? (availability.reason ?? "Playwright unavailable")
      : "no interactive TTY for the ENTER stop (and no --capture-stop)";
    ctx.providers.capture = "cap";
    const guided = new GuidedCaptureProvider(cwd);
    const guide = await guided.guide({ mode: "demo" });
    ctx.warnings.push(
      `capture: web capture unavailable (${reason}); falling back to guided. ${guide.message}`,
    );
    return;
  }

  ctx.providers.capture = web.id;
  // Live capture is nondeterministic — outside the render-spec determinism
  // boundary; recorded in the manifest.
  ctx.nondeterministic = true;
  const size = captureSizeForAspect(n.aspect, n.device);
  try {
    const footage = await web.record({
      mode: "demo",
      source: "web",
      url: n.url,
      size,
      readySelector: n.readySelector,
      showCursor: n.showCursor,
      timeoutMs: n.captureTimeoutSec ? n.captureTimeoutSec * 1000 : undefined,
      runDir: ctx.runDir,
      stop: n.captureStop,
    });
    // Confine + record run-dir-relative; mask the URL in the warning. The
    // footage path may be canonicalized (e.g. /var → /private/var on macOS),
    // so relativize against the canonicalized run dir for a stable rel path.
    ctx.capturedFootage = runRelative(ctx.runDir, footage.path);
    ctx.warnings.push(
      `capture: recorded live web flow from ${maskUrl(n.url ?? "")} → ${ctx.capturedFootage} (capture is performed by a human; URL/tokens masked)`,
    );
  } catch (err) {
    // Empty/failed capture → guided fallback (key-optional, no hard fail).
    ctx.providers.capture = "cap";
    const guided = new GuidedCaptureProvider(cwd);
    const guide = await guided.guide({ mode: "demo" });
    ctx.warnings.push(
      `capture: live web capture failed (${messageForError(err)}); falling back to guided. ${guide.message}`,
    );
  }
}

/** File-source capture: ingest a --capture path, or surface the guided protocol. */
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
    return;
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
): Promise<void> {
  if (!ctx.capturedFootage) return;
  const src = path.resolve(runDir, ctx.capturedFootage);
  const outName = "demo.mp4";
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

/**
 * Capture frame size for live web recording — DERIVED, never a magic constant.
 * A named `--device` profile wins (a small, general set of common device frames,
 * not platform-specific); otherwise the size follows the render dimensions for
 * the chosen aspect. This keeps the recorded frame consistent with the output.
 */
function captureSizeForAspect(
  aspect: "9:16" | "16:9" | "1:1",
  device?: string,
): { width: number; height: number } {
  if (device) {
    const profile = DEVICE_PROFILES[device.toLowerCase()];
    if (profile) return profile;
  }
  return dimensionsForAspect(aspect);
}

/**
 * A small, general set of device frame sizes (CSS pixels). General-purpose, not
 * tied to any platform/app — just common viewport shapes a flow might target.
 * Unknown names fall through to the aspect-derived size.
 */
const DEVICE_PROFILES: Record<string, { width: number; height: number }> = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 1366 },
  mobile: { width: 390, height: 844 },
};

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
