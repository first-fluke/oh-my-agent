import type { AgentSpec } from "./schemas.js";

// ---------------------------------------------------------------------------
// AgentId — canonical set of agent role identifiers (11 values)
// ---------------------------------------------------------------------------

export type AgentId =
  | "orchestrator"
  | "architecture"
  | "qa"
  | "pm"
  | "backend"
  | "frontend"
  | "mobile"
  | "db"
  | "debug"
  | "docs"
  | "tf-infra"
  | "retrieval";

// ---------------------------------------------------------------------------
// BuiltInPresetKey — the 6 shipped presets
// ---------------------------------------------------------------------------

export type BuiltInPresetKey =
  | "antigravity"
  | "claude"
  | "codex"
  | "gemini"
  | "cursor"
  | "kiro"
  | "qwen"
  | "mixed";

// ---------------------------------------------------------------------------
// ModelPreset — built-in or user-defined preset definition
// ---------------------------------------------------------------------------

export interface ModelPreset {
  description: string;
  /** Only valid on custom_presets entries. Built-in presets do not extend. */
  extends?: string;
  /** Every canonical agent role required when no extends. Partial when extends is set. */
  agent_defaults: Partial<Record<AgentId, AgentSpec>>;
}

// ---------------------------------------------------------------------------
// UserModelSpec — inline user-defined model (formerly models.yaml)
// ---------------------------------------------------------------------------

export type UserModelSpec = {
  cli: string;
  cli_model: string;
  supports?: {
    native_dispatch_from?: string[];
    thinking?: boolean;
    effort?: unknown;
    apply_patch?: boolean;
    task_budget?: boolean;
    prompt_cache?: boolean;
    computer_use?: boolean;
    api_only?: boolean;
  };
  pricing_note?: string;
  auth_hint?: string;
  subscription_tier?: string;
};

// ---------------------------------------------------------------------------
// VendorConfig
// ---------------------------------------------------------------------------

export type VendorConfig = {
  command?: string;
  subcommand?: string;
  prompt_flag?: string;
  auto_approve_flag?: string;
  read_only_flag?: string;
  output_format_flag?: string;
  output_format?: string;
  model_flag?: string;
  default_model?: string;
  isolation_env?: string;
  isolation_flags?: string;
};

// ---------------------------------------------------------------------------
// OmaConfig — single-file unified configuration schema
// ---------------------------------------------------------------------------

export interface OmaDocsConfig {
  /**
   * When true, runs `oma docs verify --json` at the end of /scm, /work, and
   * /ultrawork workflows. Warn-only — never blocks workflow completion.
   * Default: false when absent.
   */
  auto_verify?: boolean;
  /**
   * When true (default), `oma docs verify` runs URL link checks in the
   * background — delegating to `lychee` if installed, else falling back to
   * the built-in HEAD checker. When false, URL refs are not checked at all
   * (user is expected to run `lychee` or similar tool separately).
   * Default: true when absent.
   */
  check_urls?: boolean;
}

export interface OmaConfig {
  language: string;
  /** Built-in preset key or custom_presets key */
  model_preset: string;
  date_format?: "ISO" | "US" | "EU";
  timezone?: string;
  auto_update_cli?: boolean;
  /**
   * Opt into Claude Code telemetry. When false (default), oh-my-agent sets
   * `DISABLE_TELEMETRY=1` in `.claude/settings.json`. When true, the flag is
   * omitted so features that gate on telemetry (e.g. Remote Control) work.
   */
  telemetry?: boolean;
  /** Per-agent overrides applied as shallow merge on top of preset */
  agents?: Partial<Record<AgentId, AgentSpec>>;
  /** Inline user-defined model slugs (formerly models.yaml) */
  models?: Record<string, UserModelSpec>;
  /** User-defined presets; may extend a built-in */
  custom_presets?: Record<string, ModelPreset>;
  vendors?: Record<string, VendorConfig>;
  session?: { quota_cap?: Record<string, unknown> };
  /** oma-docs skill configuration */
  docs?: OmaDocsConfig;
  // Legacy fields for backward-compat during migration grace window
  default_cli?: string;
}

export type CliConfig = {
  active_vendor?: string;
  vendors: Record<string, VendorConfig>;
};
