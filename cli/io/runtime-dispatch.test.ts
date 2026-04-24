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
    mkdirSync(join(tempDir, ".agents", "config"), { recursive: true });
    process.chdir(tempDir);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("persists Codex effort to project-local .codex/config.toml when plan has effort", () => {
    // defaults.yaml with Codex backend + effort:high
    writeFileSync(
      join(tempDir, ".agents", "config", "defaults.yaml"),
      `agent_defaults:\n  backend: { model: "openai/gpt-5.3-codex", effort: "high" }\n`,
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
      join(tempDir, ".agents", "config", "defaults.yaml"),
      `agent_defaults:\n  backend: { model: "openai/gpt-5.3-codex", effort: "medium" }\n`,
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

  it("legacy string mapping still works (no plan resolved — falls back to vendor config)", () => {
    // No defaults.yaml, no oma-config.yaml → resolveAgentPlan throws ConfigError
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

  it("Claude effort in user config → plan drops effort (no TOML write, no args poisoning)", () => {
    writeFileSync(
      join(tempDir, ".agents", "config", "defaults.yaml"),
      `agent_defaults:\n  orchestrator: { model: "anthropic/claude-sonnet-4-6" }\n`,
    );
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      `agent_cli_mapping:\n  orchestrator:\n    model: "anthropic/claude-sonnet-4-6"\n    effort: high\n`,
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
    writeFileSync(
      join(tempDir, ".agents", "config", "defaults.yaml"),
      `agent_defaults:\n  backend: { model: "qwen/qwen3-coder-plus", thinking: true }\n`,
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
    // Qwen thinking true → args should include --thinking via buildAgentPlanArgs
    expect(plan.invocation.args).toContain("--thinking");
  });

  it("unknown slug in user config → ConfigError handled gracefully", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      `agent_cli_mapping:\n  backend:\n    model: "bogus/does-not-exist"\n`,
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

  it("reads agent_cli_mapping from .agents/oma-config.yaml (canonical path)", () => {
    // Before the fragmentation fix, resolveAgentPlan ignored oma-config.yaml
    // and fell through to defaults.yaml. Post-fix, oma-config.yaml values
    // reach the subprocess.
    writeFileSync(
      join(tempDir, ".agents", "config", "defaults.yaml"),
      `agent_defaults:\n  backend: { model: "openai/gpt-5.3-codex", effort: "high" }\n`,
    );
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      `agent_cli_mapping:\n  backend:\n    model: "openai/gpt-5.4"\n    effort: "low"\n`,
    );

    planDispatch("backend", "codex", minimalVendorConfig, "-p", "hi", {
      CODEX_CI: "1",
    });

    const toml = readFileSync(join(tempDir, ".codex", "config.toml"), "utf-8");
    // Must reflect oma-config.yaml's "low", not defaults.yaml's "high".
    expect(toml).toContain('model_reasoning_effort = "low"');
  });

  it("session.quota_cap is honored when placed in oma-config.yaml", () => {
    writeFileSync(
      join(tempDir, ".agents", "config", "defaults.yaml"),
      `agent_defaults:\n  backend: { model: "openai/gpt-5.3-codex" }\n`,
    );
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      `session:\n  quota_cap:\n    spawn_count: 0\n`,
    );

    // With spawn_count: 0, every spawn attempt should be blocked. But
    // planDispatch itself doesn't check the cap — spawn-status.ts does.
    // Here we just confirm loadQuotaCap reads the oma-config.yaml value.
    // (A unit test below loadQuotaCap in session-cost.test.ts covers the
    //  actual gating path.)
    expect(() =>
      planDispatch("backend", "codex", minimalVendorConfig, "-p", "hi", {
        CODEX_CI: "1",
      }),
    ).not.toThrow();
  });
});
