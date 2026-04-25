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
import { detectRuntimeVendor, planDispatch } from "./runtime-dispatch.js";

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

  it("returns 'unknown' when no known env vars are present", () => {
    expect(detectRuntimeVendor({})).toBe("unknown");
  });
});

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
    // codex-only preset: backend = { model: openai/gpt-5.3-codex, effort: high }
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: codex-only\n",
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
      "language: en\nmodel_preset: codex-only\nagents:\n  backend:\n    model: openai/gpt-5.3-codex\n    effort: medium\n",
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
      warnSpy.mock.calls.some((c) =>
        String(c[0]).includes("nonexistent-agent"),
      ),
    ).toBe(true);
  });

  it("Claude effort override → plan drops effort (no TOML write)", () => {
    // claude-only preset + override with effort — effort should be dropped for Claude
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: claude-only\nagents:\n  orchestrator:\n    model: anthropic/claude-sonnet-4-6\n    effort: high\n",
    );

    planDispatch("orchestrator", "claude", minimalVendorConfig, "-p", "hi", {
      CLAUDECODE: "1",
    });

    // No .codex/config.toml written (Claude path, not Codex)
    expect(() =>
      readFileSync(join(tempDir, ".codex", "config.toml"), "utf-8"),
    ).toThrow();
  });

  it("Qwen runtime + Codex target → forced external, plan args still appended", () => {
    // qwen-only preset; backend has thinking:true by default
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: qwen-only\n",
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
    // qwen-only backend has thinking:true → args include --thinking
    expect(plan.invocation.args).toContain("--thinking");
  });

  it("unknown slug in agents override → ConfigError handled gracefully", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: codex-only\nagents:\n  backend:\n    model: bogus/does-not-exist\n",
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
    expect(warnSpy.mock.calls.some((c) => String(c[0]).includes("bogus"))).toBe(
      true,
    );
  });

  it("agents override in oma-config.yaml reaches the subprocess (effort propagates)", () => {
    // Verify that agents override in oma-config.yaml is honoured over preset defaults
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: codex-only\nagents:\n  backend:\n    model: openai/gpt-5.4\n    effort: low\n",
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
      "language: en\nmodel_preset: codex-only\nsession:\n  quota_cap:\n    spawn_count: 0\n",
    );

    // planDispatch itself doesn't check the cap — spawn-status.ts does.
    expect(() =>
      planDispatch("backend", "codex", minimalVendorConfig, "-p", "hi", {
        CODEX_CI: "1",
      }),
    ).not.toThrow();
  });
});
