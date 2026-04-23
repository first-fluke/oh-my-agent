// cli/platform/model-registry.ts
// Layer-1 Model Registry — RARDO v2.1
// CLI-only: api_only:true entries are rejected at initialization.

export type RuntimeId = "claude" | "codex" | "gemini" | "antigravity" | "qwen";

export type EffortLevel = "none" | "low" | "medium" | "high" | "xhigh";

export type ThinkingMode = "none" | "dynamic" | "fixed";

export type EffortSpec =
  | {
      type: "granular";
      levels: EffortLevel[];
    }
  | {
      type: "cli-session";
      auto_default: EffortLevel;
    }
  | {
      type: "thinking-budget";
      modes: ThinkingMode[];
    }
  | {
      type: "binary-thinking";
    }
  | null;

export type ModelSpec = {
  // antigravity has no Registry entries — uses built-in models only
  cli: Exclude<RuntimeId, "antigravity">;
  cli_model: string;
  supports: {
    effort: EffortSpec;
    apply_patch: boolean;
    task_budget: boolean;
    prompt_cache: boolean;
    computer_use: boolean;
    native_dispatch_from: RuntimeId[];
    api_only: boolean;
  };
  pricing_note?: string;
  auth_hint: string;
  subscription_tier?: string;
};

// ---------------------------------------------------------------------------
// Raw registry — includes intentionally excluded api_only entries for testing
// the initialization guard. These are filtered out before export.
// ---------------------------------------------------------------------------

const RAW_REGISTRY: ReadonlyMap<string, ModelSpec> = new Map([
  // -------------------------------------------------------------------------
  // Anthropic (3)
  // -------------------------------------------------------------------------
  [
    "anthropic/claude-opus-4-7",
    {
      cli: "claude",
      cli_model: "claude-opus-4-7",
      supports: {
        effort: { type: "cli-session", auto_default: "xhigh" },
        apply_patch: false,
        task_budget: true,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["claude"],
        api_only: false,
      },
      pricing_note: "$5/$25 per Mtok (참고용 — 구독 기반 비용 아님)",
      auth_hint: "Claude Max 구독 필요 ($200/mo)",
      subscription_tier: "claude_max",
    } satisfies ModelSpec,
  ],
  [
    "anthropic/claude-sonnet-4-6",
    {
      cli: "claude",
      cli_model: "claude-sonnet-4-6",
      supports: {
        effort: { type: "cli-session", auto_default: "xhigh" },
        apply_patch: false,
        task_budget: true,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["claude"],
        api_only: false,
      },
      auth_hint: "Claude Pro 또는 Max 구독 필요",
    } satisfies ModelSpec,
  ],
  [
    "anthropic/claude-haiku-4-5",
    {
      cli: "claude",
      cli_model: "claude-haiku-4-5",
      supports: {
        effort: { type: "cli-session", auto_default: "xhigh" },
        apply_patch: false,
        task_budget: false,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["claude"],
        api_only: false,
      },
      auth_hint: "Claude Pro 또는 Max 구독 필요",
    } satisfies ModelSpec,
  ],

  // -------------------------------------------------------------------------
  // OpenAI Codex (4)
  // -------------------------------------------------------------------------
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
      auth_hint: "ChatGPT Plus 또는 Pro 구독 필요",
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
      pricing_note: "$30/$180 per Mtok (참고용 — 특수 케이스만 사용)",
      auth_hint: "ChatGPT Pro 구독 필요 ($200/mo)",
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
      pricing_note: "Codex quota 30%만 소비 — 공식 서브에이전트 권장",
      auth_hint: "ChatGPT Plus 구독 필요",
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
      auth_hint: "ChatGPT Plus 또는 Pro 구독 필요",
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
      auth_hint: "Google AI Pro 구독 필요 ($20/mo)",
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
      pricing_note: "$0.50/$3.00 per Mtok (참고용)",
      auth_hint: "Google AI Pro 구독 필요 ($20/mo)",
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
      pricing_note: "$0.25/$1.50 per Mtok (참고용)",
      auth_hint: "Google AI Pro 구독 필요 ($20/mo)",
      subscription_tier: "google_ai_pro",
    } satisfies ModelSpec,
  ],

  // -------------------------------------------------------------------------
  // Alibaba Qwen (2)
  // -------------------------------------------------------------------------
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
        "Qwen Code 구독 필요 (API 키 재인증 필요 — OAuth 2026-04-15 폐지)",
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
        "Qwen Code 구독 필요 (API 키 재인증 필요 — OAuth 2026-04-15 폐지)",
    } satisfies ModelSpec,
  ],

  // -------------------------------------------------------------------------
  // Intentionally excluded: api_only entries
  // These are present solely to exercise the initialization guard.
  // They MUST never appear in the exported CORE_REGISTRY.
  // -------------------------------------------------------------------------
  [
    "openai/gpt-5.4-nano",
    {
      cli: "codex",
      cli_model: "gpt-5.4-nano",
      supports: {
        effort: {
          type: "granular",
          levels: ["none", "low", "medium", "high", "xhigh"],
        },
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: [],
        api_only: true,
      },
      auth_hint: "API 전용 — CLI 미지원",
    } satisfies ModelSpec,
  ],
]);

// ---------------------------------------------------------------------------
// Initialization guard: filter api_only:true entries and warn
// ---------------------------------------------------------------------------

function buildCoreRegistry(): ReadonlyMap<string, ModelSpec> {
  const filtered = new Map<string, ModelSpec>();
  for (const [slug, spec] of RAW_REGISTRY) {
    if (spec.supports.api_only) {
      console.warn(
        `[model-registry] Excluding "${slug}": api_only=true is not supported in CLI-only mode.`,
      );
      continue;
    }
    filtered.set(slug, spec);
  }
  return filtered as ReadonlyMap<string, ModelSpec>;
}

/**
 * Core model registry. Contains exactly 11 CLI-compatible slugs.
 * Entries with api_only:true are excluded at module initialization.
 */
export const CORE_REGISTRY: ReadonlyMap<string, ModelSpec> =
  buildCoreRegistry();

// ---------------------------------------------------------------------------
// Helper exports
// ---------------------------------------------------------------------------

/**
 * Returns the ModelSpec for a slug, or undefined if unknown.
 * Never throws — callers are responsible for handling undefined.
 */
export function getModelSpec(slug: string): ModelSpec | undefined {
  return CORE_REGISTRY.get(slug);
}

/**
 * Returns true if the slug is present in the core registry.
 */
export function hasModelSpec(slug: string): boolean {
  return CORE_REGISTRY.has(slug);
}
