// cli/platform/model-registry/raw-registry.ts
// Raw registry — built-in CLI-compatible model specs.

import type { ModelSpec } from "./types.js";

export const RAW_REGISTRY: ReadonlyMap<string, ModelSpec> = new Map([
  // -------------------------------------------------------------------------
  // Anthropic (3)
  // -------------------------------------------------------------------------
  [
    "anthropic/claude-opus-4-7",
    {
      cli: "claude",
      cli_model: "claude-opus-4-7",
      supports: {
        effort: { type: "cli-session", auto_default: "high" },
        apply_patch: false,
        task_budget: true,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["claude"],
        api_only: false,
      },
      pricing_note: "$5/$25 per Mtok (reference only; not subscription cost)",
      auth_hint: "Requires Claude Max subscription ($200/mo)",
      subscription_tier: "claude_max",
    } satisfies ModelSpec,
  ],
  [
    "anthropic/claude-sonnet-4-6",
    {
      cli: "claude",
      cli_model: "claude-sonnet-4-6",
      supports: {
        effort: { type: "cli-session", auto_default: "high" },
        apply_patch: false,
        task_budget: true,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["claude"],
        api_only: false,
      },
      auth_hint: "Requires Claude Pro or Max subscription",
    } satisfies ModelSpec,
  ],
  [
    "anthropic/claude-haiku-4-5",
    {
      cli: "claude",
      cli_model: "claude-haiku-4-5",
      supports: {
        effort: { type: "cli-session", auto_default: "high" },
        apply_patch: false,
        task_budget: false,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["claude"],
        api_only: false,
      },
      auth_hint: "Requires Claude Pro or Max subscription",
    } satisfies ModelSpec,
  ],

  // -------------------------------------------------------------------------
  // OpenAI Codex (5)
  // -------------------------------------------------------------------------
  [
    "openai/gpt-5.5",
    {
      cli: "codex",
      cli_model: "gpt-5.5",
      supports: {
        effort: {
          type: "granular",
          levels: ["none", "low", "medium", "high", "xhigh"],
        },
        apply_patch: true,
        task_budget: false,
        prompt_cache: false,
        computer_use: true,
        native_dispatch_from: ["codex"],
        api_only: false,
      },
      pricing_note:
        "$5/$30 per Mtok (reference only; improved token efficiency vs 5.4)",
      auth_hint:
        "Requires ChatGPT Plus or Pro subscription (default Codex CLI model)",
    } satisfies ModelSpec,
  ],
  [
    "openai/gpt-5.4",
    {
      cli: "codex",
      cli_model: "gpt-5.4",
      supports: {
        effort: {
          type: "granular",
          levels: ["none", "low", "medium", "high", "xhigh"],
        },
        apply_patch: true,
        task_budget: false,
        prompt_cache: false,
        computer_use: true,
        native_dispatch_from: ["codex"],
        api_only: false,
      },
      auth_hint: "Requires ChatGPT Plus or Pro subscription",
    } satisfies ModelSpec,
  ],
  [
    "openai/gpt-5.4-pro",
    {
      cli: "codex",
      cli_model: "gpt-5.4-pro",
      supports: {
        effort: {
          type: "granular",
          levels: ["none", "low", "medium", "high", "xhigh"],
        },
        apply_patch: true,
        task_budget: false,
        prompt_cache: false,
        computer_use: true,
        native_dispatch_from: ["codex"],
        api_only: false,
      },
      pricing_note: "$30/$180 per Mtok (reference only; use for special cases)",
      auth_hint: "Requires ChatGPT Pro subscription ($200/mo)",
      subscription_tier: "chatgpt_pro",
    } satisfies ModelSpec,
  ],
  [
    "openai/gpt-5.4-mini",
    {
      cli: "codex",
      cli_model: "gpt-5.4-mini",
      supports: {
        effort: {
          type: "granular",
          levels: ["none", "low", "medium", "high", "xhigh"],
        },
        apply_patch: true,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: ["codex"],
        api_only: false,
      },
      pricing_note:
        "Uses only 30% Codex quota; recommended for official subagents",
      auth_hint: "Requires ChatGPT Plus subscription",
    } satisfies ModelSpec,
  ],
  [
    "openai/gpt-5.3-codex",
    {
      cli: "codex",
      cli_model: "gpt-5.3-codex",
      supports: {
        effort: {
          type: "granular",
          levels: ["none", "low", "medium", "high", "xhigh"],
        },
        apply_patch: true,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: ["codex"],
        api_only: false,
      },
      auth_hint: "Requires ChatGPT Plus or Pro subscription",
    } satisfies ModelSpec,
  ],

  // -------------------------------------------------------------------------
  // Google Gemini (3)
  // -------------------------------------------------------------------------
  [
    "google/gemini-3.1-pro-preview",
    {
      cli: "gemini",
      cli_model: "gemini-3.1-pro-preview",
      supports: {
        effort: {
          type: "thinking-budget",
          modes: ["none", "dynamic", "fixed"],
        },
        apply_patch: false,
        task_budget: false,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["gemini"],
        api_only: false,
      },
      auth_hint: "Requires Google AI Pro subscription ($20/mo)",
      subscription_tier: "google_ai_pro",
    } satisfies ModelSpec,
  ],
  [
    "google/gemini-3-flash",
    {
      cli: "gemini",
      cli_model: "gemini-3-flash",
      supports: {
        effort: {
          type: "thinking-budget",
          modes: ["none", "dynamic"],
        },
        apply_patch: false,
        task_budget: false,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["gemini"],
        api_only: false,
      },
      pricing_note: "$0.50/$3.00 per Mtok (reference only)",
      auth_hint: "Requires Google AI Pro subscription ($20/mo)",
      subscription_tier: "google_ai_pro",
    } satisfies ModelSpec,
  ],
  [
    "google/gemini-3.1-flash-lite",
    {
      cli: "gemini",
      cli_model: "gemini-3.1-flash-lite",
      supports: {
        effort: {
          type: "thinking-budget",
          modes: ["none", "dynamic"],
        },
        apply_patch: false,
        task_budget: false,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["gemini"],
        api_only: false,
      },
      pricing_note: "$0.25/$1.50 per Mtok (reference only)",
      auth_hint: "Requires Google AI Pro subscription ($20/mo)",
      subscription_tier: "google_ai_pro",
    } satisfies ModelSpec,
  ],

  // -------------------------------------------------------------------------
  // Antigravity (agy CLI) (2)
  // -------------------------------------------------------------------------
  // agy 1.0 has no `--model` flag — these entries are nominal: they let users
  // declare intent in oma-config.yaml and surface the right auth hint in
  // `oma doctor`, but at dispatch time the CLI uses its config-driven default.
  [
    "antigravity/gemini-3.1-pro",
    {
      cli: "antigravity",
      cli_model: "gemini-3.1-pro",
      supports: {
        effort: null,
        apply_patch: false,
        task_budget: false,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["antigravity"],
        api_only: false,
      },
      auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)",
      subscription_tier: "google_ai_pro",
    } satisfies ModelSpec,
  ],
  [
    "antigravity/gemini-3.5-flash",
    {
      cli: "antigravity",
      cli_model: "gemini-3.5-flash",
      supports: {
        effort: null,
        apply_patch: false,
        task_budget: false,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["antigravity"],
        api_only: false,
      },
      auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)",
      subscription_tier: "google_ai_pro",
    } satisfies ModelSpec,
  ],

  // -------------------------------------------------------------------------
  // Cursor (5)
  // -------------------------------------------------------------------------
  [
    "cursor/composer-2.5",
    {
      cli: "cursor",
      cli_model: "composer-2.5",
      supports: {
        effort: null,
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: ["cursor"],
        api_only: false,
      },
      auth_hint: "Requires Cursor Pro or Pro Student subscription",
    } satisfies ModelSpec,
  ],
  [
    "cursor/composer-2.5-fast",
    {
      cli: "cursor",
      cli_model: "composer-2.5-fast",
      supports: {
        effort: null,
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: ["cursor"],
        api_only: false,
      },
      auth_hint: "Requires Cursor Pro or Pro Student subscription",
    } satisfies ModelSpec,
  ],
  [
    "cursor/composer-2",
    {
      cli: "cursor",
      cli_model: "composer-2",
      supports: {
        effort: null,
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: ["cursor"],
        api_only: false,
      },
      auth_hint: "Requires Cursor Pro or Pro Student subscription",
    } satisfies ModelSpec,
  ],
  [
    "cursor/composer-2-fast",
    {
      cli: "cursor",
      cli_model: "composer-2-fast",
      supports: {
        effort: null,
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: ["cursor"],
        api_only: false,
      },
      auth_hint: "Requires Cursor Pro or Pro Student subscription",
    } satisfies ModelSpec,
  ],
  [
    "cursor/auto",
    {
      cli: "cursor",
      cli_model: "auto",
      supports: {
        effort: null,
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: ["cursor"],
        api_only: false,
      },
      auth_hint:
        "Requires Cursor Pro or Pro Student subscription (auto routing; quota-friendly)",
    } satisfies ModelSpec,
  ],

  // -------------------------------------------------------------------------
  // Kiro CLI — AWS Bedrock models via CodeWhisperer/Q (3)
  // -------------------------------------------------------------------------
  [
    "kiro/claude-sonnet-4-5",
    {
      cli: "kiro",
      cli_model: "anthropic.claude-sonnet-4-5-20251001-v1:0",
      supports: {
        effort: null,
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: ["kiro"],
        api_only: false,
      },
      auth_hint: "Requires AWS Builder ID or IAM Identity Center (Kiro CLI)",
    } satisfies ModelSpec,
  ],
  [
    "kiro/claude-haiku-3-5",
    {
      cli: "kiro",
      cli_model: "anthropic.claude-haiku-3-5-20241022-v1:0",
      supports: {
        effort: null,
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: ["kiro"],
        api_only: false,
      },
      auth_hint: "Requires AWS Builder ID or IAM Identity Center (Kiro CLI)",
    } satisfies ModelSpec,
  ],
  [
    "kiro/auto",
    {
      cli: "kiro",
      cli_model: "auto",
      supports: {
        effort: null,
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: ["kiro"],
        api_only: false,
      },
      auth_hint:
        "Requires AWS Builder ID or IAM Identity Center (Kiro CLI — auto model selection)",
    } satisfies ModelSpec,
  ],

  // -------------------------------------------------------------------------
  // Alibaba Qwen (3)
  // -------------------------------------------------------------------------
  [
    "qwen/qwen3.6-plus",
    {
      cli: "qwen",
      cli_model: "qwen3.6-plus",
      supports: {
        effort: { type: "binary-thinking" },
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: [],
        api_only: false,
      },
      pricing_note: "1M context, enhanced agentic coding (released 2026-04)",
      auth_hint:
        "Requires Qwen Code subscription or Bailian Coding Plan API key",
    } satisfies ModelSpec,
  ],
  [
    "qwen/qwen3-coder-plus",
    {
      cli: "qwen",
      cli_model: "qwen3-coder-plus",
      supports: {
        effort: { type: "binary-thinking" },
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: [],
        api_only: false,
      },
      auth_hint:
        "Requires Qwen Code subscription (API key re-authentication required; OAuth deprecated 2026-04-15)",
    } satisfies ModelSpec,
  ],
  [
    "qwen/qwen3-coder-next",
    {
      cli: "qwen",
      cli_model: "qwen3-coder-next",
      supports: {
        effort: { type: "binary-thinking" },
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: [],
        api_only: false,
      },
      auth_hint:
        "Requires Qwen Code subscription (API key re-authentication required; OAuth deprecated 2026-04-15)",
    } satisfies ModelSpec,
  ],
]);
