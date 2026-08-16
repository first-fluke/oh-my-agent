// cli/commands/doctor/profile.test.ts
// Unit tests for oma doctor --profile
//
// Covers:
//   1. Auth matrix — all 4 CLI states (logged in / not logged in)
//   2. Qwen OAuth migration warning detection
//   3. Antigravity runtime fallback detection
//   4. Stable role ordering
//   5. Defensive: missing defaults.yaml
//   6. model → CLI vendor mapping
//   7. auth_hint presence for not-logged-in rows

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeprecatedOAuthSessionResult } from "../../vendors/qwen/auth.js";

// ---------------------------------------------------------------------------
// Module-level mocks (hoisted — apply to all imports in this file)
// ---------------------------------------------------------------------------

vi.mock("../../vendors/index.js", () => {
  const isAntigravityAuthenticated = vi.fn(() => false);
  const isClaudeAuthenticated = vi.fn(() => false);
  const isCodexAuthenticated = vi.fn(() => false);
  const isCommandCodeAuthenticated = vi.fn(() => false);
  const isCursorAuthenticated = vi.fn(() => false);
  const isGrokAuthenticated = vi.fn(() => false);
  const isKimiAuthenticated = vi.fn(() => false);
  const isKiroAuthenticated = vi.fn(() => false);
  // Mirrors the real signature: opencode credentials are keyed per provider.
  const isOpencodeAuthenticated = vi.fn((_provider?: string) => false);
  const isPiAuthenticated = vi.fn(() => false);
  const isQwenAuthenticated = vi.fn(() => false);
  return {
    isAntigravityAuthenticated,
    isClaudeAuthenticated,
    isCodexAuthenticated,
    isCommandCodeAuthenticated,
    isCursorAuthenticated,
    isGrokAuthenticated,
    isKimiAuthenticated,
    isKiroAuthenticated,
    isOpencodeAuthenticated,
    isPiAuthenticated,
    isQwenAuthenticated,
    // Mirrors the derived AUTH_CHECKERS in vendors/index (same fn instances so
    // per-test mockReturnValue on the checkers above is reflected here).
    AUTH_CHECKERS: {
      claude: isClaudeAuthenticated,
      codex: isCodexAuthenticated,
      commandcode: isCommandCodeAuthenticated,
      cursor: isCursorAuthenticated,
      qwen: isQwenAuthenticated,
      antigravity: isAntigravityAuthenticated,
      grok: isGrokAuthenticated,
      kimi: isKimiAuthenticated,
      kiro: isKiroAuthenticated,
      pi: isPiAuthenticated,
      opencode: isOpencodeAuthenticated,
    },
  };
});

vi.mock("../../vendors/qwen/auth.js", () => ({
  detectDeprecatedOAuthSession: vi.fn(
    (): DeprecatedOAuthSessionResult => ({
      hasLegacySession: false,
      migrationNeeded: false,
    }),
  ),
  printMigrationGuide: vi.fn(),
}));

vi.mock("../../io/runtime-dispatch.js", () => ({
  detectRuntimeVendor: vi.fn(() => "claude"),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => DEFAULT_DEFAULTS_YAML),
  };
});

// ---------------------------------------------------------------------------
// Fixture: oma-config.yaml with mixed preset
// ---------------------------------------------------------------------------

const DEFAULT_DEFAULTS_YAML = `
language: en
model_preset: mixed
`.trim();

// ---------------------------------------------------------------------------
// Import the module under test ONCE — mocks are already applied via vi.mock()
// ---------------------------------------------------------------------------

import * as fsMock from "node:fs";
import * as runtimeDispatchMock from "../../io/runtime-dispatch.js";
import * as vendorsMock from "../../vendors/index.js";
import * as qwenAuthMock from "../../vendors/qwen/auth.js";
import * as profileModule from "./profile.js";

// ---------------------------------------------------------------------------
// Setup: reset mock implementations before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Default: all CLIs logged out, no legacy OAuth, claude runtime
  vi.mocked(vendorsMock.isAntigravityAuthenticated).mockReturnValue(false);
  vi.mocked(vendorsMock.isClaudeAuthenticated).mockReturnValue(false);
  vi.mocked(vendorsMock.isCodexAuthenticated).mockReturnValue(false);
  vi.mocked(vendorsMock.isQwenAuthenticated).mockReturnValue(false);
  vi.mocked(vendorsMock.isOpencodeAuthenticated).mockReset();
  vi.mocked(vendorsMock.isOpencodeAuthenticated).mockReturnValue(false);
  vi.mocked(qwenAuthMock.detectDeprecatedOAuthSession).mockReturnValue({
    hasLegacySession: false,
    migrationNeeded: false,
  });
  vi.mocked(runtimeDispatchMock.detectRuntimeVendor).mockReturnValue("claude");
  vi.mocked(fsMock.existsSync).mockReturnValue(true);
  vi.mocked(fsMock.readFileSync).mockReturnValue(DEFAULT_DEFAULTS_YAML);
});

// ---------------------------------------------------------------------------
// Tests: role ordering
// ---------------------------------------------------------------------------

describe("collectProfileReport — role ordering", () => {
  it("returns rows in canonical ROLE_ORDER", async () => {
    const report = await profileModule.collectProfileReport("/fake/cwd");
    const roles = report.rows.map((r) => r.role);
    expect(roles).toEqual([...profileModule.ROLE_ORDER]);
  });

  it("returns one row per canonical role", async () => {
    const report = await profileModule.collectProfileReport("/fake/cwd");
    expect(report.rows).toHaveLength(profileModule.ROLE_ORDER.length);
  });
});

// ---------------------------------------------------------------------------
// Tests: Claude auth state
// ---------------------------------------------------------------------------

describe("collectProfileReport — Claude logged in", () => {
  it("marks Claude-based roles as logged_in", async () => {
    vi.mocked(vendorsMock.isClaudeAuthenticated).mockReturnValue(true);

    const report = await profileModule.collectProfileReport("/fake/cwd");

    const claudeRows = report.rows.filter((r) => r.cli === "claude");
    const codexRows = report.rows.filter((r) => r.cli === "codex");

    expect(claudeRows.length).toBeGreaterThan(0);
    for (const row of claudeRows) {
      expect(row.authStatus, `role ${row.role} should be logged_in`).toBe(
        "logged_in",
      );
    }
    for (const row of codexRows) {
      expect(row.authStatus, `role ${row.role} should be not_logged_in`).toBe(
        "not_logged_in",
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: Codex auth state
// ---------------------------------------------------------------------------

describe("collectProfileReport — Codex logged in", () => {
  it("marks Codex-based roles as logged_in when isCodexAuthenticated returns true", async () => {
    vi.mocked(vendorsMock.isCodexAuthenticated).mockReturnValue(true);

    const report = await profileModule.collectProfileReport("/fake/cwd");

    const codexRows = report.rows.filter((r) => r.cli === "codex");
    expect(codexRows.length).toBeGreaterThan(0);
    for (const row of codexRows) {
      expect(row.authStatus, `role ${row.role} should be logged_in`).toBe(
        "logged_in",
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: Qwen auth state
// ---------------------------------------------------------------------------

describe("collectProfileReport — Qwen logged in", () => {
  it("marks Qwen-based roles as logged_in when isQwenAuthenticated returns true", async () => {
    vi.mocked(vendorsMock.isQwenAuthenticated).mockReturnValue(true);

    // Use qwen preset so all agents resolve to Qwen models
    const qwenYaml = `
language: en
model_preset: qwen
`.trim();

    vi.mocked(fsMock.readFileSync).mockReturnValue(qwenYaml);

    const report = await profileModule.collectProfileReport("/fake/cwd");

    const qwenRows = report.rows.filter((r) => r.cli === "qwen");
    expect(qwenRows.length).toBeGreaterThan(0);
    for (const row of qwenRows) {
      expect(row.authStatus, `role ${row.role} should be logged_in`).toBe(
        "logged_in",
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: All CLIs logged out
// ---------------------------------------------------------------------------

describe("collectProfileReport — all CLIs logged out", () => {
  it("marks all known-CLI rows as not_logged_in", async () => {
    // All auth checkers default to false (set in beforeEach)
    const report = await profileModule.collectProfileReport("/fake/cwd");

    for (const row of report.rows) {
      if (row.cli !== "unknown") {
        expect(row.authStatus, `role ${row.role} should be not_logged_in`).toBe(
          "not_logged_in",
        );
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: Qwen OAuth deprecation detection (T9)
// ---------------------------------------------------------------------------

describe("collectProfileReport — Qwen OAuth deprecation detection", () => {
  it("surfaces migrationNeeded: true when legacy session detected", async () => {
    vi.mocked(qwenAuthMock.detectDeprecatedOAuthSession).mockReturnValue({
      hasLegacySession: true,
      migrationNeeded: true,
      tokenPath: "/home/user/.qwen/oauth.json",
    });

    const report = await profileModule.collectProfileReport("/fake/cwd");

    expect(report.qwenOAuth.hasLegacySession).toBe(true);
    expect(report.qwenOAuth.migrationNeeded).toBe(true);
    expect(report.qwenOAuth.tokenPath).toBe("/home/user/.qwen/oauth.json");
  });

  it("surfaces migrationNeeded: false when no legacy session found", async () => {
    vi.mocked(qwenAuthMock.detectDeprecatedOAuthSession).mockReturnValue({
      hasLegacySession: false,
      migrationNeeded: false,
    });

    const report = await profileModule.collectProfileReport("/fake/cwd");

    expect(report.qwenOAuth.hasLegacySession).toBe(false);
    expect(report.qwenOAuth.migrationNeeded).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Antigravity runtime detection
// ---------------------------------------------------------------------------

describe("collectProfileReport — Antigravity runtime detection", () => {
  it("sets isAntigravity: true when runtime is antigravity", async () => {
    vi.mocked(runtimeDispatchMock.detectRuntimeVendor).mockReturnValue(
      "antigravity",
    );

    const report = await profileModule.collectProfileReport("/fake/cwd");

    expect(report.isAntigravity).toBe(true);
    expect(report.antigravityFallbackRoles).toContain("backend");
    expect(report.antigravityFallbackRoles).toContain("frontend");
    expect(report.antigravityFallbackRoles).toContain("mobile");
    expect(report.antigravityFallbackRoles).toContain("db");
    expect(report.antigravityFallbackRoles).toContain("debug");
    expect(report.antigravityFallbackRoles).toContain("tf-infra");
  });

  it("sets isAntigravity: false for non-Antigravity runtimes", async () => {
    vi.mocked(runtimeDispatchMock.detectRuntimeVendor).mockReturnValue(
      "claude",
    );

    const report = await profileModule.collectProfileReport("/fake/cwd");

    expect(report.isAntigravity).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: missingPreset (replaces legacy missingDefaultsYaml flag)
// ---------------------------------------------------------------------------

describe("collectProfileReport — missingPreset", () => {
  it("sets missingPreset: true when oma-config.yaml has no model_preset", async () => {
    vi.mocked(fsMock.readFileSync).mockReturnValue("language: en\n");

    const report = await profileModule.collectProfileReport("/fake/cwd");

    expect(report.missingPreset).toBe(true);
    expect(report.profileName).toBe("(unknown)");
  });

  it("sets missingPreset: false when oma-config.yaml declares a built-in preset", async () => {
    vi.mocked(fsMock.readFileSync).mockReturnValue(DEFAULT_DEFAULTS_YAML);

    const report = await profileModule.collectProfileReport("/fake/cwd");

    expect(report.missingPreset).toBe(false);
  });

  it("sets missingPreset: true when oma-config.yaml is not found", async () => {
    vi.mocked(fsMock.existsSync).mockReturnValue(false);

    const report = await profileModule.collectProfileReport("/fake/cwd");

    expect(report.missingPreset).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: model → CLI vendor mapping
// ---------------------------------------------------------------------------

describe("collectProfileReport — model and CLI mapping", () => {
  it("correctly maps anthropic/ models to claude CLI", async () => {
    const report = await profileModule.collectProfileReport("/fake/cwd");
    const orchestrator = report.rows.find((r) => r.role === "orchestrator");
    expect(orchestrator?.cli).toBe("claude");
    expect(orchestrator?.model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("correctly maps openai/ models to codex CLI", async () => {
    const report = await profileModule.collectProfileReport("/fake/cwd");
    const backend = report.rows.find((r) => r.role === "backend");
    expect(backend?.cli).toBe("codex");
    expect(backend?.model).toBe("openai/gpt-5.5");
  });
});

// ---------------------------------------------------------------------------
// Tests: user models: registry (regression — issue #656)
// ---------------------------------------------------------------------------

describe("collectProfileReport — user models: registry", () => {
  const CUSTOM_MODEL_YAML = `
language: en
model_preset: my-preset
models:
  moonshotai/kimi-k3:
    cli: opencode
    cli_model: moonshotai/kimi-k3
    auth_hint: "Moonshot AI — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false
custom_presets:
  my-preset:
    description: custom
    agent_defaults:
      orchestrator:
        model: moonshotai/kimi-k3
      architecture:
        model: moonshotai/kimi-k3
`.trim();

  beforeEach(() => {
    // Only oma-config.yaml exists — .agents/config/models.yaml must not be
    // found, so the inline `models:` block is the sole registry source.
    vi.mocked(fsMock.existsSync).mockImplementation((p) =>
      String(p).endsWith("/.agents/oma-config.yaml"),
    );
    vi.mocked(fsMock.readFileSync).mockReturnValue(CUSTOM_MODEL_YAML);
  });

  it("resolves CLI from a custom models: entry whose owner is not a built-in prefix", async () => {
    const report = await profileModule.collectProfileReport("/fake/cwd");
    const archRow = report.rows.find((r) => r.role === "architecture");

    expect(archRow?.model).toBe("moonshotai/kimi-k3");
    expect(archRow?.cli).toBe("opencode");
  });

  it("reports the real auth status for a custom models: entry", async () => {
    vi.mocked(vendorsMock.isOpencodeAuthenticated).mockReturnValue(true);

    const report = await profileModule.collectProfileReport("/fake/cwd");
    const archRow = report.rows.find((r) => r.role === "architecture");

    expect(archRow?.authStatus).toBe("logged_in");
    expect(archRow?.authHint).toContain("Moonshot AI");
  });

  it("still reports unknown for slugs absent from both registry and owner map", async () => {
    vi.mocked(fsMock.readFileSync).mockReturnValue(
      `
language: en
model_preset: my-preset
custom_presets:
  my-preset:
    description: custom
    agent_defaults:
      orchestrator:
        model: moonshotai/kimi-k3
`.trim(),
    );

    const report = await profileModule.collectProfileReport("/fake/cwd");
    const orchestrator = report.rows.find((r) => r.role === "orchestrator");

    expect(orchestrator?.cli).toBe("unknown");
    expect(orchestrator?.authStatus).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// Tests: OpenCode provider-aware auth (regression — issue #699)
// ---------------------------------------------------------------------------

describe("collectProfileReport — OpenCode provider-aware auth", () => {
  const OPENCODE_YAML = `
language: en
model_preset: opencode-local
models:
  opencode-zai-coding-plan/glm-5.3:
    cli: opencode
    cli_model: zai-coding-plan/glm-5.3
    auth_hint: "Z.AI Coding Plan — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false
  opencode-go/deepseek-v4-flash:
    cli: opencode
    cli_model: opencode-go/deepseek-v4-flash
    auth_hint: "OpenCode Go subscription — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false
custom_presets:
  opencode-local:
    description: opencode local
    agent_defaults:
      orchestrator:
        model: opencode-zai-coding-plan/glm-5.3
      pm:
        model: opencode-go/deepseek-v4-flash
`.trim();

  beforeEach(() => {
    // Only oma-config.yaml exists — the inline `models:` block is the sole
    // registry source.
    vi.mocked(fsMock.existsSync).mockImplementation((p) =>
      String(p).endsWith("/.agents/oma-config.yaml"),
    );
    vi.mocked(fsMock.readFileSync).mockReturnValue(OPENCODE_YAML);
    // Only the Z.AI Coding Plan credential exists (mirrors `opencode auth list`
    // in the report: no opencode-go entry).
    vi.mocked(vendorsMock.isOpencodeAuthenticated).mockImplementation(
      (provider?: string) => provider === "zai-coding-plan",
    );
  });

  it("checks the provider from the registered cli_model, not opencode-go", async () => {
    const report = await profileModule.collectProfileReport("/fake/cwd");
    const orchestrator = report.rows.find((r) => r.role === "orchestrator");

    expect(orchestrator?.cli).toBe("opencode");
    expect(orchestrator?.authStatus).toBe("logged_in");
    expect(vendorsMock.isOpencodeAuthenticated).toHaveBeenCalledWith(
      "zai-coding-plan",
    );
  });

  it("reports not_logged_in when the row's provider has no credential", async () => {
    const report = await profileModule.collectProfileReport("/fake/cwd");
    const pm = report.rows.find((r) => r.role === "pm");

    expect(pm?.model).toBe("opencode-go/deepseek-v4-flash");
    expect(pm?.authStatus).toBe("not_logged_in");
    expect(vendorsMock.isOpencodeAuthenticated).toHaveBeenCalledWith(
      "opencode-go",
    );
  });

  it("leaves opencode-go/ rows unchanged when that credential exists", async () => {
    vi.mocked(vendorsMock.isOpencodeAuthenticated).mockImplementation(
      (provider?: string) => provider === "opencode-go",
    );

    const report = await profileModule.collectProfileReport("/fake/cwd");

    expect(report.rows.find((r) => r.role === "pm")?.authStatus).toBe(
      "logged_in",
    );
    expect(report.rows.find((r) => r.role === "orchestrator")?.authStatus).toBe(
      "not_logged_in",
    );
  });

  it("reports unknown when the opencode provider cannot be derived", async () => {
    // Unregistered `opencode-*` slug: ownerToVendor resolves the CLI, but no
    // ModelSpec means no cli_model to read the provider from.
    vi.mocked(fsMock.readFileSync).mockReturnValue(
      `
language: en
model_preset: opencode-local
custom_presets:
  opencode-local:
    description: opencode local
    agent_defaults:
      orchestrator:
        model: opencode-mystery/some-model
`.trim(),
    );

    const report = await profileModule.collectProfileReport("/fake/cwd");
    const orchestrator = report.rows.find((r) => r.role === "orchestrator");

    expect(orchestrator?.cli).toBe("opencode");
    expect(orchestrator?.authStatus).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// Tests: auth_hint
// ---------------------------------------------------------------------------

describe("collectProfileReport — auth_hint for not-logged-in rows", () => {
  it("includes auth_hint for rows whose model is in the registry", async () => {
    const report = await profileModule.collectProfileReport("/fake/cwd");
    // architecture uses anthropic/claude-opus-4-7, which has an auth_hint
    const archRow = report.rows.find((r) => r.role === "architecture");
    expect(archRow).toBeDefined();
    expect(archRow?.authHint).toBeTruthy();
    expect(archRow?.authHint).toContain("Claude");
  });
});

// ---------------------------------------------------------------------------
// Tests: JSON serialization
// ---------------------------------------------------------------------------

describe("serializeProfileReportAsJson", () => {
  it("produces valid JSON with expected top-level keys", async () => {
    const report = await profileModule.collectProfileReport("/fake/cwd");
    const json = profileModule.serializeProfileReportAsJson(report);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed).toHaveProperty("profileName");
    expect(parsed).toHaveProperty("rows");
    expect(parsed).toHaveProperty("qwenOAuth");
    expect(parsed).toHaveProperty("isAntigravity");
    expect(parsed).toHaveProperty("missingPreset");
  });

  it("serialized rows include role, model, cli, authStatus", async () => {
    const report = await profileModule.collectProfileReport("/fake/cwd");
    const json = profileModule.serializeProfileReportAsJson(report);
    const parsed = JSON.parse(json) as { rows: Record<string, unknown>[] };
    const firstRow = parsed.rows[0];
    expect(firstRow).toHaveProperty("role");
    expect(firstRow).toHaveProperty("model");
    expect(firstRow).toHaveProperty("cli");
    expect(firstRow).toHaveProperty("authStatus");
  });
});
