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
// Sourced from .agents/config/defaults.yaml (2.1.0) — all canonical agent roles.
// ---------------------------------------------------------------------------

export const BUILT_IN_PRESETS: Record<BuiltInPresetKey, ModelPreset> = {
  antigravity: {
    description:
      "Antigravity CLI (agy) — nominal Gemini 3.1 Pro for impl/architecture, Gemini 3.5 Flash for orchestration & explore (agy 1.0 has no `--model` flag, so the model is selected by agy's own config)",
    agent_defaults: {
      orchestrator: { model: "antigravity/gemini-3.5-flash" },
      architecture: { model: "antigravity/gemini-3.1-pro" },
      qa: { model: "antigravity/gemini-3.1-pro" },
      pm: { model: "antigravity/gemini-3.5-flash" },
      backend: { model: "antigravity/gemini-3.1-pro" },
      frontend: { model: "antigravity/gemini-3.1-pro" },
      mobile: { model: "antigravity/gemini-3.1-pro" },
      db: { model: "antigravity/gemini-3.1-pro" },
      debug: { model: "antigravity/gemini-3.1-pro" },
      docs: { model: "antigravity/gemini-3.5-flash" },
      "tf-infra": { model: "antigravity/gemini-3.1-pro" },
      explore: { model: "antigravity/gemini-3.5-flash" },
    },
  },

  claude: {
    description: "Claude — Max subscription holders",
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
      docs: { model: "anthropic/claude-sonnet-4-6" },
      "tf-infra": { model: "anthropic/claude-sonnet-4-6" },
      explore: { model: "anthropic/claude-haiku-4-5" },
    },
  },

  codex: {
    description: "Codex — ChatGPT Plus/Pro",
    agent_defaults: {
      orchestrator: { model: "openai/gpt-5.5", effort: "medium" },
      architecture: { model: "openai/gpt-5.5", effort: "high" },
      qa: { model: "openai/gpt-5.5", effort: "high" },
      pm: { model: "openai/gpt-5.5", effort: "medium" },
      backend: { model: "openai/gpt-5.5", effort: "high" },
      frontend: { model: "openai/gpt-5.5", effort: "high" },
      mobile: { model: "openai/gpt-5.5", effort: "high" },
      db: { model: "openai/gpt-5.5", effort: "high" },
      debug: { model: "openai/gpt-5.5", effort: "high" },
      docs: { model: "openai/gpt-5.5", effort: "medium" },
      "tf-infra": { model: "openai/gpt-5.5", effort: "high" },
      explore: { model: "openai/gpt-5.4-mini", effort: "low" },
    },
  },

  qwen: {
    description:
      "Qwen Code — all agents routed external (no native parallel); Qwen has no --effort, only binary --thinking",
    agent_defaults: {
      orchestrator: { model: "qwen/qwen3-coder-next", thinking: false },
      architecture: { model: "qwen/qwen3.6-plus", thinking: true },
      qa: { model: "qwen/qwen3.6-plus", thinking: true },
      pm: { model: "qwen/qwen3-coder-next", thinking: false },
      backend: { model: "qwen/qwen3.6-plus", thinking: true },
      frontend: { model: "qwen/qwen3.6-plus", thinking: true },
      mobile: { model: "qwen/qwen3.6-plus", thinking: true },
      db: { model: "qwen/qwen3.6-plus", thinking: true },
      debug: { model: "qwen/qwen3.6-plus", thinking: true },
      docs: { model: "qwen/qwen3-coder-next", thinking: false },
      "tf-infra": { model: "qwen/qwen3.6-plus", thinking: true },
      explore: { model: "qwen/qwen3-coder-next", thinking: false },
    },
  },

  kiro: {
    description:
      "Kiro CLI — AWS Bedrock via CodeWhisperer/Q; sonnet for impl/architecture, haiku for explore/orchestration",
    agent_defaults: {
      orchestrator: { model: "kiro/claude-haiku-3-5" },
      architecture: { model: "kiro/claude-sonnet-4-5" },
      qa: { model: "kiro/claude-sonnet-4-5" },
      pm: { model: "kiro/claude-haiku-3-5" },
      backend: { model: "kiro/claude-sonnet-4-5" },
      frontend: { model: "kiro/claude-sonnet-4-5" },
      mobile: { model: "kiro/claude-sonnet-4-5" },
      db: { model: "kiro/claude-sonnet-4-5" },
      debug: { model: "kiro/claude-sonnet-4-5" },
      docs: { model: "kiro/claude-haiku-3-5" },
      "tf-infra": { model: "kiro/claude-sonnet-4-5" },
      explore: { model: "kiro/claude-haiku-3-5" },
    },
  },

  cursor: {
    description: "Cursor — Cursor Pro / Pro Student",
    agent_defaults: {
      orchestrator: { model: "cursor/composer-2.5-fast" },
      architecture: { model: "cursor/composer-2.5" },
      qa: { model: "cursor/composer-2.5-fast" },
      pm: { model: "cursor/composer-2.5-fast" },
      backend: { model: "cursor/composer-2.5" },
      frontend: { model: "cursor/composer-2.5" },
      mobile: { model: "cursor/composer-2.5" },
      db: { model: "cursor/composer-2.5" },
      debug: { model: "cursor/composer-2.5" },
      docs: { model: "cursor/composer-2.5-fast" },
      "tf-infra": { model: "cursor/composer-2.5" },
      explore: { model: "cursor/composer-2.5-fast" },
    },
  },

  mixed: {
    description:
      "Mixed — role-optimal vendors per agent (Claude for orchestration/QA/PM, Codex for impl, Gemini for explore)",
    agent_defaults: {
      orchestrator: { model: "anthropic/claude-sonnet-4-6" },
      architecture: { model: "anthropic/claude-opus-4-7" },
      qa: { model: "anthropic/claude-sonnet-4-6" },
      pm: { model: "anthropic/claude-sonnet-4-6" },
      backend: { model: "openai/gpt-5.5", effort: "high" },
      frontend: { model: "openai/gpt-5.5", effort: "high" },
      mobile: { model: "openai/gpt-5.5", effort: "high" },
      db: { model: "openai/gpt-5.5", effort: "high" },
      debug: { model: "openai/gpt-5.5", effort: "high" },
      docs: { model: "anthropic/claude-sonnet-4-6" },
      "tf-infra": { model: "openai/gpt-5.5", effort: "high" },
      explore: { model: "google/gemini-3.1-flash-lite" },
    },
  },
};

// ---------------------------------------------------------------------------
// Aliases — redirect legacy "-only" preset keys to canonical names.
// `antigravity` is no longer aliased: it is now a first-class preset that
// targets the agy CLI directly (see BUILT_IN_PRESETS above).
//
// The standalone `gemini` preset was removed (Gemini CLI deprecation, see
// gemini-deprecation.ts). Existing `model_preset: gemini` configs soft-redirect
// to `antigravity` — Google's designated successor CLI — so they keep resolving.
// ---------------------------------------------------------------------------

export const BUILT_IN_PRESET_ALIASES: Record<string, BuiltInPresetKey> = {
  "claude-only": "claude",
  "codex-only": "codex",
  gemini: "antigravity",
  "qwen-only": "qwen",
  "cursor-only": "cursor",
};

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
  "docs",
  "tf-infra",
  "explore",
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
            `All ${ALL_AGENT_IDS.length} canonical agent roles are required for built-in presets.`,
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
