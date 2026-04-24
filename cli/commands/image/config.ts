import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

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
  defaultOutputDir: ".agents/results/images",
  defaultVendor: "auto",
  defaultSize: "1024x1024",
  defaultQuality: "auto",
  defaultCount: 1,
  defaultTimeoutSec: 180,
  vendors: {
    codex: { enabled: true, model: "gpt-image-2", extra_args: [] },
    gemini: {
      // Disabled by default — Gemini image models require billing on AI Studio
      // or Vertex AI. Flip to true after enabling billing + setting GEMINI_API_KEY.
      enabled: false,
      model: "gemini-2.5-flash-image",
      strategies: ["mcp", "stream", "api"],
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
      gemini: {
        "gemini-2.5-flash-image": {
          low: 0.04,
          medium: 0.04,
          high: 0.04,
          auto: 0.04,
        },
      },
      pollinations: {
        flux: { low: 0, medium: 0, high: 0, auto: 0 },
        sana: { low: 0, medium: 0, high: 0, auto: 0 },
        turbo: { low: 0, medium: 0, high: 0, auto: 0 },
        gptimage: { low: 0, medium: 0, high: 0, auto: 0 },
        "qwen-image": { low: 0, medium: 0, high: 0, auto: 0 },
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

const CONFIG_PATH = ".agents/skills/oma-image/config/image-config.yaml";

export async function loadConfig(cwd = process.cwd()): Promise<ImageConfig> {
  const full = path.join(cwd, CONFIG_PATH);
  let fileConfig: Partial<ImageConfig> = {};
  if (existsSync(full)) {
    const raw = await readFile(full, "utf8");
    fileConfig = normalizeKeys(YAML.parse(raw) ?? {});
  }

  const merged: ImageConfig = {
    ...DEFAULTS,
    ...fileConfig,
    vendors: { ...DEFAULTS.vendors, ...(fileConfig.vendors ?? {}) },
    costGuardrail: {
      ...DEFAULTS.costGuardrail,
      ...(fileConfig.costGuardrail ?? {}),
    },
    compare: { ...DEFAULTS.compare, ...(fileConfig.compare ?? {}) },
    naming: { ...DEFAULTS.naming, ...(fileConfig.naming ?? {}) },
  };

  applyEnvOverrides(merged);
  applyRootLanguage(merged, cwd);
  return merged;
}

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
  if (process.env.OMA_IMAGE_GEMINI_STRATEGIES) {
    const list = process.env.OMA_IMAGE_GEMINI_STRATEGIES.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (cfg.vendors.gemini) cfg.vendors.gemini.strategies = list;
  }
}

function applyRootLanguage(cfg: ImageConfig, cwd: string): void {
  const rootConfigPath = path.join(cwd, ".agents/oma-config.yaml");
  if (!existsSync(rootConfigPath)) return;
  try {
    const raw = YAML.parse(
      require("node:fs").readFileSync(rootConfigPath, "utf8"),
    ) as { language?: string } | null;
    if (raw?.language) cfg.language = raw.language;
  } catch {
    // ignore
  }
}
