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
  // The standalone gemini preset was removed; google-owned models map to
  // antigravity (Google's successor CLI) for preset-frequency resolution.
  google: "antigravity",
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
      // standalone gemini preset removed → map to its successor, antigravity
      return "antigravity";
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

/**
 * Migration-local knowledge: agent ids renamed after the legacy era.
 * Runtime code knows only canonical ids; legacy spellings live here.
 */
export const LEGACY_AGENT_ID_RENAMES: Record<string, AgentId> = {
  retrieval: "explore",
};

/** Canonicalize a legacy agent id (e.g. "retrieval" -> "explore"). */
export function canonLegacyAgentId(raw: string): AgentId {
  return LEGACY_AGENT_ID_RENAMES[raw] ?? (raw as AgentId);
}

/** Look up a per-agent record tolerating legacy key spellings. */
function legacyAgentEntry<T>(
  map: Record<string, T> | undefined,
  agentId: AgentId,
): T | undefined {
  if (!map) return undefined;
  if (map[agentId] !== undefined) return map[agentId];
  for (const [legacy, canonical] of Object.entries(LEGACY_AGENT_ID_RENAMES)) {
    if (canonical === agentId && map[legacy] !== undefined) return map[legacy];
  }
  return undefined;
}

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
  "explore",
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
      const userEntry = legacyAgentEntry(userProfile.agent_defaults, agentId);
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
    const userEntry = legacyAgentEntry(topLevel, agentId);
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
