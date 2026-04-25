// cli/commands/doctor/profile.ts
// oma doctor --profile — Profile Health check
//
// Loads .agents/oma-config.yaml, resolves the model_preset (built-in or custom),
// builds an auth-status matrix for every role-model pairing, calls
// detectDeprecatedOAuthSession() for Qwen, and emits Antigravity warning.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse as parsePath, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { detectRuntimeVendor } from "../../io/runtime-dispatch.js";
import type {
  AgentId,
  AgentSpec,
  ModelPreset,
  OmaConfig,
} from "../../platform/agent-config.js";
import {
  BUILT_IN_PRESET_ALIASES,
  BUILT_IN_PRESETS,
} from "../../platform/built-in-presets.js";
import { getModelSpec } from "../../platform/model-registry.js";
import {
  isClaudeAuthenticated,
  isCodexAuthenticated,
  isGeminiAuthenticated,
  isQwenAuthenticated,
} from "../../vendors/index.js";
import {
  type DeprecatedOAuthSessionResult,
  detectDeprecatedOAuthSession,
} from "../../vendors/qwen/auth.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Canonical display order for roles — deterministic matrix output. */
export const ROLE_ORDER = [
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

export type Role = (typeof ROLE_ORDER)[number];

/** Impl roles that fall back to external subprocess under Antigravity. */
const ANTIGRAVITY_FALLBACK_ROLES: readonly string[] = [
  "backend",
  "frontend",
  "mobile",
  "db",
  "debug",
  "tf-infra",
];

// ---------------------------------------------------------------------------
// Auth checkers (file-state heuristics — no CLI binary calls)
// ---------------------------------------------------------------------------

export const CLI_AUTH_CHECKERS: Record<string, () => boolean> = {
  claude: isClaudeAuthenticated,
  codex: isCodexAuthenticated,
  gemini: isGeminiAuthenticated,
  qwen: isQwenAuthenticated,
};

export type AuthStatus = "logged_in" | "not_logged_in" | "unknown";

function checkAuthStatus(cli: string): AuthStatus {
  const checker = CLI_AUTH_CHECKERS[cli];
  if (!checker) return "unknown";
  try {
    return checker() ? "logged_in" : "not_logged_in";
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// oma-config.yaml loader
// ---------------------------------------------------------------------------

/**
 * Walk from `startDir` up to the filesystem root looking for `relativePath`.
 * Mirrors findFileUp in cli/io/runtime-dispatch.ts so the doctor matrix finds
 * the same config files the spawn path would when invoked from a subdirectory.
 */
function findFileUp(startDir: string, relativePath: string): string | null {
  let current = resolve(startDir);
  const root = parsePath(current).root;
  while (current !== root) {
    const candidate = join(current, relativePath);
    if (existsSync(candidate)) return candidate;
    current = dirname(current);
  }
  return null;
}

function loadOmaConfig(cwd: string): Partial<OmaConfig> | null {
  const configPath = findFileUp(cwd, join(".agents", "oma-config.yaml"));
  if (!configPath) return null;
  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = parseYaml(content) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Partial<OmaConfig>;
    }
  } catch {
    // ignore malformed YAML
  }
  return null;
}

// ---------------------------------------------------------------------------
// Preset resolution (mirrors resolveAgentPlanFromConfig step 1, read-only)
// ---------------------------------------------------------------------------

function resolvePreset(
  config: Partial<OmaConfig>,
): { preset: ModelPreset; resolvedKey: string } | null {
  const modelPreset = config.model_preset;
  if (!modelPreset) return null;

  const resolvedKey = BUILT_IN_PRESET_ALIASES[modelPreset] ?? modelPreset;
  const builtIn =
    BUILT_IN_PRESETS[resolvedKey as keyof typeof BUILT_IN_PRESETS];
  if (builtIn) return { preset: builtIn, resolvedKey };

  const custom = config.custom_presets?.[resolvedKey];
  if (custom) {
    if (custom.extends) {
      const baseKey = BUILT_IN_PRESET_ALIASES[custom.extends] ?? custom.extends;
      const base = BUILT_IN_PRESETS[baseKey as keyof typeof BUILT_IN_PRESETS];
      if (base) {
        return {
          preset: {
            description: custom.description,
            agent_defaults: {
              ...base.agent_defaults,
              ...custom.agent_defaults,
            } as Record<AgentId, AgentSpec>,
          },
          resolvedKey,
        };
      }
    }
    return { preset: custom as ModelPreset, resolvedKey };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Model slug → CLI vendor
// ---------------------------------------------------------------------------

const OWNER_TO_CLI: Record<string, string> = {
  anthropic: "claude",
  openai: "codex",
  google: "gemini",
  qwen: "qwen",
};

function cliFromModelSlug(slug: string): string {
  const owner = slug.split("/")[0] ?? "";
  return OWNER_TO_CLI[owner] ?? "unknown";
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type RowSource = "preset" | "override";

export interface ProfileRow {
  role: string;
  model: string;
  cli: string;
  authStatus: AuthStatus;
  authHint?: string;
  /** Whether this row uses a per-agent override or comes from the preset. */
  source: RowSource;
}

export interface ProfileReport {
  /** Resolved preset key (e.g. "claude-only") or the raw model_preset value. */
  profileName: string;
  rows: ProfileRow[];
  qwenOAuth: DeprecatedOAuthSessionResult;
  isAntigravity: boolean;
  antigravityFallbackRoles: readonly string[];
  /** True when model_preset is absent or unknown — no valid preset could be resolved. */
  missingPreset: boolean;
  /** True when all rows come from the preset with no per-agent overrides. */
  allFromPreset: boolean;
}

// ---------------------------------------------------------------------------
// Main collector
// ---------------------------------------------------------------------------

export async function collectProfileReport(
  cwd: string,
): Promise<ProfileReport> {
  const config = loadOmaConfig(cwd);
  const resolved = config ? resolvePreset(config) : null;

  const missingPreset = resolved === null;
  const profileName =
    resolved?.resolvedKey ?? config?.model_preset ?? "(unknown)";

  const runtimeVendor = detectRuntimeVendor(process.env);
  const isAntigravity = runtimeVendor === "antigravity";

  const agentsOverride = config?.agents ?? {};
  let hasAnyOverride = false;

  // Build rows in canonical order
  const rows: ProfileRow[] = ROLE_ORDER.map((role) => {
    if (missingPreset) {
      // No valid preset — emit placeholder row
      return {
        role,
        model: "❌ NO PRESET",
        cli: "unknown",
        authStatus: "unknown" as AuthStatus,
        source: "preset" as RowSource,
      };
    }

    const typedRole = role as AgentId;
    const override = agentsOverride[typedRole];
    const presetSpec = resolved.preset.agent_defaults[typedRole] as
      | AgentSpec
      | undefined;

    let spec: AgentSpec | undefined;
    let source: RowSource;

    if (override) {
      // Shallow merge: override fields win, preset fills remainder
      spec = presetSpec ? { ...presetSpec, ...override } : override;
      source = "override";
      hasAnyOverride = true;
    } else {
      spec =
        presetSpec ??
        (resolved.preset.agent_defaults.orchestrator as AgentSpec | undefined);
      source = "preset";
    }

    const model = spec?.model ?? "unknown";
    const cli = cliFromModelSlug(model);
    const authStatus = cli !== "unknown" ? checkAuthStatus(cli) : "unknown";
    const registrySpec = getModelSpec(
      model,
      config?.models as Record<string, unknown> | undefined,
    );
    const authHint = registrySpec?.auth_hint;

    return { role, model, cli, authStatus, authHint, source };
  });

  // T9: Qwen OAuth detection
  const qwenOAuth = detectDeprecatedOAuthSession();

  return {
    profileName,
    rows,
    qwenOAuth,
    isAntigravity,
    antigravityFallbackRoles: ANTIGRAVITY_FALLBACK_ROLES,
    missingPreset,
    allFromPreset: !missingPreset && !hasAnyOverride,
  };
}

// ---------------------------------------------------------------------------
// Serialization helpers (for --json integration, future use)
// ---------------------------------------------------------------------------

export function serializeProfileReportAsJson(report: ProfileReport): string {
  return JSON.stringify(
    {
      profileName: report.profileName,
      missingPreset: report.missingPreset,
      allFromPreset: report.allFromPreset,
      isAntigravity: report.isAntigravity,
      rows: report.rows,
      qwenOAuth: {
        hasLegacySession: report.qwenOAuth.hasLegacySession,
        migrationNeeded: report.qwenOAuth.migrationNeeded,
        tokenPath: report.qwenOAuth.tokenPath ?? null,
      },
    },
    null,
    2,
  );
}
