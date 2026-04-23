// cli/commands/doctor/profile.ts
// oma doctor --profile — Profile Health check (RARDO v2.1 T4)
//
// Loads .agents/config/defaults.yaml (T3) + user overrides, builds an
// auth-status matrix for every role-model pairing, calls T9's
// detectDeprecatedOAuthSession() for Qwen, and emits Antigravity warning.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { detectRuntimeVendor } from "../../io/runtime-dispatch.js";
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
// defaults.yaml loader
// ---------------------------------------------------------------------------

interface AgentDefaultEntry {
  model: string;
  effort?: string;
  thinking?: boolean;
}

interface DefaultsYaml {
  agent_defaults?: Record<string, AgentDefaultEntry | string>;
  runtime_profiles?: Record<
    string,
    {
      description?: string;
      agent_defaults?: Record<string, AgentDefaultEntry | string>;
    }
  >;
}

function resolveDefaultsYamlPath(cwd: string): string {
  return join(cwd, ".agents", "config", "defaults.yaml");
}

function parseDefaultsYaml(content: string): DefaultsYaml {
  try {
    const parsed = parseYaml(content) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as DefaultsYaml;
    }
    return {};
  } catch {
    return {};
  }
}

function normalizeEntry(
  entry: AgentDefaultEntry | string | undefined,
): AgentDefaultEntry | undefined {
  if (!entry) return undefined;
  if (typeof entry === "string") return { model: entry };
  return entry;
}

/**
 * Map a legacy vendor name to the corresponding runtime_profiles key.
 * Mirrors the helper in cli/io/runtime-dispatch.ts so the doctor matrix
 * and resolveAgentPlan agree on how to interpret a legacy vendor override.
 */
function legacyVendorToProfileKey(vendor: string): string | null {
  const normalized = vendor.trim().toLowerCase();
  switch (normalized) {
    case "claude":
      return "claude-only";
    case "codex":
      return "codex-only";
    case "gemini":
      return "gemini-only";
    case "qwen":
      return "qwen-only";
    case "antigravity":
      return "antigravity";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// User-override loader
// ---------------------------------------------------------------------------

interface UserOverrideMapping {
  agent_cli_mapping?: Record<string, string | { model: string }>;
}

function loadUserOverride(cwd: string): UserOverrideMapping {
  const candidates = [
    join(cwd, ".agents", "config", "user-preferences.yaml"),
    join(cwd, ".agents", "oma-config.yaml"),
  ];

  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const content = readFileSync(p, "utf-8");
      const parsed = parseYaml(content) as unknown;
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as UserOverrideMapping;
      }
    } catch {
      // ignore malformed YAML
    }
  }

  return {};
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

export interface ProfileRow {
  role: string;
  model: string;
  cli: string;
  authStatus: AuthStatus;
  authHint?: string;
}

export interface ProfileReport {
  profileName: string;
  rows: ProfileRow[];
  qwenOAuth: DeprecatedOAuthSessionResult;
  isAntigravity: boolean;
  antigravityFallbackRoles: readonly string[];
  missingDefaultsYaml: boolean;
}

// ---------------------------------------------------------------------------
// Main collector
// ---------------------------------------------------------------------------

export async function collectProfileReport(
  cwd: string,
): Promise<ProfileReport> {
  const defaultsPath = resolveDefaultsYamlPath(cwd);
  const missingDefaultsYaml = !existsSync(defaultsPath);

  // Load defaults.yaml
  let agentDefaults: Record<string, AgentDefaultEntry | string> = {};
  let defaultsYaml: DefaultsYaml = {};
  if (!missingDefaultsYaml) {
    try {
      const raw = readFileSync(defaultsPath, "utf-8");
      defaultsYaml = parseDefaultsYaml(raw);
      agentDefaults = defaultsYaml.agent_defaults ?? {};
    } catch {
      // defensive — treat as missing
    }
  }

  // Load user overrides
  const userOverride = loadUserOverride(cwd);
  const userMapping = userOverride.agent_cli_mapping ?? {};

  // Resolve active profile name — simple heuristic from config
  const profileName = resolveProfileName(cwd);

  // Detect runtime
  const runtimeVendor = detectRuntimeVendor(process.env);
  const isAntigravity = runtimeVendor === "antigravity";

  // Build rows in canonical order
  const rows: ProfileRow[] = ROLE_ORDER.map((role) => {
    // Check user override first
    const userEntry = userMapping[role];
    let model: string;

    if (userEntry && typeof userEntry !== "string") {
      // User AgentSpec object — use its model slug directly.
      model = userEntry.model;
    } else if (typeof userEntry === "string") {
      // Legacy string vendor override — resolve via runtime_profiles first.
      const profileKey = legacyVendorToProfileKey(userEntry);
      const vendorProfileEntry = profileKey
        ? defaultsYaml.runtime_profiles?.[profileKey]?.agent_defaults?.[role]
        : undefined;
      const entry =
        normalizeEntry(vendorProfileEntry) ??
        normalizeEntry(
          agentDefaults[role] as AgentDefaultEntry | string | undefined,
        );
      model = entry?.model ?? "unknown";
    } else {
      // No user entry — top-level defaults.
      const entry = normalizeEntry(
        agentDefaults[role] as AgentDefaultEntry | string | undefined,
      );
      model = entry?.model ?? "unknown";
    }

    const cli = cliFromModelSlug(model);
    const authStatus = cli !== "unknown" ? checkAuthStatus(cli) : "unknown";
    const spec = getModelSpec(model);
    const authHint = spec?.auth_hint;

    return { role, model, cli, authStatus, authHint };
  });

  // T9: Qwen OAuth detection
  const qwenOAuth = detectDeprecatedOAuthSession();

  return {
    profileName,
    rows,
    qwenOAuth,
    isAntigravity,
    antigravityFallbackRoles: ANTIGRAVITY_FALLBACK_ROLES,
    missingDefaultsYaml,
  };
}

// ---------------------------------------------------------------------------
// Profile name resolution
// ---------------------------------------------------------------------------

function resolveProfileName(cwd: string): string {
  // Check oma-config.yaml for an explicit profile name
  const configPath = join(cwd, ".agents", "oma-config.yaml");
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, "utf-8");
      const parsed = parseYaml(content) as unknown;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "profile" in parsed &&
        typeof (parsed as Record<string, unknown>).profile === "string"
      ) {
        return (parsed as Record<string, string>).profile;
      }
    } catch {
      // ignore
    }
  }

  // Default to "Profile B" (the RARDO v2.1 default profile)
  return "Profile B";
}

// ---------------------------------------------------------------------------
// Serialization helpers (for --json integration, future use)
// ---------------------------------------------------------------------------

export function serializeProfileReportAsJson(report: ProfileReport): string {
  return JSON.stringify(
    {
      profileName: report.profileName,
      missingDefaultsYaml: report.missingDefaultsYaml,
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
