import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildExternalInvocation,
  detectRuntimeVendor,
  planDispatch,
} from "./runtime-dispatch.js";

/** The agy argv an ACP-driver invocation carries (`… agent:acp <agy> …`). */
function agyArgv(args: string[]): string[] {
  const index = args.indexOf("agent:acp");
  expect(index).toBeGreaterThanOrEqual(0);
  return args.slice(index + 1);
}

const minimalVendorConfig = {
  command: "oma-agent",
  prompt_flag: "-p",
};

describe("detectRuntimeVendor", () => {
  it("returns 'qwen' when OMA_RUNTIME_VENDOR=qwen", () => {
    expect(detectRuntimeVendor({ OMA_RUNTIME_VENDOR: "qwen" })).toBe("qwen");
  });

  it("returns 'qwen' when QWEN_CODE_API_KEY is present in env", () => {
    expect(detectRuntimeVendor({ QWEN_CODE_API_KEY: "sk-test" })).toBe("qwen");
  });

  it("returns 'qwen' when QWEN_CODE=1", () => {
    expect(detectRuntimeVendor({ QWEN_CODE: "1" })).toBe("qwen");
  });

  it("returns 'antigravity' when ANTIGRAVITY_IDE=1", () => {
    expect(detectRuntimeVendor({ ANTIGRAVITY_IDE: "1" })).toBe("antigravity");
  });

  it("returns 'claude' when CLAUDECODE=1", () => {
    expect(detectRuntimeVendor({ CLAUDECODE: "1" })).toBe("claude");
  });

  it("returns 'cursor' when OMA_RUNTIME_VENDOR=cursor", () => {
    expect(detectRuntimeVendor({ OMA_RUNTIME_VENDOR: "cursor" })).toBe(
      "cursor",
    );
  });

  it("returns 'cursor' when CURSOR_AGENT=1", () => {
    expect(detectRuntimeVendor({ CURSOR_AGENT: "1" })).toBe("cursor");
  });

  it("returns 'cursor' when CURSOR_TRACE_ID is set", () => {
    expect(detectRuntimeVendor({ CURSOR_TRACE_ID: "trace-test" })).toBe(
      "cursor",
    );
  });

  it("returns 'pi' when PI_CODING_AGENT=true", () => {
    expect(detectRuntimeVendor({ PI_CODING_AGENT: "true" })).toBe("pi");
  });

  it("returns 'kilo' from the env Kilo Code exports to tool subprocesses", () => {
    expect(detectRuntimeVendor({ KILO: "1" })).toBe("kilo");
    expect(detectRuntimeVendor({ KILO_RUN_ID: "run-1" })).toBe("kilo");
    expect(detectRuntimeVendor({ KILOCODE_VERSION: "7.8.27" })).toBe("kilo");
    // Kilo inherits opencode's OPENCODE=1; it must still resolve to kilo.
    expect(detectRuntimeVendor({ KILO: "1", OPENCODE: "1" })).toBe("kilo");
    expect(detectRuntimeVendor({ OMA_RUNTIME_VENDOR: "kilo" })).toBe("kilo");
  });

  it("does not treat a bare OPENCODE=1 as kilo", () => {
    expect(detectRuntimeVendor({ OPENCODE: "1" })).toBe("unknown");
  });

  it("returns 'unknown' when no known env vars are present", () => {
    expect(detectRuntimeVendor({})).toBe("unknown");
  });
});

const minimalVendorConfigCursor = {
  command: "cursor",
  model_flag: "--model",
  default_model: "auto",
  output_format_flag: "--output-format",
  output_format: "json",
  auto_approve_flag: "--yolo",
};

describe("planDispatch — forced-external runtimes", () => {
  it("returns mode:'external' for qwen runtime", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const plan = planDispatch(
      "test-agent",
      "claude",
      minimalVendorConfig,
      "-p",
      "hello",
      { OMA_RUNTIME_VENDOR: "qwen" },
    );
    expect(plan.mode).toBe("external");
    expect(plan.runtimeVendor).toBe("qwen");
    expect(plan.reason).toBe("qwen runtime has no native parallel dispatch");
    warnSpy.mockRestore();
  });

  it("antigravity runtime + cross-vendor target → mode:'external'", () => {
    const plan = planDispatch(
      "test-agent",
      "claude",
      minimalVendorConfig,
      "-p",
      "hello",
      { OMA_RUNTIME_VENDOR: "antigravity" },
    );
    expect(plan.mode).toBe("external");
    expect(plan.runtimeVendor).toBe("antigravity");
    expect(plan.reason).toBe("cross-vendor or unsupported native path");
  });

  it("antigravity runtime + antigravity target → mode:'native' over ACP", () => {
    const plan = planDispatch(
      "test-agent",
      "antigravity",
      { prompt_flag: "-p" },
      "-p",
      "hello",
      { OMA_RUNTIME_VENDOR: "antigravity" },
    );
    expect(plan.mode).toBe("native");
    expect(plan.runtimeVendor).toBe("antigravity");
    // agy never runs as print mode: the invocation is the OMA ACP driver with
    // the agy argv after the binary.
    expect(plan.invocation.vendorCommand).toBe("agy");
    const args = agyArgv(plan.invocation.args);
    expect(args[0]).toBe("agy");
    expect(args).toContain("--dangerously-skip-permissions");
    // -p is a value flag; its argument must follow immediately.
    const pIdx = args.indexOf("-p");
    expect(pIdx).toBeGreaterThanOrEqual(0);
    expect(args[pIdx + 1]).toMatch(/hello/);
    expect(args).not.toContain("--print-timeout");
    expect(args).not.toContain("--thinking-budget");
  });

  it("antigravity native dispatch appends --model from the per-agent plan", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-fixed-agy-"));
    mkdirSync(join(root, ".agents"));
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "model_preset: antigravity\n",
    );
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(root);
    const plan = planDispatch(
      "test-agent",
      "antigravity",
      { prompt_flag: "-p" },
      "-p",
      "hello",
      { OMA_RUNTIME_VENDOR: "antigravity" },
    );
    cwdSpy.mockRestore();
    rmSync(root, { recursive: true, force: true });
    expect(plan.mode).toBe("native");
    // Per-agent plan resolution (fixture → antigravity preset) supplies the
    // model; the ACP driver maps it onto the session model id.
    expect(agyArgv(plan.invocation.args)).toContain("--model");
  });

  // Parity with the external agy path: both builders drive the same binary, so
  // a flag present in only one makes an agy subagent behave differently
  // depending on which runtime launched it.
  it("antigravity native dispatch grants --add-dir {workspace}", () => {
    const plan = planDispatch(
      "test-agent",
      "antigravity",
      { prompt_flag: "-p" },
      "-p",
      "hello",
      { OMA_RUNTIME_VENDOR: "antigravity" },
      { workspace: "/tmp/ws" },
    );
    expect(plan.mode).toBe("native");
    const args = agyArgv(plan.invocation.args);
    const i = args.indexOf("--add-dir");
    expect(i).toBeGreaterThan(-1);
    expect(args[i + 1]).toBe("/tmp/ws");
  });

  it("antigravity external dispatch also runs over ACP", () => {
    const plan = planDispatch(
      "test-agent",
      "antigravity",
      { prompt_flag: "-p" },
      "-p",
      "hello",
      { OMA_RUNTIME_VENDOR: "claude" },
      { workspace: "/tmp/ws" },
    );
    expect(plan.mode).toBe("external");
    expect(plan.invocation.vendorCommand).toBe("agy");
    const args = agyArgv(plan.invocation.args);
    expect(args[args.indexOf("--add-dir") + 1]).toBe("/tmp/ws");
    expect(args[args.indexOf("-p") + 1]).toBe("hello");
    expect(args).not.toContain("--print-timeout");
  });

  it("prints a WARN message when forced to external for qwen", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    planDispatch("test-agent", "claude", minimalVendorConfig, "-p", "hello", {
      OMA_RUNTIME_VENDOR: "qwen",
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "[runtime-dispatch] qwen runtime: all agents dispatched as external subprocess",
    );
    warnSpy.mockRestore();
  });
});

describe("planDispatch — regression: native paths unaffected", () => {
  it("claude runtime + claude target → mode:'native'", () => {
    const plan = planDispatch(
      "test-agent",
      "claude",
      minimalVendorConfig,
      "-p",
      "hello",
      { CLAUDECODE: "1" },
    );
    expect(plan.mode).toBe("native");
    expect(plan.runtimeVendor).toBe("claude");
  });

  it("unknown runtime + claude target → mode:'external' (cross-vendor path)", () => {
    const plan = planDispatch(
      "test-agent",
      "claude",
      minimalVendorConfig,
      "-p",
      "hello",
      {},
    );
    expect(plan.mode).toBe("external");
    expect(plan.runtimeVendor).toBe("unknown");
  });

  it("cursor runtime + cursor target → mode:'native' (cursor agent --print)", () => {
    const plan = planDispatch(
      "test-agent",
      "cursor",
      minimalVendorConfigCursor,
      null,
      "hello",
      { CURSOR_AGENT: "1" },
    );
    expect(plan.mode).toBe("native");
    expect(plan.runtimeVendor).toBe("cursor");
    expect(plan.invocation.args[0]).toBe("agent");
    expect(plan.invocation.args[1]).toBe("-p");
    expect(plan.invocation.args.at(-1)).toContain("@test-agent");
  });

  // Characterization: kiro same-vendor native dispatch was not directly
  // asserted before. Pin the dispatch contract (mode/runtimeVendor/reason) so
  // the native-builder table collapse stays behavior-preserving.
  it("kiro runtime + kiro target → mode:'native' (chat --no-interactive)", () => {
    const plan = planDispatch(
      "test-agent",
      "kiro",
      { command: "kiro", prompt_flag: "-p" },
      "-p",
      "hello",
      { OMA_RUNTIME_VENDOR: "kiro" },
    );
    expect(plan.mode).toBe("native");
    expect(plan.runtimeVendor).toBe("kiro");
    expect(plan.reason).toBe("same-vendor Kiro CLI (--no-interactive)");
    expect(plan.invocation.args.slice(0, 2)).toEqual([
      "chat",
      "--no-interactive",
    ]);
  });

  it("codex runtime + codex target → native invocation passes the hook-trust bypass flag", () => {
    const plan = planDispatch(
      "test-agent",
      "codex",
      { command: "codex", subcommand: "exec" },
      null,
      "hello",
      { OMA_RUNTIME_VENDOR: "codex" },
    );
    expect(plan.mode).toBe("native");
    expect(plan.runtimeVendor).toBe("codex");
    expect(plan.invocation.args).toContain("--dangerously-bypass-hook-trust");
    expect(plan.invocation.env.BYPASS_HOOK_TRUST).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// T10b integration — planDispatch ↔ resolveAgentPlan wiring
// Addresses QA MEDIUM-1: resolver must reach the subprocess invocation.
// ---------------------------------------------------------------------------

describe("planDispatch — plan integration (T10b)", () => {
  let tempDir: string;
  let originalCwd: string;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = mkdtempSync(join(tmpdir(), "oma-dispatch-"));
    mkdirSync(join(tempDir, ".agents"), { recursive: true });
    process.chdir(tempDir);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("persists Codex effort to project-local .codex/config.toml when plan has effort", () => {
    // codex preset: backend = { model: openai/gpt-5.3-codex, effort: high }
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: codex\n",
    );

    planDispatch("backend", "codex", minimalVendorConfig, "-p", "hello", {
      CODEX_CI: "1",
    });

    const tomlPath = join(tempDir, ".codex", "config.toml");
    const content = readFileSync(tomlPath, "utf-8");
    expect(content).toContain('model_reasoning_effort = "high"');
  });

  it("is idempotent — identical effort does not rewrite the TOML needlessly", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: codex\nagents:\n  backend:\n    model: openai/gpt-5.3-codex\n    effort: medium\n",
    );

    planDispatch("backend", "codex", minimalVendorConfig, "-p", "hi", {
      CODEX_CI: "1",
    });
    const tomlAfterFirst = readFileSync(
      join(tempDir, ".codex", "config.toml"),
      "utf-8",
    );

    planDispatch("backend", "codex", minimalVendorConfig, "-p", "hi", {
      CODEX_CI: "1",
    });
    const tomlAfterSecond = readFileSync(
      join(tempDir, ".codex", "config.toml"),
      "utf-8",
    );

    expect(tomlAfterSecond).toBe(tomlAfterFirst);
  });

  it("kilo-routed agent: `kilo run` with -m before the trailing prompt and --agent <id>", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      [
        "language: en",
        "model_preset: claude",
        "models:",
        "  kilo-sonnet:",
        "    cli: kilo",
        "    cli_model: kilo/~anthropic/claude-sonnet-latest",
        '    auth_hint: "kilo auth login"',
        "    supports:",
        "      effort: null",
        "      apply_patch: false",
        "      task_budget: false",
        "      prompt_cache: false",
        "      computer_use: false",
        "      native_dispatch_from: [kilo]",
        "      api_only: false",
        "agents:",
        "  backend:",
        "    model: kilo-sonnet",
      ].join("\n"),
    );

    const plan = planDispatch("backend", "kilo", {}, null, "do the task", {
      KILO: "1",
    });

    expect(plan.runtimeVendor).toBe("kilo");
    expect(plan.mode).toBe("external");
    expect(plan.invocation.command).toBe("kilo");
    expect(plan.invocation.args[0]).toBe("run");
    expect(plan.invocation.args.slice(-3)).toEqual([
      "-m",
      "kilo/~anthropic/claude-sonnet-latest",
      "do the task",
    ]);
    const agentIdx = plan.invocation.args.indexOf("--agent");
    expect(plan.invocation.args[agentIdx + 1]).toBe("backend");
    expect(plan.invocation.args).toContain("--auto");
  });

  it("missing oma-config.yaml → ConfigError handled gracefully, dispatch succeeds", () => {
    // No oma-config.yaml → resolveAgentPlan throws ConfigError → fallback to vendor config
    const plan = planDispatch(
      "nonexistent-agent",
      "claude",
      minimalVendorConfig,
      "-p",
      "hi",
      { CLAUDECODE: "1" },
    );
    // Graceful fallback — dispatch still succeeds, WARN emitted
    expect(plan.mode).toBe("native");
    expect(
      warnSpy.mock.calls.some((c: readonly unknown[]) =>
        String(c[0]).includes("nonexistent-agent"),
      ),
    ).toBe(true);
  });

  it("Claude effort override → plan drops effort (no TOML write)", () => {
    // claude preset + override with effort — effort should be dropped for Claude
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: claude\nagents:\n  orchestrator:\n    model: anthropic/claude-sonnet-4-6\n    effort: high\n",
    );

    planDispatch("orchestrator", "claude", minimalVendorConfig, "-p", "hi", {
      CLAUDECODE: "1",
    });

    // No .codex/config.toml written (Claude path, not Codex)
    expect(() =>
      readFileSync(join(tempDir, ".codex", "config.toml"), "utf-8"),
    ).toThrow();
  });

  it("Qwen runtime + Codex target → forced external without Qwen-only flags", () => {
    // qwen preset; backend has thinking:true by default
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: qwen\n",
    );

    const plan = planDispatch(
      "backend",
      "codex",
      minimalVendorConfig,
      "-p",
      "hi",
      { OMA_RUNTIME_VENDOR: "qwen" },
    );

    expect(plan.mode).toBe("external");
    expect(plan.invocation.args).not.toContain("--thinking");
  });

  it("unknown slug in agents override → ConfigError handled gracefully", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: codex\nagents:\n  backend:\n    model: bogus/does-not-exist\n",
    );

    const plan = planDispatch(
      "backend",
      "codex",
      minimalVendorConfig,
      "-p",
      "hi",
      { CODEX_CI: "1" },
    );

    // Dispatch succeeds via graceful fallback; WARN logged
    expect(plan.mode).toBeDefined();
    expect(
      warnSpy.mock.calls.some((c: readonly unknown[]) =>
        String(c[0]).includes("bogus"),
      ),
    ).toBe(true);
  });

  it("agents override in oma-config.yaml reaches the subprocess (effort propagates)", () => {
    // Verify that agents override in oma-config.yaml is honoured over preset defaults
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: codex\nagents:\n  backend:\n    model: openai/gpt-5.4\n    effort: low\n",
    );

    planDispatch("backend", "codex", minimalVendorConfig, "-p", "hi", {
      CODEX_CI: "1",
    });

    const toml = readFileSync(join(tempDir, ".codex", "config.toml"), "utf-8");
    // Must reflect oma-config.yaml agents override effort "low", not preset default "high".
    expect(toml).toContain('model_reasoning_effort = "low"');
  });

  it("session.quota_cap in oma-config.yaml does not block planDispatch itself", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: codex\nsession:\n  quota_cap:\n    spawn_count: 0\n",
    );

    // planDispatch itself doesn't check the cap — spawn-status.ts does.
    expect(() =>
      planDispatch("backend", "codex", minimalVendorConfig, "-p", "hi", {
        CODEX_CI: "1",
      }),
    ).not.toThrow();
  });

  // Regression: issue #336 follow-up. Before cursor was promoted to a
  // first-class vendor, `model_preset: cursor` did not exist and
  // resolveAgentPlan would route cursor dispatch through whatever model the
  // active preset declared (e.g. google/gemini-3-flash), producing
  // `cursor agent ... --model gemini-3-flash <prompt>` — wrong model.
  it("cursor preset → cursor dispatch injects Composer 2.5 Fast before prompt", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: cursor\n",
    );

    const plan = planDispatch(
      "pm",
      "cursor",
      minimalVendorConfigCursor,
      null,
      "do-the-thing",
      { CURSOR_AGENT: "1" },
    );

    const args = plan.invocation.args;
    const modelIdx = args.indexOf("--model");
    expect(modelIdx).toBeGreaterThan(-1);
    expect(args[modelIdx + 1]).toBe("composer-2.5-fast");
    expect(args.at(-1)).toContain("do-the-thing");
    // Model flag is the last option before the trailing positional prompt.
    expect(modelIdx + 2).toBe(args.length - 1);
    // No duplicate --model flag (regression for the
    // vendorConfigWithoutModel + injectCursorModelBeforeTrailingPrompt path).
    expect(args.filter((a) => a === "--model")).toHaveLength(1);
  });

  it("cursor preset (architecture role) → cursor dispatch uses Composer 2.5", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: cursor\n",
    );

    const plan = planDispatch(
      "architecture",
      "cursor",
      minimalVendorConfigCursor,
      null,
      "review",
      { CURSOR_AGENT: "1" },
    );

    const args = plan.invocation.args;
    const modelIdx = args.indexOf("--model");
    expect(args[modelIdx + 1]).toBe("composer-2.5");
  });

  it("cursor override from non-cursor preset keeps cursor vendor default model", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: gemini\n",
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const plan = planDispatch(
      "pm",
      "cursor",
      minimalVendorConfigCursor,
      null,
      "review",
      { CURSOR_AGENT: "1" },
    );

    const args = plan.invocation.args;
    const modelIdx = args.indexOf("--model");
    expect(modelIdx).toBeGreaterThan(-1);
    expect(args[modelIdx + 1]).toBe("auto");
    expect(args).not.toContain("gemini-3-flash");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("using cursor vendor defaults"),
    );
    warnSpy.mockRestore();
  });
});

describe("buildExternalInvocation — vendor branches", () => {
  it("cursor: prompt is positional, --yolo and --trust appended when no auto_approve_flag", () => {
    const inv = buildExternalInvocation(
      "cursor",
      { command: "cursor", model_flag: "--model", default_model: "composer-2" },
      null,
      "hello world",
    );
    expect(inv.command).toBe("cursor");
    expect(inv.args[0]).toBe("agent");
    expect(inv.args[1]).toBe("-p");
    expect(inv.args).toContain("--yolo");
    expect(inv.args).toContain("--trust");
    expect(inv.args.at(-1)).toBe("hello world");
  });

  it("cursor: explicit auto_approve_flag overrides default --yolo", () => {
    const inv = buildExternalInvocation(
      "cursor",
      { command: "cursor", auto_approve_flag: "--force" },
      null,
      "p",
    );
    expect(inv.args).toContain("--force");
    expect(inv.args).not.toContain("--yolo");
    expect(inv.args).toContain("--trust");
  });

  it("codex: missing auto_approve_flag → workspace-write sandbox, never the bypass", () => {
    const inv = buildExternalInvocation(
      "codex",
      { command: "codex" },
      null,
      "hi",
    );
    const sandbox = inv.args.indexOf("--sandbox");
    expect(inv.args[sandbox + 1]).toBe("workspace-write");
    expect(inv.args).toContain("sandbox_workspace_write.network_access=true");
    expect(inv.args).not.toContain(
      "--dangerously-bypass-approvals-and-sandbox",
    );
    expect(inv.args).not.toContain("--full-auto");
    expect(inv.args.at(-1)).toBe("hi");
  });

  it("codex: an explicit full-access flag is honored verbatim", () => {
    const inv = buildExternalInvocation(
      "codex",
      {
        command: "codex",
        auto_approve_flag: "--dangerously-bypass-approvals-and-sandbox",
      },
      null,
      "hi",
    );
    expect(inv.args).toContain("--dangerously-bypass-approvals-and-sandbox");
    expect(inv.args).not.toContain("--sandbox");
  });

  it("qwen: missing auto_approve_flag → falls back to --yolo", () => {
    const inv = buildExternalInvocation(
      "qwen",
      { command: "qwen" },
      "-p",
      "hi",
    );
    expect(inv.args).toContain("--yolo");
  });

  it("antigravity: command defaults to `agy` binary, auto_approve_flag falls back to --dangerously-skip-permissions", () => {
    const inv = buildExternalInvocation("antigravity", {}, "-p", "hi");
    expect(inv.command).toBe("agy");
    expect(inv.args).toContain("--dangerously-skip-permissions");
    expect(inv.args).not.toContain("--print-timeout");
  });

  it("antigravity: vendorConfig model flag passes through", () => {
    const inv = buildExternalInvocation(
      "antigravity",
      { model_flag: "--model", default_model: "Gemini 4 Argon (High)" },
      "-p",
      "hi",
    );
    const i = inv.args.indexOf("--model");
    expect(inv.args[i + 1]).toBe("Gemini 4 Argon (High)");
  });

  it("antigravity: --add-dir {workspace} granted (tech-debt #7)", () => {
    const inv = buildExternalInvocation(
      "antigravity",
      {},
      "-p",
      "hi",
      undefined,
      { workspace: "/tmp/ws" },
    );
    const i = inv.args.indexOf("--add-dir");
    expect(i).toBeGreaterThan(-1);
    expect(inv.args[i + 1]).toBe("/tmp/ws");
  });

  // The ACP driver reads the prompt from a print-mode prompt flag; a trailing
  // positional would be forwarded to `agy acp` as an unknown argument.
  it("antigravity: prompt_flag none still passes the prompt behind -p", () => {
    const inv = buildExternalInvocation("antigravity", {}, null, "hi");
    expect(inv.args.slice(-2)).toEqual(["-p", "hi"]);
  });

  it("isolation_flags split into argv tokens", () => {
    const inv = buildExternalInvocation(
      "codex",
      { command: "codex", isolation_flags: "--sandbox=workspace --no-network" },
      null,
      "p",
    );
    expect(inv.args).toContain("--sandbox=workspace");
    expect(inv.args).toContain("--no-network");
  });

  it("isolation_env: $$ is replaced with current pid", () => {
    const inv = buildExternalInvocation(
      "codex",
      { command: "codex", isolation_env: "OMA_PID=run-$$" },
      null,
      "p",
    );
    expect(inv.env.OMA_PID).toBe(`run-${process.pid}`);
  });

  it("subcommand is prepended before option args", () => {
    const inv = buildExternalInvocation(
      "codex",
      { command: "codex", subcommand: "exec" },
      null,
      "prompt",
    );
    expect(inv.args[0]).toBe("exec");
  });

  it("no promptFlag → prompt is the trailing positional argument", () => {
    const inv = buildExternalInvocation(
      "codex",
      { command: "codex", subcommand: "exec" },
      null,
      "the-prompt",
    );
    expect(inv.args.at(-1)).toBe("the-prompt");
  });

  it("pi: -p print mode, no approval flag, fallback model before positional prompt", () => {
    const inv = buildExternalInvocation(
      "pi",
      { command: "pi", model_flag: "--model", default_model: "sonnet:high" },
      "-p",
      "the-prompt",
    );
    expect(inv.command).toBe("pi");
    // pi has its own branch: `-p` print flag, no auto-approve (pi has no
    // permission sandbox), then the vendor-default model, then the positional
    // prompt last. With a resolved plan the model flag comes from plan-args.
    expect(inv.args).toEqual(["-p", "--model", "sonnet:high", "the-prompt"]);
  });

  it("pi: read-only excludes mutating tools when no read_only_flag", () => {
    const inv = buildExternalInvocation(
      "pi",
      { command: "pi" },
      "-p",
      "the-prompt",
      undefined,
      { readOnly: true },
    );
    expect(inv.command).toBe("pi");
    expect(inv.args).toEqual([
      "-p",
      "--exclude-tools",
      "edit,write,bash,powershell",
      "the-prompt",
    ]);
  });

  it("with promptFlag → flag and prompt appended as a pair", () => {
    const inv = buildExternalInvocation(
      "qwen",
      { command: "qwen" },
      "-p",
      "the-prompt",
    );
    const idx = inv.args.indexOf("-p");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(inv.args[idx + 1]).toBe("the-prompt");
    expect(inv.args.at(-1)).toBe("the-prompt");
  });
});
