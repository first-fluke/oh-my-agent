import { realpathSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { sha256Hex } from "../../utils/hash.js";
import type { VideoConfig } from "./config.js";
import {
  CostGuardrailError,
  exitCodeForError,
  messageForError,
  ProviderUnavailableError,
  SchemaValidationError,
  VIDEO_EXIT_CODES,
} from "./errors.js";
import { runCapture } from "./internal/exec.js";
import {
  collectAssetRecord,
  writeJsonFile,
  writeManifest,
} from "./manifest.js";
import { makeVideoRunId } from "./naming.js";
import { resolveVideoRunDir } from "./path-guard.js";
import { GuidedCaptureProvider } from "./providers/capture.js";
import { PlaywrightCaptureProvider } from "./providers/capture-playwright.js";
import type {
  CapabilityProvider,
  CaptionProvider,
  Compositor,
  ScriptProvider,
  VisualProvider,
  VoiceProvider,
} from "./providers.js";
import type { VideoProviderRegistry } from "./registry.js";
import {
  type AudioRef,
  type Brief,
  CaptionStyleSchema,
  type Captions,
  CompositorNameSchema,
  ManifestSchema,
  MusicModeSchema,
  parseVideoSchema,
  type RenderSpec,
  RenderSpecSchema,
  type Script,
  ScriptSchema,
  type Timing,
  TimingSchema,
  VIDEO_SCHEMA_VERSION,
  VideoAspectInputSchema,
  type VideoManifest,
  VideoModeSchema,
  type VisualAsset,
  VisualModeSchema,
} from "./types.js";

const GenerateOptionsSchema = z.object({
  mode: VideoModeSchema.optional(),
  aspect: VideoAspectInputSchema.optional(),
  locale: z.string().min(1).optional(),
  captions: CaptionStyleSchema.optional(),
  visual: VisualModeSchema.optional(),
  voice: z.string().optional(),
  music: MusicModeSchema.optional(),
  duration: z.string().optional(),
  compositor: CompositorNameSchema.optional(),
  capture: z.string().optional(),
  source: z.enum(["file", "web"]).optional(),
  url: z.string().optional(),
  device: z.string().optional(),
  readySelector: z.string().optional(),
  showCursor: z.boolean().optional(),
  polish: z.boolean().optional(),
  captureTimeout: z.string().optional(),
  captureStop: z.string().optional(),
  out: z.string().optional(),
  allowExternalOut: z.boolean().optional(),
  maxUsd: z.string().optional(),
  seed: z.string().optional(),
  timeout: z.string().optional(),
  yes: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  format: z.enum(["text", "json"]).optional(),
  briefInManifest: z.boolean().optional(),
});

export interface VideoGenerateRequest {
  brief: string;
  opts: Record<string, unknown>;
  cwd?: string;
}

export interface VideoGenerateResult {
  exitCode: number;
  runDir?: string;
  manifestPath?: string;
  scriptPath?: string;
  renderSpecPath?: string;
  warnings: string[];
  error?: string;
  manifest?: VideoManifest;
}

interface NormalizedGenerateOptions {
  mode: z.infer<typeof VideoModeSchema>;
  aspect: "9:16" | "16:9" | "1:1";
  locale: string;
  captions: z.infer<typeof CaptionStyleSchema>;
  visual: z.infer<typeof VisualModeSchema>;
  voice: string;
  music: z.infer<typeof MusicModeSchema>;
  durationSec?: number;
  compositor: z.infer<typeof CompositorNameSchema>;
  capture?: string;
  source: "file" | "web";
  url?: string;
  device?: string;
  readySelector?: string;
  showCursor: boolean;
  polish: boolean;
  captureTimeoutSec?: number;
  captureStop?: string;
  out?: string;
  allowExternalOut: boolean;
  maxUsd: number;
  seed: number;
  timeoutSec: number;
  yes: boolean;
  dryRun: boolean;
  includeBriefInManifest: boolean;
}

interface RunContext {
  runId: ReturnType<typeof makeVideoRunId>;
  runDir: string;
  normalized: NormalizedGenerateOptions;
  warnings: string[];
  providers: VideoManifest["providers"];
  assets: VideoManifest["assets"];
  costBreakdown: Record<string, number>;
  outputs: VideoManifest["outputs"];
  /** Run-dir-relative path of a live web capture, when one was recorded. */
  capturedFootage?: string;
  /** True when this run included nondeterministic live capture. */
  nondeterministic?: boolean;
}

export class VideoOrchestrator {
  constructor(
    private readonly config: VideoConfig,
    private readonly registry: VideoProviderRegistry,
  ) {}

  async generate(request: VideoGenerateRequest): Promise<VideoGenerateResult> {
    let ctx: RunContext | undefined;
    const cwd = request.cwd ?? process.cwd();
    try {
      const normalized = normalizeGenerateOptions(
        request.brief,
        request.opts,
        this.config,
      );
      const runId = makeVideoRunId(normalized.mode);
      const runDir = resolveVideoRunDir({
        outFlag: normalized.out,
        allowExternal: normalized.allowExternalOut,
        defaultBase: this.config.defaultOutputDir,
        runId,
        singleFolderPattern: this.config.naming.singleFolderPattern,
        cwd,
      });
      await mkdir(runDir, { recursive: true });
      ctx = {
        runId,
        runDir,
        normalized,
        warnings: [],
        providers: { visual: [] },
        assets: [],
        costBreakdown: {},
        outputs: {},
      };

      const brief: Brief = {
        text: request.brief.trim(),
        mode: normalized.mode,
        aspect: normalized.aspect,
        locale: normalized.locale,
        durationSec: normalized.durationSec,
        seed: normalized.seed,
      };

      const scriptProvider = await this.pickProvider<ScriptProvider>(
        "script",
        this.config.providers.script.order,
        brief,
        ctx,
      );
      const script = await scriptProvider.generate(brief, {
        maxScenes: this.config.limits.maxScenes,
      });
      ctx.providers.script = scriptProvider.id;
      const scriptPath = path.join(runDir, "script.json");
      await writeValidatedJson("script.json", ScriptSchema, scriptPath, script);

      // Demo mode: dispatch capture on --source. `web` + `url` drives a live
      // headed web capture (PlaywrightCaptureProvider.record); `file` (default)
      // validates / ingests a human-performed recording. Both confine + guard
      // the resulting path (design §5, §7 Tier-1 capture-path safety).
      if (normalized.mode === "demo") {
        await this.handleCapture(cwd, ctx);
      }

      const voiceProvider = await this.pickProvider<VoiceProvider>(
        "voice",
        this.config.providers.voice.order,
        script,
        ctx,
      );
      const { audio, timing } = await voiceProvider.synthesize(
        script.scenes.map((scene) => ({
          sceneId: scene.id,
          text: scene.narration,
        })),
        {
          runDir,
          voice: normalized.voice,
          locale: normalized.locale,
          dryRun: normalized.dryRun,
        },
      );
      ctx.providers.voice = voiceProvider.id;
      // Record which voice path was taken (real wav vs estimated/silent).
      ctx.warnings.push(
        timing.source === "estimated"
          ? `voice provider ${voiceProvider.id} used fallback path: estimated timing, no audio (source: estimated)`
          : `voice provider ${voiceProvider.id} used real path (source: ${timing.source})`,
      );
      const timingPath = path.join(runDir, "timing.json");
      await writeValidatedJson("timing.json", TimingSchema, timingPath, timing);

      const visualAssets: VisualAsset[] = [];
      const visualOrder = visualProviderOrder(
        normalized.visual,
        normalized.mode,
        this.config.providers.visual.order,
      );
      const visualTimeoutMs = normalized.timeoutSec * 1000;
      for (const scene of script.scenes) {
        const visual = await this.runFallbackChain<VisualProvider, VisualAsset>(
          "visual",
          visualOrder,
          scene,
          ctx,
          (provider) =>
            provider.produce(scene, {
              runDir,
              seed: normalized.seed,
              aspect: normalized.aspect,
              timeoutMs: visualTimeoutMs,
              dryRun: normalized.dryRun,
            }),
        );
        visualAssets.push(visual);
        ctx.providers.visual.push(visual.providerId);
        if (visual.pathTaken === "fallback") {
          ctx.warnings.push(
            `visual provider ${visual.providerId} used fallback path for ${scene.id} (placeholder asset)`,
          );
        }
      }
      ctx.providers.visual = [...new Set(ctx.providers.visual)];

      let captions: Captions | undefined;
      if (normalized.captions !== "none") {
        const captionProvider = await this.pickProvider<CaptionProvider>(
          "caption",
          this.config.providers.caption.order,
          timing,
          ctx,
        );
        captions = await captionProvider.align(
          script.scenes.map((scene) => scene.narration),
          timing,
          audio,
          {
            runDir,
            style: normalized.captions,
            locale: normalized.locale,
            sourceLocale: script.locale,
            dryRun: normalized.dryRun,
          },
        );
        ctx.providers.caption = captionProvider.id;
        if (
          normalized.locale !== script.locale &&
          captions.pathTaken === "fallback"
        ) {
          ctx.warnings.push(
            `caption provider ${captionProvider.id} kept source locale ${script.locale} (oma-translator unavailable for ${normalized.locale})`,
          );
        }
      }

      // Demo + a captured recording: the footage is the video background. With
      // --polish the Remotion `Demo` composition overlays intro/captions/zoom on
      // top; without it the raw capture is the output (handled below). Either way
      // the render-spec records the footage as the background source.
      const footageBackground =
        normalized.mode === "demo" && ctx.capturedFootage
          ? ctx.capturedFootage
          : undefined;
      const renderSpec = buildRenderSpec({
        script,
        timing,
        audio,
        captions,
        visualAssets,
        compositor: normalized.compositor,
        seed: normalized.seed,
        captionStyle: normalized.captions,
        footageBackground,
      });
      const renderSpecPath = path.join(runDir, "render-spec.json");
      await writeValidatedJson(
        "render-spec.json",
        RenderSpecSchema,
        renderSpecPath,
        renderSpec,
      );

      // Raw (default) demo output: when there is captured footage and --polish
      // is NOT set, the raw capture IS the deliverable — copy it to the named
      // output without invoking the compositor (design 014 §3.1).
      const rawDemoOutput =
        !normalized.dryRun &&
        normalized.mode === "demo" &&
        ctx.capturedFootage &&
        !normalized.polish;
      if (rawDemoOutput && ctx.capturedFootage) {
        await this.emitRawDemoOutput(runDir, ctx);
      } else if (!normalized.dryRun) {
        const compositor = await this.pickProvider<Compositor>(
          "compositor",
          [normalized.compositor],
          renderSpec,
          ctx,
        );
        ctx.providers.compositor = compositor.id;
        const previousCwd = process.cwd();
        try {
          process.chdir(runDir);
          const artifact = await compositor.render(renderSpec);
          ctx.outputs.video = artifact.path;
          ctx.outputs.durationSec = artifact.durationSec;
          if (artifact.warnings?.length) {
            ctx.warnings.push(
              ...artifact.warnings.map(
                (warning) => `compositor ${compositor.id}: ${warning}`,
              ),
            );
          }
          ctx.assets.push(
            await collectAssetRecord(runDir, artifact.path, normalized.seed),
          );
          ctx.outputs.sha256 = ctx.assets.find(
            (asset) => asset.path === artifact.path,
          )?.sha256;
        } finally {
          process.chdir(previousCwd);
        }
      } else {
        ctx.providers.compositor = normalized.compositor;
      }

      const assetPaths = [
        "script.json",
        "timing.json",
        "render-spec.json",
        // audio.path is "" in estimated/silent mode (no wav written).
        ...(audio.path ? [audio.path] : []),
        ...visualAssets.map((asset) => asset.path),
        ...(captions ? [captions.path] : []),
        ...(captions?.vttPath ? [captions.vttPath] : []),
      ];
      ctx.assets.push(
        ...(await Promise.all(
          assetPaths.map((assetPath) =>
            collectAssetRecord(runDir, assetPath, normalized.seed),
          ),
        )),
      );

      const manifest = buildManifest({
        ctx,
        brief: request.brief,
        exitCode: VIDEO_EXIT_CODES.ok,
        includeBrief: normalized.includeBriefInManifest,
      });
      const manifestPath = await writeManifest(runDir, manifest);
      return {
        exitCode: VIDEO_EXIT_CODES.ok,
        runDir,
        manifestPath,
        scriptPath,
        renderSpecPath,
        warnings: ctx.warnings,
        manifest,
      };
    } catch (err) {
      return await this.handleFailure(err, request.brief, ctx);
    }
  }

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
  private async handleCapture(cwd: string, ctx: RunContext): Promise<void> {
    const n = ctx.normalized;
    if (n.source === "web" && n.url) {
      await this.handleWebCapture(cwd, ctx);
      return;
    }
    await this.handleFileCapture(n.capture, cwd, ctx);
  }

  /** Live web capture branch with a non-hanging guided fallback. */
  private async handleWebCapture(cwd: string, ctx: RunContext): Promise<void> {
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
  private async handleFileCapture(
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
  private async emitRawDemoOutput(
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
    const record = await collectAssetRecord(
      runDir,
      outName,
      ctx.normalized.seed,
    );
    ctx.assets.push(record);
    ctx.outputs.sha256 = record.sha256;
  }

  private async pickProvider<T extends CapabilityProvider>(
    capability: Parameters<VideoProviderRegistry["resolve"]>[0],
    order: string[],
    input: unknown,
    ctx: RunContext,
  ): Promise<T> {
    const result = await this.runFallbackChain<T, T>(
      capability,
      order,
      input,
      ctx,
      async (provider) => provider,
    );
    return result;
  }

  private async runFallbackChain<T extends CapabilityProvider, R>(
    capability: Parameters<VideoProviderRegistry["resolve"]>[0],
    order: string[],
    input: unknown,
    ctx: RunContext,
    run: (provider: T) => Promise<R>,
  ): Promise<R> {
    const providers = this.registry.resolve(capability, order) as T[];
    const failures: string[] = [];
    for (const provider of providers) {
      const availability = await provider.available();
      if (!availability.ok) {
        failures.push(
          `${provider.id}: ${availability.reason ?? "unavailable"}`,
        );
        ctx.warnings.push(
          `${capability} provider ${provider.id} unavailable: ${availability.reason ?? "unavailable"}`,
        );
        continue;
      }
      const estimate = provider.estimateCost(input);
      ctx.costBreakdown[provider.id] =
        (ctx.costBreakdown[provider.id] ?? 0) + estimate.usd;
      // Gate on the CUMULATIVE total across providers, not this provider's
      // single estimate — otherwise several individually-under-cap providers
      // can together exceed --max-usd without ever tripping the guardrail.
      const totalUsd = Object.values(ctx.costBreakdown).reduce(
        (acc, value) => acc + value,
        0,
      );
      if (
        estimate.usd > 0 &&
        totalUsd >= ctx.normalized.maxUsd &&
        !ctx.normalized.yes
      ) {
        throw new CostGuardrailError(
          `estimated ${totalUsd.toFixed(2)} USD total (${provider.id} +${estimate.usd.toFixed(2)}, ${estimate.basis}); pass -y or raise --max-usd to continue.`,
        );
      }
      try {
        return await run(provider);
      } catch (err) {
        if (err instanceof CostGuardrailError) throw err;
        failures.push(`${provider.id}: ${messageForError(err)}`);
        ctx.warnings.push(
          `${capability} provider ${provider.id} failed: ${messageForError(err)}`,
        );
      }
    }
    throw new ProviderUnavailableError(
      `${capability} provider chain exhausted (${failures.join("; ")})`,
    );
  }

  private async handleFailure(
    err: unknown,
    brief: string,
    ctx?: RunContext,
  ): Promise<VideoGenerateResult> {
    const exitCode = exitCodeForError(err);
    const error = messageForError(err);
    if (!ctx) {
      return { exitCode, warnings: [], error };
    }
    ctx.warnings.push(error);
    const manifest = buildManifest({
      ctx,
      brief,
      exitCode,
      includeBrief: ctx.normalized.includeBriefInManifest,
    });
    try {
      const manifestPath = await writeManifest(ctx.runDir, manifest);
      return {
        exitCode,
        runDir: ctx.runDir,
        manifestPath,
        warnings: ctx.warnings,
        error,
        manifest,
      };
    } catch (manifestErr) {
      return {
        exitCode,
        runDir: ctx.runDir,
        warnings: ctx.warnings,
        error: `${error}; failed to write manifest: ${messageForError(manifestErr)}`,
      };
    }
  }
}

function normalizeGenerateOptions(
  brief: string,
  rawOpts: Record<string, unknown>,
  config: VideoConfig,
): NormalizedGenerateOptions {
  if (!brief || brief.trim().length === 0) {
    throw new SchemaValidationError("brief is required", "generate");
  }
  const withDefaults = {
    mode: rawOpts.mode ?? config.defaultMode,
    aspect: rawOpts.aspect ?? config.defaultAspect,
    locale: rawOpts.locale ?? config.defaultLocale,
    captions: rawOpts.captions ?? config.defaultCaptions,
    visual: rawOpts.visual ?? config.defaultVisual,
    voice: rawOpts.voice ?? config.defaultVoice,
    music: rawOpts.music ?? config.defaultMusic,
    compositor: rawOpts.compositor ?? config.defaultCompositor,
    timeout: rawOpts.timeout ?? String(config.defaultTimeoutSec),
    maxUsd: rawOpts.maxUsd ?? String(config.cost.guardrailUsd),
    ...rawOpts,
  };
  const parsed = parseVideoSchema(
    "generate options",
    GenerateOptionsSchema,
    withDefaults,
  );
  const mode = parsed.mode ?? config.defaultMode;
  const aspectInput = parsed.aspect ?? config.defaultAspect;
  const durationSec = parseDuration(parsed.duration, config);
  const maxUsd = parseNumberFlag(parsed.maxUsd, "--max-usd");
  const seed = parsed.seed ? parseIntFlag(parsed.seed, "--seed") : 1;
  const timeoutSec = parseIntFlag(
    parsed.timeout ?? String(config.defaultTimeoutSec),
    "--timeout",
  );
  const source = parsed.source ?? "file";
  // `--source web` requires a target URL (any URL — local/staging/prod). Surface
  // the missing-url case as a schema validation error → exit 4 (design 014 §7).
  if (mode === "demo" && source === "web") {
    if (!parsed.url || parsed.url.trim().length === 0) {
      throw new SchemaValidationError(
        "--source web requires --url <url>",
        "generate options",
      );
    }
  }
  const captureTimeoutSec = parsed.captureTimeout
    ? parseIntFlag(parsed.captureTimeout, "--capture-timeout")
    : undefined;
  return {
    mode,
    aspect: aspectInput === "auto" ? defaultAspectForMode(mode) : aspectInput,
    locale: parsed.locale ?? config.defaultLocale,
    captions: parsed.captions ?? config.defaultCaptions,
    visual: parsed.visual ?? config.defaultVisual,
    voice: parsed.voice ?? config.defaultVoice,
    music: parsed.music ?? config.defaultMusic,
    durationSec,
    compositor: parsed.compositor ?? config.defaultCompositor,
    capture: parsed.capture,
    source,
    url: parsed.url,
    device: parsed.device,
    readySelector: parsed.readySelector,
    showCursor: parsed.showCursor === true,
    polish: parsed.polish === true,
    captureTimeoutSec,
    captureStop: parsed.captureStop,
    out: parsed.out,
    allowExternalOut: parsed.allowExternalOut === true,
    maxUsd,
    seed,
    timeoutSec,
    yes: parsed.yes === true || config.yes,
    dryRun: parsed.dryRun === true,
    includeBriefInManifest: parsed.briefInManifest ?? true,
  };
}

function parseDuration(
  value: string | undefined,
  config: VideoConfig,
): number | undefined {
  if (!value || value === "auto") return undefined;
  const duration = parseIntFlag(value, "--duration");
  if (duration <= 0 || duration > config.limits.maxDurationSec) {
    throw new SchemaValidationError(
      `--duration must be between 1 and ${config.limits.maxDurationSec} seconds`,
      "generate options",
    );
  }
  return duration;
}

function parseIntFlag(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new SchemaValidationError(`${flag} must be an integer`, "generate");
  }
  return parsed;
}

function parseNumberFlag(value: string | undefined, flag: string): number {
  if (value === undefined) return Number.POSITIVE_INFINITY;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new SchemaValidationError(
      `${flag} must be a non-negative number`,
      "generate",
    );
  }
  return parsed;
}

function defaultAspectForMode(mode: z.infer<typeof VideoModeSchema>) {
  return mode === "shorts" ? "9:16" : "16:9";
}

function visualProviderOrder(
  visual: z.infer<typeof VisualModeSchema>,
  mode: z.infer<typeof VideoModeSchema>,
  defaultOrder: string[],
): string[] {
  if (visual === "generate") return ["oma-image"];
  if (visual === "stock") return ["pexels", "oma-image"];
  if (visual === "aigc") return ["pixelle", "oma-image"];
  if (visual === "slide") return ["oma-slide", "oma-image"];
  if (mode === "explainer") return ["oma-slide", "oma-image", ...defaultOrder];
  return defaultOrder;
}

function buildRenderSpec(args: {
  script: Script;
  timing: Timing;
  audio: AudioRef;
  captions?: Captions;
  visualAssets: VisualAsset[];
  compositor: z.infer<typeof CompositorNameSchema>;
  seed: number;
  captionStyle: z.infer<typeof CaptionStyleSchema>;
  /** Run-dir-relative live-capture footage to use as the video background. */
  footageBackground?: string;
}): RenderSpec {
  const fps = 30;
  const dimensions = dimensionsForAspect(args.script.aspect);
  let cursor = 0;
  const scenes = args.script.scenes.map((scene) => {
    const durationInFrames = Math.max(1, Math.round(scene.durationSec * fps));
    const visual = args.visualAssets.find(
      (asset) => asset.sceneId === scene.id,
    );
    const entry = {
      id: scene.id,
      fromFrame: cursor,
      durationInFrames,
      visual: {
        type: visual?.type ?? "placeholder",
        src: visual?.path ?? "",
        kenBurns: (visual?.type ?? "image") === "image",
      },
      onScreenText: scene.onScreenText,
      transitionOut: scene.transition,
    };
    cursor += durationInFrames;
    return entry;
  });
  return {
    schemaVersion: VIDEO_SCHEMA_VERSION,
    compositor: args.compositor,
    composition: compositionForMode(args.script.mode),
    fps,
    dimensions,
    durationInFrames: cursor,
    audio: {
      narration: args.audio.path ? args.audio.path : undefined,
      music: args.script.music === "none" ? undefined : args.script.music,
      musicGainDb: args.script.music === "none" ? undefined : -16,
    },
    scenes,
    captions: {
      file: args.captions?.path,
      style: args.captionStyle,
      fontFamily: "Pretendard",
      maxWidthPct: args.script.aspect === "9:16" ? 86 : 72,
      safeArea:
        args.script.aspect === "9:16"
          ? { topPct: 8, bottomPct: 18, leftPct: 7, rightPct: 7 }
          : { topPct: 6, bottomPct: 10, leftPct: 6, rightPct: 6 },
    },
    background: args.footageBackground
      ? { type: "video", src: args.footageBackground }
      : { type: "color", src: "#0f1117" },
    seed: args.seed,
  };
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

function dimensionsForAspect(aspect: Script["aspect"]): {
  width: number;
  height: number;
} {
  if (aspect === "9:16") return { width: 1080, height: 1920 };
  if (aspect === "1:1") return { width: 1080, height: 1080 };
  return { width: 1920, height: 1080 };
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
function maskUrl(value: string): string {
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

function compositionForMode(mode: Script["mode"]): string {
  if (mode === "shorts") return "Shorts";
  if (mode === "demo") return "Demo";
  return "Explainer";
}

async function writeValidatedJson<T extends z.ZodTypeAny>(
  schemaName: string,
  schema: T,
  filePath: string,
  value: unknown,
): Promise<z.infer<T>> {
  const parsed = parseVideoSchema(schemaName, schema, value);
  await writeJsonFile(filePath, parsed);
  return parsed;
}

function buildManifest(args: {
  ctx: RunContext;
  brief: string;
  exitCode: number;
  includeBrief: boolean;
}): VideoManifest {
  const totalCost = Object.values(args.ctx.costBreakdown).reduce(
    (acc, value) => acc + value,
    0,
  );
  const manifest = {
    schemaVersion: VIDEO_SCHEMA_VERSION,
    runId: args.ctx.runId.value,
    mode: args.ctx.normalized.mode,
    providers: args.ctx.providers,
    assets: args.ctx.assets,
    outputs: args.ctx.outputs,
    cost: {
      usd: Number(totalCost.toFixed(4)),
      breakdown: args.ctx.costBreakdown,
    },
    warnings: args.ctx.warnings,
    exitCode: args.exitCode,
    // Live capture is nondeterministic; record it + a MASKED URL (never tokens).
    ...(args.ctx.nondeterministic ? { nondeterministic: true } : {}),
    ...(args.ctx.normalized.source === "web" && args.ctx.normalized.url
      ? { captureUrlMasked: maskUrl(args.ctx.normalized.url) }
      : {}),
    ...(args.includeBrief
      ? { prompt: args.brief }
      : { promptSha256: sha256Hex(args.brief) }),
  };
  return parseVideoSchema("manifest.json", ManifestSchema, manifest);
}
