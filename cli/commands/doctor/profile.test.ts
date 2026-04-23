// cli/commands/doctor/profile.test.ts
// Unit tests for oma doctor --profile (RARDO v2.1 T4)
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

vi.mock("../../vendors/index.js", () => ({
  isClaudeAuthenticated: vi.fn(() => false),
  isCodexAuthenticated: vi.fn(() => false),
  isGeminiAuthenticated: vi.fn(() => false),
  isQwenAuthenticated: vi.fn(() => false),
}));

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
// Fixture: minimal defaults.yaml (Profile B)
// ---------------------------------------------------------------------------

const DEFAULT_DEFAULTS_YAML = `
agent_defaults:
  orchestrator:
    model: "anthropic/claude-sonnet-4-6"
  architecture:
    model: "anthropic/claude-opus-4-7"
  qa:
    model: "anthropic/claude-sonnet-4-6"
  pm:
    model: "anthropic/claude-sonnet-4-6"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: "high"
  frontend:
    model: "openai/gpt-5.4"
    effort: "high"
  mobile:
    model: "openai/gpt-5.4"
    effort: "high"
  db:
    model: "openai/gpt-5.3-codex"
    effort: "high"
  debug:
    model: "openai/gpt-5.3-codex"
    effort: "high"
  tf-infra:
    model: "openai/gpt-5.4"
    effort: "high"
  retrieval:
    model: "google/gemini-3.1-flash-lite"
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
  vi.mocked(vendorsMock.isClaudeAuthenticated).mockReturnValue(false);
  vi.mocked(vendorsMock.isCodexAuthenticated).mockReturnValue(false);
  vi.mocked(vendorsMock.isGeminiAuthenticated).mockReturnValue(false);
  vi.mocked(vendorsMock.isQwenAuthenticated).mockReturnValue(false);
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

  it("returns exactly 11 rows for Profile B defaults", async () => {
    const report = await profileModule.collectProfileReport("/fake/cwd");
    expect(report.rows).toHaveLength(11);
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
    const geminiRows = report.rows.filter((r) => r.cli === "gemini");

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
    for (const row of geminiRows) {
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
// Tests: Gemini auth state
// ---------------------------------------------------------------------------

describe("collectProfileReport — Gemini logged in", () => {
  it("marks Gemini-based roles as logged_in when isGeminiAuthenticated returns true", async () => {
    vi.mocked(vendorsMock.isGeminiAuthenticated).mockReturnValue(true);

    const report = await profileModule.collectProfileReport("/fake/cwd");

    const geminiRows = report.rows.filter((r) => r.cli === "gemini");
    expect(geminiRows.length).toBeGreaterThan(0);
    for (const row of geminiRows) {
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

    // Provide a YAML that includes Qwen roles
    const qwenYaml = `
agent_defaults:
  orchestrator:
    model: "anthropic/claude-sonnet-4-6"
  architecture:
    model: "anthropic/claude-opus-4-7"
  qa:
    model: "anthropic/claude-sonnet-4-6"
  pm:
    model: "anthropic/claude-sonnet-4-6"
  backend:
    model: "qwen/qwen3-coder-plus"
  frontend:
    model: "openai/gpt-5.4"
  mobile:
    model: "openai/gpt-5.4"
  db:
    model: "qwen/qwen3-coder-next"
  debug:
    model: "openai/gpt-5.3-codex"
  tf-infra:
    model: "openai/gpt-5.4"
  retrieval:
    model: "google/gemini-3.1-flash-lite"
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
// Tests: Missing defaults.yaml
// ---------------------------------------------------------------------------

describe("collectProfileReport — missing defaults.yaml", () => {
  it("sets missingDefaultsYaml: true when defaults.yaml does not exist", async () => {
    vi.mocked(fsMock.existsSync).mockImplementation((p) => {
      const pathStr = String(p);
      return !pathStr.endsWith("defaults.yaml");
    });

    const report = await profileModule.collectProfileReport("/fake/cwd");

    expect(report.missingDefaultsYaml).toBe(true);
  });

  it("sets missingDefaultsYaml: false when defaults.yaml exists", async () => {
    vi.mocked(fsMock.existsSync).mockReturnValue(true);

    const report = await profileModule.collectProfileReport("/fake/cwd");

    expect(report.missingDefaultsYaml).toBe(false);
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
    expect(backend?.model).toBe("openai/gpt-5.3-codex");
  });

  it("correctly maps google/ models to gemini CLI", async () => {
    const report = await profileModule.collectProfileReport("/fake/cwd");
    const retrieval = report.rows.find((r) => r.role === "retrieval");
    expect(retrieval?.cli).toBe("gemini");
    expect(retrieval?.model).toBe("google/gemini-3.1-flash-lite");
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
    expect(parsed).toHaveProperty("missingDefaultsYaml");
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
