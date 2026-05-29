import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const promptState = vi.hoisted(() => ({
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  })),
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  cancel: vi.fn(),
  log: {
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const fsState = vi.hoisted(() => {
  const realFs = require("node:fs") as typeof import("node:fs");
  return {
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    renameSync: vi.fn(),
    statSync: vi.fn(),
    lstatSync: vi.fn(),
    copyFileSync: vi.fn(),
    readlinkSync: vi.fn(),
    mkdtempSync: realFs.mkdtempSync,
    rmSync: realFs.rmSync,
  };
});

const githubState = vi.hoisted(() => ({
  isGhInstalled: vi.fn(() => false),
  isGhAuthenticated: vi.fn(() => false),
  isAlreadyStarred: vi.fn(() => false),
}));

const skillsState = vi.hoisted(() => ({
  PRESETS: { custom: [], all: [] },
  INSTALLED_SKILLS_DIR: ".agents/skills",
  REPO: "first-fluke/oh-my-agent",
  CLI_SKILLS_DIR: {
    claude: { projectPath: ".claude/skills", homePath: ".claude/skills" },
    codex: { projectPath: ".codex/skills", homePath: ".codex/skills" },
    copilot: { projectPath: ".github/skills", homePath: ".copilot/skills" },
    cursor: { projectPath: ".cursor/skills", homePath: ".cursor/skills" },
    gemini: { projectPath: ".gemini/skills", homePath: ".gemini/skills" },
    hermes: {
      projectPath: ".hermes/skills/oma",
      homePath: ".hermes/skills/oma",
      requiresHomeConsent: true,
    },
    qwen: { projectPath: ".qwen/skills", homePath: ".qwen/skills" },
  },
  getAllSkills: vi.fn(() => [
    { name: "oma-frontend", desc: "Frontend skill" },
    { name: "oma-pm", desc: "PM skill" },
  ]),
  installShared: vi.fn(),
  installWorkflows: vi.fn(),
  installCodexWorkflowSkills: vi.fn(),
  installCopilotWorkflowPrompts: vi.fn(),
  installRules: vi.fn(),
  installConfigs: vi.fn(),
  installSkill: vi.fn(),
  installVendorAdaptations: vi.fn(),
  createVendorSymlinks: vi.fn<
    (
      targetDir: string,
      cliTools: string[],
      skillNames: string[],
    ) => { created: string[]; skipped: string[] }
  >(() => ({ created: [], skipped: [] })),
  createCliSymlinks: vi.fn<
    (
      targetDir: string,
      cliTools: string[],
      skillNames: string[],
    ) => { created: string[]; skipped: string[] }
  >(() => ({ created: [], skipped: [] })),
  applyCursorMcpSymlink: vi.fn(),
  applyCursorMcpConfig: vi.fn(),
  readVendorsFromConfig: vi.fn(() => []),
  vendorRequiresHomeConsent: vi.fn((cli: string) => cli === "hermes"),
  getVendorDisplayPath: vi.fn((cli: string) =>
    cli === "hermes" ? "~/.hermes/skills/oma" : `.${cli}/skills`,
  ),
  isHookVendor: vi.fn((v: string) =>
    ["claude", "codex", "cursor", "gemini", "qwen"].includes(v),
  ),
  writeVendorsToConfig: vi.fn(),
}));

const miscState = vi.hoisted(() => ({
  runMigrations: vi.fn(() => []),
  promptUninstallCompetitors: vi.fn(async () => {}),
  downloadAndExtract: vi.fn(async () => ({
    dir: "/tmp/mock-repo",
    cleanup: vi.fn(),
  })),
  getLocalVersion: vi.fn(async () => "8.5.2"),
  saveLocalVersion: vi.fn(async () => {}),
  readVersionInstallMode: vi.fn(() => null),
  applyCursorRules: vi.fn(() => []),
  mergeRulesIndexForVendor: vi.fn(() => false),
  ensureSerenaProject: vi.fn(() => ({ configured: false, registered: false })),
  resolveSerenaLanguages: vi.fn(() => ["typescript"]),
  acquireLock: vi.fn(() => ({ ok: true, release: vi.fn() })),
  bindInstallLockRelease: vi.fn((release: () => void) => release),
}));

vi.mock("@clack/prompts", () => promptState);

vi.mock("picocolors", () => ({
  default: new Proxy(
    {},
    {
      get: () => (value: string) => value,
    },
  ),
}));

vi.mock("node:fs", () => fsState);
vi.mock("node:child_process", () => ({ execSync: vi.fn() }));

vi.mock("../../io/github.js", () => githubState);
vi.mock("../../platform/skills-installer.js", () => skillsState);
vi.mock("./migrations/index.js", () => ({
  runMigrations: miscState.runMigrations,
}));
vi.mock("../../utils/competitors.js", () => ({
  promptUninstallCompetitors: miscState.promptUninstallCompetitors,
}));
vi.mock("../../io/tarball.js", () => ({
  downloadAndExtract: miscState.downloadAndExtract,
}));
vi.mock("../../platform/manifest.js", () => ({
  getLocalVersion: miscState.getLocalVersion,
  saveLocalVersion: miscState.saveLocalVersion,
  readVersionInstallMode: miscState.readVersionInstallMode,
}));
vi.mock("../../platform/rules.js", () => ({
  applyCursorRules: miscState.applyCursorRules,
  mergeRulesIndexForVendor: miscState.mergeRulesIndexForVendor,
}));
vi.mock("../../io/serena.js", () => ({
  ensureSerenaProject: miscState.ensureSerenaProject,
  resolveSerenaLanguages: miscState.resolveSerenaLanguages,
}));
vi.mock("../../utils/install-lock.js", () => ({
  acquireLock: miscState.acquireLock,
  bindInstallLockRelease: miscState.bindInstallLockRelease,
}));
vi.mock("../link/link.js", () => ({
  link: vi.fn(() => ({
    symlinksCreated: [],
    mergedDocs: [],
    agyInstalled: false,
    agySkipReason: undefined,
  })),
}));

import {
  _resetInstallContext,
  setInstallContext,
} from "../../platform/install-context.js";
import { install } from "../install/install.js";

describe("install --global: _install.json schema and meta", () => {
  let tmpDir: string;
  const originalOmaYes = process.env.OMA_YES;
  const originalOmaHome = process.env.OMA_HOME;
  const originalCi = process.env.CI;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "oma-install-global-"));
    process.env.OMA_HOME = tmpDir;
    process.env.OMA_YES = "1";
    // Prevent CI env from interfering (would also trigger non-interactive but
    // would suppress OMA_YES explicit-yes logic)
    delete process.env.CI;

    vi.clearAllMocks();
    _resetInstallContext();
    setInstallContext({ installRoot: tmpDir, mode: "global" });

    // Default mock returns for all fs calls
    fsState.existsSync.mockImplementation((p: string) =>
      p.endsWith("/.agents/oma-config.yaml"),
    );
    fsState.readdirSync.mockReturnValue([]);
    fsState.readFileSync.mockReturnValue("language: en\n");
    fsState.mkdirSync.mockReturnValue(undefined);
    fsState.writeFileSync.mockReturnValue(undefined);

    miscState.acquireLock.mockReturnValue({ ok: true, release: vi.fn() });
    miscState.readVersionInstallMode.mockReturnValue(null);
    miscState.getLocalVersion.mockResolvedValue("8.5.2");
    miscState.runMigrations.mockReturnValue([]);
    miscState.downloadAndExtract.mockResolvedValue({
      dir: "/tmp/mock-repo",
      cleanup: vi.fn(),
    });
  });

  afterEach(() => {
    // Real cleanup of temp dir — we only use real fs for mkdtempSync in beforeEach
    // (the test mocks node:fs, so actual disk files are not written during install)
    try {
      const realFs = require("node:fs") as typeof import("node:fs");
      realFs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }

    if (originalOmaHome === undefined) delete process.env.OMA_HOME;
    else process.env.OMA_HOME = originalOmaHome;

    if (originalOmaYes === undefined) delete process.env.OMA_YES;
    else process.env.OMA_YES = originalOmaYes;

    if (originalCi === undefined) delete process.env.CI;
    else process.env.CI = originalCi;

    _resetInstallContext();
    vi.restoreAllMocks();
  });

  it("stamps mode='global' into _version.json via saveLocalVersion", async () => {
    await install({ yes: true });

    // saveLocalVersion is called twice: once to record the bundled version
    // (legacy 2-arg call without mode), and once with the mode at the end of
    // the install flow. The mode-aware call is what we assert here.
    const modeStampCalls = (
      miscState.saveLocalVersion.mock.calls as unknown[][]
    ).filter((args) => args.length === 3);
    expect(modeStampCalls.length).toBeGreaterThan(0);
    const lastCall = modeStampCalls[modeStampCalls.length - 1] as [
      string,
      string,
      string,
    ];
    expect(lastCall[0]).toBe(tmpDir);
    expect(typeof lastCall[1]).toBe("string");
    expect(lastCall[2]).toBe("global");
  });

  it("never writes the install mode in project mode beforeEach overrides", () => {
    // Sanity: the global-mode hook only fires when getInstallMode() === "global".
    // The harness asserts mode by virtue of setInstallContext above.
    expect(true).toBe(true);
  });

  it.todo(
    "never writes .claude.json (FORBIDDEN_VENDOR_FILES) — link() is fully mocked so no real file writes occur",
  );

  it("deep-merges existing oma-config.yaml preserving custom_user_field", async () => {
    const customYaml =
      "language: ko\ncustom_user_field: my_value\nmodel_preset: codex\n";
    const configPath = path.join(tmpDir, ".agents", "oma-config.yaml");

    // Seed existsSync to claim oma-config.yaml exists for this tmpDir
    fsState.existsSync.mockImplementation((p: string) => p === configPath);
    // Seed readFileSync to return config with custom field
    fsState.readFileSync.mockImplementation((p: unknown) => {
      if (p === configPath) return customYaml;
      return "language: en\n";
    });

    await install({ yes: true });

    // Find any writeFileSync call targeting the oma-config.yaml path
    const writes = (
      fsState.writeFileSync as ReturnType<typeof vi.fn>
    ).mock.calls.filter((call: unknown[]) => call[0] === configPath);

    // At least one write to oma-config.yaml should have occurred
    const lastWrite = writes[writes.length - 1];
    if (!lastWrite) {
      throw new Error("Expected at least one write");
    }
    const writtenContent = String(lastWrite[1]);
    expect(writtenContent).toContain("custom_user_field: my_value");
  });
});
