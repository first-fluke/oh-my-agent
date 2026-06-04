import { z } from "zod";
import { SchemaValidationError } from "./errors.js";

export const VIDEO_SCHEMA_VERSION = "1.0" as const;

export const VideoModeSchema = z.enum(["shorts", "explainer", "demo"]);
export const VideoAspectSchema = z.enum(["9:16", "16:9", "1:1"]);
export const VideoAspectInputSchema = z.enum(["9:16", "16:9", "1:1", "auto"]);
export const CaptionStyleSchema = z.enum(["tiktok", "lower-third", "none"]);
export const VisualModeSchema = z.enum([
  "auto",
  "generate",
  "stock",
  "aigc",
  "slide",
]);
export const MusicModeSchema = z.enum(["upbeat", "calm", "none"]);
export const CompositorNameSchema = z.enum(["remotion", "mpt"]);
export const OutputFormatSchema = z.enum(["text", "json"]);

const SchemaVersion = z.literal(VIDEO_SCHEMA_VERSION);

export const ScriptSceneSchema = z.object({
  id: z.string().min(1),
  durationSec: z.number().positive(),
  narration: z.string(),
  onScreenText: z.array(z.string()).default([]),
  visual: z.object({
    kind: z.enum(["still", "clip", "mixed", "slide", "capture"]),
    prompt: z.string().optional(),
    ref: z.string().optional(),
    source: z.string().optional(),
  }),
  transition: z.string().optional(),
});

export const ScriptSchema = z.object({
  schemaVersion: SchemaVersion,
  mode: VideoModeSchema,
  aspect: VideoAspectSchema,
  locale: z.string().min(1),
  title: z.string().min(1),
  scenes: z.array(ScriptSceneSchema).min(1),
  music: MusicModeSchema,
  brand: z.record(z.string(), z.unknown()).default({}),
});
export type Script = z.infer<typeof ScriptSchema>;
export type Scene = z.infer<typeof ScriptSceneSchema>;

export const TimingSchema = z.object({
  schemaVersion: SchemaVersion,
  // Empty when the estimated/silent fallback path runs (no wav written); set to
  // the run-dir-relative wav path on the real voicebox-stt / tts-native path.
  audio: z.string(),
  totalSec: z.number().nonnegative(),
  segments: z.array(
    z.object({
      sceneId: z.string().min(1),
      startSec: z.number().nonnegative(),
      endSec: z.number().nonnegative(),
      words: z.array(
        z.object({
          t: z.string(),
          startSec: z.number().nonnegative(),
          endSec: z.number().nonnegative(),
        }),
      ),
    }),
  ),
  source: z.enum(["tts-native", "voicebox-stt", "whisper-cpp", "estimated"]),
});
export type Timing = z.infer<typeof TimingSchema>;

export const RenderSpecSchema = z.object({
  schemaVersion: SchemaVersion,
  compositor: CompositorNameSchema,
  composition: z.string().min(1),
  fps: z.number().int().positive(),
  dimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  durationInFrames: z.number().int().nonnegative(),
  audio: z.object({
    narration: z.string().optional(),
    music: z.string().optional(),
    musicGainDb: z.number().optional(),
  }),
  scenes: z.array(
    z.object({
      id: z.string().min(1),
      fromFrame: z.number().int().nonnegative(),
      durationInFrames: z.number().int().positive(),
      visual: z.object({
        type: z.enum(["image", "video", "slide", "capture", "placeholder"]),
        src: z.string().min(1),
        kenBurns: z.boolean().default(false),
      }),
      onScreenText: z.array(z.string()).default([]),
      transitionOut: z.string().optional(),
    }),
  ),
  captions: z.object({
    file: z.string().optional(),
    style: CaptionStyleSchema,
    fontFamily: z.string(),
    maxWidthPct: z.number().positive().max(100),
    safeArea: z.object({
      topPct: z.number().nonnegative(),
      bottomPct: z.number().nonnegative(),
      leftPct: z.number().nonnegative(),
      rightPct: z.number().nonnegative(),
    }),
  }),
  background: z.object({
    type: z.enum(["color", "image", "video"]),
    src: z.string().optional(),
  }),
  seed: z.number().int(),
});
export type RenderSpec = z.infer<typeof RenderSpecSchema>;

export const ManifestSchema = z.object({
  schemaVersion: SchemaVersion,
  runId: z.string().min(1),
  mode: VideoModeSchema,
  providers: z.object({
    script: z.string().optional(),
    voice: z.string().optional(),
    visual: z.array(z.string()).default([]),
    caption: z.string().optional(),
    capture: z.string().optional(),
    compositor: z.string().optional(),
  }),
  assets: z.array(
    z.object({
      path: z.string().min(1),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      bytes: z.number().int().nonnegative(),
      seed: z.number().int().optional(),
    }),
  ),
  outputs: z.object({
    video: z.string().optional(),
    durationSec: z.number().nonnegative().optional(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  }),
  cost: z.object({
    usd: z.number().nonnegative(),
    breakdown: z.record(z.string(), z.number().nonnegative()),
  }),
  warnings: z.array(z.string()),
  exitCode: z.number().int().min(0).max(6),
  /** True when the run included nondeterministic live capture (web/demo). */
  nondeterministic: z.boolean().optional(),
  /**
   * For a live web capture: the target URL with query/hash MASKED. Never carries
   * raw query tokens. Absent for non-web runs.
   */
  captureUrlMasked: z.string().optional(),
  prompt: z.string().optional(),
  promptSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});
export type VideoManifest = z.infer<typeof ManifestSchema>;

export interface Brief {
  text: string;
  mode: z.infer<typeof VideoModeSchema>;
  aspect: z.infer<typeof VideoAspectSchema>;
  locale: string;
  durationSec?: number;
  seed: number;
}

export interface NarrationLine {
  sceneId: string;
  text: string;
}

export interface AudioRef {
  path: string;
}

export interface VisualAsset {
  sceneId: string;
  path: string;
  type: "image" | "video" | "slide" | "capture" | "placeholder";
  providerId: string;
  /** Which path produced this asset: "real" (external call) or "fallback". */
  pathTaken: "real" | "fallback";
}

export interface Captions {
  path: string;
  vttPath?: string;
  style: z.infer<typeof CaptionStyleSchema>;
  /** Locale actually used; may differ from requested when translation absent. */
  locale: string;
  pathTaken: "real" | "fallback";
}

export interface VideoArtifact {
  path: string;
  durationSec: number;
  /** Which path produced this artifact: "real" (Remotion render) or "fallback". */
  pathTaken?: "real" | "fallback";
  /** Non-fatal notices to surface in the manifest (e.g. real-branch fell back). */
  warnings?: string[];
}

export interface CapturePlan {
  mode: "demo";
  capturePath?: string;
  /** "file": ingest a pre-recorded path; "web": live headed web capture. */
  source?: "file" | "web";
  /** Target URL for source "web" (any URL — local / staging / prod). */
  url?: string;
  /** Recording frame size, derived from --aspect / --device when omitted. */
  size?: { width: number; height: number };
  /** Optional CSS selector to await before the meaningful capture (SPA hydration). */
  readySelector?: string;
  /** Overlay a visible cursor in the recording for clarity. */
  showCursor?: boolean;
  /** Hard ceiling for the live capture (ms); the run aborts cleanly past it. */
  timeoutMs?: number;
  /** Absolute run directory the live recording + outputs are confined to. */
  runDir?: string;
  /**
   * Non-interactive stop mode for CI / tests. `duration:<sec>` stops after N
   * seconds; `selector:<css>` stops when the selector appears. Omitted → the
   * interactive ENTER prompt (the real, human-supervised path).
   */
  stop?: string;
}

export interface Instructions {
  message: string;
}

export interface RawFootage {
  path: string;
}

/**
 * Snap an aspect to an image-generation size whose edges are both multiples of
 * 16 (oma-image / gpt-image-2 constraint). Design 013 §5: 9:16 → 1088×1920,
 * 16:9 → 1920×1088, 1:1 → 1088×1088. Remotion later crops to the exact frame.
 */
export function snapAspectToImageSize(aspect: "9:16" | "16:9" | "1:1"): {
  width: number;
  height: number;
} {
  if (aspect === "9:16") return { width: 1088, height: 1920 };
  if (aspect === "1:1") return { width: 1088, height: 1088 };
  return { width: 1920, height: 1088 };
}

export function parseVideoSchema<T extends z.ZodTypeAny>(
  schemaName: string,
  schema: T,
  value: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  const field = issue?.path.length ? issue.path.join(".") : "(root)";
  throw new SchemaValidationError(
    `${schemaName} validation failed at ${field}: ${issue?.message ?? "invalid value"}`,
    schemaName,
  );
}
