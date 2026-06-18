import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installVendorAdaptations } from "../../platform/skills-installer.js";

// Cross-platform path comparison: normalize backslashes so includes() works on Windows.
const n = (s: string) => s.replace(/\\/g, "/");

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

// Shim safe-write through the mocked fs so assertions keep observing the
// final target path + content (the atomic tmp/rename dance is covered by
// utils/safe-write.test.ts).
vi.mock("../../utils/safe-write.js", async () => {
  const mockedFs = await import("node:fs");
  return {
    safeWriteJson: vi.fn((path: string, value: unknown) => {
      mockedFs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
    }),
    safeWriteFile: vi.fn((path: string, content: string) => {
      mockedFs.writeFileSync(path, content);
    }),
  };
});

const mockSourceDir = "/tmp/source";
const mockTargetDir = "/tmp/target";

describe("installHooksFromVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        const norm = p.replace(/\\/g, "/");
        if (norm.includes("variants/") && norm.endsWith(".json")) return true;
        if (norm.includes("hooks/core")) return true;
        if (norm.includes(".agents/agents")) return true;
        if (norm.includes(".agents/workflows")) return true;
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

  it("should copy only the variant's runtime-required scripts to vendor hookDir", () => {
    // Use a minimal inline variant to avoid real file reads.
    // test-filter.ts requires filter-test-output.sh at runtime; statusLine
    // requires hud.ts. The handler .ts itself runs in-process via `oma hook`
    // and must NOT be materialized.
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
          PreToolUse: {
            hook: "test-filter.ts",
            matcher: "Bash",
            timeout: 5,
          },
        },
        statusLine: { hook: "hud.ts" },
      }),
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["claude"]);

    expect(fs.cpSync).toHaveBeenCalledWith(
      join(mockSourceDir, ".agents", "hooks", "core", "hud.ts"),
      join(mockTargetDir, ".claude", "hooks", "hud.ts"),
      { force: true, dereference: true },
    );
    expect(fs.cpSync).toHaveBeenCalledWith(
      join(mockSourceDir, ".agents", "hooks", "core", "filter-test-output.sh"),
      join(mockTargetDir, ".claude", "hooks", "filter-test-output.sh"),
      { force: true, dereference: true },
    );

    // No full-directory dump and no in-process handler copies.
    const copiedSources = (
      fs.cpSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.map((c: string[]) => n(c[0] ?? ""));
    expect(copiedSources).not.toContainEqual(
      n(join(mockSourceDir, ".agents", "hooks", "core")),
    );
    expect(copiedSources).not.toContainEqual(
      n(join(mockSourceDir, ".agents", "hooks", "core", "keyword-detector.ts")),
    );
    expect(copiedSources).not.toContainEqual(
      n(join(mockSourceDir, ".agents", "hooks", "core", "test-filter.ts")),
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

  it("nests statusLine under ui for Qwen and preserves existing ui keys", () => {
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        const norm = n(p);
        // Existing Qwen settings already carry a ui.theme entry.
        if (norm.endsWith(".qwen/settings.json")) {
          return JSON.stringify({ ui: { theme: "Dark" } });
        }
        return JSON.stringify({
          vendor: "qwen",
          hookDir: ".qwen/hooks",
          settingsFile: ".qwen/settings.json",
          projectDirEnv: "QWEN_PROJECT_DIR",
          runtime: "bun",
          events: {},
          statusLine: { hook: "hud.ts" },
          statusLineKey: "ui",
        });
      },
    );
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        const norm = n(p);
        if (norm.includes("variants/") && norm.endsWith(".json")) return true;
        if (norm.includes("hooks/core")) return true;
        if (norm.endsWith(".qwen/settings.json")) return true;
        return false;
      },
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["qwen"]);

    const writeCall = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: string[]) =>
        typeof call[0] === "string" &&
        n(call[0]).endsWith(".qwen/settings.json"),
    );
    const settings = JSON.parse(writeCall?.[1] as string);
    expect(settings.statusLine).toBeUndefined();
    expect(settings.ui.statusLine.command).toContain("hud.ts");
    expect(settings.ui.theme).toBe("Dark");
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
        typeof call[0] === "string" && n(call[0]).includes(".codex/hooks.json"),
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
          flags: { hooks: true },
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
    expect(tomlWrite?.[1]).toContain("hooks = true");
  });

  it("should create settings parent directory before writing hooks.json", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        if (n(p).includes("variants/") && n(p).endsWith(".json")) return true;
        if (n(p).includes(".agents/agents")) return true;
        if (n(p).includes(".agents/workflows")) return true;
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
        typeof call[0] === "string" && n(call[0]).includes(".codex/hooks.json"),
    );
    expect(writeCall).toBeTruthy();
  });

  it("should write oma-hook.sh command without absolute oma paths (machine-independent)", () => {
    // Design 019: event hooks now emit `<hookDir>/oma-hook.sh --vendor <v> --event <e>`.
    // The wrapper resolves oma at runtime (PATH first), so settings stay machine-independent.
    (
      childProcess.execFileSync as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue("/opt/homebrew/bin/bun\n");

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
    // Now invokes oma-hook.sh wrapper instead of bun <script>. The codex
    // variant has no projectDirEnv, so the variant-controlled relative path is
    // single-quoted (injection-safe) rather than left bare.
    expect(cmd).toBe(
      "'.codex/hooks/oma-hook.sh' --vendor 'codex' --event 'UserPromptSubmit'",
    );
    // No absolute paths from the local machine embedded in settings.
    expect(cmd).not.toMatch(/\/opt\/homebrew|\/Users\/|\.local\/share\/mise/);
  });

  it("should write oma-hook.sh with projectDirEnv expansion for Claude variant", () => {
    // Design 019: projectDirEnv expansion is preserved in the wrapper path so
    // the command remains machine-independent for vendors like Claude that use it.
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

    const writeCall = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: string[]) =>
        typeof call[0] === "string" && call[0].includes("settings.json"),
    );
    const settings = JSON.parse(writeCall?.[1] as string);
    const cmd = settings.hooks.UserPromptSubmit[0].hooks[0].command;
    // oma-hook.sh wrapper path uses $CLAUDE_PROJECT_DIR expansion.
    expect(cmd).toBe(
      "\"$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh\" --vendor 'claude' --event 'UserPromptSubmit'",
    );
    expect(cmd).not.toMatch(/\/opt\/homebrew|\/Users\/|\.local\/share\/mise/);
  });

  it("should generate the oma-hook.sh wrapper in the vendor hookDir", () => {
    // Design 019: patchVendorHookTypes is no longer called (vendor identity is
    // now the --vendor arg, not a runtime-patched switch). Instead, a single
    // oma-hook.sh wrapper is written to the hookDir and used by all event entries.
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({
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
      }),
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["codex"]);

    // The wrapper must be written to hookDir.
    const wrapperWrite = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === "string" &&
        n(call[0]).endsWith(".codex/hooks/oma-hook.sh"),
    );
    expect(wrapperWrite).toBeTruthy();

    const wrapperContent = wrapperWrite?.[1] as string;
    // Dedup preamble present.
    expect(wrapperContent).toContain("__oma_dedup_lock");
    // oma binary resolution: recorded install path first, then PATH lookup.
    expect(wrapperContent).toContain("command -v oma");
    // Always fail-open: force exit 0 even if oma errors / lacks the hook command.
    expect(wrapperContent).toContain("exit 0");
    // Delegates to oma hook with verbatim args, swallowing a non-zero exit.
    expect(wrapperContent).toContain('"$__oma_bin" hook "$@" || true');

    // hook-output.ts patching is intentionally NOT performed (vendor is --vendor arg now).
    const hookOutputWrite = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === "string" && n(call[0]).includes("hook-output.ts"),
    );
    expect(hookOutputWrite).toBeUndefined();
  });

  it("should pass vendor identity via --vendor flag rather than patching copied hook scripts", () => {
    // Design 019: patchVendorDetection is no longer called. Hook scripts are NOT
    // patched to infer vendor from script path. Instead, vendor identity is an
    // explicit --vendor argument in the oma-hook.sh command registered in settings.
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({
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
      }),
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["codex"]);

    // test-filter.ts and persistent-mode.ts must NOT be patched.
    const patchedTestFilter = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === "string" &&
        n(call[0]).endsWith(".codex/hooks/test-filter.ts"),
    );
    expect(patchedTestFilter).toBeUndefined();

    const patchedPersistentMode = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === "string" &&
        n(call[0]).endsWith(".codex/hooks/persistent-mode.ts"),
    );
    expect(patchedPersistentMode).toBeUndefined();

    // The settings commands include --vendor codex explicitly.
    const hooksWrite = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === "string" && n(call[0]).endsWith(".codex/hooks.json"),
    );
    const settings = JSON.parse(hooksWrite?.[1] as string);
    const preToolCmd = settings.hooks.PreToolUse[0].hooks[0].command;
    const stopCmd = settings.hooks.Stop[0].hooks[0].command;
    expect(preToolCmd).toContain("--vendor 'codex'");
    expect(preToolCmd).toContain("--event 'PreToolUse'");
    expect(stopCmd).toContain("--vendor 'codex'");
    expect(stopCmd).toContain("--event 'Stop'");
  });

  it("should generate Cursor hooks.json with version 1 and prompt hooks via oma-hook.sh", () => {
    // Design 019: cursor event hooks now call oma-hook.sh instead of bun <script>.
    // extra.version is still written to the settings file unchanged.
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
        typeof call[0] === "string" &&
        n(call[0]).includes(".cursor/hooks.json"),
    );
    expect(writeCall).toBeTruthy();

    const settings = JSON.parse(writeCall?.[1] as string);
    // extra fields still written.
    expect(settings.version).toBe(1);
    // Event hooks now use oma-hook.sh with --vendor cursor.
    const userPromptCmd = settings.hooks.UserPromptSubmit[0].hooks[0].command;
    expect(userPromptCmd).toContain(".cursor/hooks/oma-hook.sh");
    expect(userPromptCmd).toContain("--vendor 'cursor'");
    expect(userPromptCmd).toContain("--event 'UserPromptSubmit'");
    const beforeSubmitCmd =
      settings.hooks.beforeSubmitPrompt[0].hooks[0].command;
    expect(beforeSubmitCmd).toContain(".cursor/hooks/oma-hook.sh");
    expect(beforeSubmitCmd).toContain("--vendor 'cursor'");
    expect(beforeSubmitCmd).toContain("--event 'beforeSubmitPrompt'");
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
        statusLine: { hook: "hud.ts" },
      }),
    );

    // Simulate existing files/symlinks in destination hooks directory
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string, opts?: { withFileTypes?: boolean }) => {
        if (
          typeof p === "string" &&
          n(p).includes(".claude/hooks") &&
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
          (n(p).endsWith("keyword-detector.ts") || n(p).endsWith("hud.ts")) &&
          n(p).includes(".claude/hooks")
        ) {
          return { isDirectory: () => false };
        }
        throw new Error("ENOENT");
      },
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["claude"]);

    // Should have called unlinkSync on existing files before cpSync — this
    // also sweeps stale handler copies left by older full-copy installs.
    const unlinkCalls = (
      fs.unlinkSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.map((c: string[]) => c[0]);

    expect(unlinkCalls).toContainEqual(
      join(mockTargetDir, ".claude", "hooks", "keyword-detector.ts"),
    );
    expect(unlinkCalls).toContainEqual(
      join(mockTargetDir, ".claude", "hooks", "hud.ts"),
    );

    // The required script (statusLine hud.ts) is recopied after cleanup.
    expect(fs.cpSync).toHaveBeenCalledWith(
      join(mockSourceDir, ".agents", "hooks", "core", "hud.ts"),
      join(mockTargetDir, ".claude", "hooks", "hud.ts"),
      { force: true, dereference: true },
    );
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
        statusLine: { hook: "hud.ts" },
      }),
    );

    // Simulate broken symlinks in destination (from deleted temp dir)
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string, opts?: { withFileTypes?: boolean }) => {
        if (
          typeof p === "string" &&
          n(p).includes(".claude/hooks") &&
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
          n(p).endsWith("persistent-mode.ts") &&
          n(p).includes(".claude/hooks")
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

    // cpSync should use dereference: true to always copy real files —
    // per-file for the variant's required scripts (statusLine hud.ts here).
    expect(fs.cpSync).toHaveBeenCalledWith(
      join(mockSourceDir, ".agents", "hooks", "core", "hud.ts"),
      join(mockTargetDir, ".claude", "hooks", "hud.ts"),
      { force: true, dereference: true },
    );
  });
});

// ---------------------------------------------------------------------------
// Migration tests (Task 7 — backward-compat replace semantics)
// ---------------------------------------------------------------------------

describe("migration: legacy bun-script entries replaced, user hooks preserved", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        const norm = p.replace(/\\/g, "/");
        if (norm.includes("variants/") && norm.endsWith(".json")) return true;
        if (norm.includes("hooks/core")) return true;
        if (norm.includes(".agents/agents")) return true;
        if (norm.includes(".agents/workflows")) return true;
        if (norm.includes("settings.json")) return true;
        return false;
      },
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

  it("replaces legacy bun keyword-detector entries with new oma-hook.sh entry, preserves user hook", () => {
    // Seed a settings.json that represents an OLD install:
    //   - OMA legacy entry: bun ".../.claude/hooks/keyword-detector.ts"
    //   - User-added entry: my-custom-prompt-hook (NOT an OMA script)
    const legacySettings = {
      hooks: {
        UserPromptSubmit: [
          {
            // Legacy OMA entry (pre-019 style)
            hooks: [
              {
                name: "keyword-detector",
                type: "command",
                command:
                  'bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"',
                timeout: 5,
              },
              {
                name: "state-boundary",
                type: "command",
                command:
                  'bun "$CLAUDE_PROJECT_DIR/.claude/hooks/state-boundary.ts"',
                timeout: 5,
              },
              {
                name: "skill-injector",
                type: "command",
                command:
                  'bun "$CLAUDE_PROJECT_DIR/.claude/hooks/skill-injector.ts"',
                timeout: 3,
              },
            ],
          },
          {
            // User-added hook — must be preserved
            hooks: [
              {
                name: "my-custom-prompt-hook",
                type: "command",
                command: "my-custom-tool --on-prompt",
                timeout: 10,
              },
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: "Bash",
            // Legacy OMA entry
            hooks: [
              {
                name: "test-filter",
                type: "command",
                command:
                  'bun "$CLAUDE_PROJECT_DIR/.claude/hooks/test-filter.ts"',
                timeout: 5,
              },
            ],
          },
        ],
      },
      statusLine: {
        type: "command",
        command: 'bun "$CLAUDE_PROJECT_DIR/.claude/hooks/hud.ts"',
      },
    };

    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        const norm = p.replace(/\\/g, "/");
        if (norm.includes("settings.json")) {
          return JSON.stringify(legacySettings);
        }
        // variant JSON for claude
        return JSON.stringify({
          vendor: "claude",
          hookDir: ".claude/hooks",
          settingsFile: ".claude/settings.json",
          projectDirEnv: "CLAUDE_PROJECT_DIR",
          runtime: "bun",
          events: {
            UserPromptSubmit: [
              { hook: "keyword-detector.ts", timeout: 5 },
              { hook: "state-boundary.ts", timeout: 5 },
              { hook: "skill-injector.ts", timeout: 3 },
            ],
            PreToolUse: {
              hook: "test-filter.ts",
              matcher: "Bash",
              timeout: 5,
            },
            Stop: { hook: "persistent-mode.ts", timeout: 5 },
          },
          statusLine: { hook: "hud.ts" },
          extra: {
            permissions: {
              allow: ["Bash(bun run:*)"],
            },
          },
        });
      },
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["claude"]);

    const writeCall = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: string[]) =>
        typeof call[0] === "string" &&
        call[0].replace(/\\/g, "/").includes("settings.json"),
    );
    expect(writeCall).toBeTruthy();

    const settings = JSON.parse(writeCall?.[1] as string);
    const userPromptEntries = settings.hooks.UserPromptSubmit;

    // Legacy OMA entry is gone.
    const hasLegacyBunEntry = userPromptEntries.some(
      (g: { hooks?: Array<{ command?: string }> }) =>
        g.hooks?.some(
          (h: { command?: string }) =>
            h.command?.includes("keyword-detector.ts") &&
            h.command?.includes("bun"),
        ),
    );
    expect(hasLegacyBunEntry).toBe(false);

    // New oma-hook.sh entry is present.
    const omaEntry = userPromptEntries.find(
      (g: { hooks?: Array<{ command?: string }> }) =>
        g.hooks?.some((h: { command?: string }) =>
          h.command?.includes("oma-hook.sh"),
        ),
    );
    expect(omaEntry).toBeTruthy();
    expect(omaEntry.hooks[0].command).toContain("--vendor 'claude'");
    expect(omaEntry.hooks[0].command).toContain("--event 'UserPromptSubmit'");

    // User hook is still present.
    const userEntry = userPromptEntries.find(
      (g: { hooks?: Array<{ name?: string }> }) =>
        g.hooks?.some(
          (h: { name?: string }) => h.name === "my-custom-prompt-hook",
        ),
    );
    expect(userEntry).toBeTruthy();
    expect(userEntry.hooks[0].command).toBe("my-custom-tool --on-prompt");

    // PreToolUse: legacy test-filter replaced by new oma-hook.sh entry.
    const preToolEntries = settings.hooks.PreToolUse;
    const hasLegacyTestFilter = preToolEntries.some(
      (g: { hooks?: Array<{ command?: string }> }) =>
        g.hooks?.some(
          (h: { command?: string }) =>
            h.command?.includes("test-filter.ts") && h.command?.includes("bun"),
        ),
    );
    expect(hasLegacyTestFilter).toBe(false);
    const omaPreTool = preToolEntries.find(
      (g: { hooks?: Array<{ command?: string }> }) =>
        g.hooks?.some((h: { command?: string }) =>
          h.command?.includes("oma-hook.sh"),
        ),
    );
    expect(omaPreTool).toBeTruthy();
    expect(omaPreTool.hooks[0].command).toContain(
      "--vendor 'claude' --event 'PreToolUse'",
    );

    // Stop event should be present with oma-hook.sh.
    const stopCmd = settings.hooks.Stop[0].hooks[0].command;
    expect(stopCmd).toContain("oma-hook.sh");
    expect(stopCmd).toContain("--vendor 'claude' --event 'Stop'");
  });

  it("is idempotent: running install twice yields identical settings", () => {
    // First install from clean state.
    const claudeVariant = JSON.stringify({
      vendor: "claude",
      hookDir: ".claude/hooks",
      settingsFile: ".claude/settings.json",
      projectDirEnv: "CLAUDE_PROJECT_DIR",
      runtime: "bun",
      events: {
        UserPromptSubmit: [
          { hook: "keyword-detector.ts", timeout: 5 },
          { hook: "state-boundary.ts", timeout: 5 },
          { hook: "skill-injector.ts", timeout: 3 },
        ],
        PreToolUse: {
          hook: "test-filter.ts",
          matcher: "Bash",
          timeout: 5,
        },
        Stop: { hook: "persistent-mode.ts", timeout: 5 },
      },
      statusLine: { hook: "hud.ts" },
    });

    // For the first call: settings.json does not exist yet.
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        const norm = p.replace(/\\/g, "/");
        if (norm.includes("variants/") && norm.endsWith(".json")) return true;
        if (norm.includes("hooks/core")) return true;
        if (norm.includes(".agents/agents")) return true;
        if (norm.includes(".agents/workflows")) return true;
        return false; // settings.json does not exist on first run
      },
    );
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      claudeVariant,
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["claude"]);

    // Capture first write result.
    const firstWrite = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: string[]) =>
        typeof call[0] === "string" &&
        call[0].replace(/\\/g, "/").includes("settings.json"),
    );
    expect(firstWrite).toBeTruthy();
    const firstResult = firstWrite?.[1] as string;

    // For the second call: settings.json NOW exists with the first write result.
    vi.clearAllMocks();
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (fs.lstatSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        throw new Error("ENOENT");
      },
    );
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        const norm = p.replace(/\\/g, "/");
        if (norm.includes("variants/") && norm.endsWith(".json")) return true;
        if (norm.includes("hooks/core")) return true;
        if (norm.includes(".agents/agents")) return true;
        if (norm.includes(".agents/workflows")) return true;
        if (norm.includes("settings.json")) return true; // now exists
        return false;
      },
    );
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        const norm = p.replace(/\\/g, "/");
        if (norm.includes("settings.json")) return firstResult;
        return claudeVariant;
      },
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["claude"]);

    const secondWrite = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: string[]) =>
        typeof call[0] === "string" &&
        call[0].replace(/\\/g, "/").includes("settings.json"),
    );
    expect(secondWrite).toBeTruthy();
    const secondResult = secondWrite?.[1] as string;

    // Both runs must produce the same settings.
    expect(JSON.parse(secondResult)).toEqual(JSON.parse(firstResult));
  });

  it("mixed event: user hook on same event as OMA hook is preserved alongside new OMA entry", () => {
    // Scenario: user has added their own PreToolUse hook (different matcher: "Write").
    // OMA also manages PreToolUse (legacy test-filter entry → replaced by oma-hook.sh).
    // After re-install, the user "Write" guard must still be in the PreToolUse list.
    // Uses claude vendor so the settingsFile path (.claude/settings.json) matches
    // the beforeEach existsSync mock that returns true for "settings.json" paths.
    const existingSettings = {
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            // Legacy OMA entry — bun command for test-filter (pre-019 style)
            hooks: [
              {
                name: "test-filter",
                type: "command",
                command:
                  'bun "$CLAUDE_PROJECT_DIR/.claude/hooks/test-filter.ts"',
                timeout: 5,
              },
            ],
          },
          {
            matcher: "Write",
            // User-added hook on the same event with a different matcher
            hooks: [
              {
                name: "user-write-guard",
                type: "command",
                command: "/usr/local/bin/write-guard",
                timeout: 3,
              },
            ],
          },
        ],
      },
    };

    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        const norm = p.replace(/\\/g, "/");
        if (norm.includes("settings.json")) {
          return JSON.stringify(existingSettings);
        }
        return JSON.stringify({
          vendor: "claude",
          hookDir: ".claude/hooks",
          settingsFile: ".claude/settings.json",
          projectDirEnv: "CLAUDE_PROJECT_DIR",
          runtime: "bun",
          events: {
            PreToolUse: {
              hook: "test-filter.ts",
              matcher: "Bash",
              timeout: 5,
            },
          },
          statusLine: { hook: "hud.ts" },
        });
      },
    );

    installVendorAdaptations(mockSourceDir, mockTargetDir, ["claude"]);

    const writeCall = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: string[]) =>
        typeof call[0] === "string" &&
        call[0].replace(/\\/g, "/").includes("settings.json"),
    );
    expect(writeCall).toBeTruthy();
    const settings = JSON.parse(writeCall?.[1] as string);

    const preToolEntries = settings.hooks.PreToolUse;

    // Legacy OMA test-filter entry is gone.
    const hasLegacy = preToolEntries.some(
      (g: { hooks?: Array<{ command?: string }> }) =>
        g.hooks?.some(
          (h: { command?: string }) =>
            h.command?.includes("test-filter.ts") && h.command?.includes("bun"),
        ),
    );
    expect(hasLegacy).toBe(false);

    // New oma-hook.sh entry is present.
    const omaEntry = preToolEntries.find(
      (g: { hooks?: Array<{ command?: string }> }) =>
        g.hooks?.some((h: { command?: string }) =>
          h.command?.includes("oma-hook.sh"),
        ),
    );
    expect(omaEntry).toBeTruthy();
    expect(omaEntry.hooks[0].command).toContain(
      "--vendor 'claude' --event 'PreToolUse'",
    );

    // User hook (write-guard on "Write" matcher) is preserved.
    const userEntry = preToolEntries.find(
      (g: { hooks?: Array<{ name?: string }> }) =>
        g.hooks?.some((h: { name?: string }) => h.name === "user-write-guard"),
    );
    expect(userEntry).toBeTruthy();
    expect(userEntry.hooks[0].command).toBe("/usr/local/bin/write-guard");
    expect(userEntry.matcher).toBe("Write");
  });
});
