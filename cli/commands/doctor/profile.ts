// cli/commands/doctor/profile.ts
// oma doctor --profile — Profile Health check
//
// Loads .agents/oma-config.yaml, resolves the model_preset (built-in or custom),
// builds an auth-status matrix for every role-model pairing, calls
// detectDeprecatedOAuthSession() for Qwen, and emits Antigravity warning.

import { loadUserConfig } from "../../io/runtime-dispatch/config-loader.js";
import { resolveAutoVendor } from "../../io/runtime-dispatch/detect.js";
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
import {
  getModelSpec,
  type ModelSpec,
  ownerToVendor,
} from "../../platform/model-registry.js";
import { loadConfigLayers } from "../../utils/config-layers.js";
import {
  freeApiKey,
  probeFreeProvider,
  resolveFreeProvider,
  resolveFreeVendor,
} from "../../utils/free-provider.js";
import { AUTH_CHECKERS, isOpencodeAuthenticated } from "../../vendors/index.js";
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
  "refactor",
  "docs",
  "tf-infra",
  "explore",
] as const;

export type Role = (typeof ROLE_ORDER)[number];

/**
 * Impl roles that fall back to external subprocess under Antigravity when the
 * resolved per-row CLI differs from `antigravity` (the agy CLI). Computed
 * dynamically at collect time so an `antigravity` preset under the Antigravity
 * runtime no longer surfaces a fallback warning.
 */
const IMPL_ROLES: readonly string[] = [
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

export type AuthStatus = "logged_in" | "not_logged_in" | "unknown";

/**
 * opencode stores one credential per *provider* (`opencode-go`, `openai`,
 * `zai-coding-plan`, …), and a model's provider is the prefix of its
 * `cli_model` (`zai-coding-plan/glm-5.3` → `zai-coding-plan`). The registry
 * slug's owner is not a reliable source: users prefix it with `opencode-` so
 * `ownerToVendor` resolves the CLI, which yields `opencode-zai-coding-plan`
 * rather than the provider opencode actually authenticates.
 *
 * Returns undefined when no registered spec supplies a `provider/model`
 * cli_model — the caller then reports `unknown` instead of asserting a
 * definite auth failure against opencode's `opencode-go` default (issue #699).
 */
function opencodeProvider(spec: ModelSpec | undefined): string | undefined {
  const cliModel = spec?.cli_model ?? "";
  const provider = cliModel.includes("/") ? cliModel.split("/")[0] : "";
  return provider || undefined;
}

function checkAuthStatus(cli: string, spec: ModelSpec | undefined): AuthStatus {
  try {
    if (cli === "opencode") {
      const provider = opencodeProvider(spec);
      if (!provider) return "unknown";
      return isOpencodeAuthenticated(provider) ? "logged_in" : "not_logged_in";
    }
    const checker = AUTH_CHECKERS[cli];
    if (!checker) return "unknown";
    return checker() ? "logged_in" : "not_logged_in";
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Preset resolution (mirrors resolveAgentPlanFromConfig step 1, read-only)
// ---------------------------------------------------------------------------

function resolvePreset(
  config: Partial<OmaConfig>,
): { preset: ModelPreset; resolvedKey: string } | null {
  const modelPreset = config.model_preset;
  if (!modelPreset) return null;
  if (modelPreset === "auto" || modelPreset === "free") {
    return {
      preset: { description: "Vendor agent defaults", agent_defaults: {} },
      resolvedKey: modelPreset,
    };
  }

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

/**
 * Resolve a model slug to its CLI vendor the same way the dispatch path does
 * (`resolveVendorFromModelSlug` in agent-config/vendor-resolution.ts): a
 * registered ModelSpec's `cli` field is authoritative — including inline
 * `models:` entries from oma-config.yaml — and the owner-prefix heuristic is
 * only the fallback for unregistered slugs. Returns "unknown" when neither
 * source resolves, which the matrix renders as `? unknown`.
 */
function cliFromModelSpec(spec: ModelSpec | undefined, slug: string): string {
  if (spec?.cli) return spec.cli;
  const owner = slug.split("/")[0] ?? "";
  return ownerToVendor(owner) ?? "unknown";
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type RowSource = "preset" | "override" | "vendor";

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
  configSources?: {
    global?: string;
    globalLocal?: string;
    shared?: string;
    local?: string;
    environment?: string;
  };
  configError?: string;
  freeProvider?: {
    baseUrl?: string;
    model?: string;
    apiKeyEnv?: string;
    keyPresent: boolean;
    reachable: boolean;
    error?: string;
    environmentOverrides: string[];
  };
  /** Resolved preset key (e.g. "claude") or the raw model_preset value. */
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
  let configSources: ProfileReport["configSources"];
  let configError: string | undefined;
  let config: Partial<OmaConfig> | null = null;
  try {
    config = loadUserConfig(cwd);
    configSources = loadConfigLayers(cwd).sources;
  } catch (error) {
    configError = error instanceof Error ? error.message : String(error);
  }
  const resolved = config ? resolvePreset(config) : null;

  const missingPreset = resolved === null;
  const profileName =
    resolved?.resolvedKey ?? config?.model_preset ?? "(unknown)";

  const runtimeVendor = detectRuntimeVendor(process.env);
  const isAntigravity = runtimeVendor === "antigravity";

  const agentsOverride = config?.agents ?? {};
  let hasAnyOverride = false;

  let freeProvider: ProfileReport["freeProvider"];
  let freeVendor = "unknown";
  if (profileName === "free" && config) {
    freeProvider = {
      keyPresent: false,
      reachable: false,
      environmentOverrides: ["FREELLM_BASE_URL", "FREELLM_MODEL"].filter(
        (name) => process.env[name] !== undefined,
      ),
    };
    try {
      Object.assign(freeProvider, resolveFreeProvider(config));
      freeVendor = resolveFreeVendor(config);
      const provider = resolveFreeProvider(config);
      freeApiKey(provider);
      freeProvider.keyPresent = true;
      await probeFreeProvider(provider);
      freeProvider.reachable = true;
    } catch (error) {
      freeProvider.error =
        error instanceof Error ? error.message : String(error);
    }
  }

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

    if (freeProvider) {
      return {
        role,
        model: freeProvider.model ?? "(invalid free config)",
        cli: freeVendor,
        authStatus: freeProvider.reachable
          ? "logged_in"
          : freeProvider.keyPresent
            ? "unknown"
            : "not_logged_in",
        source: "preset",
      };
    }
    const typedRole = role as AgentId;
    const override = agentsOverride[typedRole];
    if (profileName === "auto" && !override) {
      const cli = resolveAutoVendor(config?.default_cli);
      return {
        role,
        model: "(vendor agent default)",
        cli,
        authStatus: checkAuthStatus(cli, undefined),
        source: "vendor",
      };
    }
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
    const registrySpec = getModelSpec(
      model,
      config?.models as Record<string, unknown> | undefined,
    );
    const cli = cliFromModelSpec(registrySpec, model);
    const authStatus =
      cli !== "unknown" ? checkAuthStatus(cli, registrySpec) : "unknown";
    const authHint = registrySpec?.auth_hint;

    return { role, model, cli, authStatus, authHint, source };
  });

  // T9: Qwen OAuth detection
  const qwenOAuth = detectDeprecatedOAuthSession();

  // Under the Antigravity runtime, only impl roles whose resolved CLI is NOT
  // antigravity (e.g. inherited from a non-antigravity preset) actually fall
  // back to an external subprocess.
  const antigravityFallbackRoles: readonly string[] = isAntigravity
    ? rows
        .filter(
          (row) => IMPL_ROLES.includes(row.role) && row.cli !== "antigravity",
        )
        .map((row) => row.role)
    : [];

  return {
    profileName,
    configSources,
    configError,
    freeProvider,
    rows,
    qwenOAuth,
    isAntigravity,
    antigravityFallbackRoles,
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
      configSources: report.configSources,
      configError: report.configError,
      freeProvider: report.freeProvider,
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
