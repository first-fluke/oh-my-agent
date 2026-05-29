import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  inferSerenaLanguages: vi.fn(() => ["typescript"]),
}));

const configState = vi.hoisted(() => ({
  isTelemetryEnabled: vi.fn(() => false),
  loadOmaConfig: vi.fn(() => ({})),
  loadSerenaConfig: vi.fn(() => ({ autoUpdate: false })),
}));

const geminiState = vi.hoisted(() => ({
  usesGeminiCli: vi.fn(() => false),
  formatGeminiDeprecationWarning: vi.fn(() => ""),
}));

const migrationsState = vi.hoisted(() => ({
  runMigrations: vi.fn(() => []),
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
    "gemini",
    "grok",
    "hermes",
    "qwen",
  ],
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
    gemini: { projectPath: ".gemini/skills", homePath: ".gemini/skills" },
    grok: { projectPath: ".grok/skills", homePath: ".grok/skills" },
    hermes: {
      projectPath: ".hermes/skills/oma",
      homePath: ".hermes/skills/oma",
      requiresHomeConsent: true,
    },
    qwen: { projectPath: ".qwen/skills", homePath: ".qwen/skills" },
  },
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
vi.mock("../link/link.js", () => linkState);
vi.mock("../migrations/index.js", () => migrationsState);

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  _resetInstallContext,
  setInstallContext,
} from "../../platform/install-context.js";
import { update } from "../update/update.js";

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
    manifestState.snapshotArtifacts.mockReturnValue({});
    manifestState.diffArtifacts.mockReturnValue({
      addedSkills: [],
      removedSkills: [],
      addedWorkflows: [],
      removedWorkflows: [],
    });
    manifestState.hasArtifactChanges.mockReturnValue(false);

    lockState.acquireLock.mockReturnValue({ ok: true, release: vi.fn() });
    migrationsState.runMigrations.mockReturnValue([]);
    selfUpdateState.maybeSelfUpdate.mockResolvedValue({
      triggered: false,
      reason: "disabled",
    });
    configState.loadSerenaConfig.mockReturnValue({ autoUpdate: false });
    configState.loadOmaConfig.mockReturnValue({});
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
});
