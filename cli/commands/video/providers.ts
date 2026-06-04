import type {
  AudioRef,
  Brief,
  Captions,
  CapturePlan,
  Instructions,
  NarrationLine,
  RawFootage,
  RenderSpec,
  Scene,
  Script,
  Timing,
  VideoArtifact,
  VisualAsset,
} from "./types.js";

export interface Availability {
  ok: boolean;
  reason?: string;
  remediation?: string;
}

export interface CostEstimate {
  usd: number;
  basis: string;
}

export interface ProviderMeta {
  id: string;
  available(): Promise<Availability>;
  estimateCost(input: unknown): CostEstimate;
}

export interface ScriptOpts {
  maxScenes: number;
}

/**
 * `dryRun` plans the run (script + render-spec) without doing real external
 * work: providers take their deterministic fallback branch and skip vendor
 * readiness probes (which otherwise spawn `oma image doctor` / hit Voicebox per
 * scene). Treated exactly like mock mode for the real-vs-fallback decision.
 */
export interface VoiceOpts {
  runDir: string;
  voice: string;
  locale: string;
  dryRun?: boolean;
}

export interface VisualOpts {
  runDir: string;
  seed: number;
  aspect: "9:16" | "16:9" | "1:1";
  timeoutMs: number;
  dryRun?: boolean;
}

export interface CaptionOpts {
  runDir: string;
  style: "tiktok" | "lower-third" | "none";
  locale: string;
  sourceLocale: string;
  dryRun?: boolean;
}

export interface ScriptProvider extends ProviderMeta {
  generate(brief: Brief, opts: ScriptOpts): Promise<Script>;
}

export interface VoiceProvider extends ProviderMeta {
  synthesize(
    lines: NarrationLine[],
    opts: VoiceOpts,
  ): Promise<{ audio: AudioRef; timing: Timing }>;
}

export interface VisualProvider extends ProviderMeta {
  kind: "still" | "clip" | "mixed";
  produce(scene: Scene, opts: VisualOpts): Promise<VisualAsset>;
}

export interface CaptionProvider extends ProviderMeta {
  align(
    text: string[],
    timing: Timing,
    audio: AudioRef,
    opts: CaptionOpts,
  ): Promise<Captions>;
}

export interface CaptureProvider extends ProviderMeta {
  guide(plan: CapturePlan): Promise<Instructions>;
  ingest(path: string): Promise<RawFootage>;
  /**
   * Optional live capture (backward-compatible). A provider that implements this
   * performs a real headed capture of `plan.url` and returns the produced
   * footage. Providers without it (e.g. `GuidedCaptureProvider`) remain the
   * key-optional fallback — the orchestrator only calls `record` when present.
   */
  record?(plan: CapturePlan): Promise<RawFootage>;
}

export interface Compositor extends ProviderMeta {
  render(spec: RenderSpec): Promise<VideoArtifact>;
}

export type Capability =
  | "script"
  | "voice"
  | "visual"
  | "caption"
  | "capture"
  | "compositor";

export type CapabilityProvider =
  | ScriptProvider
  | VoiceProvider
  | VisualProvider
  | CaptionProvider
  | CaptureProvider
  | Compositor;
