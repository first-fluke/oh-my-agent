import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { VideoConfig } from "./config.js";
import {
  CostGuardrailError,
  exitCodeForError,
  messageForError,
  ProviderUnavailableError,
  VIDEO_EXIT_CODES,
} from "./errors.js";
import { collectAssetRecord, writeManifest } from "./manifest.js";
import { makeVideoRunId } from "./naming.js";
import { emitRawDemoOutput, handleCapture } from "./orchestrator/capture.js";
import {
  buildManifest,
  writeValidatedJson,
} from "./orchestrator/manifest-build.js";
import { normalizeGenerateOptions } from "./orchestrator/options.js";
import {
  buildRenderSpec,
  visualProviderOrder,
} from "./orchestrator/render-spec.js";
import type { RunContext } from "./orchestrator/run-context.js";
import { resolveVideoRunDir } from "./path-guard.js";
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
  type Brief,
  type Captions,
  RenderSpecSchema,
  ScriptSchema,
  TimingSchema,
  type VideoManifest,
  type VisualAsset,
} from "./types.js";

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
        await handleCapture(cwd, ctx);
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
        await emitRawDemoOutput(runDir, ctx);
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
