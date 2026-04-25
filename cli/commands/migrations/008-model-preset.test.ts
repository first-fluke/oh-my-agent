// ---------------------------------------------------------------------------
// 008-model-preset.test.ts
//
// T12 — table-driven tests for migration 008 (model_preset single-file config).
// Each fixture creates a fresh .agents/ skeleton in mkdtempSync and runs the
// migration against it. Assertions verify the output file and side effects.
//
// Coverage (≥ 12 fixtures):
//  1.  Single-vendor claude    → model_preset: claude-only, no agents block
//  2.  Single-vendor codex     → model_preset: codex-only, no agents block
//  3.  Single-vendor gemini    → model_preset: gemini-only, no agents block
//  4.  Single-vendor qwen      → model_preset: qwen-only, no agents block
//  5.  Single-vendor antigravity → model_preset: antigravity, no agents block
//  6.  Mixed-vendor (claude dominant) → preset=claude-only, non-dominant → agents
//  7.  AgentSpec object values → preserved in agents map
//  8.  Customized defaults.yaml → custom_presets.user-customized + WARN
//  9.  Empty oma-config.yaml (only language: en) → model_preset added
// 10.  Idempotent re-run: model_preset present → skip, no modifications
// 11.  Failure marker: .backup-pre-008-FAILED present → refuses to run
// 12.  models.yaml inline → oma-config.yaml.models populated
// 13.  .agents/config/ removed when empty after migration
// 14.  .agents/config/ preserved when non-yaml files remain
// 15.  Backup dir uses unique ${timestamp}-${pid} (mocked pid)
// ---------------------------------------------------------------------------

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml } from "yaml";
import { migrateModelPreset } from "./008-model-preset.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempRoot(): string {
  return mkdtempSync(join(tmpdir(), "oma-008-test-"));
}

function scaffoldAgentsDir(root: string): void {
  mkdirSync(join(root, ".agents"), { recursive: true });
}

function writeOmaConfig(root: string, content: string): void {
  writeFileSync(join(root, ".agents", "oma-config.yaml"), content, "utf-8");
}

function readOmaConfig(root: string): Record<string, unknown> {
  const raw = readFileSync(join(root, ".agents", "oma-config.yaml"), "utf-8");
  return parseYaml(raw) as Record<string, unknown>;
}

function writeDefaults(root: string, content: string): void {
  mkdirSync(join(root, ".agents", "config"), { recursive: true });
  writeFileSync(
    join(root, ".agents", "config", "defaults.yaml"),
    content,
    "utf-8",
  );
}

function writeModelsYaml(root: string, content: string): void {
  mkdirSync(join(root, ".agents", "config"), { recursive: true });
  writeFileSync(
    join(root, ".agents", "config", "models.yaml"),
    content,
    "utf-8",
  );
}

function runMigration(root: string): string[] {
  return migrateModelPreset.up(root);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("migration 008 — model_preset", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  // -------------------------------------------------------------------------
  // Fixture 1: single-vendor claude
  // -------------------------------------------------------------------------
  it("(1) single-vendor claude → model_preset: claude-only, no agents block", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(
      root,
      `${[
        "language: en",
        "agent_cli_mapping:",
        "  orchestrator: claude",
        "  backend: claude",
        "  qa: claude",
      ].join("\n")}\n`,
    );

    const actions = runMigration(root);

    const config = readOmaConfig(root);
    expect(config.model_preset).toBe("claude-only");
    expect(config.agent_cli_mapping).toBeUndefined();
    // agents block only present if non-empty
    if (config.agents !== undefined) {
      expect(Object.keys(config.agents as object)).toHaveLength(0);
    }
    expect(actions.some((a) => a.includes("claude-only"))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Fixture 2: single-vendor codex
  // -------------------------------------------------------------------------
  it("(2) single-vendor codex → model_preset: codex-only", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(
      root,
      `${[
        "language: en",
        "agent_cli_mapping:",
        "  orchestrator: codex",
        "  backend: codex",
      ].join("\n")}\n`,
    );

    runMigration(root);

    const config = readOmaConfig(root);
    expect(config.model_preset).toBe("codex-only");
    expect(config.agent_cli_mapping).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Fixture 3: single-vendor gemini
  // -------------------------------------------------------------------------
  it("(3) single-vendor gemini → model_preset: gemini-only", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(
      root,
      `${[
        "language: ko",
        "agent_cli_mapping:",
        "  orchestrator: gemini",
        "  pm: gemini",
        "  retrieval: gemini",
      ].join("\n")}\n`,
    );

    runMigration(root);

    const config = readOmaConfig(root);
    expect(config.model_preset).toBe("gemini-only");
    expect(config.language).toBe("ko");
  });

  // -------------------------------------------------------------------------
  // Fixture 4: single-vendor qwen
  // -------------------------------------------------------------------------
  it("(4) single-vendor qwen → model_preset: qwen-only", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(
      root,
      `${[
        "language: en",
        "agent_cli_mapping:",
        "  backend: qwen",
        "  frontend: qwen",
      ].join("\n")}\n`,
    );

    runMigration(root);

    const config = readOmaConfig(root);
    expect(config.model_preset).toBe("qwen-only");
  });

  // -------------------------------------------------------------------------
  // Fixture 5: single-vendor antigravity
  // -------------------------------------------------------------------------
  it("(5) single-vendor antigravity → model_preset: antigravity", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(
      root,
      `${[
        "language: en",
        "agent_cli_mapping:",
        "  orchestrator: antigravity",
        "  backend: antigravity",
      ].join("\n")}\n`,
    );

    runMigration(root);

    const config = readOmaConfig(root);
    expect(config.model_preset).toBe("antigravity");
  });

  // -------------------------------------------------------------------------
  // Fixture 6: mixed-vendor (claude dominant) → agents block for minority
  // -------------------------------------------------------------------------
  it("(6) mixed-vendor, claude dominant → preset=claude-only, gemini agents go to overrides", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(
      root,
      `${[
        "language: en",
        "agent_cli_mapping:",
        "  orchestrator: claude",
        "  backend: claude",
        "  qa: claude",
        "  frontend: gemini",
        "  retrieval: gemini",
      ].join("\n")}\n`,
    );

    runMigration(root);

    const config = readOmaConfig(root);
    expect(config.model_preset).toBe("claude-only");
    expect(config.agents).toBeDefined();
    const agents = config.agents as Record<string, unknown>;
    expect(agents.frontend).toBeDefined();
    expect(agents.retrieval).toBeDefined();
    // Claude agents should NOT be in agents override
    expect(agents.orchestrator).toBeUndefined();
    expect(agents.backend).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Fixture 7: AgentSpec object values → preserved in agents map
  // -------------------------------------------------------------------------
  it("(7) AgentSpec object values → preserved into agents map", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(
      root,
      `${[
        "language: en",
        "agent_cli_mapping:",
        "  backend:",
        "    model: openai/gpt-5.3-codex",
        "    effort: high",
        "  orchestrator:",
        "    model: anthropic/claude-sonnet-4-6",
      ].join("\n")}\n`,
    );

    runMigration(root);

    const config = readOmaConfig(root);
    expect(config.model_preset).toBeDefined();
    const agents = config.agents as Record<
      string,
      { model: string; effort?: string }
    >;
    expect(agents.backend).toBeDefined();
    expect(agents.backend.model).toBe("openai/gpt-5.3-codex");
    expect(agents.backend.effort).toBe("high");
    expect(agents.orchestrator).toBeDefined();
    expect(agents.orchestrator.model).toBe("anthropic/claude-sonnet-4-6");
  });

  // -------------------------------------------------------------------------
  // Fixture 8: customized defaults.yaml → custom_presets.user-customized + WARN
  // -------------------------------------------------------------------------
  it("(8) customized defaults.yaml → preserved as custom_presets.user-customized", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(
      root,
      `${["language: en", "agent_cli_mapping:", "  orchestrator: gemini"].join(
        "\n",
      )}\n`,
    );

    // Write a customized defaults.yaml that differs from built-in presets
    writeDefaults(
      root,
      `${[
        "version: 2.1.0",
        "runtime_profiles:",
        "  gemini-only:",
        "    agent_defaults:",
        "      orchestrator:",
        "        model: google/gemini-3.1-pro-preview",
        "        thinking: true",
      ].join("\n")}\n`,
    );

    const warnSpy = vi.spyOn(console, "warn");
    runMigration(root);

    const config = readOmaConfig(root);

    // Should warn about customization
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("customized"));

    // The custom preset must be present
    expect(config.custom_presets).toBeDefined();
    const customPresets = config.custom_presets as Record<string, unknown>;
    expect(customPresets["user-customized"]).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Fixture 9: empty oma-config.yaml (only language: en) → model_preset added
  // -------------------------------------------------------------------------
  it("(9) only language: en in oma-config → model_preset is added", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(root, "language: en\n");

    runMigration(root);

    const config = readOmaConfig(root);
    expect(config.model_preset).toBeDefined();
    expect(typeof config.model_preset).toBe("string");
    expect((config.model_preset as string).length).toBeGreaterThan(0);
    // language preserved
    expect(config.language).toBe("en");
  });

  // -------------------------------------------------------------------------
  // Fixture 10: idempotent — model_preset already present → skip
  // -------------------------------------------------------------------------
  it("(10) idempotent re-run: model_preset already present → skip, file unchanged", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    const original =
      "language: ko\nmodel_preset: gemini-only\nagents:\n  backend:\n    model: openai/gpt-5.3-codex\n";
    writeOmaConfig(root, original);

    const actions = runMigration(root);

    // Should be skipped (empty actions)
    expect(actions).toHaveLength(0);

    // File must be byte-for-byte unchanged
    const after = readFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "utf-8",
    );
    expect(after).toBe(original);
  });

  // -------------------------------------------------------------------------
  // Fixture 11: failure marker → refuses to run
  // -------------------------------------------------------------------------
  it("(11) .backup-pre-008-FAILED present → migration refuses to run, returns empty actions", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(root, "language: en\n");

    // Write failure marker
    writeFileSync(
      join(root, ".agents", ".backup-pre-008-FAILED"),
      "Migration 008 failed at 2026-04-25T00:00:00Z\n",
      "utf-8",
    );

    const errorSpy = vi.spyOn(console, "error");
    const actions = runMigration(root);

    expect(actions).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(".backup-pre-008-FAILED"),
    );

    // oma-config.yaml must be unmodified (no model_preset added)
    const config = readOmaConfig(root);
    expect(config.model_preset).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Fixture 12: models.yaml inline → oma-config.yaml.models
  // -------------------------------------------------------------------------
  it("(12) models.yaml content inlined into oma-config.yaml.models", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(root, "language: en\n");
    writeModelsYaml(
      root,
      `${[
        "models:",
        "  custom-fast:",
        "    cli: gemini",
        "    cli_model: gemini-3-flash",
      ].join("\n")}\n`,
    );

    const actions = runMigration(root);

    const config = readOmaConfig(root);
    expect(config.models).toBeDefined();
    const models = config.models as Record<string, unknown>;
    expect(models["custom-fast"]).toBeDefined();
    expect(existsSync(join(root, ".agents", "config", "models.yaml"))).toBe(
      false,
    );
    expect(actions.some((a) => a.includes("models.yaml"))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Fixture 13: .agents/config/ removed when empty after migration
  // -------------------------------------------------------------------------
  it("(13) .agents/config/ removed when empty after migration", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(root, "language: en\n");
    // Create config dir with only defaults.yaml (will be deleted by migration)
    writeDefaults(root, "version: 2.1.0\n");

    runMigration(root);

    expect(existsSync(join(root, ".agents", "config"))).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Fixture 14: .agents/config/ preserved if non-yaml files remain
  // -------------------------------------------------------------------------
  it("(14) .agents/config/ preserved when non-yaml files remain", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(root, "language: en\n");
    writeDefaults(root, "version: 2.1.0\n");

    // Extra non-yaml file that should prevent dir removal
    writeFileSync(
      join(root, ".agents", "config", "custom-readme.txt"),
      "readme\n",
      "utf-8",
    );

    runMigration(root);

    expect(existsSync(join(root, ".agents", "config"))).toBe(true);
    expect(
      existsSync(join(root, ".agents", "config", "custom-readme.txt")),
    ).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Fixture 15: backup directory uses unique ${timestamp}-${pid}
  // Two runs with the same timestamp but different mocked PIDs must not collide
  // -------------------------------------------------------------------------
  it("(15) backup dirs with same timestamp but different pid do not collide", () => {
    const root1 = makeTempRoot();
    const root2 = makeTempRoot();
    tempRoots.push(root1, root2);

    for (const root of [root1, root2]) {
      scaffoldAgentsDir(root);
      writeOmaConfig(
        root,
        "language: en\nagent_cli_mapping:\n  orchestrator: claude\n",
      );
    }

    // Mock process.pid for run 1
    const pidDescriptor = Object.getOwnPropertyDescriptor(process, "pid");
    Object.defineProperty(process, "pid", { value: 11111, configurable: true });
    const actions1 = runMigration(root1);
    const backupAction1 = actions1.find((a) => a.includes(".backup-pre-008-"));

    Object.defineProperty(process, "pid", { value: 22222, configurable: true });
    const actions2 = runMigration(root2);
    const backupAction2 = actions2.find((a) => a.includes(".backup-pre-008-"));

    // Restore pid
    if (pidDescriptor) {
      Object.defineProperty(process, "pid", pidDescriptor);
    }

    expect(backupAction1).toBeDefined();
    expect(backupAction2).toBeDefined();
    // The backup paths should differ (pid portion)
    expect(backupAction1).not.toBe(backupAction2);
  });
});
