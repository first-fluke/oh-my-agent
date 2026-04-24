/**
 * Filesystem-based regression tests for collectProfileReport.
 *
 * Verifies that the doctor matrix discovers .agents/config/defaults.yaml,
 * .agents/oma-config.yaml, and .agents/config/user-preferences.yaml by
 * walking parent directories — matching findFileUp semantics in
 * cli/io/runtime-dispatch.ts. Without this the matrix would show defaults
 * while the actual spawn path reads the parent's config, which is the exact
 * fragmentation PR #270 set out to eliminate.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../vendors/index.js", () => ({
  isClaudeAuthenticated: vi.fn(() => false),
  isCodexAuthenticated: vi.fn(() => false),
  isGeminiAuthenticated: vi.fn(() => false),
  isQwenAuthenticated: vi.fn(() => false),
}));

vi.mock("../../vendors/qwen/auth.js", () => ({
  detectDeprecatedOAuthSession: vi.fn(() => ({
    hasLegacySession: false,
    migrationNeeded: false,
  })),
  printMigrationGuide: vi.fn(),
}));

vi.mock("../../io/runtime-dispatch.js", () => ({
  detectRuntimeVendor: vi.fn(() => "claude"),
}));

import { collectProfileReport } from "./profile.js";

const DEFAULTS_YAML = `
agent_defaults:
  orchestrator: { model: "anthropic/claude-sonnet-4-6" }
  architecture: { model: "anthropic/claude-opus-4-7" }
  qa:           { model: "anthropic/claude-sonnet-4-6" }
  pm:           { model: "anthropic/claude-sonnet-4-6" }
  backend:      { model: "openai/gpt-5.3-codex", effort: "high" }
  frontend:     { model: "openai/gpt-5.4", effort: "high" }
  mobile:       { model: "openai/gpt-5.4", effort: "high" }
  db:           { model: "openai/gpt-5.3-codex", effort: "high" }
  debug:        { model: "openai/gpt-5.3-codex", effort: "high" }
  tf-infra:     { model: "openai/gpt-5.4", effort: "high" }
  retrieval:    { model: "google/gemini-3.1-flash-lite" }
`.trim();

describe("collectProfileReport — subdirectory invocation", () => {
  let projectRoot: string;
  let subDir: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), "oma-doctor-subdir-"));
    mkdirSync(join(projectRoot, ".agents", "config"), { recursive: true });
    subDir = join(projectRoot, "packages", "web", "src");
    mkdirSync(subDir, { recursive: true });
    writeFileSync(
      join(projectRoot, ".agents", "config", "defaults.yaml"),
      DEFAULTS_YAML,
    );
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it("finds defaults.yaml from a nested subdirectory", async () => {
    const report = await collectProfileReport(subDir);
    expect(report.missingDefaultsYaml).toBe(false);
    const backend = report.rows.find((r) => r.role === "backend");
    expect(backend?.model).toBe("openai/gpt-5.3-codex");
  });

  it("honors oma-config.yaml override from a nested subdirectory", async () => {
    writeFileSync(
      join(projectRoot, ".agents", "oma-config.yaml"),
      `agent_cli_mapping:\n  backend:\n    model: "anthropic/claude-sonnet-4-6"\n`,
    );
    const report = await collectProfileReport(subDir);
    const backend = report.rows.find((r) => r.role === "backend");
    expect(backend?.model).toBe("anthropic/claude-sonnet-4-6");
    expect(backend?.cli).toBe("claude");
  });

  it("honors legacy user-preferences.yaml from a nested subdirectory", async () => {
    writeFileSync(
      join(projectRoot, ".agents", "config", "user-preferences.yaml"),
      `agent_cli_mapping:\n  backend: "gemini"\n`,
    );
    const report = await collectProfileReport(subDir);
    const backend = report.rows.find((r) => r.role === "backend");
    // Legacy string vendor "gemini" resolves via runtime_profiles.gemini-only
    // in the real defaults.yaml; with our minimal fixture no such profile
    // exists, so it falls back to the top-level default.
    expect(backend?.model).toBe("openai/gpt-5.3-codex");
  });

  it("prefers oma-config.yaml over user-preferences.yaml", async () => {
    writeFileSync(
      join(projectRoot, ".agents", "config", "user-preferences.yaml"),
      `agent_cli_mapping:\n  backend:\n    model: "google/gemini-3.1-flash-lite"\n`,
    );
    writeFileSync(
      join(projectRoot, ".agents", "oma-config.yaml"),
      `agent_cli_mapping:\n  backend:\n    model: "anthropic/claude-sonnet-4-6"\n`,
    );
    const report = await collectProfileReport(subDir);
    const backend = report.rows.find((r) => r.role === "backend");
    expect(backend?.model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("resolves profile name from oma-config.yaml in parent dir", async () => {
    writeFileSync(
      join(projectRoot, ".agents", "oma-config.yaml"),
      `profile: "codex-only"\n`,
    );
    const report = await collectProfileReport(subDir);
    expect(report.profileName).toBe("codex-only");
  });
});
