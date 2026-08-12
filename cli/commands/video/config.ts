import type { z } from "zod";
import { AGENTS_RESULTS_DIR } from "../../constants/paths.js";
import {
  deepMerge,
  readRootOmaConfig,
  skillSectionFrom,
} from "../../platform/agent-config/skill-sections.js";
import {
  type CaptionStyleSchema,
  type CompositorNameSchema,
  type MusicModeSchema,
  type VideoAspectInputSchema,
  VideoModeSchema,
  type VisualModeSchema,
} from "./types.js";

type VideoMode = z.infer<typeof VideoModeSchema>;
type VideoAspectInput = z.infer<typeof VideoAspectInputSchema>;
type CaptionStyle = z.infer<typeof CaptionStyleSchema>;
type VisualMode = z.infer<typeof VisualModeSchema>;
type MusicMode = z.infer<typeof MusicModeSchema>;
type CompositorName = z.infer<typeof CompositorNameSchema>;

export interface ProviderOrderConfig {
  order: string[];
}

export interface EnvGatedProviderConfig {
  enabled: boolean;
  envVar?: string;
}

export interface VideoConfig {
  defaultOutputDir: string;
  defaultMode: VideoMode;
  defaultAspect: VideoAspectInput;
  defaultLocale: string;
  defaultCaptions: CaptionStyle;
  defaultVisual: VisualMode;
  defaultVoice: string;
  defaultMusic: MusicMode;
  defaultCompositor: CompositorName;
  defaultTimeoutSec: number;
  yes: boolean;
  providers: {
    script: ProviderOrderConfig;
    voice: ProviderOrderConfig;
    visual: ProviderOrderConfig;
    caption: ProviderOrderConfig;
    capture: ProviderOrderConfig;
    music: ProviderOrderConfig;
    compositor: ProviderOrderConfig;
    pexels: EnvGatedProviderConfig;
    pixelle: EnvGatedProviderConfig;
  };
  cost: {
    guardrailUsd: number;
  };
  limits: {
    maxDurationSec: number;
    maxScenes: number;
  };
  naming: {
    singleFolderPattern: string;
  };
  language: string;
}

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  defaultOutputDir: `${AGENTS_RESULTS_DIR}/videos`,
  defaultMode: "shorts",
  defaultAspect: "auto",
  defaultLocale: "en",
  defaultCaptions: "tiktok",
  defaultVisual: "auto",
  defaultVoice: "none",
  defaultMusic: "none",
  defaultCompositor: "remotion",
  defaultTimeoutSec: 600,
  yes: false,
  providers: {
    script: { order: ["agent-script"] },
    voice: { order: ["oma-voice"] },
    visual: { order: ["oma-image", "pexels", "pixelle"] },
    caption: { order: ["oma-captions"] },
    capture: { order: ["playwright-web", "cap"] },
    music: { order: ["strudel"] },
    compositor: { order: ["remotion", "mpt"] },
    pexels: { enabled: false, envVar: "PEXELS_API_KEY" },
    pixelle: { enabled: false, envVar: "RUNNINGHUB_API_KEY" },
  },
  cost: { guardrailUsd: 0.2 },
  limits: { maxDurationSec: 180, maxScenes: 40 },
  naming: { singleFolderPattern: "{timestamp}-{shortid}-{mode}" },
  language: "en",
};

/**
 * Resolve the effective config: shipped defaults < the `video:` section of
 * `.agents/oma-config.yaml` < env vars < CLI flags (design 024).
 *
 * `.agents/skills/oma-video/config/video-config.yaml` is not consulted. It was
 * the pre-024 home for these settings; migration 022 moves a user's diverged
 * keys into oma-config.
 */
export async function loadVideoConfig(
  cwd = process.cwd(),
): Promise<VideoConfig> {
  const root = readRootOmaConfig(cwd);
  // structuredClone, not a reference: applyEnvOverrides mutates the result, and
  // sharing nested objects would write those mutations into the module default.
  let raw = structuredClone(DEFAULT_VIDEO_CONFIG) as unknown as Record<
    string,
    unknown
  >;

  const section = skillSectionFrom(root, "video");
  if (section) raw = deepMerge(raw, normalizeKeys(section));

  const merged = raw as unknown as VideoConfig;
  applyEnvOverrides(merged);
  // `language` is a root key, never a per-skill one — one read serves both.
  const language = root?.language;
  if (typeof language === "string" && language) merged.language = language;
  return merged;
}

/** Map the section's snake_case keys onto the internal camelCase shape. */
function normalizeKeys(raw: Record<string, unknown>): Partial<VideoConfig> {
  const out: Partial<VideoConfig> & Record<string, unknown> = {};
  const map: Record<string, string> = {
    default_output_dir: "defaultOutputDir",
    default_mode: "defaultMode",
    default_aspect: "defaultAspect",
    default_locale: "defaultLocale",
    default_captions: "defaultCaptions",
    default_visual: "defaultVisual",
    default_voice: "defaultVoice",
    default_music: "defaultMusic",
    default_compositor: "defaultCompositor",
    default_timeout_sec: "defaultTimeoutSec",
  };
  for (const [key, value] of Object.entries(raw)) {
    const mapped = map[key] ?? key;
    if (mapped === "cost" && value && typeof value === "object") {
      const cost = value as Record<string, unknown>;
      out.cost = {
        guardrailUsd:
          (cost.guardrail_usd as number) ??
          (cost.guardrailUsd as number) ??
          DEFAULT_VIDEO_CONFIG.cost.guardrailUsd,
      };
    } else if (mapped === "limits" && value && typeof value === "object") {
      const limits = value as Record<string, unknown>;
      out.limits = {
        maxDurationSec:
          (limits.max_duration_sec as number) ??
          (limits.maxDurationSec as number) ??
          DEFAULT_VIDEO_CONFIG.limits.maxDurationSec,
        maxScenes:
          (limits.max_scenes as number) ??
          (limits.maxScenes as number) ??
          DEFAULT_VIDEO_CONFIG.limits.maxScenes,
      };
    } else if (mapped === "naming" && value && typeof value === "object") {
      const naming = value as Record<string, unknown>;
      out.naming = {
        singleFolderPattern:
          (naming.single_folder_pattern as string) ??
          (naming.singleFolderPattern as string) ??
          DEFAULT_VIDEO_CONFIG.naming.singleFolderPattern,
      };
    } else if (mapped === "providers" && value && typeof value === "object") {
      out.providers = normalizeProviders(value as Record<string, unknown>);
    } else {
      (out as Record<string, unknown>)[mapped] = value;
    }
  }
  return out;
}

/**
 * Pass provider entries through untouched except for `env_var`, which oma-config
 * spells snake_case like every other key it holds while the type uses `envVar`.
 */
function normalizeProviders(
  raw: Record<string, unknown>,
): VideoConfig["providers"] {
  const out: Record<string, unknown> = {};
  for (const [name, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      out[name] = entry;
      continue;
    }
    const { env_var: envVar, ...rest } = entry as Record<string, unknown>;
    out[name] = envVar === undefined ? rest : { ...rest, envVar };
  }
  return out as VideoConfig["providers"];
}

function applyEnvOverrides(cfg: VideoConfig): void {
  if (process.env.OMA_VIDEO_DEFAULT_MODE) {
    const mode = VideoModeSchema.safeParse(process.env.OMA_VIDEO_DEFAULT_MODE);
    if (mode.success) cfg.defaultMode = mode.data;
  }
  if (process.env.OMA_VIDEO_DEFAULT_OUT) {
    cfg.defaultOutputDir = process.env.OMA_VIDEO_DEFAULT_OUT;
  }
  if (process.env.OMA_VIDEO_YES === "1") {
    cfg.yes = true;
  }
  cfg.providers.pexels.enabled = Boolean(process.env.PEXELS_API_KEY);
  cfg.providers.pixelle.enabled = Boolean(process.env.RUNNINGHUB_API_KEY);
}
