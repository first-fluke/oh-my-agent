import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testHome = vi.hoisted(() => ({ root: "" }));
vi.mock("node:os", async (original) => ({
  ...(await original<typeof import("node:os")>()),
  homedir: () => join(testHome.root, "test-home"),
}));

const remotionState = vi.hoisted(() => ({
  describeToolchain: vi.fn(() => ({ version: null as string | null })),
  ensureLatestToolchain: vi.fn(),
  ensureRemotionSkills: vi.fn(),
}));

// Vendor reconciliation must not inspect or update the developer's toolchain.
vi.mock("../video/internal/remotion-workspace.js", () => remotionState);

const serenaState = vi.hoisted(() => ({
  ensureSerenaProject: vi.fn(() => ({ configured: false, registered: false })),
  ensureOmaSerenaContexts: vi.fn(() => ({ changed: [], failed: [] })),
  inferSerenaLanguages: vi.fn(() => ["typescript"]),
  deriveSerenaLanguages: vi.fn((_cwd: string, languages: string[]) => ({
    languages,
    prunable: true,
  })),
}));

vi.mock("../../io/serena.js", async (original) => ({
  ...(await original<typeof import("../../io/serena.js")>()),
  ...serenaState,
}));

const gortexState = vi.hoisted(() => ({
  ensureGortexProject: vi.fn(() => ({
    binaryAvailable: true,
    tracked: "already",
    excludes: { status: "unchanged", added: [] },
  })),
}));

vi.mock("../../io/gortex.js", () => gortexState);

const providerState = vi.hoisted(() => ({
  loadProviders: vi.fn(() => ({
    docs: "context7",
    web: "native",
    code_intelligence: "serena" as "serena" | "gortex",
    semantic_memory: "agentmemory",
  })),
}));

vi.mock("../../utils/providers.js", async (original) => ({
  ...(await original<typeof import("../../utils/providers.js")>()),
  loadProviders: providerState.loadProviders,
}));

vi.mock("../../utils/config.js", async (original) => ({
  ...(await original<typeof import("../../utils/config.js")>()),
  loadSerenaConfig: vi.fn(() => ({ autoUpdate: false })),
}));

let extractedRepoDir = "";
let cleanupMock: ReturnType<typeof vi.fn>;
let configuredVendorsForTest: string[] = [];
let mockInstallRoot = "";

vi.mock("../../platform/install-context.js", () => ({
  getInstallRoot: vi.fn(() => mockInstallRoot),
  getInstallMode: vi.fn(() => "project"),
  safeGetInstallRoot: vi.fn(() => mockInstallRoot),
  safeGetInstallMode: vi.fn(() => "project"),
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

vi.mock("../../io/git-recommended.js", () => ({
  maybeApplyRecommendedGitConfig: vi.fn(async () => ({
    available: true,
    applied: [],
    skipped: [],
    alreadyOk: ["rerere.enabled", "init.defaultBranch"],
  })),
}));

vi.mock("../commands/migrations/index.js", () => ({
  runMigrations: vi.fn(() => []),
}));

vi.mock("../../platform/rules.js", () => ({
  applyCursorRules: vi.fn(() => []),
  mergeRulesIndexForVendor: vi.fn(() => true),
  vendorDocFile: vi.fn((vendor: string) =>
    vendor === "claude"
      ? "CLAUDE.md"
      : ["codex", "cursor", "qwen", "pi"].includes(vendor)
        ? "AGENTS.md"
        : undefined,
  ),
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
    testHome.root = makeTempRoot("oma-update-home-");
    cleanupMock = vi.fn();
    configuredVendorsForTest = [];
    vi.clearAllMocks();
    (
      skills.installVendorAdaptations as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(() => undefined);
    providerState.loadProviders.mockReturnValue({
      docs: "context7",
      web: "native",
      code_intelligence: "serena",
      semantic_memory: "agentmemory",
    });
    remotionState.describeToolchain.mockReturnValue({ version: null });
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

  it("skips Serena maintenance when Gortex is selected", async () => {
    const projectDir = makeTempRoot("oma-update-gortex-project-");
    const repoDir = makeTempRoot("oma-update-gortex-repo-");
    extractedRepoDir = repoDir;
    mockInstallRoot = projectDir;
    writeRepoConfig(repoDir, ["codex"]);
    createExistingVendorRoots(projectDir, ["codex"]);
    providerState.loadProviders.mockReturnValue({
      docs: "context7",
      web: "native",
      code_intelligence: "gortex",
      semantic_memory: "agentmemory",
    });

    process.chdir(projectDir);
    await update({ ci: true });

    expect(serenaState.ensureSerenaProject).not.toHaveBeenCalled();
    expect(serenaState.ensureOmaSerenaContexts).not.toHaveBeenCalled();
    // Gortex gets the same per-update project maintenance Serena gets:
    // excludes reconciled and the root (re-)registered with the daemon.
    expect(gortexState.ensureGortexProject).toHaveBeenCalledWith(
      expect.stringContaining("oma-update-gortex-project-"),
    );
  });

  it("does not run Gortex project setup when Serena is selected", async () => {
    const projectDir = makeTempRoot("oma-update-serena-project-");
    const repoDir = makeTempRoot("oma-update-serena-repo-");
    extractedRepoDir = repoDir;
    mockInstallRoot = projectDir;
    writeRepoConfig(repoDir, ["codex"]);
    createExistingVendorRoots(projectDir, ["codex"]);

    process.chdir(projectDir);
    await update({ ci: true });

    expect(serenaState.ensureSerenaProject).toHaveBeenCalled();
    expect(gortexState.ensureGortexProject).not.toHaveBeenCalled();
  });

  it("reconciles Gortex MCP drift when the installed version is current", async () => {
    const projectDir = makeTempRoot("oma-update-gortex-drift-project-");
    const repoDir = makeTempRoot("oma-update-gortex-drift-repo-");
    extractedRepoDir = repoDir;
    mockInstallRoot = projectDir;
    writeRepoConfig(repoDir, ["codex"]);
    createExistingVendorRoots(projectDir, ["codex"]);
    providerState.loadProviders.mockReturnValue({
      docs: "context7",
      web: "native",
      code_intelligence: "gortex",
      semantic_memory: "agentmemory",
    });
    vi.mocked(manifest.getLocalVersion).mockResolvedValueOnce("9.9.9");

    process.chdir(projectDir);
    await update({ ci: true });

    expect(manifest.saveLocalVersion).toHaveBeenCalledWith(
      expect.stringContaining("oma-update-gortex-drift-project-"),
      "9.9.9",
      "project",
    );
    expect(
      readFileSync(join(projectDir, ".codex", "config.toml"), "utf8"),
    ).toContain("[mcp_servers.gortex]");
  });

  it("reconciles browser drift in both scopes when the installed version is current", async () => {
    const projectDir = makeTempRoot("oma-update-browser-drift-");
    testHome.root = projectDir;
    const repoDir = makeTempRoot("oma-update-browser-repo-");
    extractedRepoDir = repoDir;
    mockInstallRoot = projectDir;
    writeRepoConfig(repoDir, ["cursor"]);
    createExistingVendorRoots(projectDir, ["cursor"]);
    mkdirSync(join(projectDir, ".agents"), { recursive: true });
    writeFileSync(
      join(projectDir, ".agents/oma-config.yaml"),
      "mcp:\n  devtools_browsers: [aside]\n",
    );
    for (const [directory, browser] of [
      [".cursor", "chrome"],
      ["test-home/.cursor", "firefox"],
    ] as const) {
      mkdirSync(join(projectDir, directory), { recursive: true });
      writeFileSync(
        join(projectDir, directory, "mcp.json"),
        JSON.stringify({
          mcpServers: {
            [`${browser}-devtools`]: { command: browser },
            custom: { command: "keep" },
          },
        }),
      );
    }
    vi.mocked(manifest.getLocalVersion).mockResolvedValueOnce("9.9.9");
    process.chdir(projectDir);
    await update({ ci: true });
    const local = JSON.parse(
      readFileSync(join(projectDir, ".cursor/mcp.json"), "utf8"),
    ).mcpServers;
    expect(local.aside).toBeDefined();
    expect(local["chrome-devtools"]).toBeUndefined();
    expect(
      JSON.parse(
        readFileSync(join(projectDir, "test-home/.cursor/mcp.json"), "utf8"),
      ).mcpServers,
    ).toEqual({ custom: { command: "keep" } });
  });

  it("throttles Remotion refresh for projects with oma-video", async () => {
    const projectDir = makeTempRoot("oma-update-remotion-project-");
    const repoDir = makeTempRoot("oma-update-remotion-repo-");
    extractedRepoDir = repoDir;
    mockInstallRoot = projectDir;
    writeRepoConfig(repoDir, ["codex"]);
    createExistingVendorRoots(projectDir, ["codex"]);
    (
      skills.getInstalledSkillNames as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(["oma-video"]);
    remotionState.describeToolchain.mockReturnValue({ version: "4.0.522" });
    remotionState.ensureLatestToolchain.mockResolvedValue({
      version: "4.0.522",
      status: "current",
    });
    remotionState.ensureRemotionSkills.mockResolvedValue({
      ref: "11986e44eeb6",
      status: "current",
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    process.chdir(projectDir);
    await update({ ci: true });

    expect(remotionState.ensureLatestToolchain).toHaveBeenCalledWith({
      checkIntervalMin: 60,
      force: false,
    });
    expect(remotionState.ensureRemotionSkills).toHaveBeenCalledWith({
      checkIntervalMin: 60,
      force: false,
    });
    expect(logSpy.mock.calls.flat().join("\n")).not.toContain(
      "remotion 4.0.522",
    );
  });
});
