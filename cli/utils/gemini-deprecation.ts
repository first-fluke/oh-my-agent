import type {
  AgentSpec,
  BuiltInPresetKey,
  ModelPreset,
  OmaConfig,
} from "../platform/agent-config.js";
import {
  BUILT_IN_PRESET_ALIASES,
  BUILT_IN_PRESETS,
} from "../platform/built-in-presets.js";
import { getModelSpec } from "../platform/model-registry.js";

export const GEMINI_DEPRECATION_DATE = "June 18, 2026";
export const GEMINI_MIGRATION_URL = "https://goo.gle/gemini-cli-migration";

const warnedContexts = new Set<string>();

function isGeminiModelSlug(
  slug: string | undefined,
  userModels?: Record<string, unknown>,
): boolean {
  if (!slug) return false;
  const spec = getModelSpec(slug, userModels);
  if (spec) return spec.cli === "gemini";
  return slug.startsWith("google/");
}

function presetTargetsGemini(
  preset: ModelPreset | undefined,
  userModels: Record<string, unknown> | undefined,
): boolean {
  if (!preset?.agent_defaults) return false;
  return Object.values(preset.agent_defaults).some(
    (spec: AgentSpec | undefined) => isGeminiModelSlug(spec?.model, userModels),
  );
}

export function usesGeminiCli(
  config: Partial<OmaConfig> | null | undefined,
): boolean {
  if (!config) return false;
  const userModels = config.models as Record<string, unknown> | undefined;

  const rawPreset = config.model_preset;
  if (rawPreset) {
    const resolvedKey = BUILT_IN_PRESET_ALIASES[rawPreset] ?? rawPreset;
    const builtIn = BUILT_IN_PRESETS[resolvedKey as BuiltInPresetKey];
    if (builtIn && presetTargetsGemini(builtIn, userModels)) return true;

    const customPreset = config.custom_presets?.[resolvedKey];
    if (customPreset && presetTargetsGemini(customPreset, userModels))
      return true;
  }

  if (config.agents) {
    for (const spec of Object.values(config.agents)) {
      if (isGeminiModelSlug(spec?.model, userModels)) return true;
    }
  }

  return false;
}

export function formatGeminiDeprecationWarning(): string {
  return [
    `Gemini CLI is deprecated on ${GEMINI_DEPRECATION_DATE} for Google One / unpaid tiers.`,
    `Google is migrating users to the Antigravity CLI; after that date Gemini CLI will stop serving requests for those tiers.`,
    `Switch oh-my-agent by editing .agents/oma-config.yaml — set model_preset: antigravity (or remove gemini from agents).`,
    `Migration guide: ${GEMINI_MIGRATION_URL}`,
  ].join("\n");
}

export function warnGeminiDeprecationOnce(context = "default"): void {
  if (warnedContexts.has(context)) return;
  warnedContexts.add(context);
  for (const line of formatGeminiDeprecationWarning().split("\n")) {
    console.warn(`[gemini-deprecation] ${line}`);
  }
}

export function _resetGeminiDeprecationWarningsForTests(): void {
  warnedContexts.clear();
}
