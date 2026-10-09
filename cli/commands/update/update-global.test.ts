import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const memoryState = vi.hoisted(() => ({
  ensureAgentMemory: vi.fn(
    async (_options?: { onProgress?: (message: string) => void }) => ({
      state: "ready" as const,
      endpoint: "http://127.0.0.1:25150",
      installed: false,
      started: false,
      reused: true,
    }),
  ),
}));
vi.mock("../../io/agentmemory/ensure.js", () => memoryState);

const migrationState = vi.hoisted(() => ({
  migrateGlobalHome: vi.fn(async () => ({
    copied: [] as string[],
    conflicts: [] as string[],
    deferred: [] as string[],
  })),
}));
vi.mock("../../io/global-home-migration.js", () => migrationState);

// Version/reconciliation tests must not refresh the developer's real toolchain.
const syncSchedulesSpy = vi.hoisted(() =>
  vi.fn(async () => ({ synced: 0, resynced: 0, pruned: 0 })),
);
vi.mock("../../io/video/internal/hyperframes-workspace.js", () => ({
  describeToolchain: vi.fn(() => ({ version: null })),
  ensureLatestToolchain: vi.fn(),
  ensureHyperframesSkills: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Hoisted mock state
// ---------------------------------------------------------------------------

// Note: `saveLocalVersion` (and other fs-touching manifest helpers) are
// intentionally NOT mocked — the assertions read `_version.json` back from
// disk after update() runs.

const manifestState = vi.hoisted(() => ({
  fetchRemoteManifest: vi.fn(async () => ({
    version: "8.1.0",
    metadata: { totalFiles: 42 },
  })),
  getLocalVersion: vi.fn(async () => "8.0.0"),
  hasInstalledProject: vi.fn(() => true),
  getNeedsReconcile: vi.fn(() => false),
  setNeedsReconcile: vi.fn(),
  snapshotArtifacts: vi.fn(() => ({})),
  diffArtifacts: vi.fn(() => ({
    addedSkills: [],
    removedSkills: [],
    addedWorkflows: [],
    removedWorkflows: [],
  })),
  hasArtifactChanges: vi.fn(() => false),
  readSkillDescription: vi.fn(() => null),
  readWorkflowDescription: vi.fn(() => null),
}));

const tarballState = vi.hoisted(() => ({
  downloadAndExtract: vi.fn(async () => ({
    dir: "/tmp/mock-update-repo",
    cleanup: vi.fn(),
  })),
}));

const linkState = vi.hoisted(() => ({
  link: vi.fn(() => ({
    symlinksCreated: [],
    mergedDocs: [],
    agyInstalled: false,
    agySkipReason: undefined,
  })),
}));

const selfUpdateState = vi.hoisted(() => ({
  maybeSelfUpdate: vi.fn(async () => ({
    triggered: false,
    reason: "disabled" as const,
  })),
}));

const githubState = vi.hoisted(() => ({
  isGhInstalled: vi.fn(() => false),
  isGhAuthenticated: vi.fn(() => false),
  isAlreadyStarred: vi.fn(() => false),
}));

const competitorsState = vi.hoisted(() => ({
  promptUninstallCompetitors: vi.fn(async () => {}),
}));

const lockState = vi.hoisted(() => ({
  acquireLock: vi.fn(() => ({ ok: true, release: vi.fn() })),
  bindInstallLockRelease: vi.fn((release: () => void) => release),
}));

const serenaState = vi.hoisted(() => ({
  ensureSerenaProject: vi.fn(() => ({ configured: false, registered: false })),
  ensureOmaSerenaContexts: vi.fn(() => ({ changed: [], failed: [] })),
  inferSerenaLanguages: vi.fn(() => ["typescript"]),
  // Detection is exercised in io/serena.test.ts; here it passes the
  // skill-derived set straight through.
  deriveSerenaLanguages: vi.fn((_cwd: string, languages: string[]) => ({
    languages,
  })),
}));

const configState = vi.hoisted(() => ({
  isTelemetryEnabled: vi.fn(() => false),
  loadDevToolsBrowsers: vi.fn(() => undefined),
  loadOmaConfig: vi.fn(
    (
      _root?: string,
    ): ReturnType<typeof import("../../utils/config.js").loadOmaConfig> => ({
      language: "en",
      model_preset: "claude",
    }),
  ),
  loadSerenaConfig: vi.fn(() => ({ autoUpdate: false })),
}));

const geminiState = vi.hoisted(() => ({
  usesGeminiCli: vi.fn(() => false),
  formatGeminiDeprecationWarning: vi.fn(() => ""),
}));

const migrationsState = vi.hoisted(() => ({
  runMigrations: vi.fn((): string[] => []),
  runMigrationsWithStatus: vi.fn(() => ({
    actions: [] as string[],
    requiresReconcile: false,
  })),
}));

const runtimeMigrationState = vi.hoisted(() => ({
  migrateRuntimeState: vi.fn(async (options: { projectDir: string }) => ({
    ok: true,
    dryRun: false,
    profile: "0",
    projectDir: options.projectDir,
    entries: [] as { status: string; source: string; area: string }[],
  })),
}));

const skillsState = vi.hoisted(() => ({
  REPO: "first-fluke/oh-my-agent",
  INSTALLED_SKILLS_DIR: ".agents/skills",
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
  getInstalledSkillNames: vi.fn((_root: string): string[] => []),
  createGlobalSkillDiscoveryLinks: vi.fn(() => []),
  vendorRequiresHomeConsent: vi.fn(
    (cli: string) => cli === "antigravity" || cli === "hermes",
  ),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  cancel: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  })),
  log: {
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("picocolors", () => ({
  default: new Proxy(
    {},
    {
      get: () => (value: string) => value,
    },
  ),
}));

vi.mock("../../io/github.js", () => githubState);
vi.mock("../../io/self-update.js", () => selfUpdateState);
vi.mock("../../io/serena.js", () => serenaState);
vi.mock("../../io/tarball.js", () => tarballState);
vi.mock("../../io/schedule/sync.js", () => ({
  syncSchedules: syncSchedulesSpy,
}));
vi.mock("../../io/git-recommended.js", () => ({
  maybeApplyRecommendedGitConfig: vi.fn(async () => ({
    available: true,
    applied: [],
    skipped: [],
    alreadyOk: ["rerere.enabled", "init.defaultBranch"],
  })),
}));
vi.mock("../../platform/manifest.js", async (importOriginal) => {
  // Keep real fs-touching helpers (saveLocalVersion, readVersionInstallMode,
  // readVersionSchemaVersion) so the assertions can read back what update wrote.
  const actual =
    (await importOriginal()) as typeof import("../../platform/manifest.js");
  return {
    ...actual,
    ...manifestState,
  };
});
vi.mock("../../platform/skills-installer.js", () => skillsState);
vi.mock("../../utils/competitors.js", () => competitorsState);
vi.mock("../../utils/install-lock.js", () => lockState);
vi.mock("../../utils/config.js", () => configState);
vi.mock("../../utils/gemini-deprecation.js", () => geminiState);
vi.mock("../../utils/i18n.js", () => ({
  t: vi.fn((key: string) => key),
}));
vi.mock("../link/run.js", () => linkState);
vi.mock("../migrations/index.js", () => migrationsState);
vi.mock("../../state/runtime-migration.js", () => runtimeMigrationState);

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  _resetInstallContext,
  setInstallContext,
} from "../../platform/install-context.js";
import { update } from "../update/run.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function seedInstallDir(
  tmpDir: string,
  opts: {
    withMode?: boolean;
    priorVersion?: string;
  } = {},
): void {
  const { withMode = true, priorVersion = "8.0.0" } = opts;

  fs.mkdirSync(path.join(tmpDir, ".agents", "skills"), { recursive: true });

  // _version.json carries install state (version + optional mode/schemaVersion)
  const versionPayload: Record<string, unknown> = { version: priorVersion };
  if (withMode) {
    versionPayload.mode = "global";
    versionPayload.schemaVersion = 2;
    versionPayload.installedAt = "2026-01-01T00:00:00.000Z";
  }
  fs.writeFileSync(
    path.join(tmpDir, ".agents", "skills", "_version.json"),
    `${JSON.stringify(versionPayload, null, 2)}\n`,
  );

  // oma-config.yaml (presence required by update logic paths)
  fs.writeFileSync(
    path.join(tmpDir, ".agents", "oma-config.yaml"),
    "language: en\nmodel_preset: claude\n",
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("update --global: _install.json lifecycle", () => {
  let tmpDir: string;
  const originalOmaHome = process.env.OMA_HOME;
  const originalCi = process.env.CI;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "oma-update-global-"));
    process.env.OMA_HOME = tmpDir;
    // Use CI=true so update() skips TTY-specific paths (console.clear etc.)
    process.env.CI = "true";

    vi.clearAllMocks();
    migrationState.migrateGlobalHome
      .mockReset()
      .mockResolvedValue({ copied: [], conflicts: [], deferred: [] });
    memoryState.ensureAgentMemory.mockReset().mockResolvedValue({
      state: "ready",
      endpoint: "http://127.0.0.1:25150",
      installed: false,
      started: false,
      reused: true,
    });
    _resetInstallContext();
    setInstallContext({ installRoot: tmpDir, mode: "global" });

    // Reset manifest mocks to sensible defaults
    manifestState.fetchRemoteManifest.mockResolvedValue({
      version: "8.1.0",
      metadata: { totalFiles: 42 },
    });
    manifestState.getLocalVersion.mockResolvedValue("8.0.0");
    manifestState.hasInstalledProject.mockReturnValue(true);
    manifestState.getNeedsReconcile.mockReturnValue(false);
    manifestState.setNeedsReconcile.mockReset();
    manifestState.snapshotArtifacts.mockReturnValue({});
    manifestState.diffArtifacts.mockReturnValue({
      addedSkills: [],
      removedSkills: [],
      addedWorkflows: [],
      removedWorkflows: [],
    });
    manifestState.hasArtifactChanges.mockReturnValue(false);
    skillsState.getInstalledSkillNames.mockReset().mockReturnValue([]);

    lockState.acquireLock.mockReturnValue({ ok: true, release: vi.fn() });
    migrationsState.runMigrations.mockReturnValue([]);
    migrationsState.runMigrationsWithStatus.mockReturnValue({
      actions: [],
      requiresReconcile: false,
    });
    runtimeMigrationState.migrateRuntimeState.mockImplementation(
      async (options) => ({
        ok: true,
        dryRun: false,
        profile: "0",
        projectDir: options.projectDir,
        entries: [],
      }),
    );
    selfUpdateState.maybeSelfUpdate.mockResolvedValue({
      triggered: false,
      reason: "disabled",
    });
    configState.loadSerenaConfig.mockReturnValue({ autoUpdate: false });
    configState.loadOmaConfig.mockReturnValue({
      language: "en",
      model_preset: "claude",
    });
    geminiState.usesGeminiCli.mockReturnValue(false);

    // tarball mock — returns a distinct fake repo dir (sibling of tmpDir) with
    // a minimal seeded .agents tree so update.ts's cpSync(repoDir/.agents, cwd/.agents)
    // copies between two distinct directories.
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "oma-update-repo-"));
    fs.mkdirSync(path.join(repoDir, ".agents", "skills"), { recursive: true });
    fs.writeFileSync(
      path.join(repoDir, ".agents", "skills", "_version.json"),
      `${JSON.stringify({ version: "8.1.0" })}\n`,
    );
    tarballState.downloadAndExtract.mockResolvedValue({
      dir: repoDir,
      cleanup: vi.fn(() =>
        fs.rmSync(repoDir, { recursive: true, force: true }),
      ),
    });

    seedInstallDir(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });

    if (originalOmaHome === undefined) delete process.env.OMA_HOME;
    else process.env.OMA_HOME = originalOmaHome;

    if (originalCi === undefined) delete process.env.CI;
    else process.env.CI = originalCi;

    _resetInstallContext();
    vi.restoreAllMocks();
  });

  it("stamps refreshed installedAt + new version into _version.json after update", async () => {
    await update({ global: true, force: true, ci: true });
    expect(runtimeMigrationState.migrateRuntimeState).not.toHaveBeenCalled();

    const versionPath = path.join(tmpDir, ".agents", "skills", "_version.json");
    const raw = fs.readFileSync(versionPath, "utf-8");
    const meta = JSON.parse(raw) as {
      version: string;
      mode: string;
      installedAt: string;
      schemaVersion: number;
    };

    expect(meta.version).toBe("8.1.0");
    expect(meta.mode).toBe("global");
    expect(meta.schemaVersion).toBe(2);
    // installedAt must have been refreshed
    expect(meta.installedAt).not.toBe("2026-01-01T00:00:00.000Z");
    expect(new Date(meta.installedAt).toISOString()).toBe(meta.installedAt);
  });

  it("migrates before acquiring the update lock and projects common skills before copying", async () => {
    await update({ global: true, force: true, ci: true });
    expect(migrationState.migrateGlobalHome).toHaveBeenCalledExactlyOnceWith({
      env: expect.objectContaining({ OMA_HOME: tmpDir }),
    });
    expect(
      migrationState.migrateGlobalHome.mock.invocationCallOrder[0],
    ).toBeLessThan(lockState.acquireLock.mock.invocationCallOrder[0] ?? 0);
    expect(
      skillsState.createGlobalSkillDiscoveryLinks.mock.invocationCallOrder[0],
    ).toBeLessThan(
      tarballState.downloadAndExtract.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it.each(["conflicts", "deferred"] as const)(
    "stops before locking when migration reports %s",
    async (field) => {
      migrationState.migrateGlobalHome.mockResolvedValueOnce({
        copied: [],
        conflicts: [],
        deferred: [],
        [field]: ["legacy path needs attention"],
      });
      await expect(
        update({ global: true, force: true, ci: true }),
      ).rejects.toThrow("legacy path needs attention");
      expect(lockState.acquireLock).not.toHaveBeenCalled();
      expect(tarballState.downloadAndExtract).not.toHaveBeenCalled();
      expect(linkState.link).not.toHaveBeenCalled();
    },
  );

  it("does not migrate a global home during a project update", async () => {
    _resetInstallContext();
    setInstallContext({ installRoot: tmpDir, mode: "project" });
    await update({ force: true, ci: true });
    expect(migrationState.migrateGlobalHome).not.toHaveBeenCalled();
    expect(skillsState.createGlobalSkillDiscoveryLinks).not.toHaveBeenCalled();
  });

  it("prepares shared memory before linking and reporting an updated version", async () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => {});

    await update({ global: true, force: true, ci: true });

    expect(memoryState.ensureAgentMemory).toHaveBeenCalledExactlyOnceWith({
      onProgress: expect.any(Function),
    });
    expect(
      memoryState.ensureAgentMemory.mock.invocationCallOrder[0],
    ).toBeLessThan(linkState.link.mock.invocationCallOrder[0] ?? 0);
    expect(manifestState.setNeedsReconcile).toHaveBeenCalledWith(tmpDir, false);
    const clearIndex = manifestState.setNeedsReconcile.mock.calls.findIndex(
      ([, pending]) => pending === false,
    );
    expect(
      manifestState.setNeedsReconcile.mock.invocationCallOrder[clearIndex],
    ).toBeGreaterThan(linkState.link.mock.invocationCallOrder[0] ?? 0);
    const completed = output.mock.calls.findIndex(([message]) =>
      String(message).includes("Updated to version 8.1.0"),
    );
    expect(completed).toBeGreaterThanOrEqual(0);
    expect(
      memoryState.ensureAgentMemory.mock.invocationCallOrder[0],
    ).toBeLessThan(output.mock.invocationCallOrder[completed] ?? 0);
  });

  it("prepares shared memory when an already-current global update skips the download", async () => {
    manifestState.getLocalVersion.mockResolvedValue("8.1.0");
    migrationState.migrateGlobalHome.mockResolvedValueOnce({
      copied: [path.join(tmpDir, ".agents")],
      conflicts: [],
      deferred: [],
    });
    const output = vi.spyOn(console, "log").mockImplementation(() => {});

    await update({ global: true, ci: true });

    expect(memoryState.ensureAgentMemory).toHaveBeenCalledOnce();
    expect(tarballState.downloadAndExtract).not.toHaveBeenCalled();
    expect(linkState.link).toHaveBeenCalledWith({
      root: tmpDir,
      quiet: true,
    });
    const completed = output.mock.calls.findIndex(([message]) =>
      String(message).includes("Already up to date!"),
    );
    expect(completed).toBeGreaterThanOrEqual(0);
    expect(
      memoryState.ensureAgentMemory.mock.invocationCallOrder[0],
    ).toBeLessThan(output.mock.invocationCallOrder[completed] ?? 0);
  });

  it.each(["none", "honcho"] as const)(
    "respects the preserved local provider %s during a forced update",
    async (provider) => {
      const actualConfig = await vi.importActual<
        typeof import("../../utils/config.js")
      >("../../utils/config.js");
      configState.loadOmaConfig.mockImplementation(actualConfig.loadOmaConfig);
      fs.writeFileSync(
        path.join(tmpDir, ".agents", "oma-config.local.yaml"),
        `providers:\n  semantic_memory: ${provider}\n`,
      );
      const { dir: repoDir } = await tarballState.downloadAndExtract();
      fs.writeFileSync(
        path.join(repoDir, ".agents", "oma-config.yaml"),
        "providers:\n  semantic_memory: agentmemory\n",
      );

      await update({ global: true, force: true, ci: true });

      expect(memoryState.ensureAgentMemory).not.toHaveBeenCalled();
      expect(linkState.link).toHaveBeenCalled();
      expect(actualConfig.loadOmaConfig(tmpDir)?.providers).toMatchObject({
        semantic_memory: provider,
      });
    },
  );

  it("uses the final force-reset provider instead of the previous base preference", async () => {
    const actualConfig = await vi.importActual<
      typeof import("../../utils/config.js")
    >("../../utils/config.js");
    configState.loadOmaConfig.mockImplementation(actualConfig.loadOmaConfig);
    fs.writeFileSync(
      path.join(tmpDir, ".agents", "oma-config.yaml"),
      "providers:\n  semantic_memory: none\n",
    );
    const { dir: repoDir } = await tarballState.downloadAndExtract();
    fs.writeFileSync(
      path.join(repoDir, ".agents", "oma-config.yaml"),
      "providers:\n  semantic_memory: agentmemory\n",
    );

    await update({ global: true, force: true, ci: true });

    expect(memoryState.ensureAgentMemory).toHaveBeenCalledOnce();
    expect(actualConfig.loadOmaConfig(tmpDir)?.providers).toMatchObject({
      semantic_memory: "agentmemory",
    });
  });

  it.each([false, true])(
    "rejects and releases the lock when shared memory is unavailable (already-current=%s)",
    async (alreadyCurrent) => {
      if (alreadyCurrent)
        manifestState.getLocalVersion.mockResolvedValue("8.1.0");
      const release = vi.fn();
      lockState.acquireLock.mockReturnValue({ ok: true, release });
      memoryState.ensureAgentMemory.mockRejectedValueOnce(
        new Error("memory health check failed"),
      );
      const output = vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(update({ global: true, ci: true })).rejects.toThrow(
        "memory health check failed",
      );

      expect(linkState.link).not.toHaveBeenCalled();
      expect(selfUpdateState.maybeSelfUpdate).not.toHaveBeenCalled();
      expect(release).toHaveBeenCalledOnce();
      if (!alreadyCurrent) {
        expect(manifestState.setNeedsReconcile).toHaveBeenCalledWith(
          tmpDir,
          true,
        );
        expect(manifestState.setNeedsReconcile).not.toHaveBeenCalledWith(
          tmpDir,
          false,
        );
      }
      expect(output.mock.calls.flat().join("\n")).not.toMatch(
        /Already up to date|Updated to version/,
      );
      const version = JSON.parse(
        fs.readFileSync(
          path.join(tmpDir, ".agents", "skills", "_version.json"),
          "utf8",
        ),
      );
      expect(version.version).toBe("8.0.0");
      expect(version.installedAt).toBe("2026-01-01T00:00:00.000Z");
    },
  );

  it("preserves the selected skills after memory failure and a same-version retry", async () => {
    const actualManifest = await vi.importActual<
      typeof import("../../platform/manifest.js")
    >("../../platform/manifest.js");
    const actualSkills = await vi.importActual<
      typeof import("../../platform/skills-installer/skill-symlinks.js")
    >("../../platform/skills-installer/skill-symlinks.js");
    manifestState.getLocalVersion.mockResolvedValue("8.1.0");
    manifestState.getNeedsReconcile.mockImplementation(() =>
      actualManifest.getNeedsReconcile(tmpDir),
    );
    manifestState.setNeedsReconcile.mockImplementation(
      actualManifest.setNeedsReconcile,
    );
    manifestState.snapshotArtifacts.mockImplementation(() =>
      actualManifest.snapshotArtifacts(tmpDir),
    );
    skillsState.getInstalledSkillNames.mockImplementation(
      actualSkills.getInstalledSkillNames,
    );
    await actualManifest.saveLocalVersion(tmpDir, "8.1.0", "global");
    actualManifest.setNeedsReconcile(tmpDir, true);
    const selectedSkill = path.join(
      tmpDir,
      ".agents",
      "skills",
      "oma-backend",
      "SKILL.md",
    );
    fs.mkdirSync(path.dirname(selectedSkill), { recursive: true });
    fs.writeFileSync(selectedSkill, "original backend skill");
    const { dir: repoDir, cleanup } = await tarballState.downloadAndExtract();
    tarballState.downloadAndExtract.mockClear();
    tarballState.downloadAndExtract.mockResolvedValue({
      dir: repoDir,
      cleanup: vi.fn(),
    });
    for (const name of ["oma-backend", "oma-video"]) {
      const skillPath = path.join(
        repoDir,
        ".agents",
        "skills",
        name,
        "SKILL.md",
      );
      fs.mkdirSync(path.dirname(skillPath), { recursive: true });
      fs.writeFileSync(skillPath, `updated ${name} skill`);
    }
    memoryState.ensureAgentMemory.mockRejectedValueOnce(
      new Error("memory health check failed"),
    );
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(update({ global: true, ci: true })).rejects.toThrow(
        "memory health check failed",
      );
      expect(fs.readFileSync(selectedSkill, "utf8")).toBe(
        "updated oma-backend skill",
      );
      expect(actualManifest.getNeedsReconcile(tmpDir)).toBe(true);
      expect(linkState.link).not.toHaveBeenCalled();

      await update({ global: true, ci: true });

      expect(actualSkills.getInstalledSkillNames(tmpDir)).toEqual([
        "oma-backend",
      ]);
      expect(
        fs.existsSync(path.join(tmpDir, ".agents", "skills", "oma-video")),
      ).toBe(false);
      expect(memoryState.ensureAgentMemory).toHaveBeenCalledTimes(2);
      expect(tarballState.downloadAndExtract).toHaveBeenCalledTimes(2);
      expect(linkState.link).toHaveBeenCalledOnce();
      expect(actualManifest.getNeedsReconcile(tmpDir)).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("migrates project runtime before an already-current update returns", async () => {
    _resetInstallContext();
    setInstallContext({ installRoot: tmpDir, mode: "project" });
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    manifestState.getLocalVersion.mockResolvedValue("8.1.0");
    await update({ ci: true });
    expect(
      runtimeMigrationState.migrateRuntimeState,
    ).toHaveBeenCalledExactlyOnceWith({ projectDir: tmpDir });
    expect(tarballState.downloadAndExtract).not.toHaveBeenCalled();
    expect(memoryState.ensureAgentMemory).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    "preserves local config byte-for-byte during update (force=%s)",
    async (force) => {
      const { dir: repoDir } = await tarballState.downloadAndExtract();
      for (const name of ["oma-config.local.cue", "oma-config.local.yaml"]) {
        fs.writeFileSync(
          path.join(tmpDir, ".agents", name),
          '// personal settings\nmodel_preset: "free"\n',
        );
        fs.writeFileSync(
          path.join(repoDir, ".agents", name),
          "accidentally included upstream local settings",
        );
      }
      await update({ global: true, force, ci: true });
      for (const name of ["oma-config.local.cue", "oma-config.local.yaml"]) {
        expect(
          fs.readFileSync(path.join(tmpDir, ".agents", name), "utf8"),
        ).toBe('// personal settings\nmodel_preset: "free"\n');
      }
    },
  );

  // Note: through the full update flow, `cpSync` overwrites
  // `_version.json` with the bundled (fresh) copy before `saveLocalVersion`
  // runs, so unrelated fields like `needsReconcile` are not preserved
  // end-to-end. Direct field-preservation behaviour of `saveLocalVersion`
  // is covered by manifest-level unit tests.

  it("backfills mode when _version.json is legacy (schemaVersion=1, no mode)", async () => {
    // Reseed _version.json without mode (legacy shape)
    const versionPath = path.join(tmpDir, ".agents", "skills", "_version.json");
    fs.writeFileSync(
      versionPath,
      `${JSON.stringify({ version: "8.0.0" }, null, 2)}\n`,
    );

    await update({ global: true, force: true, ci: true });

    const after = JSON.parse(fs.readFileSync(versionPath, "utf-8")) as {
      mode: string;
      schemaVersion: number;
    };
    expect(after.mode).toBe("global");
    expect(after.schemaVersion).toBe(2);
  });

  it("writes version matching remoteManifest.version after update", async () => {
    manifestState.fetchRemoteManifest.mockResolvedValue({
      version: "8.1.0",
      metadata: { totalFiles: 10 },
    });

    await update({ global: true, force: true, ci: true });

    const versionPath = path.join(tmpDir, ".agents", "skills", "_version.json");
    const meta = JSON.parse(fs.readFileSync(versionPath, "utf-8")) as {
      version: string;
    };
    expect(meta.version).toBe("8.1.0");
  });

  it("pins the download to the release the remote manifest points at", async () => {
    manifestState.fetchRemoteManifest.mockResolvedValue({
      version: "8.1.0",
      metadata: { totalFiles: 10 },
    });

    await update({ global: true, force: true, ci: true });

    expect(tarballState.downloadAndExtract).toHaveBeenCalledWith({
      version: "8.1.0",
    });
  });

  it("starts CLI self-update only after project reconciliation completes", async () => {
    await update({ global: true, force: true, ci: true });

    expect(linkState.link).toHaveBeenCalled();
    expect(selfUpdateState.maybeSelfUpdate).toHaveBeenCalled();
    expect(linkState.link.mock.invocationCallOrder[0]).toBeLessThan(
      selfUpdateState.maybeSelfUpdate.mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it("installs missing skills at the current version when explicitly requested", async () => {
    manifestState.getLocalVersion.mockResolvedValue("8.1.0");
    const { dir: repoDir } = await tarballState.downloadAndExtract();
    tarballState.downloadAndExtract.mockClear();
    const skillPath = path.join(
      ".agents",
      "skills",
      "oma-explanation",
      "SKILL.md",
    );
    fs.mkdirSync(path.dirname(path.join(repoDir, skillPath)), {
      recursive: true,
    });
    fs.writeFileSync(path.join(repoDir, skillPath), "# Explanation\n");

    await update({ global: true, ci: true, withNewSkills: true });

    expect(tarballState.downloadAndExtract).toHaveBeenCalledOnce();
    expect(fs.readFileSync(path.join(tmpDir, skillPath), "utf8")).toBe(
      "# Explanation\n",
    );
    expect(linkState.link).toHaveBeenCalled();
  });

  it("skips the download at the current version without an explicit skill request", async () => {
    manifestState.getLocalVersion.mockResolvedValue("8.1.0");

    await update({ global: true, ci: true });

    expect(tarballState.downloadAndExtract).not.toHaveBeenCalled();
    expect(linkState.link).toHaveBeenCalledWith({
      root: tmpDir,
      quiet: true,
    });
  });

  it("does not redownload for a state-only migration warning", async () => {
    manifestState.getLocalVersion.mockResolvedValue("8.1.0");
    migrationsState.runMigrations.mockReturnValue([
      "session migration failed for oma-conflict: destination differs",
    ]);
    migrationsState.runMigrationsWithStatus.mockReturnValue({
      actions: [
        "session migration failed for oma-conflict: destination differs",
      ],
      requiresReconcile: false,
    });

    await update({ global: true, ci: true });

    expect(tarballState.downloadAndExtract).not.toHaveBeenCalled();
    expect(linkState.link).toHaveBeenCalledWith({
      root: tmpDir,
      quiet: true,
    });
  });
});
