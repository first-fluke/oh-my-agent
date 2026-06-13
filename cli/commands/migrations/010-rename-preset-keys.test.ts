// ---------------------------------------------------------------------------
// 010-rename-preset-keys.test.ts
//
// Verifies migration 010: rename legacy model_preset values
// (claude-only → claude, …) in .agents/oma-config.yaml.
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
import { afterEach, describe, expect, it } from "vitest";
import { migrateRenamePresetKeys } from "./010-rename-preset-keys.js";

function makeTempRoot(): string {
  return mkdtempSync(join(tmpdir(), "oma-010-test-"));
}

function scaffoldAgentsDir(root: string): void {
  mkdirSync(join(root, ".agents"), { recursive: true });
}

function writeOmaConfig(root: string, content: string): void {
  writeFileSync(join(root, ".agents", "oma-config.yaml"), content, "utf-8");
}

function readOmaConfig(root: string): string {
  return readFileSync(join(root, ".agents", "oma-config.yaml"), "utf-8");
}

function backupPath(root: string): string {
  return join(
    root,
    ".agents",
    "backup",
    "010-rename-preset",
    "oma-config.yaml",
  );
}

function backupExists(root: string): boolean {
  return existsSync(backupPath(root));
}

describe("migration 010 — rename-preset-keys", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  const renameCases: Array<[string, string]> = [
    ["claude-only", "claude"],
    ["codex-only", "codex"],
    ["gemini-only", "antigravity"],
    ["qwen-only", "qwen"],
    ["cursor-only", "cursor"],
  ];

  for (const [legacy, canonical] of renameCases) {
    it(`renames "${legacy}" → "${canonical}" and creates a backup`, () => {
      const root = makeTempRoot();
      tempRoots.push(root);
      scaffoldAgentsDir(root);

      writeOmaConfig(root, `language: en\nmodel_preset: ${legacy}\n`);

      const actions = migrateRenamePresetKeys.up(root);

      const after = readOmaConfig(root);
      expect(after).toContain(`model_preset: ${canonical}`);
      expect(after).not.toContain(`model_preset: ${legacy}`);
      expect(backupExists(root)).toBe(true);
      expect(actions.some((a) => a.includes(legacy))).toBe(true);
      expect(actions.some((a) => a.includes(canonical))).toBe(true);
    });
  }

  it("is idempotent — no-op when preset is already canonical", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    const original = "language: en\nmodel_preset: claude\n";
    writeOmaConfig(root, original);

    const actions = migrateRenamePresetKeys.up(root);

    expect(actions).toEqual([]);
    expect(readOmaConfig(root)).toBe(original);
    expect(backupExists(root)).toBe(false);
  });

  it("is a no-op when oma-config.yaml is missing", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    const actions = migrateRenamePresetKeys.up(root);

    expect(actions).toEqual([]);
    expect(backupExists(root)).toBe(false);
  });

  it("is a no-op when model_preset line is absent", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    const original = "language: en\nlogging: info\n";
    writeOmaConfig(root, original);

    const actions = migrateRenamePresetKeys.up(root);

    expect(actions).toEqual([]);
    expect(readOmaConfig(root)).toBe(original);
    expect(backupExists(root)).toBe(false);
  });

  it("preserves surrounding lines, comments, and trailing content", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    const original =
      "# header comment\nlanguage: en\nmodel_preset: gemini-only  # legacy\nagents:\n  backend:\n    model: openai/gpt-5.5\n";
    writeOmaConfig(root, original);

    migrateRenamePresetKeys.up(root);

    const after = readOmaConfig(root);
    expect(after).toContain("# header comment");
    expect(after).toContain("model_preset: antigravity  # legacy");
    expect(after).toContain("agents:");
    expect(after).toContain("model: openai/gpt-5.5");
  });

  it("running twice (second time canonical) is safe and produces no extra backup", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    writeOmaConfig(root, "language: en\nmodel_preset: gemini-only\n");

    const first = migrateRenamePresetKeys.up(root);
    expect(first.length).toBeGreaterThan(0);
    expect(readOmaConfig(root)).toContain("model_preset: antigravity");

    // remove backup so we can detect whether a second run creates a new one
    rmSync(backupPath(root));

    const second = migrateRenamePresetKeys.up(root);
    expect(second).toEqual([]);
    expect(backupExists(root)).toBe(false);
  });

  it("leaves `antigravity` untouched — it is now a first-class preset (agy CLI)", () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    scaffoldAgentsDir(root);

    const original = "language: en\nmodel_preset: antigravity\n";
    writeOmaConfig(root, original);

    const actions = migrateRenamePresetKeys.up(root);

    expect(actions).toEqual([]);
    expect(readOmaConfig(root)).toBe(original);
    expect(backupExists(root)).toBe(false);
  });
});
