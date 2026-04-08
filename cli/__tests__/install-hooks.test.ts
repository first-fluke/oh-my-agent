import * as fs from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installVendorAdaptations } from "../lib/skills.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  cpSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  readlinkSync: vi.fn(),
  rmSync: vi.fn(),
  writeFileSync: vi.fn(),
  lstatSync: vi.fn(),
  unlinkSync: vi.fn(),
  symlinkSync: vi.fn(),
}));

const mockSourceDir = "/tmp/source";
const mockTargetDir = "/tmp/target";

describe("installHooksFromVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        if (p.includes("variants/") && p.endsWith(".json")) return true;
        if (p.includes("hooks/core")) return true;
        if (p.includes(".agents/agents")) return true;
        if (p.includes(".agents/workflows")) return true;
        return false;
      },
    );

    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "{}",
    );
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (fs.lstatSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        throw new Error("ENOENT");
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should copy core hooks to vendor hookDir", () => {
    // Use a minimal inline variant to avoid real file reads
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({
        vendor: "claude",
        hookDir: ".claude/hooks",
        settingsFile: ".claude/settings.json",
        projectDirEnv: "CLAUDE_PROJECT_DIR",
        runtime: "bun",
        events: {
          UserPromptSubmit: {
            hook: "keyword-detector.ts",
            timeout: 5,
          },
        },
      }),
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["claude"]);

    expect(fs.cpSync).toHaveBeenCalledWith(
      join(mockSourceDir, ".agents", "hooks", "core"),
      join(mockTargetDir, ".claude", "hooks"),
      { recursive: true, force: true },
    );
  });

  it("should generate settings with hook entries", () => {
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({
        vendor: "gemini",
        hookDir: ".gemini/hooks",
        settingsFile: ".gemini/settings.json",
        projectDirEnv: "GEMINI_PROJECT_DIR",
        runtime: "bun",
        events: {
          BeforeAgent: {
            hook: "keyword-detector.ts",
            matcher: "*",
            timeout: 5,
          },
        },
      }),
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["gemini"]);

    const writeCall = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: string[]) =>
        typeof call[0] === "string" && call[0].includes("settings.json"),
    );
    expect(writeCall).toBeTruthy();

    const settings = JSON.parse(writeCall![1] as string);
    expect(settings.hooks.BeforeAgent).toBeDefined();
    expect(settings.hooks.BeforeAgent[0].matcher).toBe("*");
    expect(settings.hooks.BeforeAgent[0].hooks[0].command).toContain(
      "keyword-detector.ts",
    );
  });

  it("should include statusLine for Claude variant", () => {
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({
        vendor: "claude",
        hookDir: ".claude/hooks",
        settingsFile: ".claude/settings.json",
        projectDirEnv: "CLAUDE_PROJECT_DIR",
        runtime: "bun",
        events: {},
        statusLine: { hook: "hud.ts" },
      }),
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["claude"]);

    const writeCall = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: string[]) =>
        typeof call[0] === "string" && call[0].includes("settings.json"),
    );
    const settings = JSON.parse(writeCall![1] as string);
    expect(settings.statusLine.command).toContain("hud.ts");
  });

  it("should handle featureFlags for Codex variant", () => {
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({
        vendor: "codex",
        hookDir: ".codex/hooks",
        settingsFile: ".codex/hooks.json",
        projectDirEnv: null,
        runtime: "bun",
        events: {},
        featureFlags: {
          file: ".codex/config.toml",
          section: "features",
          flags: { codex_hooks: true },
        },
      }),
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["codex"]);

    // Should attempt to write config.toml
    const tomlWrite = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: string[]) =>
        typeof call[0] === "string" && call[0].includes("config.toml"),
    );
    expect(tomlWrite).toBeTruthy();
    expect(tomlWrite![1]).toContain("codex_hooks = true");
  });

  it("should use relative paths when projectDirEnv is null", () => {
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({
        vendor: "codex",
        hookDir: ".codex/hooks",
        settingsFile: ".codex/hooks.json",
        projectDirEnv: null,
        runtime: "bun",
        events: {
          UserPromptSubmit: {
            hook: "keyword-detector.ts",
            timeout: 5,
          },
        },
      }),
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["codex"]);

    const writeCall = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: string[]) =>
        typeof call[0] === "string" && call[0].includes("hooks.json"),
    );
    const settings = JSON.parse(writeCall![1] as string);
    const cmd = settings.hooks.UserPromptSubmit[0].hooks[0].command;
    expect(cmd).toBe("bun .codex/hooks/keyword-detector.ts");
    expect(cmd).not.toContain("$");
  });

  it("should skip vendor when variant file does not exist", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["claude"]);

    expect(fs.cpSync).not.toHaveBeenCalled();
  });
});
