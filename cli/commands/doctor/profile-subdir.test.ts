/**
 * Filesystem-based regression tests for collectProfileReport.
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

vi.mock("../../vendors/index.js", () => {
  const isAntigravityAuthenticated = vi.fn(() => false);
  const isClaudeAuthenticated = vi.fn(() => false);
  const isCodexAuthenticated = vi.fn(() => false);
  const isCommandCodeAuthenticated = vi.fn(() => false);
  const isCursorAuthenticated = vi.fn(() => false);
  const isGrokAuthenticated = vi.fn(() => false);
  const isKimiAuthenticated = vi.fn(() => false);
  const isKiroAuthenticated = vi.fn(() => false);
  const isOpencodeAuthenticated = vi.fn(() => false);
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
language: en
model_preset: mixed
`.trim();

describe("collectProfileReport — subdirectory invocation", () => {
  let projectRoot: string;
  let subDir: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), "oma-doctor-subdir-"));
    mkdirSync(join(projectRoot, ".agents"), { recursive: true });
    subDir = join(projectRoot, "packages", "web", "src");
    mkdirSync(subDir, { recursive: true });
    writeFileSync(
      join(projectRoot, ".agents", "oma-config.yaml"),
      DEFAULTS_YAML,
    );
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it("finds oma-config.yaml from a nested subdirectory", async () => {
    // mixed preset: backend = openai/gpt-6.1-terra
    const report = await collectProfileReport(subDir);
    expect(report.missingPreset).toBe(false);
    const backend = report.rows.find((r) => r.role === "backend");
    expect(backend?.model).toBe("openai/gpt-6.1-terra");
  });

  it("honors agents override in oma-config.yaml from a nested subdirectory", async () => {
    writeFileSync(
      join(projectRoot, ".agents", "oma-config.yaml"),
      `language: en\nmodel_preset: mixed\nagents:\n  backend:\n    model: "anthropic/claude-sonnet-4-6"\n`,
    );
    const report = await collectProfileReport(subDir);
    const backend = report.rows.find((r) => r.role === "backend");
    expect(backend?.model).toBe("anthropic/claude-sonnet-4-6");
    expect(backend?.cli).toBe("claude");
    expect(backend?.source).toBe("override");
  });

  it("shows missingPreset for oma-config.yaml without model_preset in parent dir", async () => {
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
      `language: en\nmodel_preset: codex\n`,
    );
    const report = await collectProfileReport(subDir);
    expect(report.profileName).toBe("codex");
  });
});
