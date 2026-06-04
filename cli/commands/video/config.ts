import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import type { z } from "zod";
import { AGENTS_RESULTS_DIR } from "../../constants/paths.js";
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
    compositor: { order: ["remotion", "mpt"] },
    pexels: { enabled: false, envVar: "PEXELS_API_KEY" },
    pixelle: { enabled: false, envVar: "RUNNINGHUB_API_KEY" },
  },
  cost: { guardrailUsd: 0.2 },
  limits: { maxDurationSec: 180, maxScenes: 40 },
  naming: { singleFolderPattern: "{timestamp}-{shortid}-{mode}" },
  language: "en",
};

const PROJECT_CONFIG_PATH = ".agents/skills/oma-video/config/video-config.yaml";

export async function loadVideoConfig(
  cwd = process.cwd(),
): Promise<VideoConfig> {
  const full = path.join(cwd, PROJECT_CONFIG_PATH);
  let fileConfig: Partial<VideoConfig> = {};
  if (existsSync(full)) {
    const raw = await readFile(full, "utf8");
    fileConfig = normalizeKeys(YAML.parse(raw) ?? {});
  }

  const merged = mergeConfig(DEFAULT_VIDEO_CONFIG, fileConfig);
  applyEnvOverrides(merged);
  applyRootLanguage(merged, cwd);
  return merged;
}

function mergeConfig(
  defaults: VideoConfig,
  fileConfig: Partial<VideoConfig>,
): VideoConfig {
  return {
    ...defaults,
    ...fileConfig,
    providers: {
      ...defaults.providers,
      ...(fileConfig.providers ?? {}),
      script: {
        ...defaults.providers.script,
        ...(fileConfig.providers?.script ?? {}),
      },
      voice: {
        ...defaults.providers.voice,
        ...(fileConfig.providers?.voice ?? {}),
      },
      visual: {
        ...defaults.providers.visual,
        ...(fileConfig.providers?.visual ?? {}),
      },
      caption: {
        ...defaults.providers.caption,
        ...(fileConfig.providers?.caption ?? {}),
      },
      capture: {
        ...defaults.providers.capture,
        ...(fileConfig.providers?.capture ?? {}),
      },
      compositor: {
        ...defaults.providers.compositor,
        ...(fileConfig.providers?.compositor ?? {}),
      },
      pexels: {
        ...defaults.providers.pexels,
        ...(fileConfig.providers?.pexels ?? {}),
      },
      pixelle: {
        ...defaults.providers.pixelle,
        ...(fileConfig.providers?.pixelle ?? {}),
      },
    },
    cost: { ...defaults.cost, ...(fileConfig.cost ?? {}) },
    limits: { ...defaults.limits, ...(fileConfig.limits ?? {}) },
    naming: { ...defaults.naming, ...(fileConfig.naming ?? {}) },
  };
}

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
    } else {
      (out as Record<string, unknown>)[mapped] = value;
    }
  }
  return out;
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

function applyRootLanguage(cfg: VideoConfig, cwd: string): void {
  const rootConfigPath = path.join(cwd, ".agents/oma-config.yaml");
  if (!existsSync(rootConfigPath)) return;
  try {
    const raw = YAML.parse(readFileSync(rootConfigPath, "utf8")) as {
      language?: string;
    } | null;
    if (raw?.language) cfg.language = raw.language;
  } catch {
    // ignore malformed root config; callers still get defaults
  }
}
