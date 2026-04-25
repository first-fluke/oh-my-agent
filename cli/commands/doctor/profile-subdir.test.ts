/**
 * Filesystem-based regression tests for collectProfileReport.
 *
 * TODO Phase 3 qa: Rewrite all fixtures to use model_preset-based oma-config.yaml
 * instead of the legacy defaults.yaml + agent_cli_mapping format removed in 008.
 *
 * Verifies that the doctor matrix discovers .agents/oma-config.yaml by walking
 * parent directories — matching findFileUp semantics in runtime-dispatch.ts.
 * Without this the matrix would show defaults while the actual spawn path reads
 * the parent's config, which is the exact fragmentation PR #270 set out to eliminate.
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

// TODO Phase 3 qa: replace DEFAULTS_YAML fixture with model_preset-based oma-config.yaml
// (e.g. "language: en\nmodel_preset: antigravity") and update all test assertions below
// to match the new preset-based resolution (no agent_cli_mapping, no defaults.yaml).
const DEFAULTS_YAML = `
language: en
model_preset: antigravity
`.trim();

describe("collectProfileReport — subdirectory invocation", () => {
  let projectRoot: string;
  let subDir: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), "oma-doctor-subdir-"));
    mkdirSync(join(projectRoot, ".agents"), { recursive: true });
    subDir = join(projectRoot, "packages", "web", "src");
    mkdirSync(subDir, { recursive: true });
    // TODO Phase 3 qa: previously wrote .agents/config/defaults.yaml —
    // now writes .agents/oma-config.yaml with model_preset (migration 008).
    writeFileSync(
      join(projectRoot, ".agents", "oma-config.yaml"),
      DEFAULTS_YAML,
    );
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it("finds oma-config.yaml from a nested subdirectory", async () => {
    // antigravity preset: backend = openai/gpt-5.3-codex
    const report = await collectProfileReport(subDir);
    // TODO Phase 3 qa: replace missingDefaultsYaml with missingPreset assertion
    expect(report.missingPreset).toBe(false);
    const backend = report.rows.find((r) => r.role === "backend");
    expect(backend?.model).toBe("openai/gpt-5.3-codex");
  });

  it("honors agents override in oma-config.yaml from a nested subdirectory", async () => {
    // TODO Phase 3 qa: update fixture — previously tested agent_cli_mapping (removed in 008).
    // Now tests the new agents override format (object-only AgentSpec).
    writeFileSync(
      join(projectRoot, ".agents", "oma-config.yaml"),
      `language: en\nmodel_preset: antigravity\nagents:\n  backend:\n    model: "anthropic/claude-sonnet-4-6"\n`,
    );
    const report = await collectProfileReport(subDir);
    const backend = report.rows.find((r) => r.role === "backend");
    expect(backend?.model).toBe("anthropic/claude-sonnet-4-6");
    expect(backend?.cli).toBe("claude");
    expect(backend?.source).toBe("override");
  });

  it("shows missingPreset for oma-config.yaml without model_preset in parent dir", async () => {
    // TODO Phase 3 qa: previously tested legacy vendor-string mapping (removed in 008).
    // Now tests missing model_preset scenario — replaced the agent_cli_mapping test.
    writeFileSync(
      join(projectRoot, ".agents", "oma-config.yaml"),
      `language: en\n`,
    );
    const report = await collectProfileReport(subDir);
    expect(report.missingPreset).toBe(true);
  });

  it("resolves profile name from model_preset in oma-config.yaml in parent dir", async () => {
    writeFileSync(
      join(projectRoot, ".agents", "oma-config.yaml"),
      `language: en\nmodel_preset: codex-only\n`,
    );
    const report = await collectProfileReport(subDir);
    expect(report.profileName).toBe("codex-only");
  });
});
