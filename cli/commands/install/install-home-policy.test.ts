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
  installCopilotWorkflowPrompts: vi.fn(),
  installRules: vi.fn(),
  installConfigs: vi.fn(),
  installSkill: vi.fn(),
  installVendorAdaptations: vi.fn(),
  getInstalledWorkflowNames: vi.fn(() => []),
  createVendorWorkflowSymlinks: vi.fn(() => ({ created: [], skipped: [] })),
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
  isExtensionVendor: vi.fn((v: string) => v === "pi"),
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
  applyCursorRules: vi.fn(() => []),
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
vi.mock("../../utils/competitors.js", () => ({
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
  applyCursorRules: miscState.applyCursorRules,
  mergeRulesIndexForVendor: miscState.mergeRulesIndexForVendor,
}));
vi.mock("../../io/serena.js", () => ({
  ensureSerenaProject: miscState.ensureSerenaProject,
  resolveSerenaLanguages: miscState.resolveSerenaLanguages,
}));
vi.mock("../../utils/install-lock.js", () => ({
  acquireLock: vi.fn(() => ({ ok: true, release: () => {} })),
  bindInstallLockRelease: vi.fn((release: () => void) => release),
}));

import {
  _resetInstallContext,
  setInstallContext,
} from "../../platform/install-context.js";
import { install } from "../install/install.js";

describe("install home policy", () => {
  const originalHome = process.env.HOME;
  const originalCi = process.env.CI;
  const originalOmaYes = process.env.OMA_YES;

  beforeEach(() => {
    vi.clearAllMocks();

    _resetInstallContext();
    setInstallContext({ installRoot: process.cwd(), mode: "project" });

    process.env.HOME = "/tmp/test-home";
    // Force interactive mode regardless of host env (GitHub Actions sets
    // CI=true, which would otherwise activate non-interactive yes-mode and
    // bypass the multiselect mocks below).
    delete process.env.CI;
    delete process.env.OMA_YES;

    // 3 select prompts: language, modelPreset, projectType
    promptState.select
      .mockResolvedValueOnce("en")
      .mockResolvedValueOnce("claude")
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
    if (originalCi === undefined) delete process.env.CI;
    else process.env.CI = originalCi;
    if (originalOmaYes === undefined) delete process.env.OMA_YES;
    else process.env.OMA_YES = originalOmaYes;
    _resetInstallContext();
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

    const symlinkCalls = skillsState.createVendorSymlinks.mock.calls;
    expect(symlinkCalls.length).toBeGreaterThan(0);
    // hermes must not be in the cliTools array passed to createVendorSymlinks
    for (const call of symlinkCalls) {
      const cliTools = call[1];
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

    const symlinkCalls = skillsState.createVendorSymlinks.mock.calls;
    const allCliTools = symlinkCalls.flatMap((c) => c[1]);
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

// ── Task 45 — EC-12: cwd === homedir() guard tests ────────────────────────────

describe("install EC-12 — cwd equals homedir guard", () => {
  // The EC-12 guard lives at install.ts line ~269:
  //   if (getInstallMode() === "project" && process.cwd() === homedir()) { ... }
  //
  // Spy infrastructure: process.cwd and process.exit are spied per test.
  // The promptState mock is already wired up via vi.mock("@clack/prompts").

  let cwdSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  // Stable home value for all EC-12 tests — must NOT equal process.env.HOME
  // that was set by beforeEach (/tmp/test-home), so we pick the same value.
  const fakeHome = "/tmp/test-home";

  beforeEach(() => {
    // vi.clearAllMocks doesn't always clear hoisted mock call history across
    // nested describes — clear explicitly to prevent test bleeding.
    promptState.cancel.mockClear();
    promptState.confirm.mockClear();
    // Throw on exit so install() stops at the EC-12 guard instead of running
    // the rest of the flow (multiselect mocks etc. would otherwise fire).
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw new Error(`__EXIT__${code}`);
    }) as never);
  });

  afterEach(() => {
    cwdSpy?.mockRestore();
    exitSpy?.mockRestore();
  });

  it("EC-12-1: non-interactive + cwd=HOME + project mode => cancel + exit(1)", async () => {
    // Make cwd() === homedir()
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(fakeHome);

    // Set HOME env so homedir() resolves to fakeHome
    process.env.HOME = fakeHome;
    process.env.CI = "true"; // non-interactive

    _resetInstallContext();
    setInstallContext({ installRoot: process.cwd(), mode: "project" });

    await expect(install()).rejects.toThrow(/__EXIT__1/);

    expect(promptState.cancel).toHaveBeenCalledWith(
      expect.stringContaining("--global"),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("EC-12-2: interactive + cwd=HOME + project mode + confirm=false => prompt fires + exit(0)", async () => {
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(fakeHome);
    process.env.HOME = fakeHome;
    delete process.env.CI;

    _resetInstallContext();
    setInstallContext({ installRoot: process.cwd(), mode: "project" });

    // First confirm call = EC-12 consent prompt => user declines
    promptState.confirm.mockResolvedValueOnce(false);

    await expect(install()).rejects.toThrow(/__EXIT__0/);

    // EC-12 confirm must have been called
    expect(promptState.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("HOME"),
      }),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("EC-12-3: interactive + cwd=HOME + project mode + confirm=true => install proceeds past guard", async () => {
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(fakeHome);
    process.env.HOME = fakeHome;
    delete process.env.CI;

    _resetInstallContext();
    setInstallContext({ installRoot: process.cwd(), mode: "project" });

    // EC-12 consent: user approves
    promptState.confirm.mockResolvedValueOnce(true);
    // Subsequent confirms (global consent, etc.): decline to keep the test minimal
    promptState.confirm.mockResolvedValue(false);

    // install may complete or throw later; we only care the EC-12 prompt fired
    // and exit(1) was NOT called via the EC-12 abort path.
    try {
      await install();
    } catch {
      // ignore: any later exit() throws are fine
    }

    // The first confirm was the EC-12 prompt; install continued past it
    expect(promptState.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("HOME") }),
    );
    // exit should NOT have been called with 1 (EC-12 abort path)
    expect(exitSpy).not.toHaveBeenCalledWith(1);
  });

  it("EC-12-4: cwd=HOME + global mode => no EC-12 cancel", async () => {
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(fakeHome);
    process.env.HOME = fakeHome;
    process.env.CI = "true";
    process.env.OMA_YES = "1";

    _resetInstallContext();
    // Global mode — EC-12 guard only fires in project mode
    setInstallContext({ installRoot: fakeHome, mode: "global" });

    try {
      await install({ yes: true });
    } catch {
      // ignore late exits
    }

    // EC-12 cancel message must NOT have been emitted
    const cancelCalls = (promptState.cancel as ReturnType<typeof vi.fn>).mock
      .calls;
    const hasEc12Cancel = cancelCalls.some((args: unknown[]) =>
      String(args[0]).includes("Refusing to install in HOME without"),
    );
    expect(hasEc12Cancel).toBe(false);
  });

  it("EC-12-5: cwd != HOME + project mode => install proceeds normally past guard", async () => {
    // cwd is a temp dir, not HOME — EC-12 guard must not fire
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/tmp/my-project");
    process.env.HOME = fakeHome;
    process.env.CI = "true";
    process.env.OMA_YES = "1";

    _resetInstallContext();
    setInstallContext({ installRoot: "/tmp/my-project", mode: "project" });

    try {
      await install({ yes: true });
    } catch {
      // ignore late exits
    }

    // Confirm must NOT have been called for EC-12 (no HOME equality)
    const ec12CancelCalls = (
      promptState.cancel as ReturnType<typeof vi.fn>
    ).mock.calls.filter((args: unknown[]) =>
      String(args[0]).includes("Refusing to install in HOME without"),
    );
    expect(ec12CancelCalls).toHaveLength(0);
    // exit(1) via EC-12 path must not have fired
    expect(exitSpy).not.toHaveBeenCalledWith(1);
  });
});
