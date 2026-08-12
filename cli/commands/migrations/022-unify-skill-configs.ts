/**
 * Migration 022: move user overrides out of the per-skill config files and into
 * `.agents/oma-config.yaml`.
 *
 * `.agents/skills/` is replaced wholesale on every `oma update`, so anything a
 * user set in a skill's own `config/` YAML was destroyed on their next
 * update — silently, with no diff. `.agents/oma-config.yaml` is the one file
 * install/update/uninstall treat as user-owned. Design:
 * docs/plans/designs/024-unify-skill-configs.md.
 *
 * Only *changed* keys move. Each legacy file is deep-diffed against the default
 * it shipped with, and just the diverging leaves are appended to oma-config. A
 * user who never edited a file gets nothing written, and keeps receiving
 * upstream default changes instead of a frozen copy of today's values.
 *
 * Idempotent. Writes are append-only — an existing top-level key in oma-config
 * is never rewritten, so user comments and ordering survive.
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  omitPaths,
  sparseDiff,
} from "../../platform/agent-config/skill-sections.js";
import { appendMissingConfigKeys } from "../update/config-merge.js";
import type { Migration } from "./index.js";

const APPEND_HEADER =
  "Added by oma migration 022 — moved from .agents/skills/*/config/*.yaml, " +
  "which `oma update` overwrites. Edit freely.";

interface SkillMigration {
  /** oma-config top-level section this skill's overrides land in. */
  section: string;
  /** Legacy file, relative to `.agents/skills/`. */
  file: string;
  /** The values this file shipped with, in its own YAML key shape. */
  shipped: Record<string, unknown>;
  /**
   * Keys that are not preferences and must not migrate: env-derived flags, keys
   * sourced from elsewhere, and advertised-scope lists.
   */
  drop?: readonly string[];
  /**
   * Delete the file when it turns out to be unmodified.
   *
   * True only where the shipped defaults live in TypeScript. For the agent-read
   * skills the YAML *is* the shipped default the SKILL.md falls back to, and
   * migrations run again after `oma update` re-copies `.agents/` — deleting
   * those would strip the defaults on every single update.
   */
  deleteWhenPristine: boolean;
  /** Rewrite the sparse override set before it is written to oma-config. */
  reshape?: (overrides: Record<string, unknown>) => Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Shipped defaults, frozen at this migration's release.
//
// Snapshots rather than imports on purpose: a migration has to diff against
// what the user's file shipped with, and importing today's live defaults would
// silently change this migration's behaviour every time a default is tuned.
// ---------------------------------------------------------------------------

const VIDEO_SHIPPED: Record<string, unknown> = {
  default_output_dir: ".agents/results/videos",
  default_mode: "shorts",
  default_aspect: "auto",
  default_locale: "en",
  default_captions: "tiktok",
  default_visual: "auto",
  default_voice: "none",
  default_music: "none",
  default_compositor: "remotion",
  default_timeout_sec: 600,
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
  cost: { guardrail_usd: 0.2 },
  limits: { max_duration_sec: 180, max_scenes: 40 },
  naming: { single_folder_pattern: "{timestamp}-{shortid}-{mode}" },
};

const IMAGE_SHIPPED: Record<string, unknown> = {
  default_output_dir: ".agents/results/images",
  default_vendor: "auto",
  default_size: "1024x1024",
  default_quality: "auto",
  default_count: 1,
  default_timeout_sec: 180,
  vendors: {
    codex: { enabled: true, model: "gpt-image-2", extra_args: [] },
    antigravity: { enabled: true, model: "" },
    pollinations: { enabled: true, model: "flux" },
  },
  cost_guardrail: {
    estimate_threshold_usd: 0.2,
    per_image_usd: {
      codex: {
        "gpt-image-2": { low: 0.02, medium: 0.03, high: 0.04, auto: 0.03 },
      },
      antigravity: { "": { low: 0, medium: 0, high: 0, auto: 0 } },
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
  compare: { folder_pattern: "{timestamp}-{shortid}-compare", manifest: true },
  naming: { single_folder_pattern: "{timestamp}-{shortid}" },
};

const VOICE_SHIPPED: Record<string, unknown> = {
  notification_profile: null,
  asset_profile: null,
  output_dir: ".agents/results/voice",
  auto_notify_after_sec: 60,
  max_tts_chars: 5000,
  max_stt_minutes: 30,
};

const HWP_SHIPPED: Record<string, unknown> = {
  format: "markdown",
  version: { channel: "latest", pinned: "4.1.0" },
  output: { default_location: "same_dir" },
  supported_formats: ["hwp", "hwpx", "hwpml"],
};

const PDF_SHIPPED: Record<string, unknown> = {
  format: "markdown",
  image_output: "off",
  image_format: "png",
  use_struct_tree: false,
  ocr: { enabled: false, languages: "en", hybrid_port: 5002 },
  output: { default_location: "same_dir", overwrite: false },
};

const SCHOLAR_SHIPPED: Record<string, unknown> = {
  api: { base_url: "https://knows.academy" },
};

const SKILLS: readonly SkillMigration[] = [
  {
    section: "video",
    file: "oma-video/config/video-config.yaml",
    shipped: VIDEO_SHIPPED,
    // pexels/pixelle `enabled` is recomputed from the environment on every run
    // (config.ts applyEnvOverrides), so the file value has never had an effect.
    // `language` comes from oma-config's root `language:` key.
    drop: ["providers.pexels.enabled", "providers.pixelle.enabled", "language"],
    deleteWhenPristine: true,
    reshape: renameProviderEnvVar,
  },
  {
    section: "image",
    file: "oma-image/config/image-config.yaml",
    shipped: IMAGE_SHIPPED,
    drop: ["language"],
    deleteWhenPristine: true,
  },
  {
    section: "voice",
    file: "oma-voice/config/voice-config.yaml",
    shipped: VOICE_SHIPPED,
    deleteWhenPristine: false,
  },
  {
    section: "hwp",
    file: "oma-hwp/config/hwp-config.yaml",
    // Advertised scope, not a preference — stays in the skill file.
    shipped: HWP_SHIPPED,
    drop: ["supported_formats"],
    deleteWhenPristine: false,
  },
  {
    section: "pdf",
    file: "oma-pdf/config/pdf-config.yaml",
    shipped: PDF_SHIPPED,
    deleteWhenPristine: false,
  },
  {
    section: "scholar",
    file: "oma-scholar/config/scholar-config.yaml",
    // Only the endpoint host is a preference. Endpoint paths, timeouts, id
    // prefixes and lint rules are protocol shape and stay in the skill file, so
    // the diff is scoped to `api.base_url` and flattened to `scholar.base_url`.
    shipped: SCHOLAR_SHIPPED,
    deleteWhenPristine: false,
    reshape: (overrides) => {
      const api = overrides.api;
      if (!isRecord(api) || !("base_url" in api)) return {};
      return { base_url: api.base_url };
    },
  },
];

/** oma-config spells this `env_var`, like every other key it holds. */
function renameProviderEnvVar(
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const providers = overrides.providers;
  if (!isRecord(providers)) return overrides;

  const renamed: Record<string, unknown> = {};
  for (const [name, entry] of Object.entries(providers)) {
    if (!isRecord(entry) || !("envVar" in entry)) {
      renamed[name] = entry;
      continue;
    }
    const { envVar, ...rest } = entry;
    renamed[name] = { ...rest, env_var: envVar };
  }
  return { ...overrides, providers: renamed };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readYamlRecord(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = parseYaml(readFileSync(path, "utf-8"));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Dot-separated paths to every leaf of a sparse object, for the action log. */
function leafPaths(source: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(source)) {
    const dotted = prefix ? `${prefix}.${key}` : key;
    if (isRecord(value)) out.push(...leafPaths(value, dotted));
    else out.push(dotted);
  }
  return out;
}

export const migrateUnifySkillConfigs: Migration = {
  name: "022-unify-skill-configs",
  // `.agents/**` is an oma-owned path — it exists only because oma created it —
  // so no vendor gate applies. The signature keeps parity with its siblings.
  up(cwd: string): string[] {
    const actions: string[] = [];
    const omaConfigPath = join(cwd, ".agents", "oma-config.yaml");
    const omaConfig = readYamlRecord(omaConfigPath);
    const sections: Record<string, unknown> = {};

    for (const skill of SKILLS) {
      const legacyPath = join(
        cwd,
        ".agents",
        "skills",
        ...skill.file.split("/"),
      );
      const legacy = readYamlRecord(legacyPath);
      if (!legacy) continue;

      let overrides = sparseDiff(legacy, skill.shipped);
      if (skill.drop) overrides = omitPaths(overrides, skill.drop);
      if (skill.reshape) overrides = skill.reshape(overrides);

      if (Object.keys(overrides).length === 0) {
        if (!skill.deleteWhenPristine) continue;
        try {
          unlinkSync(legacyPath);
          actions.push(`removed unmodified .agents/skills/${skill.file}`);
        } catch {
          // A read-only or already-gone file is not worth failing the run over.
        }
        continue;
      }

      // An existing section is the user's own — never rewrite it. Reporting the
      // skip is what keeps a partially-migrated install debuggable.
      if (omaConfig && skill.section in omaConfig) {
        actions.push(
          `kept .agents/skills/${skill.file} — oma-config already has a \`${skill.section}:\` section`,
        );
        continue;
      }

      sections[skill.section] = overrides;
      actions.push(
        `moved ${leafPaths(overrides)
          .map((key) => `${skill.section}.${key}`)
          .join(", ")} from .agents/skills/${skill.file}`,
      );
    }

    actions.push(...migrateActiveVendor(cwd, omaConfig, sections));
    actions.push(...migrateModelsYaml(cwd, omaConfig, sections));

    if (Object.keys(sections).length > 0) {
      actions.push(...writeSections(omaConfigPath, omaConfig, sections));
    }

    return actions;
  },
};

/**
 * `active_vendor` fires only when oma-config resolves no vendor at all, so it
 * differs from the hardcoded "claude" floor only when the user changed it.
 * cli-config.yaml itself stays: its `vendors:` half is a shipped capability
 * registry, not a preference.
 */
function migrateActiveVendor(
  cwd: string,
  omaConfig: Record<string, unknown> | null,
  sections: Record<string, unknown>,
): string[] {
  const cliConfig = readYamlRecord(
    join(
      cwd,
      ".agents",
      "skills",
      "oma-orchestrator",
      "config",
      "cli-config.yaml",
    ),
  );
  const activeVendor = cliConfig?.active_vendor;
  if (typeof activeVendor !== "string" || activeVendor === "claude") return [];
  if (omaConfig && "default_cli" in omaConfig) return [];

  sections.default_cli = activeVendor;
  return [
    `moved default_cli: ${activeVendor} from .agents/skills/oma-orchestrator/config/cli-config.yaml (active_vendor)`,
  ];
}

/**
 * Fold `.agents/config/models.yaml` into oma-config's inline `models:` block.
 *
 * `oma uninstall` removes `.agents/config/` wholesale, so model slugs kept there
 * are not durable. The file itself stays for one release — the registry still
 * reads it, and it wins over the inline block during the window.
 */
function migrateModelsYaml(
  cwd: string,
  omaConfig: Record<string, unknown> | null,
  sections: Record<string, unknown>,
): string[] {
  const modelsYaml = readYamlRecord(
    join(cwd, ".agents", "config", "models.yaml"),
  );
  const models = modelsYaml?.models;
  if (!isRecord(models) || Object.keys(models).length === 0) return [];

  if (omaConfig && "models" in omaConfig) {
    return [
      "kept .agents/config/models.yaml — oma-config already has a `models:` section",
    ];
  }

  sections.models = models;
  return [
    `moved ${Object.keys(models)
      .map((slug) => `models.${slug}`)
      .join(", ")} from .agents/config/models.yaml`,
  ];
}

/**
 * Append the collected sections to oma-config, reusing update's append-only
 * merge so existing keys, comments and ordering are left byte-identical.
 */
function writeSections(
  omaConfigPath: string,
  omaConfig: Record<string, unknown> | null,
  sections: Record<string, unknown>,
): string[] {
  if (!omaConfig) {
    return [
      "kept legacy skill configs — .agents/oma-config.yaml is missing or unreadable",
    ];
  }

  let userRaw: string;
  try {
    userRaw = readFileSync(omaConfigPath, "utf-8");
  } catch {
    return [
      "kept legacy skill configs — .agents/oma-config.yaml is unreadable",
    ];
  }

  // appendMissingConfigKeys takes the incoming keys as YAML text, so hand it the
  // sections in the same representation it will re-emit.
  const { content, addedKeys } = appendMissingConfigKeys(
    userRaw,
    stringifyYaml(sections),
    APPEND_HEADER,
  );
  if (addedKeys.length === 0) return [];

  try {
    writeFileSync(omaConfigPath, content);
  } catch {
    return [
      "kept legacy skill configs — .agents/oma-config.yaml is not writable",
    ];
  }
  return [`updated .agents/oma-config.yaml (${addedKeys.join(", ")})`];
}
