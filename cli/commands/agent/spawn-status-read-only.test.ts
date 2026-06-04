/**
 * Regression tests for --read-only flag in spawnAgent / planDispatch.
 *
 * Coverage:
 * (a) --read-only for codex: appends `--sandbox` + `read-only`, omits auto-approve flag
 * (b) --read-only for claude: appends `--permission-mode` + `plan`, omits auto-approve flag
 * (c) absent --read-only: args byte-for-byte unchanged (back-compat)
 * (d) unsupported vendor (gemini, no read_only_flag in config): warns, no auto-approve
 */
import * as child_process from "node:child_process";
import type * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spawnAgent } from "./spawn-status.js";

// Normalize Windows backslashes for cross-platform path string checks.
const n = (s: string) => s.replace(/\\/g, "/");

const mockFsFunctions = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  openSync: vi.fn(),
  closeSync: vi.fn(),
  statSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
}));

vi.mock("node:fs", async () => ({
  default: mockFsFunctions,
  ...mockFsFunctions,
}));

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

describe("agent/spawn-status.ts — read-only flag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OMA_RUNTIME_VENDOR", "");
    vi.stubEnv("CODEX_CI", "");
    vi.stubEnv("CODEX_THREAD_ID", "");
    vi.stubEnv("CLAUDECODE", "");
    vi.spyOn(process, "kill").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // (a) codex + read-only: appends --sandbox read-only, suppresses auto-approve
  // ---------------------------------------------------------------------------
  it("read-only for codex native: appends --sandbox read-only and omits auto-approve", async () => {
    vi.stubEnv("OMA_RUNTIME_VENDOR", "codex");

    const OMA_CONFIG_YAML = ["language: en", "model_preset: codex"].join("\n");
    const CLI_CONFIG_YAML = [
      "active_vendor: codex",
      "vendors:",
      "  codex:",
      "    command: codex",
      "    subcommand: exec",
      "    prompt_flag: none",
      "    auto_approve_flag: --full-auto",
      "    read_only_flag: '--sandbox read-only'",
      "    model_flag: -m",
      "    default_model: gpt-5.5",
    ].join("\n");

    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return true;
      if (n(target).includes("cli-config.yaml")) return true;
      if (n(target).endsWith("/workspace")) return true;
      return false;
    });
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return OMA_CONFIG_YAML;
      if (n(target).includes("cli-config.yaml")) return CLI_CONFIG_YAML;
      return "";
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 10001, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    await spawnAgent(
      "backend-engineer",
      "read the codebase",
      "session-ro-1",
      "/workspace",
      undefined,
      undefined,
      undefined,
      true, // readOnly
    );

    const spawnArgs = vi.mocked(child_process.spawn).mock.calls.at(-1)?.[1];
    expect(spawnArgs).toBeDefined();

    // read-only flags present
    expect(spawnArgs).toContain("--sandbox");
    expect(spawnArgs).toContain("read-only");

    // auto-approve flag suppressed
    expect(spawnArgs).not.toContain("--full-auto");
  });

  // ---------------------------------------------------------------------------
  // (b) claude + read-only: appends --permission-mode plan, suppresses auto-approve
  // ---------------------------------------------------------------------------
  it("read-only for claude native: appends --permission-mode plan and omits auto-approve", async () => {
    vi.stubEnv("OMA_RUNTIME_VENDOR", "claude");

    const OMA_CONFIG_YAML = ["language: en", "model_preset: claude"].join("\n");
    const CLI_CONFIG_YAML = [
      "active_vendor: claude",
      "vendors:",
      "  claude:",
      "    command: claude",
      "    output_format_flag: --output-format",
      "    output_format: json",
      "    auto_approve_flag: --dangerously-skip-permissions",
      "    read_only_flag: '--permission-mode plan'",
      "    model_flag: --model",
      "    default_model: sonnet",
    ].join("\n");

    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return true;
      if (n(target).includes("cli-config.yaml")) return true;
      if (n(target).endsWith("/workspace")) return true;
      return false;
    });
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return OMA_CONFIG_YAML;
      if (n(target).includes("cli-config.yaml")) return CLI_CONFIG_YAML;
      return "";
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 10002, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    await spawnAgent(
      "pm-planner",
      "plan the work",
      "session-ro-2",
      "/workspace",
      undefined,
      undefined,
      undefined,
      true, // readOnly
    );

    const spawnArgs = vi.mocked(child_process.spawn).mock.calls.at(-1)?.[1];
    expect(spawnArgs).toBeDefined();

    // read-only flags present
    expect(spawnArgs).toContain("--permission-mode");
    expect(spawnArgs).toContain("plan");

    // auto-approve flag suppressed
    expect(spawnArgs).not.toContain("--dangerously-skip-permissions");
  });

  // ---------------------------------------------------------------------------
  // (c) absent --read-only: args byte-for-byte unchanged (back-compat)
  // ---------------------------------------------------------------------------
  it("absent read-only: args unchanged vs baseline — auto-approve present, no restriction flags", async () => {
    vi.stubEnv("OMA_RUNTIME_VENDOR", "codex");

    const OMA_CONFIG_YAML = ["language: en", "model_preset: codex"].join("\n");
    const CLI_CONFIG_YAML = [
      "active_vendor: codex",
      "vendors:",
      "  codex:",
      "    command: codex",
      "    subcommand: exec",
      "    prompt_flag: none",
      "    auto_approve_flag: --full-auto",
      "    read_only_flag: '--sandbox read-only'",
      "    model_flag: -m",
      "    default_model: gpt-5.5",
    ].join("\n");

    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return true;
      if (n(target).includes("cli-config.yaml")) return true;
      if (n(target).endsWith("/workspace")) return true;
      return false;
    });
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return OMA_CONFIG_YAML;
      if (n(target).includes("cli-config.yaml")) return CLI_CONFIG_YAML;
      return "";
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 10003, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    // Call WITHOUT readOnly (default behavior)
    await spawnAgent(
      "backend-engineer",
      "implement feature",
      "session-ro-3",
      "/workspace",
    );

    const spawnArgs = vi.mocked(child_process.spawn).mock.calls.at(-1)?.[1];
    expect(spawnArgs).toBeDefined();

    // auto-approve flag present as before
    expect(spawnArgs).toContain("--full-auto");

    // read-only restriction flags absent
    expect(spawnArgs).not.toContain("--sandbox");
    expect(spawnArgs).not.toContain("read-only");
    expect(spawnArgs).not.toContain("--permission-mode");
  });

  // ---------------------------------------------------------------------------
  // (d) unsupported vendor (gemini, no read_only_flag in vendorConfig): warns
  // ---------------------------------------------------------------------------
  it("read-only for gemini (no read_only_flag): emits warning and omits auto-approve", async () => {
    vi.stubEnv("OMA_RUNTIME_VENDOR", "gemini");

    const OMA_CONFIG_YAML = ["language: en", "default_cli: gemini"].join("\n");
    const CLI_CONFIG_YAML = [
      "active_vendor: gemini",
      "vendors:",
      "  gemini:",
      "    command: gemini",
      "    prompt_flag: -p",
      "    output_format_flag: --output-format",
      "    output_format: json",
      "    auto_approve_flag: --approval-mode=yolo",
      "    model_flag: -m",
      "    default_model: auto",
      // intentionally no read_only_flag
    ].join("\n");

    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return true;
      if (n(target).includes("cli-config.yaml")) return true;
      if (n(target).endsWith("/workspace")) return true;
      return false;
    });
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return OMA_CONFIG_YAML;
      if (n(target).includes("cli-config.yaml")) return CLI_CONFIG_YAML;
      return "";
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 10004, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await spawnAgent(
      "frontend-engineer",
      "analyze the UI",
      "session-ro-4",
      "/workspace",
      undefined,
      undefined,
      undefined,
      true, // readOnly
    );

    const spawnArgs = vi.mocked(child_process.spawn).mock.calls.at(-1)?.[1];
    expect(spawnArgs).toBeDefined();

    // auto-approve flag must be suppressed
    expect(spawnArgs).not.toContain("--approval-mode=yolo");

    // a warning must have been emitted about the unsupported vendor
    const warnCalls = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(
      warnCalls.some(
        (msg) => msg.includes("read-only") && msg.includes("gemini"),
      ),
    ).toBe(true);

    warnSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // (e) read-only fallback: codex with NO read_only_flag in config uses built-in default
  // ---------------------------------------------------------------------------
  it("read-only for codex with no read_only_flag in config: falls back to built-in --sandbox read-only", async () => {
    vi.stubEnv("OMA_RUNTIME_VENDOR", "codex");

    const OMA_CONFIG_YAML = ["language: en", "model_preset: codex"].join("\n");
    const CLI_CONFIG_YAML = [
      "active_vendor: codex",
      "vendors:",
      "  codex:",
      "    command: codex",
      "    subcommand: exec",
      "    prompt_flag: none",
      "    auto_approve_flag: --full-auto",
      // intentionally no read_only_flag — tests built-in fallback in native.ts
    ].join("\n");

    mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return true;
      if (n(target).includes("cli-config.yaml")) return true;
      if (n(target).endsWith("/workspace")) return true;
      return false;
    });
    mockFsFunctions.readFileSync.mockImplementation((pathArg: fs.PathLike) => {
      const target = pathArg.toString();
      if (n(target).includes("oma-config.yaml")) return OMA_CONFIG_YAML;
      if (n(target).includes("cli-config.yaml")) return CLI_CONFIG_YAML;
      return "";
    });
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 10005, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    await spawnAgent(
      "backend-engineer",
      "analyze code only",
      "session-ro-5",
      "/workspace",
      undefined,
      undefined,
      undefined,
      true, // readOnly
    );

    const spawnArgs = vi.mocked(child_process.spawn).mock.calls.at(-1)?.[1];
    expect(spawnArgs).toBeDefined();

    // built-in fallback flags present
    expect(spawnArgs).toContain("--sandbox");
    expect(spawnArgs).toContain("read-only");

    // auto-approve suppressed
    expect(spawnArgs).not.toContain("--full-auto");
  });
});
