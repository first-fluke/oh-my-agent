// Compositor — Remotion / MPT (design §3.2, §5). Two deterministic branches:
//
//   real     : (not mock) — the AGENT-AUTHORED per-run project at
//              `<runDir>/remotion/` (scaffolded by `oma video compose` on the
//              always-latest Remotion toolchain) is typechecked and rendered via
//              `npx remotion render` as a SUBPROCESS. Never imported. Assets are
//              passed via `--props` + `--public-dir=<runDir>`. Any failure —
//              missing/stub composition, tsc error, render error — THROWS with
//              the diagnostics: a broken render on the latest Remotion is the
//              composition's bug to fix, never something to paper over.
//   fallback : OMA_VIDEO_MOCK=1 only — deterministic placeholder mp4 derived
//              from the render-spec so tests and dry runs stay toolchain-free.
//
// The render OUTPUT is not part of the determinism boundary (render-spec.json +
// assets are). The placeholder stays a pure function of the spec so it is
// reproducible from the same render-spec.
import { existsSync } from "node:fs";
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
  describeToolchain,
  isStubRoot,
  runProjectDir,
} from "../internal/remotion-workspace.js";
import type { Availability, Compositor, CostEstimate } from "../providers.js";
import {
  outputFileName,
  type RenderSpec,
  type VideoArtifact,
} from "../types.js";

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
    const file = outputFileName(spec);
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

    if (isMockMode()) return this.placeholder(file, spec, durationSec);

    const gate = await this.realBranchGate(runDir);
    if (!gate.ok) throw new Error(gate.reason);
    return await this.renderWithRemotion({
      spec,
      file,
      runDir,
      projectDir: gate.projectDir,
      chromeOverride: gate.chromeOverride,
      fallbackDurationSec: durationSec,
    });
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
    if (parsed?.ok !== true) {
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
   * The real Remotion branch needs: ffmpeg (ffprobe), the per-run project with
   * an agent-authored Root.tsx (not the stub), and a toolchain with its
   * headless shell. Every miss is an error with the remediation in the reason.
   */
  private async realBranchGate(
    runDir: string,
  ): Promise<
    | { ok: true; projectDir: string; chromeOverride?: string }
    | { ok: false; reason: string }
  > {
    const ffmpeg = await binaryAvailable("ffmpeg", ["-version"]);
    if (!ffmpeg.ok) return { ok: false, reason: "ffmpeg not found" };

    const projectDir = runProjectDir(runDir);
    if (!existsSync(path.join(projectDir, "src", "index.ts"))) {
      return {
        ok: false,
        reason: `no Remotion project at ${projectDir} — run \`oma video compose ${runDir}\` and author src/Root.tsx`,
      };
    }
    if (isStubRoot(projectDir)) {
      return {
        ok: false,
        reason: `composition not authored: ${path.join(projectDir, "src", "Root.tsx")} is still the scaffold stub — author it per ${path.join(projectDir, "AUTHORING.md")}`,
      };
    }
    if (!existsSync(path.join(projectDir, "node_modules", "remotion"))) {
      return {
        ok: false,
        reason: `toolchain link missing under ${projectDir}/node_modules — re-run \`oma video compose ${runDir}\``,
      };
    }

    const chromeOverride = process.env.OMA_VIDEO_CHROME?.trim() || undefined;
    if (!describeToolchain().browserReady && !chromeOverride) {
      return {
        ok: false,
        reason:
          "remotion headless shell not ready (run `oma video doctor --install`)",
      };
    }

    const tsc = await runCapture("npx", ["tsc", "--noEmit"], {
      cwd: projectDir,
      timeoutMs: 300_000,
    });
    if (tsc.code !== 0) {
      const tail = (tsc.stdout || tsc.stderr)
        .trim()
        .split("\n")
        .slice(-8)
        .join("\n");
      return {
        ok: false,
        reason: `composition does not typecheck against remotion ${describeToolchain().version ?? "?"} — fix ${projectDir}/src (consult remotion-dev/skills):\n${tail}`,
      };
    }

    return { ok: true, projectDir, chromeOverride };
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
    // with a fresh port before failing.
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
      const tail = (res.stderr || res.stdout).trim().split("\n").slice(-12);
      lastError = `remotion render exit ${res.code}:\n${tail.join("\n") || "no output"}`;
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
      // Don't auto-download at render time; the headless shell lives in the
      // toolchain cache (`oma video compose` / `oma video doctor --install`).
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
