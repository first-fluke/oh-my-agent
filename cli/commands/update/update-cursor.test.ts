import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let extractedRepoDir = "";
let cleanupMock: ReturnType<typeof vi.fn>;
let configuredVendorsForTest: string[] = [];
let mockInstallRoot = "";

vi.mock("../../platform/install-context.js", () => ({
  getInstallRoot: vi.fn(() => mockInstallRoot),
  getInstallMode: vi.fn(() => "project"),
  _resetInstallContext: vi.fn(),
}));

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
  snapshotArtifacts: vi.fn(() => ({ skills: [], workflows: [] })),
  diffArtifacts: vi.fn(() => ({
    addedSkills: [],
    removedSkills: [],
    addedWorkflows: [],
    removedWorkflows: [],
  })),
  hasArtifactChanges: vi.fn(() => false),
  readSkillDescription: vi.fn(() => ""),
  readWorkflowDescription: vi.fn(() => ""),
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
  applyCursorRules: vi.fn(() => []),
  mergeRulesIndexForVendor: vi.fn(() => true),
}));

vi.mock("../../platform/skills-installer.js", () => ({
  ALL_CLI_VENDORS: [
    "antigravity",
    "claude",
    "codex",
    "copilot",
    "cursor",
    "grok",
    "hermes",
    "qwen",
  ],
  EXTENSION_VENDORS: ["pi"],
  CLI_SKILLS_DIR: {
    antigravity: {
      projectPath: ".gemini/antigravity-cli/skills",
      homePath: ".gemini/antigravity-cli/skills",
      requiresHomeConsent: true,
    },
    claude: { projectPath: ".claude/skills", homePath: ".claude/skills" },
    codex: { projectPath: ".codex/skills", homePath: ".codex/skills" },
    copilot: { projectPath: ".github/skills", homePath: ".copilot/skills" },
    cursor: { projectPath: ".cursor/skills", homePath: ".cursor/skills" },
    grok: { projectPath: ".grok/skills", homePath: ".grok/skills" },
    hermes: {
      projectPath: ".hermes/skills/oma",
      homePath: ".hermes/skills/oma",
      requiresHomeConsent: true,
    },
    qwen: { projectPath: ".qwen/skills", homePath: ".qwen/skills" },
  },
  REPO: "first-fluke/oh-my-agent",
  installCopilotWorkflowPrompts: vi.fn(),
  installVendorAdaptations: vi.fn(),
  detectExistingCliSymlinkDirs: vi.fn(() => []),
  getInstalledSkillNames: vi.fn(() => []),
  getInstalledWorkflowNames: vi.fn(() => []),
  createVendorWorkflowSymlinks: vi.fn(() => ({ created: [], skipped: [] })),
  createVendorSymlinks: vi.fn(() => ({
    created: [],
    skipped: [],
    removed: [],
  })),
  createCliSymlinks: vi.fn(() => ({ created: [], skipped: [], removed: [] })),
  applyCursorMcpConfig: vi.fn(),
  readVendorsFromConfig: vi.fn(() => configuredVendorsForTest),
  isHookVendor: vi.fn((v: string) =>
    ["claude", "codex", "cursor", "qwen"].includes(v),
  ),
  isExtensionVendor: vi.fn((v: string) => v === "pi"),
  vendorRequiresHomeConsent: vi.fn((cli: string) => cli === "hermes"),
}));

import * as manifest from "../../platform/manifest.js";
import * as rules from "../../platform/rules.js";
import * as skills from "../../platform/skills-installer.js";
import { update } from "../update/run.js";

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
    mockInstallRoot = "";
    for (const root of tempRoots) {
      // Windows holds locks on a just-released cwd briefly — retry to avoid EBUSY flake.
      rmSync(root, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
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

  function createExistingVendorRoots(projectRoot: string, vendors: string[]) {
    for (const vendor of vendors) {
      mkdirSync(join(projectRoot, `.${vendor}`), { recursive: true });
    }
  }

  it("installs cursor hooks and merges cursor guide on update", async () => {
    const projectDir = makeTempRoot("oma-update-cursor-project-");
    const repoDir = makeTempRoot("oma-update-cursor-repo-");
    extractedRepoDir = repoDir;
    mockInstallRoot = projectDir;
    writeRepoConfig(repoDir, ["cursor"]);
    createExistingVendorRoots(projectDir, ["cursor"]);

    process.chdir(projectDir);
    await update({ ci: true });

    const firstInstallCall = (
      skills.installVendorAdaptations as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    // link kernel always passes (cwd, cwd) — sourceDir == targetDir == project.
    expect(firstInstallCall?.[0]).toContain(projectDir);
    expect(firstInstallCall?.[1]).toContain(projectDir);
    expect(firstInstallCall?.[2]).toEqual(["cursor"]);
    const cursorRulesCall = (
      rules.applyCursorRules as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(cursorRulesCall?.[0]).toContain(projectDir);

    const mcpLinkCall = (
      skills.applyCursorMcpConfig as unknown as ReturnType<typeof vi.fn>
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
    mockInstallRoot = projectDir;
    writeRepoConfig(repoDir, ["codex", "cursor"]);
    createExistingVendorRoots(projectDir, ["codex", "cursor"]);

    process.chdir(projectDir);
    await update({ ci: true });

    const secondInstallCall = (
      skills.installVendorAdaptations as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    // link kernel always passes (cwd, cwd) — sourceDir == targetDir == project.
    expect(secondInstallCall?.[0]).toContain(projectDir);
    expect(secondInstallCall?.[1]).toContain(projectDir);
    expect(secondInstallCall?.[2]).toEqual(["codex", "cursor"]);
    const secondCursorRulesCall = (
      rules.applyCursorRules as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(secondCursorRulesCall?.[0]).toContain(projectDir);

    expect(
      (skills.applyCursorMcpConfig as unknown as ReturnType<typeof vi.fn>).mock
        .calls.length,
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
    mockInstallRoot = projectDir;
    writeRepoConfig(repoDir, ["codex"]);
    createExistingVendorRoots(projectDir, ["codex"]);

    (
      skills.installVendorAdaptations as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      throw new Error(
        "ENOENT: no such file or directory, open '/tmp/project/.codex/hooks.json'",
      );
    });

    process.chdir(projectDir);

    await expect(update({ ci: true })).rejects.toThrow("ENOENT");
    expect(manifest.saveLocalVersion).not.toHaveBeenCalled();
  });
});
