/**
 * Legacy config types and pure helpers for migration 008
 * (agent_cli_mapping + defaults.yaml → model_preset).
 */
import type {
  AgentId,
  AgentSpec,
  BuiltInPresetKey,
} from "../../../platform/agent-config.js";
import { BUILT_IN_PRESETS } from "../../../platform/built-in-presets.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RawAgentDefault = {
  model?: string;
  effort?: string;
  thinking?: boolean;
  memory?: string;
};

export type LegacyDefaultsYaml = {
  version?: string;
  agent_defaults?: Record<string, RawAgentDefault>;
  runtime_profiles?: Record<
    string,
    { description?: string; agent_defaults?: Record<string, RawAgentDefault> }
  >;
};

// ---------------------------------------------------------------------------
// Vendor detection helpers
// ---------------------------------------------------------------------------

const OWNER_TO_VENDOR: Record<string, BuiltInPresetKey> = {
  anthropic: "claude",
  openai: "codex",
  google: "gemini",
  qwen: "qwen",
};

/** Derive a vendor preset key from a model slug or legacy vendor string. */
export function vendorToPresetKey(vendor: string): BuiltInPresetKey | null {
  const normalized = vendor.trim().toLowerCase();
  switch (normalized) {
    case "claude":
    case "claude-only":
      return "claude";
    case "codex":
    case "codex-only":
      return "codex";
    case "gemini":
    case "gemini-only":
      return "gemini";
    case "qwen":
    case "qwen-only":
      return "qwen";
    case "mixed":
      return "mixed";
    case "antigravity":
      return "antigravity";
    default:
      return null;
  }
}

export function modelSlugToPresetKey(slug: string): BuiltInPresetKey | null {
  const owner = slug.split("/")[0] ?? "";
  return OWNER_TO_VENDOR[owner] ?? null;
}

// ---------------------------------------------------------------------------
// Bundled defaults comparison — detect user customizations
// ---------------------------------------------------------------------------

/** Canonical agent IDs in deterministic order */
export const ALL_AGENT_IDS: AgentId[] = [
  "orchestrator",
  "architecture",
  "qa",
  "pm",
  "backend",
  "frontend",
  "mobile",
  "db",
  "debug",
  "docs",
  "tf-infra",
  "retrieval",
];

/**
 * Compare a runtime_profiles section from the user's defaults.yaml against
 * the built-in BUILT_IN_PRESETS to determine if the user has customized it.
 * Returns true if the user's content differs from any built-in preset.
 */
export function isDefaultsCustomized(
  userDefaults: LegacyDefaultsYaml,
): boolean {
  const userRuntimeProfiles = userDefaults.runtime_profiles ?? {};

  for (const [presetKey, builtIn] of Object.entries(BUILT_IN_PRESETS) as [
    BuiltInPresetKey,
    (typeof BUILT_IN_PRESETS)[BuiltInPresetKey],
  ][]) {
    const userProfile = userRuntimeProfiles[presetKey];
    if (!userProfile) continue; // Not customized if missing

    for (const agentId of ALL_AGENT_IDS) {
      const userEntry = userProfile.agent_defaults?.[agentId];
      const builtInEntry = builtIn.agent_defaults[agentId];
      if (!userEntry || !builtInEntry) continue;

      if (
        userEntry.model !== builtInEntry.model ||
        (userEntry.effort ?? undefined) !==
          (builtInEntry.effort ?? undefined) ||
        (userEntry.thinking ?? undefined) !==
          (builtInEntry.thinking ?? undefined)
      ) {
        return true;
      }
    }
  }

  // Also check top-level agent_defaults vs mixed (which is the "default profile")
  const topLevel = userDefaults.agent_defaults ?? {};
  const baseline = BUILT_IN_PRESETS.mixed.agent_defaults;
  for (const agentId of ALL_AGENT_IDS) {
    const userEntry = topLevel[agentId];
    const builtInEntry = baseline[agentId];
    if (!userEntry || !builtInEntry) continue;
    if (
      userEntry.model !== builtInEntry.model ||
      (userEntry.effort ?? undefined) !== (builtInEntry.effort ?? undefined) ||
      (userEntry.thinking ?? undefined) !== (builtInEntry.thinking ?? undefined)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Convert a legacy agent_defaults block into an AgentSpec-compatible object.
 */
export function rawEntryToAgentSpec(raw: RawAgentDefault): AgentSpec | null {
  if (!raw.model) return null;
  const spec: AgentSpec = { model: raw.model };
  if (raw.effort) spec.effort = raw.effort as AgentSpec["effort"];
  if (raw.thinking !== undefined) spec.thinking = raw.thinking;
  if (raw.memory) spec.memory = raw.memory as AgentSpec["memory"];
  return spec;
}

// ---------------------------------------------------------------------------
// Most-frequent vendor helper
// ---------------------------------------------------------------------------

export function mostFrequentPresetKey(
  counts: Map<BuiltInPresetKey, number>,
): BuiltInPresetKey {
  let max = 0;
  let winner: BuiltInPresetKey = "claude";
  for (const [key, count] of counts) {
    if (count > max) {
      max = count;
      winner = key;
    }
  }
  return winner;
}
