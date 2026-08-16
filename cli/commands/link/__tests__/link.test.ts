import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../utils/safe-write.js", () => ({
  safeWriteJson: vi.fn(),
}));

let configuredVendorsForTest: string[] = [];
let agyInstalledResult: { installed: boolean; reason?: string } = {
  installed: true,
};

vi.mock("../../../platform/rules.js", () => ({
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

vi.mock("../../../platform/pi-extension-composer.js", () => ({
  installPiExtension: vi.fn(),
}));

vi.mock("../../../platform/pi-prompts.js", () => ({
  installPiPromptTemplates: vi.fn(() => []),
}));

vi.mock("../../../platform/skills-installer.js", () => ({
  createVendorSymlinks: vi.fn(() => ({
    created: [],
    skipped: [],
    removed: [],
  })),
  createVendorWorkflowSymlinks: vi.fn(() => ({ created: [], skipped: [] })),
  createCliSymlinks: vi.fn(() => ({ created: [], skipped: [], removed: [] })),
  detectExistingCliSymlinkDirs: vi.fn(() => []),
  applyCursorMcpConfig: vi.fn(),
  getInstalledSkillNames: vi.fn(() => []),
  getInstalledWorkflowNames: vi.fn(() => []),
  installCopilotWorkflowPrompts: vi.fn(),
  installVendorAdaptations: vi.fn(),
  isHookVendor: vi.fn((v: string) =>
    ["claude", "codex", "cursor", "qwen"].includes(v),
  ),
  isExtensionVendor: vi.fn((v: string) => v === "pi"),
  readVendorsFromConfig: vi.fn(() => configuredVendorsForTest),
  vendorRequiresHomeConsent: vi.fn((cli: string) => cli === "hermes"),
  vendorSkillsDir: vi.fn(
    (cli: string, root: string) => `${root}/.${cli}/skills`,
  ),
}));

vi.mock("../../../utils/config.js", () => ({
  isTelemetryEnabled: vi.fn(() => false),
  loadSerenaConfig: vi.fn(() => ({ mode: "stdio" })),
}));

vi.mock("../../../vendors/antigravity/hud.js", () => ({
  installAntigravityHud: vi.fn(() => agyInstalledResult),
}));

vi.mock("../../../vendors/claude/mcp.js", () => ({
  applyClaudeMcp: vi.fn((mcp: unknown) => mcp),
  needsClaudeMcpUpdate: vi.fn(() => false),
}));

vi.mock("../../../vendors/claude/settings.js", () => ({
  applyClaudeSettings: vi.fn(),
  needsClaudeSettingsUpdate: vi.fn(() => false),
}));

// Stub workspace trust so link() never touches the real ~/.claude.json. The
// merge logic itself is covered by vendors/claude/trust.test.ts.
vi.mock("../../../vendors/claude/trust.js", () => ({
  ensureClaudeWorkspaceTrust: vi.fn(() => ({
    changed: false,
    alreadyTrusted: true,
  })),
}));

vi.mock("../../../vendors/codex/settings.js", () => ({
  applyCodexSettings: vi.fn((s: unknown) => s),
  needsCodexSettingsUpdate: vi.fn(() => false),
  parseCodexConfig: vi.fn(() => ({})),
  serializeCodexConfig: vi.fn(() => ""),
}));

vi.mock("../../../vendors/grok/settings.js", () => ({
  applyGrokTelemetryConfig: vi.fn(),
  needsGrokTelemetryUpdate: vi.fn(() => false),
}));

vi.mock("../../../vendors/qwen/settings.js", () => ({
  applyQwenSettings: vi.fn((s: unknown) => s),
  needsQwenSettingsUpdate: vi.fn(() => false),
}));

import {
  _resetInstallContext,
  setInstallContext,
} from "../../../platform/install-context.js";
import * as piExtension from "../../../platform/pi-extension-composer.js";
import * as piPrompts from "../../../platform/pi-prompts.js";
import * as rules from "../../../platform/rules.js";
import * as skills from "../../../platform/skills-installer.js";
import * as safeWrite from "../../../utils/safe-write.js";
import * as antigravity from "../../../vendors/antigravity/hud.js";
import * as claudeMcp from "../../../vendors/claude/mcp.js";
import * as grok from "../../../vendors/grok/settings.js";
import * as qwen from "../../../vendors/qwen/settings.js";
import { link } from "../run.js";

describe("link kernel", () => {
  const tempRoots: string[] = [];
  const originalCwd = process.cwd();

  beforeEach(() => {
    configuredVendorsForTest = [];
    agyInstalledResult = { installed: true };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    for (const root of tempRoots) {
      rmSync(root, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }
    tempRoots.length = 0;
  });

  function makeProject(vendors: string[]): string {
    const root = mkdtempSync(join(tmpdir(), "oma-link-test-"));
    tempRoots.push(root);
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      `vendors:\n${vendors.map((v) => `  - ${v}`).join("\n")}\n`,
      "utf-8",
    );
    configuredVendorsForTest = vendors;
    return root;
  }

  describe("contract", () => {
    it("returns a LinkResult struct", () => {
      const projectDir = makeProject(["claude"]);
      process.chdir(projectDir);

      const result = link({ quiet: true });

      expect(result).toMatchObject({
        vendors: expect.any(Array),
        agyInstalled: expect.any(Boolean),
        mergedDocs: expect.any(Array),
        symlinksCreated: expect.any(Array),
      });
    });

    it("returns empty result when no vendors are configured", () => {
      const projectDir = makeProject([]);
      process.chdir(projectDir);

      const result = link({ quiet: true });

      expect(result.vendors).toEqual([]);
      expect(result.agyInstalled).toBe(false);
    });

    it("exits with error when .agents/ is missing", () => {
      const root = mkdtempSync(join(tmpdir(), "oma-link-no-agents-"));
      tempRoots.push(root);
      process.chdir(root);

      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = link({ quiet: true });

      expect(result.vendors).toEqual([]);
      expect(process.exitCode).toBe(1);
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
      process.exitCode = 0;
    });
  });

  describe("vendor filter", () => {
    it("vendorFilter overrides config", () => {
      const projectDir = makeProject(["claude", "codex"]);
      process.chdir(projectDir);

      const result = link({ quiet: true, vendorFilter: ["claude"] });

      expect(result.vendors).toEqual(["claude"]);
      expect(skills.installVendorAdaptations).toHaveBeenCalledWith(
        expect.stringContaining(projectDir),
        expect.stringContaining(projectDir),
        ["claude"],
      );
    });

    it("falls back to config when vendorFilter is omitted", () => {
      const projectDir = makeProject(["codex", "cursor"]);
      process.chdir(projectDir);

      const result = link({ quiet: true });

      expect(result.vendors).toEqual(["codex", "cursor"]);
    });

    it("treats an empty vendorFilter as an explicit empty selection", () => {
      const projectDir = makeProject(["claude", "codex"]);
      process.chdir(projectDir);

      const result = link({ quiet: true, vendorFilter: [] });

      expect(result.vendors).toEqual([]);
      expect(skills.installVendorAdaptations).not.toHaveBeenCalled();
    });

    it("links pi-only projects through the extension path", () => {
      const projectDir = makeProject(["pi"]);
      process.chdir(projectDir);

      const result = link({ quiet: true });

      expect(piExtension.installPiExtension).toHaveBeenCalledWith(
        expect.stringContaining("oma-link-test-"),
        expect.stringContaining("oma-link-test-"),
      );
      expect(piPrompts.installPiPromptTemplates).toHaveBeenCalledWith(
        expect.stringContaining("oma-link-test-"),
        expect.stringContaining("oma-link-test-"),
      );
      expect(rules.mergeRulesIndexForVendor).toHaveBeenCalledWith(
        expect.stringContaining("oma-link-test-"),
        "pi",
        ["pi"],
      );
      expect(skills.installVendorAdaptations).not.toHaveBeenCalled();
      expect(result.vendors).toEqual([]);
      expect(result.mergedDocs).toEqual(["AGENTS.md"]);
    });
  });

  describe("antigravity HOME wiring", () => {
    it("invokes installAntigravityHud when antigravity is in the vendor list", () => {
      const projectDir = makeProject(["claude", "antigravity"]);
      process.chdir(projectDir);

      const result = link({ quiet: true });

      expect(antigravity.installAntigravityHud).toHaveBeenCalledWith(
        expect.stringContaining(projectDir),
        expect.objectContaining({ telemetry: expect.any(Boolean) }),
      );
      expect(skills.installVendorAdaptations).toHaveBeenCalledWith(
        expect.stringContaining(projectDir),
        expect.stringContaining(projectDir),
        ["claude"],
      );
      expect(result.agyInstalled).toBe(true);
    });

    it("does not invoke installAntigravityHud when antigravity is absent", () => {
      const projectDir = makeProject(["claude"]);
      process.chdir(projectDir);

      link({ quiet: true });

      expect(antigravity.installAntigravityHud).not.toHaveBeenCalled();
    });

    it("surfaces agySkipReason when HUD install skips", () => {
      agyInstalledResult = {
        installed: false,
        reason: "agy config dir not found",
      };
      const projectDir = makeProject(["claude", "antigravity"]);
      process.chdir(projectDir);

      const result = link({ quiet: true });

      expect(result.agyInstalled).toBe(false);
      expect(result.agySkipReason).toBe("agy config dir not found");
    });
  });

  describe("telemetry propagation", () => {
    it("threads explicit telemetry: true to vendor settings checkers", () => {
      const projectDir = makeProject(["qwen"]);
      process.chdir(projectDir);

      link({ quiet: true, telemetry: true });

      expect(qwen.needsQwenSettingsUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { telemetry: true },
      );
    });

    it("threads explicit telemetry: false to vendor settings checkers", () => {
      const projectDir = makeProject(["qwen"]);
      process.chdir(projectDir);

      link({ quiet: true, telemetry: false });

      expect(qwen.needsQwenSettingsUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { telemetry: false },
      );
    });

    it("skips Grok telemetry writes unless grok is selected", () => {
      const projectDir = makeProject(["claude"]);
      process.chdir(projectDir);

      link({ quiet: true, telemetry: false });

      expect(grok.needsGrokTelemetryUpdate).not.toHaveBeenCalled();
      expect(grok.applyGrokTelemetryConfig).not.toHaveBeenCalled();
    });
  });

  describe("quiet mode", () => {
    it("suppresses the standalone CLI summary in quiet mode", () => {
      const projectDir = makeProject(["claude"]);
      process.chdir(projectDir);

      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
      link({ quiet: true });
      expect(consoleLog).not.toHaveBeenCalled();

      consoleLog.mockRestore();
    });

    it("prints the standalone CLI summary when quiet is false", () => {
      const projectDir = makeProject(["claude"]);
      process.chdir(projectDir);

      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
      link({ quiet: false });
      expect(consoleLog).toHaveBeenCalled();

      consoleLog.mockRestore();
    });
  });

  describe("refreshSymlinks toggle", () => {
    it("does not call createVendorSymlinks when refreshSymlinks is false", () => {
      const projectDir = makeProject(["claude"]);
      process.chdir(projectDir);

      link({ quiet: true, refreshSymlinks: false });

      expect(skills.createVendorSymlinks).not.toHaveBeenCalled();
    });

    it("calls createVendorSymlinks by default when symlink dirs and skills exist", () => {
      (
        skills.detectExistingCliSymlinkDirs as unknown as ReturnType<
          typeof vi.fn
        >
      ).mockReturnValueOnce(["claude"]);
      (
        skills.getInstalledSkillNames as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValueOnce(["oma-frontend"]);
      const projectDir = makeProject(["claude"]);
      process.chdir(projectDir);

      link({ quiet: true });

      expect(skills.createVendorSymlinks).toHaveBeenCalled();
    });
  });

  describe("doc merging", () => {
    it("returns mergedDocs for vendors that merged successfully", () => {
      const projectDir = makeProject(["claude", "codex"]);
      process.chdir(projectDir);

      const result = link({ quiet: true });

      // mergeRulesIndexForVendor is mocked to return true for all vendors,
      // and link dedupes by target file (CLAUDE.md / AGENTS.md / GEMINI.md).
      expect(result.mergedDocs).toContain("CLAUDE.md");
      expect(result.mergedDocs).toContain("AGENTS.md");
    });
  });

  describe("safeWriteJson routing", () => {
    it("calls safeWriteJson for Claude .mcp.json (NOT .claude.json) when update is needed", () => {
      (
        claudeMcp.needsClaudeMcpUpdate as ReturnType<typeof vi.fn>
      ).mockReturnValueOnce(true);

      const projectDir = makeProject(["claude"]);
      process.chdir(projectDir);

      link({ quiet: true });

      const calls = (
        safeWrite.safeWriteJson as ReturnType<typeof vi.fn>
      ).mock.calls.map((args: unknown[]) => args[0] as string);
      const mcpCall = calls.find((p: string) => p.endsWith(".mcp.json"));
      expect(mcpCall).toBeDefined();
      const forbidden = calls.find((p: string) => p.endsWith(".claude.json"));
      expect(forbidden).toBeUndefined();
    });

    it("calls safeWriteJson for Qwen settings.json when update is needed", () => {
      (
        qwen.needsQwenSettingsUpdate as ReturnType<typeof vi.fn>
      ).mockReturnValueOnce(true);

      const projectDir = makeProject(["qwen"]);
      process.chdir(projectDir);

      link({ quiet: true });

      const calls = (
        safeWrite.safeWriteJson as ReturnType<typeof vi.fn>
      ).mock.calls.map((args: unknown[]) => args[0] as string);
      expect(
        calls.some(
          (p: string) => p.includes(".qwen") && p.endsWith("settings.json"),
        ),
      ).toBe(true);
    });

    it("never calls safeWriteJson with .claude.json for any vendor", () => {
      const projectDir = makeProject(["claude", "qwen", "codex"]);
      process.chdir(projectDir);

      link({ quiet: true });

      const calls = (
        safeWrite.safeWriteJson as ReturnType<typeof vi.fn>
      ).mock.calls.map((args: unknown[]) => args[0] as string);
      const forbidden = calls.find((p: string) => p.endsWith(".claude.json"));
      expect(forbidden).toBeUndefined();
    });
  });

  // Regression — #658: link() hardcoded process.cwd() as both source and target,
  // so `oma link --global` from any directory other than $HOME silently
  // reconciled the wrong root (or no-op'd when that root had no .agents/).
  describe("install-root resolution (#658)", () => {
    it("reconciles the global install root, not the cwd, in global mode", () => {
      const homeRoot = makeProject(["claude"]);
      const unrelatedProject = mkdtempSync(join(tmpdir(), "oma-link-cwd-"));
      tempRoots.push(unrelatedProject);
      process.chdir(unrelatedProject);
      _resetInstallContext();
      setInstallContext({ installRoot: homeRoot, mode: "global" });

      const result = link({ quiet: true });

      expect(result.vendors).toEqual(["claude"]);
      expect(skills.installVendorAdaptations).toHaveBeenCalledWith(
        homeRoot,
        homeRoot,
        ["claude"],
      );
    });

    it("does not fail when cwd has no .agents/ but the global root does", () => {
      const homeRoot = makeProject(["claude"]);
      const unrelatedProject = mkdtempSync(join(tmpdir(), "oma-link-cwd-"));
      tempRoots.push(unrelatedProject);
      process.chdir(unrelatedProject);
      _resetInstallContext();
      setInstallContext({ installRoot: homeRoot, mode: "global" });

      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      link({ quiet: true });

      expect(consoleError).not.toHaveBeenCalled();
      expect(process.exitCode).not.toBe(1);
      consoleError.mockRestore();
    });

    it("uses the project install root in project mode", () => {
      const projectRoot = makeProject(["claude"]);
      _resetInstallContext();
      setInstallContext({ installRoot: projectRoot, mode: "project" });
      // cwd deliberately left elsewhere — the resolved root must still win.
      const elsewhere = mkdtempSync(join(tmpdir(), "oma-link-elsewhere-"));
      tempRoots.push(elsewhere);
      process.chdir(elsewhere);

      link({ quiet: true });

      expect(skills.installVendorAdaptations).toHaveBeenCalledWith(
        projectRoot,
        projectRoot,
        ["claude"],
      );
    });

    it("an explicit root option overrides the install context", () => {
      const explicitRoot = makeProject(["claude"]);
      const contextRoot = mkdtempSync(join(tmpdir(), "oma-link-ctx-"));
      tempRoots.push(contextRoot);
      _resetInstallContext();
      setInstallContext({ installRoot: contextRoot, mode: "global" });

      link({ quiet: true, root: explicitRoot });

      expect(skills.installVendorAdaptations).toHaveBeenCalledWith(
        explicitRoot,
        explicitRoot,
        ["claude"],
      );
    });

    it("names the searched root when .agents/ is missing", () => {
      const empty = mkdtempSync(join(tmpdir(), "oma-link-missing-"));
      tempRoots.push(empty);
      _resetInstallContext();
      setInstallContext({ installRoot: empty, mode: "global" });

      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      link({ quiet: true });

      expect(String(consoleError.mock.calls[0]?.[0])).toContain(empty);
      consoleError.mockRestore();
      process.exitCode = 0;
    });
  });

  describe("codex hook-trust notice", () => {
    // installVendorAdaptations is mocked to write .codex/hooks.json, so the
    // link kernel can detect the create/change and emit the trust reminder.
    function writeCodexHooksOnInstall(contents: string): void {
      (
        skills.installVendorAdaptations as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        const hooksPath = join(process.cwd(), ".codex", "hooks.json");
        mkdirSync(join(process.cwd(), ".codex"), { recursive: true });
        writeFileSync(hooksPath, contents, "utf-8");
      });
    }

    it("prints the trust reminder when .codex/hooks.json is created", () => {
      const projectDir = makeProject(["codex"]);
      process.chdir(projectDir);
      writeCodexHooksOnInstall('{"hooks":{}}');
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      link({ quiet: true });

      const logged = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(logged).toContain("Codex hooks installed/updated");
      expect(logged).toContain("/hooks");
      logSpy.mockRestore();
    });

    it("does not print the notice when hooks.json is unchanged", () => {
      const projectDir = makeProject(["codex"]);
      process.chdir(projectDir);
      const stable = '{"hooks":{"Stop":[]}}';
      mkdirSync(join(projectDir, ".codex"), { recursive: true });
      writeFileSync(join(projectDir, ".codex", "hooks.json"), stable, "utf-8");
      writeCodexHooksOnInstall(stable);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      link({ quiet: true });

      const logged = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(logged).not.toContain("Codex hooks installed/updated");
      logSpy.mockRestore();
    });
  });

  describe("dry-run", () => {
    // Earlier blocks pin a global-mode context; reset so the kernel resolves
    // project mode from cwd and the .gitignore step is in scope.
    beforeEach(() => {
      _resetInstallContext();
    });

    /** Recursively list paths under `dir`, relative and sorted, for diffing. */
    function snapshot(dir: string, prefix = ""): string[] {
      const out: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        out.push(rel);
        if (entry.isDirectory()) {
          out.push(...snapshot(join(dir, entry.name), rel));
        }
      }
      return out.sort();
    }

    /**
     * Make the mocked adaptation step write a sentinel, so "nothing changed"
     * is a real signal: the temp project is not a git repo, so every unmocked
     * writer the kernel reaches would no-op anyway.
     */
    function writeSentinelOnInstall(): void {
      (
        skills.installVendorAdaptations as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        writeFileSync(join(process.cwd(), "sentinel.txt"), "written", "utf-8");
      });
    }

    it("writes nothing to disk", () => {
      const projectDir = makeProject(["claude", "codex", "cursor"]);
      process.chdir(projectDir);
      writeSentinelOnInstall();
      const before = snapshot(projectDir);

      link({ quiet: true, dryRun: true });

      expect(snapshot(projectDir)).toEqual(before);
      expect(snapshot(projectDir)).not.toContain("sentinel.txt");
    });

    it("invokes no vendor writer", () => {
      const projectDir = makeProject(["claude", "codex", "cursor", "pi"]);
      process.chdir(projectDir);

      link({ quiet: true, dryRun: true });

      expect(skills.installVendorAdaptations).not.toHaveBeenCalled();
      expect(skills.createVendorSymlinks).not.toHaveBeenCalled();
      expect(skills.createVendorWorkflowSymlinks).not.toHaveBeenCalled();
      expect(skills.applyCursorMcpConfig).not.toHaveBeenCalled();
      expect(rules.applyCursorRules).not.toHaveBeenCalled();
      expect(rules.mergeRulesIndexForVendor).not.toHaveBeenCalled();
      expect(piExtension.installPiExtension).not.toHaveBeenCalled();
      expect(piPrompts.installPiPromptTemplates).not.toHaveBeenCalled();
      expect(antigravity.installAntigravityHud).not.toHaveBeenCalled();
      expect(safeWrite.safeWriteJson).not.toHaveBeenCalled();
    });

    it("reports the targets a real pass would touch", () => {
      const projectDir = makeProject(["claude", "cursor"]);
      process.chdir(projectDir);

      const { plan } = link({ quiet: true, dryRun: true });
      const reasons = plan.map((e) => e.reason).join("\n");
      // Compare by suffix: macOS resolves the temp root through /private,
      // so plan paths and `projectDir` differ by prefix.
      const endsWith = (name: string) =>
        plan.some((e) => e.path.endsWith(name));

      expect(plan.length).toBeGreaterThan(0);
      expect(reasons).toContain("installVendorAdaptations");
      expect(reasons).toContain("applyCursorRules");
      expect(endsWith("CLAUDE.md")).toBe(true);
      expect(endsWith(".gitignore")).toBe(true);
    });

    it("records CLAUDE.md and AGENTS.md at most once each", () => {
      const projectDir = makeProject(["claude", "codex", "qwen", "pi"]);
      process.chdir(projectDir);

      const { plan } = link({ quiet: true, dryRun: true });
      const docs = plan
        .map((e) => e.path)
        .filter((p) => p.endsWith("CLAUDE.md") || p.endsWith("AGENTS.md"));

      expect(new Set(docs).size).toBe(docs.length);
    });

    it("leaves derived counters empty and defers to the plan", () => {
      const projectDir = makeProject(["claude"]);
      process.chdir(projectDir);

      const result = link({ quiet: true, dryRun: true });

      expect(result.mergedDocs).toEqual([]);
      expect(result.symlinksCreated).toEqual([]);
      expect(result.agyInstalled).toBe(false);
      expect(result.plan.length).toBeGreaterThan(0);
    });

    it("suppresses the codex hook-trust notice", () => {
      const projectDir = makeProject(["codex"]);
      process.chdir(projectDir);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      link({ quiet: true, dryRun: true });

      const logged = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(logged).not.toContain("Codex hooks installed/updated");
      logSpy.mockRestore();
    });

    it("previews extension-only projects without writing", () => {
      const projectDir = makeProject(["pi"]);
      process.chdir(projectDir);
      const before = snapshot(projectDir);

      const { plan } = link({ quiet: true, dryRun: true });

      expect(snapshot(projectDir)).toEqual(before);
      expect(plan.map((e) => e.reason).join("\n")).toContain(
        "installPiExtension",
      );
    });

    it("still writes and populates the plan on a normal pass", () => {
      const projectDir = makeProject(["claude"]);
      process.chdir(projectDir);
      writeSentinelOnInstall();

      const result = link({ quiet: true });

      expect(skills.installVendorAdaptations).toHaveBeenCalled();
      expect(result.plan.length).toBeGreaterThan(0);
      expect(snapshot(projectDir)).toContain("sentinel.txt");
    });
  });
});
