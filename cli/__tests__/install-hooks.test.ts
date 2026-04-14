import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installVendorAdaptations } from "../lib/skills.js";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

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
    (
      childProcess.execFileSync as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue("/opt/homebrew/bin/bun\n");
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
      { recursive: true, force: true, dereference: true },
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

    const settings = JSON.parse(writeCall?.[1] as string);
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
    const settings = JSON.parse(writeCall?.[1] as string);
    expect(settings.statusLine.command).toContain("hud.ts");
  });

  it("should not include statusLine for Gemini variant", () => {
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
        typeof call[0] === "string" &&
        call[0].includes(".gemini/settings.json"),
    );
    const settings = JSON.parse(writeCall?.[1] as string);
    expect(settings.statusLine).toBeUndefined();
  });

  it("should not include statusLine for Codex variant", () => {
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
        typeof call[0] === "string" && call[0].includes(".codex/hooks.json"),
    );
    const settings = JSON.parse(writeCall?.[1] as string);
    expect(settings.statusLine).toBeUndefined();
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
    expect(tomlWrite?.[1]).toContain("codex_hooks = true");
  });

  it("should create settings parent directory before writing hooks.json", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        if (p.includes("variants/") && p.endsWith(".json")) return true;
        if (p.includes(".agents/agents")) return true;
        if (p.includes(".agents/workflows")) return true;
        return false;
      },
    );

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

    expect(fs.mkdirSync).toHaveBeenCalledWith(join(mockTargetDir, ".codex"), {
      recursive: true,
    });

    const writeCall = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: string[]) =>
        typeof call[0] === "string" && call[0].includes(".codex/hooks.json"),
    );
    expect(writeCall).toBeTruthy();
  });

  it("should pin bun to an absolute path when it is resolvable", () => {
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
    const settings = JSON.parse(writeCall?.[1] as string);
    const cmd = settings.hooks.UserPromptSubmit[0].hooks[0].command;
    expect(cmd).toBe(
      '"/opt/homebrew/bin/bun" .codex/hooks/keyword-detector.ts',
    );
    expect(cmd).not.toContain("$");
  });

  it("should fall back to bare bun when runtime lookup fails", () => {
    (
      childProcess.execFileSync as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      throw new Error("bun not found");
    });

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
    const settings = JSON.parse(writeCall?.[1] as string);
    const cmd = settings.hooks.UserPromptSubmit[0].hooks[0].command;
    expect(cmd).toBe("bun .codex/hooks/keyword-detector.ts");
  });

  it("should patch copied Codex hook types to use updated_input", () => {
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (pathArg: string) => {
        if (pathArg.includes("variants/") && pathArg.endsWith(".json")) {
          return JSON.stringify({
            vendor: "codex",
            hookDir: ".codex/hooks",
            settingsFile: ".codex/hooks.json",
            projectDirEnv: null,
            runtime: "bun",
            events: {
              PreToolUse: {
                hook: "test-filter.ts",
                matcher: "Bash",
                timeout: 5,
              },
            },
          });
        }

        if (pathArg.endsWith(".codex/hooks/types.ts")) {
          return `    case "claude":
    case "codex":
    case "qwen":
      return JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          updatedInput,
        },
      });`;
        }

        return "{}";
      },
    );
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (pathArg: string) =>
        pathArg.includes("variants/") ||
        pathArg.includes("hooks/core") ||
        pathArg.includes(".codex/hooks/types.ts") ||
        pathArg.includes(".agents/agents") ||
        pathArg.includes(".agents/workflows"),
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["codex"]);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      join(mockTargetDir, ".codex", "hooks", "types.ts"),
      expect.stringContaining("updated_input: updatedInput"),
      "utf-8",
    );
  });

  it("should patch copied hook scripts to infer vendor from script path", () => {
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (pathArg: string) => {
        if (pathArg.includes("variants/") && pathArg.endsWith(".json")) {
          return JSON.stringify({
            vendor: "codex",
            hookDir: ".codex/hooks",
            settingsFile: ".codex/hooks.json",
            projectDirEnv: null,
            runtime: "bun",
            events: {
              PreToolUse: {
                hook: "test-filter.ts",
                matcher: "Bash",
                timeout: 5,
              },
              Stop: {
                hook: "persistent-mode.ts",
                timeout: 5,
              },
            },
          });
        }

        if (pathArg.endsWith(".codex/hooks/test-filter.ts")) {
          return `function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  if (event === "BeforeTool") return "gemini";
  if (event === "PreToolUse") {
    if ("session_id" in input && !("sessionId" in input)) return "codex";
  }
  if (process.env.QWEN_PROJECT_DIR) return "qwen";
  return "claude";
}`;
        }

        if (pathArg.endsWith(".codex/hooks/persistent-mode.ts")) {
          return `function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  if (event === "AfterAgent") return "gemini";
  if (event === "Stop") {
    if ("session_id" in input && !("sessionId" in input)) return "codex";
  }
  if (process.env.QWEN_PROJECT_DIR) return "qwen";
  return "claude";
}`;
        }

        return "{}";
      },
    );
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (pathArg: string) =>
        pathArg.includes("variants/") ||
        pathArg.includes("hooks/core") ||
        pathArg.includes(".codex/hooks/test-filter.ts") ||
        pathArg.includes(".codex/hooks/persistent-mode.ts") ||
        pathArg.includes(".agents/agents") ||
        pathArg.includes(".agents/workflows"),
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["codex"]);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      join(mockTargetDir, ".codex", "hooks", "test-filter.ts"),
      expect.stringContaining(
        "const byScriptPath = inferVendorFromScriptPath();",
      ),
      "utf-8",
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      join(mockTargetDir, ".codex", "hooks", "persistent-mode.ts"),
      expect.stringContaining(
        'if (event === "Stop" && "session_id" in input) return "codex";',
      ),
      "utf-8",
    );
  });

  it("should generate Cursor hooks.json with version 1 and prompt hooks", () => {
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({
        vendor: "cursor",
        hookDir: ".cursor/hooks",
        settingsFile: ".cursor/hooks.json",
        projectDirEnv: null,
        runtime: "bun",
        events: {
          UserPromptSubmit: {
            hook: "keyword-detector.ts",
            timeout: 5,
          },
          beforeSubmitPrompt: {
            hook: "keyword-detector.ts",
            timeout: 5,
          },
        },
        extra: {
          version: 1,
        },
      }),
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["cursor"]);

    const writeCall = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: string[]) =>
        typeof call[0] === "string" && call[0].includes(".cursor/hooks.json"),
    );
    expect(writeCall).toBeTruthy();

    const settings = JSON.parse(writeCall?.[1] as string);
    expect(settings.version).toBe(1);
    expect(settings.hooks.UserPromptSubmit[0].hooks[0].command).toContain(
      ".cursor/hooks/keyword-detector.ts",
    );
    expect(settings.hooks.beforeSubmitPrompt[0].hooks[0].command).toContain(
      ".cursor/hooks/keyword-detector.ts",
    );
  });

  it("should clear existing files before copying hooks to prevent EEXIST", () => {
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

    // Simulate existing files/symlinks in destination hooks directory
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string, opts?: { withFileTypes?: boolean }) => {
        if (
          typeof p === "string" &&
          p.includes(".claude/hooks") &&
          opts?.withFileTypes
        ) {
          return [
            {
              name: "keyword-detector.ts",
              isFile: () => true,
              isDirectory: () => false,
            },
            { name: "hud.ts", isFile: () => true, isDirectory: () => false },
          ];
        }
        return [];
      },
    );

    // Simulate existing file/symlink at destination (triggers ENOENT without fix)
    (fs.lstatSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        if (
          typeof p === "string" &&
          (p.endsWith("keyword-detector.ts") || p.endsWith("hud.ts")) &&
          p.includes(".claude/hooks")
        ) {
          return { isDirectory: () => false };
        }
        throw new Error("ENOENT");
      },
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["claude"]);

    // Should have called unlinkSync on existing files before cpSync
    const unlinkCalls = (
      fs.unlinkSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.map((c: string[]) => c[0]);

    expect(unlinkCalls).toContainEqual(
      join(mockTargetDir, ".claude", "hooks", "keyword-detector.ts"),
    );
    expect(unlinkCalls).toContainEqual(
      join(mockTargetDir, ".claude", "hooks", "hud.ts"),
    );

    // cpSync should still be called after cleanup
    expect(fs.cpSync).toHaveBeenCalled();
  });

  it("should skip vendor when variant file does not exist", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["claude"]);

    expect(fs.cpSync).not.toHaveBeenCalled();
  });

  it("should clear broken symlinks in destination before cpSync", () => {
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({
        vendor: "claude",
        hookDir: ".claude/hooks",
        settingsFile: ".claude/settings.json",
        projectDirEnv: "CLAUDE_PROJECT_DIR",
        runtime: "bun",
        events: {
          Stop: { hook: "persistent-mode.ts", timeout: 5 },
        },
      }),
    );

    // Simulate broken symlinks in destination (from deleted temp dir)
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string, opts?: { withFileTypes?: boolean }) => {
        if (
          typeof p === "string" &&
          p.includes(".claude/hooks") &&
          opts?.withFileTypes
        ) {
          return [
            {
              name: "persistent-mode.ts",
              isFile: () => false,
              isDirectory: () => false,
              isSymbolicLink: () => true,
            },
          ];
        }
        return [];
      },
    );

    // lstatSync sees broken symlink as non-directory
    (fs.lstatSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        if (
          typeof p === "string" &&
          p.endsWith("persistent-mode.ts") &&
          p.includes(".claude/hooks")
        ) {
          return { isDirectory: () => false, isSymbolicLink: () => true };
        }
        throw new Error("ENOENT");
      },
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["claude"]);

    // Broken symlink should be unlinked before cpSync
    const unlinkCalls = (
      fs.unlinkSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.map((c: string[]) => c[0]);
    expect(unlinkCalls).toContainEqual(
      join(mockTargetDir, ".claude", "hooks", "persistent-mode.ts"),
    );

    // cpSync should use dereference: true to always copy real files
    expect(fs.cpSync).toHaveBeenCalledWith(
      join(mockSourceDir, ".agents", "hooks", "core"),
      join(mockTargetDir, ".claude", "hooks"),
      { recursive: true, force: true, dereference: true },
    );
  });
});
