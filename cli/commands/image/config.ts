import { AGENTS_RESULTS_DIR } from "../../constants/paths.js";
import {
  deepMerge,
  readRootOmaConfig,
  skillSectionFrom,
} from "../../platform/agent-config/skill-sections.js";

export type VendorConfig = {
  enabled: boolean;
  model: string;
  strategies?: string[];
  extra_args?: string[];
};

export interface ImageConfig {
  defaultOutputDir: string;
  defaultVendor: string;
  defaultSize: string;
  defaultQuality: string;
  defaultCount: number;
  defaultTimeoutSec: number;
  vendors: Record<string, VendorConfig>;
  costGuardrail: {
    estimateThresholdUsd: number;
    perImageUsd: Record<string, Record<string, Record<string, number>>>;
  };
  compare: { folderPattern: string; manifest: boolean };
  naming: {
    singleFolderPattern: string;
  };
  language: string;
}

const DEFAULTS: ImageConfig = {
  defaultOutputDir: `${AGENTS_RESULTS_DIR}/images`,
  defaultVendor: "auto",
  defaultSize: "1024x1024",
  defaultQuality: "auto",
  defaultCount: 1,
  defaultTimeoutSec: 180,
  vendors: {
    codex: { enabled: true, model: "gpt-image-2", extra_args: [] },
    antigravity: {
      // Antigravity CLI (`agy`) is an agentic CLI that drives its own image
      // generation tool over the Gemini Code Assist subscription. The exact
      // model agy chooses internally is opaque to us — we don't pass a model
      // hint, don't record one in the manifest, and don't embed one in
      // filenames. No API key, no per-image charge.
      enabled: true,
      model: "",
    },
    pollinations: {
      enabled: true,
      model: "flux",
    },
  },
  costGuardrail: {
    estimateThresholdUsd: 0.2,
    perImageUsd: {
      codex: {
        "gpt-image-2": { low: 0.02, medium: 0.03, high: 0.04, auto: 0.03 },
      },
      antigravity: {
        "": { low: 0, medium: 0, high: 0, auto: 0 },
      },
      // Mirrors FREE_MODELS/CREDIT_MODELS in providers/pollinations.ts.
      // Credit-gated models bill prepaid pollen credits, not USD, so the
      // USD guardrail estimate stays 0 for all of them.
      pollinations: {
        flux: { low: 0, medium: 0, high: 0, auto: 0 },
        zimage: { low: 0, medium: 0, high: 0, auto: 0 },
        "qwen-image": { low: 0, medium: 0, high: 0, auto: 0 },
        "wan-image": { low: 0, medium: 0, high: 0, auto: 0 },
        gptimage: { low: 0, medium: 0, high: 0, auto: 0 },
        "gptimage-large": { low: 0, medium: 0, high: 0, auto: 0 },
        "gpt-image-2": { low: 0, medium: 0, high: 0, auto: 0 },
        klein: { low: 0, medium: 0, high: 0, auto: 0 },
        kontext: { low: 0, medium: 0, high: 0, auto: 0 },
      },
    },
  },
  compare: {
    folderPattern: "{timestamp}-{shortid}-compare",
    manifest: true,
  },
  naming: {
    singleFolderPattern: "{timestamp}-{shortid}",
  },
  language: "en",
};

/**
 * Resolve the effective config: shipped defaults < the `image:` section of
 * `.agents/oma-config.yaml` < env vars < CLI flags (design 024).
 *
 * `.agents/skills/oma-image/config/image-config.yaml` is not consulted. It was
 * the pre-024 home for these settings; migration 022 moves a user's diverged
 * keys into oma-config.
 */
export async function loadConfig(cwd = process.cwd()): Promise<ImageConfig> {
  const root = readRootOmaConfig(cwd);
  // structuredClone, not a reference: applyEnvOverrides mutates the result, and
  // sharing nested objects would write those mutations into the module default.
  let raw = structuredClone(DEFAULTS) as unknown as Record<string, unknown>;

  const section = skillSectionFrom(root, "image");
  if (section) raw = deepMerge(raw, normalizeKeys(section));

  const merged = raw as unknown as ImageConfig;
  applyEnvOverrides(merged);
  // `language` is a root key, never a per-skill one — one read serves both.
  const language = root?.language;
  if (typeof language === "string" && language) merged.language = language;
  return merged;
}

/** Map the section's snake_case keys onto the internal camelCase shape. */
function normalizeKeys(raw: Record<string, unknown>): Partial<ImageConfig> {
  const out: Partial<ImageConfig> & Record<string, unknown> = {};
  const map: Record<string, string> = {
    default_output_dir: "defaultOutputDir",
    default_vendor: "defaultVendor",
    default_size: "defaultSize",
    default_quality: "defaultQuality",
    default_count: "defaultCount",
    default_timeout_sec: "defaultTimeoutSec",
    cost_guardrail: "costGuardrail",
  };
  for (const [k, v] of Object.entries(raw)) {
    const mapped = map[k] ?? k;
    if (mapped === "costGuardrail" && v && typeof v === "object") {
      const cg = v as Record<string, unknown>;
      out.costGuardrail = {
        estimateThresholdUsd:
          (cg.estimate_threshold_usd as number) ??
          (cg.estimateThresholdUsd as number) ??
          DEFAULTS.costGuardrail.estimateThresholdUsd,
        perImageUsd:
          ((cg.per_image_usd ??
            cg.perImageUsd) as ImageConfig["costGuardrail"]["perImageUsd"]) ??
          DEFAULTS.costGuardrail.perImageUsd,
      };
    } else if (mapped === "compare" && v && typeof v === "object") {
      const c = v as Record<string, unknown>;
      out.compare = {
        folderPattern:
          (c.folder_pattern as string) ??
          (c.folderPattern as string) ??
          DEFAULTS.compare.folderPattern,
        manifest: (c.manifest as boolean) ?? DEFAULTS.compare.manifest,
      };
    } else if (mapped === "naming" && v && typeof v === "object") {
      const n = v as Record<string, unknown>;
      out.naming = {
        singleFolderPattern:
          (n.single_folder_pattern as string) ??
          (n.singleFolderPattern as string) ??
          DEFAULTS.naming.singleFolderPattern,
      };
    } else {
      (out as Record<string, unknown>)[mapped] = v;
    }
  }
  return out;
}

function applyEnvOverrides(cfg: ImageConfig): void {
  if (process.env.OMA_IMAGE_DEFAULT_VENDOR) {
    cfg.defaultVendor = process.env.OMA_IMAGE_DEFAULT_VENDOR;
  }
  if (process.env.OMA_IMAGE_DEFAULT_OUT) {
    cfg.defaultOutputDir = process.env.OMA_IMAGE_DEFAULT_OUT;
  }
}
