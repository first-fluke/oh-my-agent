/**
 * cli/platform/built-in-presets.ts
 *
 * Single source of truth for built-in model presets.
 * Replaces .agents/config/defaults.yaml as of migration 008.
 *
 * SSOT upgrade path: bump npm version → built-in presets update automatically.
 * No user-side file update needed.
 */
import type { AgentId, BuiltInPresetKey, ModelPreset } from "./agent-config.js";
import { getModelSpec } from "./model-registry.js";

// ---------------------------------------------------------------------------
// Built-in preset definitions
// Sourced from .agents/config/defaults.yaml (2.1.0) — all 11 agent roles.
// ---------------------------------------------------------------------------

export const BUILT_IN_PRESETS: Record<BuiltInPresetKey, ModelPreset> = {
  "claude-only": {
    description: "Claude-only — Max subscription holders",
    agent_defaults: {
      orchestrator: { model: "anthropic/claude-sonnet-4-6" },
      architecture: { model: "anthropic/claude-opus-4-7" },
      qa: { model: "anthropic/claude-sonnet-4-6" },
      pm: { model: "anthropic/claude-sonnet-4-6" },
      backend: { model: "anthropic/claude-sonnet-4-6" },
      frontend: { model: "anthropic/claude-sonnet-4-6" },
      mobile: { model: "anthropic/claude-sonnet-4-6" },
      db: { model: "anthropic/claude-sonnet-4-6" },
      debug: { model: "anthropic/claude-sonnet-4-6" },
      "tf-infra": { model: "anthropic/claude-sonnet-4-6" },
      retrieval: { model: "anthropic/claude-haiku-4-5" },
    },
  },

  "codex-only": {
    description: "Codex-only — ChatGPT Plus/Pro",
    agent_defaults: {
      orchestrator: { model: "openai/gpt-5.4", effort: "medium" },
      architecture: { model: "openai/gpt-5.4-pro", effort: "high" },
      qa: { model: "openai/gpt-5.4", effort: "high" },
      pm: { model: "openai/gpt-5.4", effort: "medium" },
      backend: { model: "openai/gpt-5.3-codex", effort: "high" },
      frontend: { model: "openai/gpt-5.4", effort: "high" },
      mobile: { model: "openai/gpt-5.4", effort: "high" },
      db: { model: "openai/gpt-5.3-codex", effort: "high" },
      debug: { model: "openai/gpt-5.3-codex", effort: "high" },
      "tf-infra": { model: "openai/gpt-5.4", effort: "high" },
      retrieval: { model: "openai/gpt-5.4-mini", effort: "low" },
    },
  },

  "gemini-only": {
    description: "Gemini-only — Google AI Pro",
    agent_defaults: {
      orchestrator: { model: "google/gemini-3-flash" },
      architecture: { model: "google/gemini-3.1-pro-preview", thinking: true },
      qa: { model: "google/gemini-3-flash", thinking: true },
      pm: { model: "google/gemini-3-flash" },
      backend: { model: "google/gemini-3-flash", thinking: true },
      frontend: { model: "google/gemini-3-flash", thinking: true },
      mobile: { model: "google/gemini-3-flash", thinking: true },
      db: { model: "google/gemini-3-flash", thinking: true },
      debug: { model: "google/gemini-3-flash", thinking: true },
      "tf-infra": { model: "google/gemini-3-flash", thinking: true },
      retrieval: { model: "google/gemini-3.1-flash-lite" },
    },
  },

  "qwen-only": {
    description:
      "Qwen Code — all agents routed external (no native parallel); Qwen has no --effort, only binary --thinking",
    agent_defaults: {
      orchestrator: { model: "qwen/qwen3-coder-next", thinking: false },
      architecture: { model: "qwen/qwen3-coder-plus", thinking: true },
      qa: { model: "qwen/qwen3-coder-plus", thinking: true },
      pm: { model: "qwen/qwen3-coder-next", thinking: false },
      backend: { model: "qwen/qwen3-coder-plus", thinking: true },
      frontend: { model: "qwen/qwen3-coder-plus", thinking: true },
      mobile: { model: "qwen/qwen3-coder-plus", thinking: true },
      db: { model: "qwen/qwen3-coder-plus", thinking: true },
      debug: { model: "qwen/qwen3-coder-plus", thinking: true },
      "tf-infra": { model: "qwen/qwen3-coder-plus", thinking: true },
      retrieval: { model: "qwen/qwen3-coder-next", thinking: false },
    },
  },

  antigravity: {
    description:
      "Antigravity IDE — all impl roles fall back to external subprocess (handled at dispatch layer)",
    agent_defaults: {
      orchestrator: { model: "anthropic/claude-sonnet-4-6" },
      architecture: { model: "anthropic/claude-opus-4-7" },
      qa: { model: "anthropic/claude-sonnet-4-6" },
      pm: { model: "anthropic/claude-sonnet-4-6" },
      backend: { model: "openai/gpt-5.3-codex", effort: "high" },
      frontend: { model: "openai/gpt-5.4", effort: "high" },
      mobile: { model: "openai/gpt-5.4", effort: "high" },
      db: { model: "openai/gpt-5.3-codex", effort: "high" },
      debug: { model: "openai/gpt-5.3-codex", effort: "high" },
      "tf-infra": { model: "openai/gpt-5.4", effort: "high" },
      retrieval: { model: "google/gemini-3.1-flash-lite" },
    },
  },
};

// ---------------------------------------------------------------------------
// Aliases — redirect old preset keys to canonical names
// Initially empty; add entries here when renaming a built-in preset.
// ---------------------------------------------------------------------------

export const BUILT_IN_PRESET_ALIASES: Record<string, BuiltInPresetKey> = {};

// ---------------------------------------------------------------------------
// Integrity assertion — verifies every preset model slug resolves via registry.
// Runs at module import in production to surface misconfiguration at boot time.
// ---------------------------------------------------------------------------

const ALL_AGENT_IDS: readonly AgentId[] = [
  "orchestrator",
  "architecture",
  "qa",
  "pm",
  "backend",
  "frontend",
  "mobile",
  "db",
  "debug",
  "tf-infra",
  "retrieval",
] as const;

/**
 * Assert that every model slug in every built-in preset resolves via the
 * model registry. Throws on first unknown slug.
 *
 * Called automatically at module import in production (NODE_ENV !== "test").
 * Call explicitly in tests to exercise the assertion.
 */
export function assertPresetIntegrity(): void {
  for (const [presetKey, preset] of Object.entries(BUILT_IN_PRESETS)) {
    for (const agentId of ALL_AGENT_IDS) {
      const spec = preset.agent_defaults[agentId];
      if (!spec) {
        throw new Error(
          `[built-in-presets] Preset "${presetKey}" is missing agent_defaults for "${agentId}". ` +
            `All 11 agent roles are required for built-in presets.`,
        );
      }
      const modelSpec = getModelSpec(spec.model);
      if (!modelSpec) {
        throw new Error(
          `[built-in-presets] Preset "${presetKey}" agent "${agentId}" references unknown model slug "${spec.model}". ` +
            `Add it to the model registry or update the preset.`,
        );
      }
    }
  }
}

// Run integrity assertion at module import in production
if (process.env.NODE_ENV !== "test") {
  assertPresetIntegrity();
}
