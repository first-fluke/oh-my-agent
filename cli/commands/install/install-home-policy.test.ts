import * as childProcess from "node:child_process";
import * as fs from "node:fs";
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

const fsState = vi.hoisted(() => ({
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
}));

const githubState = vi.hoisted(() => ({
  isGhInstalled: vi.fn(() => false),
  isGhAuthenticated: vi.fn(() => false),
  isAlreadyStarred: vi.fn(() => false),
}));

const skillsState = vi.hoisted(() => ({
  PRESETS: { custom: [] },
  INSTALLED_SKILLS_DIR: ".agents/skills",
  REPO: "first-fluke/oh-my-agent",
  CLI_SKILLS_DIR: {
    claude: { base: "project", path: ".claude/skills" },
    copilot: { base: "project", path: ".github/skills" },
    hermes: { base: "home", path: ".hermes/skills/oma" },
  },
  getAllSkills: vi.fn(() => [
    { name: "oma-frontend", desc: "Frontend skill" },
    { name: "oma-pm", desc: "PM skill" },
  ]),
  installShared: vi.fn(),
  installWorkflows: vi.fn(),
  installCodexWorkflowSkills: vi.fn(),
  installRules: vi.fn(),
  installConfigs: vi.fn(),
  installSkill: vi.fn(),
  installVendorAdaptations: vi.fn(),
  createCliSymlinks: vi.fn(() => ({ created: [], skipped: [] })),
  ensureCursorMcpSymlink: vi.fn(),
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
  getLocalVersion: vi.fn(async () => null),
  saveLocalVersion: vi.fn(async () => {}),
  generateCursorRules: vi.fn(() => []),
  mergeRulesIndexForVendor: vi.fn(() => false),
  ensureSerenaProject: vi.fn(() => ({ configured: false, registered: false })),
  resolveSerenaLanguages: vi.fn(() => ["typescript"]),
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
vi.mock("../../cli-kit/competitors.js", () => ({
  promptUninstallCompetitors: miscState.promptUninstallCompetitors,
}));
vi.mock("../../io/tarball.js", () => ({
  downloadAndExtract: miscState.downloadAndExtract,
}));
vi.mock("../../platform/manifest.js", () => ({
  getLocalVersion: miscState.getLocalVersion,
  saveLocalVersion: miscState.saveLocalVersion,
}));
vi.mock("../../platform/rules.js", () => ({
  generateCursorRules: miscState.generateCursorRules,
  mergeRulesIndexForVendor: miscState.mergeRulesIndexForVendor,
}));
vi.mock("../../io/serena.js", () => ({
  ensureSerenaProject: miscState.ensureSerenaProject,
  resolveSerenaLanguages: miscState.resolveSerenaLanguages,
}));

import { install } from "../install/install.js";

describe("install home policy", () => {
  const originalHome = process.env.HOME;

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.HOME = "/tmp/test-home";

    // 3 select prompts: language, modelPreset, projectType
    promptState.select
      .mockResolvedValueOnce("en")
      .mockResolvedValueOnce("claude-only")
      .mockResolvedValueOnce("custom");
    // 2 multiselect prompts: skills, vendors
    promptState.multiselect
      .mockResolvedValueOnce(["oma-frontend"])
      .mockResolvedValueOnce(["gemini"]);
    // Default: any consent prompt receives "false"
    promptState.confirm.mockResolvedValue(false);

    fsState.existsSync.mockImplementation((path: string) =>
      path.endsWith("/.agents/oma-config.yaml"),
    );
    fsState.readdirSync.mockReturnValue([]);
    fsState.readFileSync.mockReturnValue("language: en\n");
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    vi.restoreAllMocks();
  });

  // --- Baseline invariant: non-hermes vendors never write HOME ---

  it("does not write to HOME-level vendor settings (non-hermes)", async () => {
    await install();

    const writes = (
      fs.writeFileSync as ReturnType<typeof vi.fn>
    ).mock.calls.map((call: unknown[]) => String(call[0]));
    expect(writes.length).toBeGreaterThan(0);
    expect(
      writes.some(
        (path) =>
          path.startsWith("/tmp/test-home/.gemini/") ||
          path.startsWith("/tmp/test-home/.claude/"),
      ),
    ).toBe(false);

    const execCalls = (
      childProcess.execSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.map((call: unknown[]) => String(call[0]));
    expect(execCalls.some((cmd) => cmd.includes("git config --global"))).toBe(
      false,
    );
  });

  // --- Hermes consent gate: explicit opt-in required ---

  it("does NOT add hermes to selectedClis when consent declined", async () => {
    promptState.multiselect.mockReset();
    promptState.multiselect
      .mockResolvedValueOnce(["oma-frontend"])
      .mockResolvedValueOnce(["hermes"]);
    promptState.confirm.mockResolvedValue(false); // consent denied

    await install();

    const symlinkCalls = skillsState.createCliSymlinks.mock.calls;
    expect(symlinkCalls.length).toBeGreaterThan(0);
    // hermes must not be in the cliTools array passed to createCliSymlinks
    for (const call of symlinkCalls) {
      const cliTools = call[1] as string[];
      expect(cliTools).not.toContain("hermes");
    }
  });

  it("adds hermes to selectedClis when consent granted", async () => {
    promptState.multiselect.mockReset();
    promptState.multiselect
      .mockResolvedValueOnce(["oma-frontend"])
      .mockResolvedValueOnce(["hermes"]);
    promptState.confirm.mockResolvedValue(true); // consent granted

    await install();

    const symlinkCalls = skillsState.createCliSymlinks.mock.calls;
    const allCliTools = symlinkCalls.flatMap((c) => c[1] as string[]);
    expect(allCliTools).toContain("hermes");
  });

  it("never passes hermes to installVendorAdaptations (no hook bridge)", async () => {
    promptState.multiselect.mockReset();
    promptState.multiselect
      .mockResolvedValueOnce(["oma-frontend"])
      .mockResolvedValueOnce(["claude", "hermes"]);
    promptState.confirm.mockResolvedValue(true); // hermes consent granted

    await install();

    const adaptCalls = skillsState.installVendorAdaptations.mock.calls;
    for (const call of adaptCalls) {
      const hookVendors = call[2] as string[];
      expect(hookVendors).not.toContain("hermes");
      expect(hookVendors).not.toContain("copilot");
    }
  });

  it("isolates HOME write — gemini selected does NOT trigger gemini HOME write", async () => {
    promptState.multiselect.mockReset();
    promptState.multiselect
      .mockResolvedValueOnce(["oma-frontend"])
      .mockResolvedValueOnce(["gemini", "hermes"]);
    promptState.confirm.mockResolvedValue(true); // hermes consent granted

    await install();

    const writes = (
      fs.writeFileSync as ReturnType<typeof vi.fn>
    ).mock.calls.map((call: unknown[]) => String(call[0]));
    // Gemini settings remain project-local — never HOME
    expect(
      writes.some((path) => path.startsWith("/tmp/test-home/.gemini/")),
    ).toBe(false);
  });
});
