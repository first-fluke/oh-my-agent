// cli/platform/model-registry/types.ts
// Shared types for the Layer-1 Model Registry.

export type RuntimeId =
  | "claude"
  | "codex"
  | "gemini"
  | "cursor"
  | "antigravity"
  | "qwen"
  | "kiro"
  | "opencode"
  // `pi` never appears as a model's owning `cli` (the registry schema validates
  // `cli` against the canonical VENDORS set, which excludes pi). It is a valid
  // RuntimeId only as a *resolved plan target*: pi is a universal proxy runtime
  // that can dispatch any real-provider model, so resolve-plan may set
  // `plan.cli = "pi"` when the pi vendor override is active.
  | "pi";

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
  cli: RuntimeId;
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
