import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let extractedRepoDir = "";
let cleanupMock: ReturnType<typeof vi.fn>;
let configuredVendorsForTest: string[] = [];

vi.mock("../../platform/manifest.js", () => ({
  fetchRemoteManifest: vi.fn(async () => ({
    version: "9.9.9",
    metadata: { totalFiles: 1 },
  })),
  getLocalVersion: vi.fn(async () => "9.9.8"),
  getNeedsReconcile: vi.fn(() => false),
  hasInstalledProject: vi.fn(() => true),
  saveLocalVersion: vi.fn(async () => {}),
  setNeedsReconcile: vi.fn(() => {}),
}));

vi.mock("../../io/tarball.js", () => ({
  downloadAndExtract: vi.fn(async () => ({
    dir: extractedRepoDir,
    cleanup: cleanupMock,
  })),
}));

vi.mock("../commands/migrations/index.js", () => ({
  runMigrations: vi.fn(() => []),
}));

vi.mock("../../platform/rules.js", () => ({
  generateCursorRules: vi.fn(() => []),
  mergeRulesIndexForVendor: vi.fn(() => true),
}));

vi.mock("../../platform/skills-installer.js", () => ({
  REPO: "first-fluke/oh-my-agent",
  installCodexWorkflowSkills: vi.fn(),
  installVendorAdaptations: vi.fn(),
  detectExistingCliSymlinkDirs: vi.fn(() => []),
  getInstalledSkillNames: vi.fn(() => []),
  createCliSymlinks: vi.fn(() => ({ created: [], skipped: [] })),
  ensureCursorMcpSymlink: vi.fn(),
  readVendorsFromConfig: vi.fn(() => configuredVendorsForTest),
  isHookVendor: vi.fn((v: string) =>
    ["claude", "codex", "cursor", "gemini", "qwen"].includes(v),
  ),
  vendorRequiresHomeConsent: vi.fn((cli: string) => cli === "hermes"),
}));

import * as manifest from "../../platform/manifest.js";
import * as rules from "../../platform/rules.js";
import * as skills from "../../platform/skills-installer.js";
import { update } from "../update/update.js";

describe("update cursor vendor adaptations", () => {
  const tempRoots: string[] = [];
  const originalCwd = process.cwd();

  beforeEach(() => {
    cleanupMock = vi.fn();
    configuredVendorsForTest = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  function makeTempRoot(prefix: string): string {
    const root = mkdtempSync(join(tmpdir(), prefix));
    tempRoots.push(root);
    return root;
  }

  function writeRepoConfig(repoRoot: string, vendors: string[]): void {
    mkdirSync(join(repoRoot, ".agents"), { recursive: true });
    writeFileSync(
      join(repoRoot, ".agents", "oma-config.yaml"),
      `vendors:\n${vendors.map((v) => `  - ${v}`).join("\n")}\n`,
      "utf-8",
    );
    configuredVendorsForTest = vendors;
  }

  it("installs cursor hooks and merges cursor guide on update", async () => {
    const projectDir = makeTempRoot("oma-update-cursor-project-");
    const repoDir = makeTempRoot("oma-update-cursor-repo-");
    extractedRepoDir = repoDir;
    writeRepoConfig(repoDir, ["cursor"]);

    process.chdir(projectDir);
    await update(false, true);

    const firstInstallCall = (
      skills.installVendorAdaptations as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(firstInstallCall?.[0]).toBe(repoDir);
    expect(firstInstallCall?.[1]).toContain(projectDir);
    expect(firstInstallCall?.[2]).toEqual(["cursor"]);
    const cursorRulesCall = (
      rules.generateCursorRules as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(cursorRulesCall?.[0]).toContain(projectDir);

    const mcpLinkCall = (
      skills.ensureCursorMcpSymlink as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(mcpLinkCall?.[0]).toContain(projectDir);

    const firstMergeCall = (
      rules.mergeRulesIndexForVendor as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find((call: unknown[]) => call[1] === "cursor");
    expect(firstMergeCall?.[0]).toContain(projectDir);
    expect(firstMergeCall?.[1]).toBe("cursor");
  });

  it("deduplicates AGENTS merge when codex and cursor are both enabled", async () => {
    const projectDir = makeTempRoot("oma-update-cursor-codex-project-");
    const repoDir = makeTempRoot("oma-update-cursor-codex-repo-");
    extractedRepoDir = repoDir;
    writeRepoConfig(repoDir, ["codex", "cursor"]);

    process.chdir(projectDir);
    await update(false, true);

    const secondInstallCall = (
      skills.installVendorAdaptations as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(secondInstallCall?.[0]).toBe(repoDir);
    expect(secondInstallCall?.[1]).toContain(projectDir);
    expect(secondInstallCall?.[2]).toEqual(["codex", "cursor"]);
    const secondCursorRulesCall = (
      rules.generateCursorRules as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(secondCursorRulesCall?.[0]).toContain(projectDir);

    expect(
      (skills.ensureCursorMcpSymlink as unknown as ReturnType<typeof vi.fn>)
        .mock.calls.length,
    ).toBeGreaterThan(0);

    const codexMergeCall = (
      rules.mergeRulesIndexForVendor as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find((call: unknown[]) => call[1] === "codex");
    expect(codexMergeCall?.[0]).toContain(projectDir);
    expect(codexMergeCall?.[1]).toBe("codex");

    const cursorMergeCall = (
      rules.mergeRulesIndexForVendor as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find((call: unknown[]) => call[1] === "cursor");
    expect(cursorMergeCall).toBeUndefined();
  });

  it("does not save version when vendor adaptations fail", async () => {
    const projectDir = makeTempRoot("oma-update-fail-project-");
    const repoDir = makeTempRoot("oma-update-fail-repo-");
    extractedRepoDir = repoDir;
    writeRepoConfig(repoDir, ["codex"]);

    (
      skills.installVendorAdaptations as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      throw new Error(
        "ENOENT: no such file or directory, open '/tmp/project/.codex/hooks.json'",
      );
    });

    process.chdir(projectDir);

    await expect(update(false, true)).rejects.toThrow("ENOENT");
    expect(manifest.saveLocalVersion).not.toHaveBeenCalled();
  });
});
