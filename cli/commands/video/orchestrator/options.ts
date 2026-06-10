import { z } from "zod";
import type { VideoConfig } from "../config.js";
import { SchemaValidationError } from "../errors.js";
import {
  CaptionStyleSchema,
  CompositorNameSchema,
  MusicModeSchema,
  parseVideoSchema,
  VideoAspectInputSchema,
  VideoModeSchema,
  VisualModeSchema,
} from "../types.js";

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

export interface NormalizedGenerateOptions {
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

export function normalizeGenerateOptions(
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
