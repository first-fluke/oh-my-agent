// Local HyperFrames and MPT compositors; placeholders are test-only.
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { stageRenderSpec } from "../../../io/video/internal/hyperframes-project.js";
import { binaryAvailable, runCapture } from "../internal/exec.js";
import {
  isStubRoot,
  runProjectDir,
  toolchainCli,
} from "../internal/hyperframes-workspace.js";
import { isMockMode } from "../internal/mock.js";
import {
  getMptProjectStatus,
  type MptProjectStatus,
  resolveMptDriverPath,
} from "../internal/mpt-project.js";
import type { Availability, Compositor, CostEstimate } from "../providers.js";
import {
  outputFileName,
  type RenderSpec,
  type VideoArtifact,
} from "../types.js";

// Generous ceiling: a real render is ~1-2 frames/ms; a 180s clip at 30fps is
// 5400 frames. 10 min covers the slowest machines without hanging a run.
const RENDER_TIMEOUT_MS = 600_000;

/** Require a video stream and positive encoded duration, never a text stub. */
export async function requirePlayableVideoDuration(
  absPath: string,
  dimensions?: RenderSpec["dimensions"],
): Promise<number> {
  if (!existsSync(absPath)) {
    throw new Error(`render did not produce an output file: ${absPath}`);
  }
  const res = await runCapture(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=codec_type,width,height:format=duration",
      "-of",
      "json",
      absPath,
    ],
    { timeoutMs: 15_000 },
  );
  if (res.code !== 0) {
    const detail = (res.stderr || res.stdout).trim().split("\n").at(-1);
    throw new Error(
      `render output is not a playable video (ffprobe failed${detail ? `: ${detail}` : ""})`,
    );
  }
  try {
    const parsed = JSON.parse(res.stdout) as {
      format?: { duration?: string };
      streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
    };
    const seconds = Number.parseFloat(parsed.format?.duration ?? "");
    const video = parsed.streams?.find(
      (stream) => stream.codec_type === "video",
    );
    if (
      video &&
      dimensions &&
      (video.width !== dimensions.width || video.height !== dimensions.height)
    ) {
      throw new Error(
        `render dimensions ${video.width}x${video.height} do not match ${dimensions.width}x${dimensions.height}`,
      );
    }
    if (video && Number.isFinite(seconds) && seconds > 0) return seconds;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("render dimensions"))
      throw error;
    // Fall through to the actionable validation error.
  }
  throw new Error(
    "render output is not a playable video with a positive duration",
  );
}

export class VideoCompositor implements Compositor {
  constructor(public readonly id: "hyperframes" | "mpt" = "hyperframes") {}

  async available(): Promise<Availability> {
    return { ok: true };
  }

  estimateCost(): CostEstimate {
    return { usd: 0, basis: `${this.id} local render` };
  }

  async render(spec: RenderSpec): Promise<VideoArtifact> {
    const file = outputFileName(spec);
    const durationSec = spec.durationInFrames / spec.fps;
    // The orchestrator/render command chdir into the run dir before calling, so
    // cwd is the run dir; capture it as an absolute base for the subprocess.
    const runDir = process.cwd();

    // MoneyPrinterTurbo compositor: a separate real branch driven via the MPT
    // venv python + the in-repo driver (design 013 §5). Gated on the key-
    // optional rule. Outside mock mode, unavailable or failed MPT renders
    // report diagnostics rather than writing text with an .mp4 suffix.
    if (this.id === "mpt") {
      return this.renderMptOrPlaceholder({ spec, file, runDir, durationSec });
    }

    if (isMockMode()) return this.placeholder(file, spec, durationSec);

    const gate = await this.realBranchGate(runDir);
    if (!gate.ok) throw new Error(gate.reason);
    return await this.renderWithHyperframes({
      spec,
      file,
      runDir,
      projectDir: gate.projectDir,
    });
  }

  /**
   * MoneyPrinterTurbo render path. Gate (key-optional, backend rule 11): real
   * only when NOT mock mode AND ffmpeg present AND the MPT checkout is installed
   * (clone + venv) AND a key-free material source is available (local materials
   * always are, so this is satisfied without any key; PEXELS_API_KEY enables the
   * pexels source). The deterministic placeholder is reserved for the
   * OMA_VIDEO_MOCK=1 harness; real-path failures must remain failures.
   */
  private async renderMptOrPlaceholder(args: {
    spec: RenderSpec;
    file: string;
    runDir: string;
    durationSec: number;
  }): Promise<VideoArtifact> {
    const { spec, file, runDir, durationSec } = args;
    if (isMockMode()) return this.placeholder(file, spec, durationSec);
    const gate = this.mptBranchGateSync();
    if (!gate.ok) {
      throw new Error(
        `mpt compositor unavailable: ${gate.reason}. Run \`oma video doctor --install-mpt\` before rendering.`,
      );
    }
    const ffmpeg = await binaryAvailable("ffmpeg", ["-version"]);
    if (!ffmpeg.ok) {
      throw new Error(
        `mpt compositor requires ffmpeg: ${ffmpeg.detail || "not found"}`,
      );
    }

    try {
      return await this.renderWithMpt({
        spec,
        file,
        runDir,
        venvPython: gate.venvPython,
        projectDir: gate.projectDir,
        driverPath: gate.driverPath,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await rm(path.join(runDir, file), { force: true });
      throw new Error(`mpt render failed: ${reason}`);
    }
  }

  /** Resolve MPT checkout + driver eligibility (sync, no probes). */
  private mptBranchGateSync():
    | {
        ok: true;
        projectDir: string;
        venvPython: string;
        driverPath: string;
      }
    | { ok: false; reason: string } {
    if (isMockMode()) return { ok: false, reason: "mock mode" };
    const project: MptProjectStatus = getMptProjectStatus();
    if (!project.dir) return { ok: false, reason: "mpt checkout not found" };
    if (!project.installed || !project.venvPython) {
      return { ok: false, reason: "mpt checkout not installed" };
    }
    const driverPath = resolveMptDriverPath();
    if (!driverPath) return { ok: false, reason: "mpt driver not found" };
    return {
      ok: true,
      projectDir: project.dir,
      venvPython: project.venvPython,
      driverPath,
    };
  }

  /**
   * Spawn `<MPT venv python> driver.py <spec.json>` as a SUBPROCESS (never an
   * import). The driver builds MPT VideoParams from our injected narration +
   * voice + aspect, synthesizes key-free local material clips, runs MPT's
   * headless pipeline, and copies the produced mp4 to <runDir>/<file>. The
   * narration is read from the run dir's `script.json` (the human-readable
   * scene text); aspect is derived from the render-spec dimensions. The driver's
   * last stdout line is one JSON result.
   */
  private async renderWithMpt(args: {
    spec: RenderSpec;
    file: string;
    runDir: string;
    venvPython: string;
    projectDir: string;
    driverPath: string;
  }): Promise<VideoArtifact> {
    const { spec, file, runDir, venvPython, projectDir, driverPath } = args;
    const outPath = path.join(runDir, file);
    const narration = await this.readNarration(runDir, spec);
    const aspect = this.aspectForDimensions(spec.dimensions);
    const driverSpec: Record<string, unknown> = {
      mpt_dir: projectDir,
      script: narration,
      subject: spec.composition,
      out_path: outPath,
      aspect,
      video_source: process.env.PEXELS_API_KEY ? "pexels" : "local",
      clip_duration: 5,
      subtitle: spec.captions.style !== "none",
    };
    // Pass the spec as a file in the run dir so it is inspectable + avoids argv
    // length limits. The driver accepts a path or inline JSON.
    const specPath = path.join(runDir, "mpt-driver-spec.json");
    await writeFile(specPath, JSON.stringify(driverSpec), "utf8");

    // MPT resolves ffmpeg via IMAGEIO_FFMPEG_EXE or `shutil.which("ffmpeg")`.
    // Only pin an explicit binary when OMA_FFMPEG is set; otherwise let MPT find
    // the system ffmpeg on PATH (don't inject an empty env var).
    const env = { ...process.env };
    const ffmpegOverride = process.env.OMA_FFMPEG?.trim();
    if (ffmpegOverride) env.IMAGEIO_FFMPEG_EXE = ffmpegOverride;
    const res = await runCapture(venvPython, [driverPath, specPath], {
      cwd: projectDir,
      timeoutMs: RENDER_TIMEOUT_MS,
      env,
    });
    if (res.timedOut) {
      throw new Error(`mpt render timed out after ${RENDER_TIMEOUT_MS}ms`);
    }
    const parsed = this.parseDriverResult(res.stdout);
    if (parsed?.ok !== true) {
      const reason =
        parsed?.error ||
        (res.stderr || res.stdout).trim().split("\n").slice(-2).join(" | ") ||
        `exit ${res.code}`;
      throw new Error(`driver: ${reason}`);
    }
    const durationSec = await requirePlayableVideoDuration(outPath);
    return {
      path: file,
      durationSec,
      pathTaken: "real",
    };
  }

  /**
   * Read the joined narration for the MPT script. Prefers the run dir's
   * `script.json` (one line per scene's narration); falls back to the render-
   * spec on-screen text, then the composition name, so the driver always has a
   * non-empty script.
   */
  private async readNarration(
    runDir: string,
    spec: RenderSpec,
  ): Promise<string> {
    try {
      const raw = await readFile(path.join(runDir, "script.json"), "utf8");
      const script = JSON.parse(raw) as {
        scenes?: Array<{ narration?: string }>;
      };
      const lines = (script.scenes ?? [])
        .map((scene) => (scene.narration ?? "").trim())
        .filter((line) => line.length > 0);
      if (lines.length > 0) return lines.join("\n");
    } catch {
      // No script.json or unparseable — fall through to the spec-derived text.
    }
    const fromText = spec.scenes
      .flatMap((scene) => scene.onScreenText)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (fromText.length > 0) return fromText.join("\n");
    return spec.composition;
  }

  /** Map render-spec dimensions to an MPT aspect ratio token. */
  private aspectForDimensions(d: {
    width: number;
    height: number;
  }): "9:16" | "16:9" | "1:1" {
    if (d.height > d.width) return "9:16";
    if (d.width > d.height) return "16:9";
    return "1:1";
  }

  /** Parse the driver's last stdout JSON line into a typed result. */
  private parseDriverResult(stdout: string): {
    ok: boolean;
    output?: string;
    duration?: number;
    source?: string;
    error?: string;
  } | null {
    const lines = stdout
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("{") && line.endsWith("}"));
    const last = lines.at(-1);
    if (!last) return null;
    try {
      return JSON.parse(last);
    } catch {
      return null;
    }
  }

  private async realBranchGate(
    runDir: string,
  ): Promise<{ ok: true; projectDir: string } | { ok: false; reason: string }> {
    const ffmpeg = await binaryAvailable("ffmpeg", ["-version"]);
    if (!ffmpeg.ok) return { ok: false, reason: "ffmpeg not found" };
    const projectDir = runProjectDir(runDir);
    if (!existsSync(path.join(projectDir, "index.html"))) {
      return {
        ok: false,
        reason: `no HyperFrames project at ${projectDir} — run \`oma video compose ${runDir}\` and author index.html`,
      };
    }
    if (isStubRoot(projectDir)) {
      return {
        ok: false,
        reason: `composition not authored: replace ${projectDir}/index.html per AUTHORING.md`,
      };
    }
    if (!existsSync(toolchainCli(projectDir))) {
      return {
        ok: false,
        reason: `HyperFrames toolchain missing — run \`oma video compose ${runDir}\``,
      };
    }
    return { ok: true, projectDir };
  }

  private async renderWithHyperframes(args: {
    spec: RenderSpec;
    file: string;
    runDir: string;
    projectDir: string;
  }): Promise<VideoArtifact> {
    const { spec, file, runDir, projectDir } = args;
    stageRenderSpec(runDir, spec);
    const outPath = path.join(runDir, file);
    const options = {
      cwd: projectDir,
      timeoutMs: RENDER_TIMEOUT_MS,
      env: { ...process.env, DO_NOT_TRACK: "1" },
    };
    const cli = toolchainCli(projectDir);
    const lint = await runCapture("node", [cli, "lint"], options);
    if (lint.timedOut) throw new Error("hyperframes lint timed out");
    if (lint.code !== 0) {
      throw new Error(
        `hyperframes lint failed:\n${(lint.stderr || lint.stdout).trim()}`,
      );
    }
    // Remove stale output before invoking the renderer: exit zero alone is not evidence.
    await rm(outPath, { force: true });
    try {
      const result = await runCapture(
        "node",
        [
          cli,
          "render",
          "--output",
          outPath,
          "--fps",
          String(spec.fps),
          "--format",
          "mp4",
          "--strict",
          "--no-best-effort",
        ],
        options,
      );
      if (result.timedOut)
        throw new Error(`render timed out after ${RENDER_TIMEOUT_MS}ms`);
      if (result.code !== 0) {
        throw new Error(
          `hyperframes render exit ${result.code}:\n${(result.stderr || result.stdout).trim().split("\n").slice(-12).join("\n")}`,
        );
      }
      const durationSec = await requirePlayableVideoDuration(
        outPath,
        spec.dimensions,
      );
      if (
        Math.abs(durationSec - spec.durationInFrames / spec.fps) >
        Math.max(0.1, 2 / spec.fps)
      ) {
        throw new Error(
          `render duration ${durationSec}s does not match render-spec ${spec.durationInFrames / spec.fps}s`,
        );
      }
      return { path: file, durationSec, pathTaken: "real" };
    } catch (error) {
      await rm(outPath, { force: true });
      throw error;
    }
  }

  private async placeholder(
    file: string,
    spec: RenderSpec,
    durationSec: number,
  ): Promise<VideoArtifact> {
    // Deterministic placeholder content keyed by the spec — reproducible from
    // the same render-spec (cwd is the run dir during render).
    await writeFile(
      file,
      `oma-video placeholder render\ncomposition=${spec.composition}\nframes=${spec.durationInFrames}\nfps=${spec.fps}\nseed=${spec.seed}\n`,
      "utf8",
    );
    return { path: file, durationSec, pathTaken: "fallback" };
  }
}
