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
  getAllSkills: vi.fn(() => [
    { name: "oma-frontend", desc: "Frontend skill" },
    { name: "oma-pm", desc: "PM skill" },
  ]),
  installShared: vi.fn(),
  installWorkflows: vi.fn(),
  installRules: vi.fn(),
  installConfigs: vi.fn(),
  installSkill: vi.fn(),
  installVendorAdaptations: vi.fn(),
  createCliSymlinks: vi.fn(() => ({ created: [], skipped: [] })),
  ensureCursorMcpSymlink: vi.fn(),
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

vi.mock("../lib/github.js", () => githubState);
vi.mock("../lib/skills.js", () => skillsState);
vi.mock("./migrations/index.js", () => ({
  runMigrations: miscState.runMigrations,
}));
vi.mock("../lib/competitors.js", () => ({
  promptUninstallCompetitors: miscState.promptUninstallCompetitors,
}));
vi.mock("../lib/tarball.js", () => ({
  downloadAndExtract: miscState.downloadAndExtract,
}));
vi.mock("../lib/manifest.js", () => ({
  getLocalVersion: miscState.getLocalVersion,
  saveLocalVersion: miscState.saveLocalVersion,
}));
vi.mock("../lib/rules.js", () => ({
  generateCursorRules: miscState.generateCursorRules,
  mergeRulesIndexForVendor: miscState.mergeRulesIndexForVendor,
}));
vi.mock("../lib/serena.js", () => ({
  ensureSerenaProject: miscState.ensureSerenaProject,
  resolveSerenaLanguages: miscState.resolveSerenaLanguages,
}));

import { install } from "../commands/install.js";

describe("install home safety", () => {
  const originalHome = process.env.HOME;

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.HOME = "/tmp/test-home";

    promptState.select
      .mockResolvedValueOnce("en")
      .mockResolvedValueOnce("custom");
    promptState.multiselect
      .mockResolvedValueOnce(["oma-frontend"])
      .mockResolvedValueOnce(["gemini"]);
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

  it("does not write to HOME-level vendor settings", async () => {
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
});
