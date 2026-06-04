// Compositor — Remotion / MPT (design §3.2, §5). Two deterministic branches:
//
//   real     : when (not mock) AND FFmpeg is present AND the vendored Remotion
//              project is installed with its Chrome Headless Shell, spawn
//              `npx remotion render` as a SUBPROCESS in the project dir (Remotion
//              uses its headless shell by default — reliable; a system Chrome is
//              only forced via the OMA_VIDEO_CHROME override). Never imported
//              (boundary-safe): the render-spec.json + run-dir assets are passed
//              in via `--props` + `--public-dir`. Returns the real mp4 + its
//              actual duration (probed via ffprobe).
//   fallback : when the toolchain or installed project is absent (or in
//              OMA_VIDEO_MOCK=1), or when the real render fails for any reason,
//              write a deterministic placeholder mp4 derived from the render-spec
//              and record a manifest warning. `oma video generate` (non-dry-run)
//              still yields a well-formed run dir + manifest with zero external
//              toolchain.
//
// The render OUTPUT is not part of the determinism boundary (render-spec.json +
// assets are). The placeholder stays a pure function of the spec so it is
// reproducible from the same render-spec.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { binaryAvailable, runCapture } from "../internal/exec.js";
import { isMockMode } from "../internal/mock.js";
import {
  getMptProjectStatus,
  type MptProjectStatus,
  resolveMptDriverPath,
} from "../internal/mpt-project.js";
import {
  getRemotionProjectStatus,
  type RemotionProjectStatus,
} from "../internal/remotion-project.js";
import type { Availability, Compositor, CostEstimate } from "../providers.js";
import type { RenderSpec, VideoArtifact } from "../types.js";

// Generous ceiling: a real render is ~1-2 frames/ms; a 180s clip at 30fps is
// 5400 frames. 10 min covers the slowest machines without hanging a run.
const RENDER_TIMEOUT_MS = 600_000;

export class RemotionLikeCompositor implements Compositor {
  constructor(public readonly id: "remotion" | "mpt" = "remotion") {}

  async available(): Promise<Availability> {
    return { ok: true };
  }

  estimateCost(): CostEstimate {
    return { usd: 0, basis: `${this.id} local render` };
  }

  async render(spec: RenderSpec): Promise<VideoArtifact> {
    const file = `${spec.composition.toLowerCase()}.mp4`;
    const durationSec = spec.durationInFrames / spec.fps;
    // The orchestrator/render command chdir into the run dir before calling, so
    // cwd is the run dir; capture it as an absolute base for the subprocess.
    const runDir = process.cwd();

    // MoneyPrinterTurbo compositor: a separate real branch driven via the MPT
    // venv python + the in-repo driver (design 013 §5). Gated on the key-
    // optional rule; degrades to the deterministic placeholder otherwise.
    if (this.id === "mpt") {
      return this.renderMptOrPlaceholder({ spec, file, runDir, durationSec });
    }

    const gate = await this.realBranchGate();
    if (!gate.ok) {
      // Toolchain/project absent or mock mode — deterministic placeholder.
      return this.placeholder(file, spec, durationSec);
    }

    try {
      return await this.renderWithRemotion({
        spec,
        file,
        runDir,
        projectDir: gate.projectDir,
        chromeOverride: gate.chromeOverride,
        fallbackDurationSec: durationSec,
      });
    } catch (err) {
      // Any failure (render error, timeout, bad output) degrades to the
      // placeholder so the run still completes; the manifest records why.
      const reason = err instanceof Error ? err.message : String(err);
      const artifact = await this.placeholder(file, spec, durationSec);
      artifact.warnings = [
        ...(artifact.warnings ?? []),
        `remotion render failed, used placeholder: ${reason}`,
      ];
      return artifact;
    }
  }

  /**
   * MoneyPrinterTurbo render path. Gate (key-optional, backend rule 11): real
   * only when NOT mock mode AND ffmpeg present AND the MPT checkout is installed
   * (clone + venv) AND a key-free material source is available (local materials
   * always are, so this is satisfied without any key; PEXELS_API_KEY enables the
   * pexels source). On ANY failure -> deterministic placeholder + warning.
   */
  private async renderMptOrPlaceholder(args: {
    spec: RenderSpec;
    file: string;
    runDir: string;
    durationSec: number;
  }): Promise<VideoArtifact> {
    const { spec, file, runDir, durationSec } = args;
    const gate = this.mptBranchGateSync();
    if (!gate.ok) {
      // Toolchain/checkout absent or mock mode — deterministic placeholder.
      return this.placeholder(file, spec, durationSec);
    }
    const ffmpeg = await binaryAvailable("ffmpeg", ["-version"]);
    if (!ffmpeg.ok) return this.placeholder(file, spec, durationSec);

    try {
      return await this.renderWithMpt({
        spec,
        file,
        runDir,
        venvPython: gate.venvPython,
        projectDir: gate.projectDir,
        driverPath: gate.driverPath,
        fallbackDurationSec: durationSec,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const artifact = await this.placeholder(file, spec, durationSec);
      artifact.warnings = [
        ...(artifact.warnings ?? []),
        `mpt render failed, used placeholder: ${reason}`,
      ];
      return artifact;
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
    fallbackDurationSec: number;
  }): Promise<VideoArtifact> {
    const {
      spec,
      file,
      runDir,
      venvPython,
      projectDir,
      driverPath,
      fallbackDurationSec,
    } = args;
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
    if (!parsed || parsed.ok !== true) {
      const reason =
        parsed?.error ||
        (res.stderr || res.stdout).trim().split("\n").slice(-2).join(" | ") ||
        `exit ${res.code}`;
      throw new Error(`driver: ${reason}`);
    }
    const probed = await this.probeDurationSec(outPath);
    return {
      path: file,
      durationSec: probed ?? parsed.duration ?? fallbackDurationSec,
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

  /**
   * Decide whether the real Remotion branch is eligible. Real only when NOT in
   * mock mode AND ffmpeg + system Chrome are present AND the vendored project is
   * installed. Returns the resolved chrome path + project dir on success.
   */
  private async realBranchGate(): Promise<
    | { ok: true; projectDir: string; chromeOverride?: string }
    | { ok: false; reason: string }
  > {
    if (isMockMode()) return { ok: false, reason: "mock mode" };

    const ffmpeg = await binaryAvailable("ffmpeg", ["-version"]);
    if (!ffmpeg.ok) return { ok: false, reason: "ffmpeg not found" };

    const project: RemotionProjectStatus = getRemotionProjectStatus();
    if (!project.dir)
      return { ok: false, reason: "remotion project not found" };
    if (!project.installed) {
      return { ok: false, reason: "remotion project not installed" };
    }

    // Default to Remotion's Chrome Headless Shell (reliable). OMA_VIDEO_CHROME
    // lets an advanced user force a system Chrome instead.
    const chromeOverride = process.env.OMA_VIDEO_CHROME?.trim() || undefined;
    if (!project.browserReady && !chromeOverride) {
      return {
        ok: false,
        reason: "remotion browser not ready (run `oma video doctor --install`)",
      };
    }

    return { ok: true, projectDir: project.dir, chromeOverride };
  }

  /**
   * Spawn `npx remotion render <entry> <CompId> <out> --props=<spec>
   * --public-dir=<runDir> --browser-executable=<chrome>` in the project dir.
   *
   * `--public-dir=<runDir>` is what makes the render-spec's run-dir-relative
   * asset paths (`visuals/...`, `captions.srt`) resolve via `staticFile()`; the
   * Remotion `src/` never sees an absolute path. On success we probe the real
   * duration from the produced mp4 (the render-spec duration is the planned
   * length; ffprobe reports what was actually encoded).
   */
  private async renderWithRemotion(args: {
    spec: RenderSpec;
    file: string;
    runDir: string;
    projectDir: string;
    chromeOverride?: string;
    fallbackDurationSec: number;
  }): Promise<VideoArtifact> {
    const {
      spec,
      file,
      runDir,
      projectDir,
      chromeOverride,
      fallbackDurationSec,
    } = args;
    const outPath = path.join(runDir, file);
    const specPath = path.join(runDir, "render-spec.json");

    // The render server can transiently fail to bind/serve on the first attempt
    // when many Chrome processes start at once ("got no response"). Retry once
    // with a fresh port before giving up to the placeholder.
    let lastError = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this.spawnRemotionRender({
        composition: spec.composition,
        outPath,
        specPath,
        runDir,
        projectDir,
        chromeOverride,
      });
      if (res.timedOut) {
        throw new Error(`render timed out after ${RENDER_TIMEOUT_MS}ms`);
      }
      if (res.code === 0) {
        const probed = await this.probeDurationSec(outPath);
        return {
          // Orchestrator joins this against the run dir, so return run-relative.
          path: file,
          durationSec: probed ?? fallbackDurationSec,
          pathTaken: "real",
        };
      }
      const tail = (res.stderr || res.stdout).trim().split("\n").slice(-3);
      lastError = `exit ${res.code}: ${tail.join(" | ") || "no output"}`;
      const transient = /got no response|Target closed|net::ERR/i.test(
        res.stderr + res.stdout,
      );
      if (!transient) break;
    }
    throw new Error(lastError || "render failed");
  }

  /**
   * One `npx remotion render` invocation. Remotion serves the bundle on a local
   * HTTP port (default 3000) during the render; two renders close together — or
   * a lingering server — collide on 3000 and fail with "got no response". A
   * per-invocation high-range port keeps sequential/concurrent runs isolated.
   */
  private spawnRemotionRender(args: {
    composition: string;
    outPath: string;
    specPath: string;
    runDir: string;
    projectDir: string;
    chromeOverride?: string;
  }): ReturnType<typeof runCapture> {
    const {
      composition,
      outPath,
      specPath,
      runDir,
      projectDir,
      chromeOverride,
    } = args;
    const port = 30_000 + Math.floor(Math.random() * 20_000);
    const renderArgs = [
      "remotion",
      "render",
      "src/index.ts",
      composition,
      outPath,
      `--props=${specPath}`,
      `--public-dir=${runDir}`,
      `--port=${port}`,
    ];
    // Default: Remotion's Chrome Headless Shell (reliable). Only force a system
    // Chrome when the user explicitly opts in via OMA_VIDEO_CHROME.
    if (chromeOverride) {
      renderArgs.push(`--browser-executable=${chromeOverride}`);
    }
    return runCapture("npx", renderArgs, {
      cwd: projectDir,
      timeoutMs: RENDER_TIMEOUT_MS,
      // Don't auto-download at render time; the headless shell is provisioned
      // ahead of time by `oma video doctor --install`.
      env: { ...process.env, REMOTION_SKIP_BROWSER_DOWNLOAD: "1" },
    });
  }

  /** Read the real container duration via ffprobe; null when unavailable. */
  private async probeDurationSec(absPath: string): Promise<number | null> {
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
