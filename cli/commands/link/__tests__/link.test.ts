import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
});
