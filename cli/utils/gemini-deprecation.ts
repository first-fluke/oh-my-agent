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

export const GEMINI_DEPRECATION_DATE = "June 18, 2026";
export const GEMINI_MIGRATION_URL = "https://goo.gle/gemini-cli-migration";

const warnedContexts = new Set<string>();

// The Gemini CLI vendor and its `google/*` registry models were removed. A
// legacy config may still literally name a `google/*` slug (now an unknown
// model), so detect it by owner prefix to keep nudging users to migrate.
function isGeminiModelSlug(slug: string | undefined): boolean {
  if (!slug) return false;
  return slug.startsWith("google/");
}

function presetTargetsGemini(preset: ModelPreset | undefined): boolean {
  if (!preset?.agent_defaults) return false;
  return Object.values(preset.agent_defaults).some(
    (spec: AgentSpec | undefined) => isGeminiModelSlug(spec?.model),
  );
}

export function usesGeminiCli(
  config: Partial<OmaConfig> | null | undefined,
): boolean {
  if (!config) return false;

  const rawPreset = config.model_preset;
  if (rawPreset) {
    // The standalone gemini preset was removed and now soft-redirects to
    // antigravity via BUILT_IN_PRESET_ALIASES. A config that still literally
    // names it should keep getting the deprecation nudge to make the switch
    // explicit, so detect the legacy names before alias resolution.
    if (rawPreset === "gemini" || rawPreset === "gemini-only") return true;

    const resolvedKey = BUILT_IN_PRESET_ALIASES[rawPreset] ?? rawPreset;
    const builtIn = BUILT_IN_PRESETS[resolvedKey as BuiltInPresetKey];
    if (builtIn && presetTargetsGemini(builtIn)) return true;

    const customPreset = config.custom_presets?.[resolvedKey];
    if (customPreset && presetTargetsGemini(customPreset)) return true;
  }

  if (config.agents) {
    for (const spec of Object.values(config.agents)) {
      if (isGeminiModelSlug(spec?.model)) return true;
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
