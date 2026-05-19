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

  it("returns mode:'external' for antigravity runtime", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
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
    expect(plan.reason).toBe(
      "antigravity runtime has no native parallel dispatch",
    );
    warnSpy.mockRestore();
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

  it("prints a WARN message when forced to external for antigravity", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    planDispatch("test-agent", "claude", minimalVendorConfig, "-p", "hello", {
      OMA_RUNTIME_VENDOR: "antigravity",
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "[runtime-dispatch] antigravity runtime: all agents dispatched as external subprocess",
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

  it("gemini: missing auto_approve_flag → falls back to --approval-mode=yolo", () => {
    const inv = buildExternalInvocation(
      "gemini",
      { command: "gemini" },
      "-p",
      "hi",
    );
    expect(inv.args).toContain("--approval-mode=yolo");
  });

  it("codex: missing auto_approve_flag → falls back to --full-auto", () => {
    const inv = buildExternalInvocation(
      "codex",
      { command: "codex" },
      null,
      "hi",
    );
    expect(inv.args).toContain("--full-auto");
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

  it("with promptFlag → flag and prompt appended as a pair", () => {
    const inv = buildExternalInvocation(
      "gemini",
      { command: "gemini" },
      "-p",
      "the-prompt",
    );
    const idx = inv.args.indexOf("-p");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(inv.args[idx + 1]).toBe("the-prompt");
    expect(inv.args.at(-1)).toBe("the-prompt");
  });
});
