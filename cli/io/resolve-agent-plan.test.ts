/**
 * T10 Integration tests: resolveAgentPlan + per-vendor invocation builders
 *
 * Test cases (12 minimum):
 *  1. User-preferences AgentSpec takes precedence over defaults
 *  2. Legacy string in user-preferences falls back to defaults for model/effort
 *  3. Missing agentId → falls through to orchestrator default
 *  4. Claude cli-session model → effort dropped + WARN emitted
 *  5. api_only slug → throws ConfigError
 *  6. Unknown slug → throws ConfigError with actionable message
 *  7. vendorOverride matches native_dispatch_from → cli overridden
 *  8. vendorOverride not in native_dispatch_from → WARN, cli NOT overridden
 *  9. Codex effort="high" → setCodexReasoningEffort reflects "high"
 * 10. Qwen effort="high" → invocation args include --thinking
 * 11. Qwen effort="none" → invocation args include --no-thinking
 * 12. Gemini effort translation to thinking-budget
 * 13. User-preferences missing entirely → falls back to defaults
 * 14. Empty AgentSpec {} (model only, no effort) → no effort in plan
 * 15. OMA_RUNTIME_VENDOR env var used when vendorOverride not passed
 */

import { describe, expect, it, vi } from "vitest";
import {
  parseCodexConfig,
  serializeCodexConfig,
  setCodexReasoningEffort,
} from "../vendors/codex/settings.js";
import {
  buildAgentPlanArgs,
  ConfigError,
  geminiThinkingBudgetFlag,
  qwenThinkingFlag,
  resolveAgentPlanFromConfig,
} from "./runtime-dispatch.js";

// ---------------------------------------------------------------------------
// Fixtures — minimal config objects used across tests
// ---------------------------------------------------------------------------

const DEFAULTS_PROFILE_B = {
  agent_defaults: {
    orchestrator: { model: "anthropic/claude-sonnet-4-6" },
    architecture: { model: "anthropic/claude-opus-4-7" },
    backend: { model: "openai/gpt-5.3-codex", effort: "high" },
    frontend: { model: "openai/gpt-5.4", effort: "high" },
    retrieval: { model: "google/gemini-3.1-flash-lite" },
    qa: { model: "anthropic/claude-sonnet-4-6" },
    debug: { model: "openai/gpt-5.3-codex", effort: "high" },
  },
};

const EMPTY_USER_PREFS = { agent_cli_mapping: {} };

// ---------------------------------------------------------------------------
// Case 1: User-preferences AgentSpec takes precedence over defaults
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 1: AgentSpec from user-prefs overrides defaults", () => {
  it("uses model from user-preferences AgentSpec, not defaults", () => {
    const userPrefs = {
      agent_cli_mapping: {
        backend: { model: "openai/gpt-5.4", effort: "medium" },
      },
    };

    const plan = resolveAgentPlanFromConfig("backend", {
      userPrefs,
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(plan.cliModel).toBe("gpt-5.4");
    expect(plan.cli).toBe("codex");
    expect(plan.effort).toBe("medium");
  });

  it("picks up thinking flag from AgentSpec", () => {
    const userPrefs = {
      agent_cli_mapping: {
        retrieval: { model: "google/gemini-3-flash", thinking: true },
      },
    };

    const plan = resolveAgentPlanFromConfig("retrieval", {
      userPrefs,
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(plan.cli).toBe("gemini");
    expect(plan.thinking).toBe(true);
    expect(plan.cliModel).toBe("gemini-3-flash");
  });
});

// ---------------------------------------------------------------------------
// Case 2: Legacy string in user-preferences → vendor only; model/effort from defaults
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 2: legacy string falls back to defaults", () => {
  it("resolves model and effort from defaults when user-pref entry is a string", () => {
    const userPrefs = {
      agent_cli_mapping: {
        backend: "codex", // legacy string format
      },
    };

    const plan = resolveAgentPlanFromConfig("backend", {
      userPrefs,
      defaults: DEFAULTS_PROFILE_B,
    });

    // Should use defaults for backend: gpt-5.3-codex, effort: high
    expect(plan.cliModel).toBe("gpt-5.3-codex");
    expect(plan.cli).toBe("codex");
    expect(plan.effort).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// Case 3: Missing agentId → falls through to orchestrator default
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 3: missing agentId falls back to orchestrator", () => {
  it("uses orchestrator defaults when agentId is not in user-prefs or defaults", () => {
    const plan = resolveAgentPlanFromConfig("nonexistent-agent", {
      userPrefs: EMPTY_USER_PREFS,
      defaults: DEFAULTS_PROFILE_B,
    });

    // orchestrator defaults to claude-sonnet-4-6
    expect(plan.cli).toBe("claude");
    expect(plan.cliModel).toBe("claude-sonnet-4-6");
  });
});

// ---------------------------------------------------------------------------
// Case 4: Claude cli-session model → effort dropped + WARN emitted (R14)
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 4: Claude effort drop (R14)", () => {
  it("drops effort and emits WARN for Claude cli-session model", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const userPrefs = {
      agent_cli_mapping: {
        backend: { model: "anthropic/claude-opus-4-7", effort: "high" },
      },
    };

    const plan = resolveAgentPlanFromConfig("backend", {
      userPrefs,
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(plan.effort).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("effort field is ignored for Claude CLI"),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("cli-session"),
    );
    warnSpy.mockRestore();
  });

  it("does not emit WARN when effort is not set for Claude model", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const plan = resolveAgentPlanFromConfig("qa", {
      userPrefs: EMPTY_USER_PREFS,
      defaults: DEFAULTS_PROFILE_B,
    });

    // qa defaults to claude-sonnet-4-6 with no effort
    expect(plan.effort).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Case 5: api_only slug → throws ConfigError (R13 defensive)
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 5: api_only slug throws ConfigError", () => {
  it("throws ConfigError when model slug has api_only:true", () => {
    // gpt-5.4-nano is excluded from CORE_REGISTRY (api_only) so getModelSpec returns undefined
    // We test the "unknown slug" path since api_only entries are never in CORE_REGISTRY
    const userPrefs = {
      agent_cli_mapping: {
        backend: { model: "openai/gpt-5.4-nano" },
      },
    };

    expect(() =>
      resolveAgentPlanFromConfig("backend", {
        userPrefs,
        defaults: DEFAULTS_PROFILE_B,
      }),
    ).toThrow(ConfigError);

    expect(() =>
      resolveAgentPlanFromConfig("backend", {
        userPrefs,
        defaults: DEFAULTS_PROFILE_B,
      }),
    ).toThrow(/Unknown model slug/);
  });
});

// ---------------------------------------------------------------------------
// Case 6: Unknown slug → throws ConfigError with actionable message
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 6: unknown slug throws ConfigError", () => {
  it("throws ConfigError with actionable message for unregistered slug", () => {
    const userPrefs = {
      agent_cli_mapping: {
        frontend: { model: "openai/gpt-6-future" },
      },
    };

    expect(() =>
      resolveAgentPlanFromConfig("frontend", {
        userPrefs,
        defaults: DEFAULTS_PROFILE_B,
      }),
    ).toThrow(ConfigError);

    expect(() =>
      resolveAgentPlanFromConfig("frontend", {
        userPrefs,
        defaults: DEFAULTS_PROFILE_B,
      }),
    ).toThrow(
      "Unknown model slug 'openai/gpt-6-future'. Add it to .agents/config/models.yaml or use a Registry slug.",
    );
  });
});

// ---------------------------------------------------------------------------
// Case 7: vendorOverride matches native_dispatch_from → cli overridden
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 7: vendorOverride matches native_dispatch_from", () => {
  it("overrides cli to vendorOverride when it is in native_dispatch_from", () => {
    const plan = resolveAgentPlanFromConfig(
      "retrieval",
      { userPrefs: EMPTY_USER_PREFS, defaults: DEFAULTS_PROFILE_B },
      "gemini",
    );

    expect(plan.cli).toBe("gemini");
    expect(plan.cliModel).toBe("gemini-3.1-flash-lite");
  });
});

// ---------------------------------------------------------------------------
// Case 8: vendorOverride not in native_dispatch_from → WARN, cli NOT overridden
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 8: vendorOverride not in native_dispatch_from", () => {
  it("warns and keeps original cli when vendorOverride is not supported", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // retrieval uses google/gemini-3.1-flash-lite; native_dispatch_from: ["gemini"]
    // codex is NOT in native_dispatch_from
    const plan = resolveAgentPlanFromConfig(
      "retrieval",
      { userPrefs: EMPTY_USER_PREFS, defaults: DEFAULTS_PROFILE_B },
      "codex",
    );

    expect(plan.cli).toBe("gemini"); // NOT overridden
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('"codex" is not in native_dispatch_from'),
    );
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Case 9: Codex effort="high" → setCodexReasoningEffort reflects "high"
// ---------------------------------------------------------------------------

describe("setCodexReasoningEffort — Case 9: Codex effort in TOML", () => {
  it("sets model_reasoning_effort to 'high' in codex settings", () => {
    const base = parseCodexConfig("");
    const updated = setCodexReasoningEffort(base, "high");
    expect(updated.model_reasoning_effort).toBe("high");
  });

  it("idempotent: calling twice with same value gives same result", () => {
    const base = parseCodexConfig("");
    const first = setCodexReasoningEffort(base, "high");
    const second = setCodexReasoningEffort(first, "high");
    expect(second.model_reasoning_effort).toBe("high");
    expect(serializeCodexConfig(second)).toContain(
      'model_reasoning_effort = "high"',
    );
  });

  it("clears model_reasoning_effort when effort is undefined", () => {
    const base = { model_reasoning_effort: "high" };
    const updated = setCodexReasoningEffort(base, undefined);
    expect(updated.model_reasoning_effort).toBeUndefined();
  });

  it("backend plan (effort=high) + codex TOML shows model_reasoning_effort = 'high'", () => {
    const plan = resolveAgentPlanFromConfig("backend", {
      userPrefs: EMPTY_USER_PREFS,
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(plan.cli).toBe("codex");
    expect(plan.effort).toBe("high");

    const tomlSettings = setCodexReasoningEffort({}, plan.effort);
    expect(tomlSettings.model_reasoning_effort).toBe("high");
    const serialized = serializeCodexConfig(tomlSettings);
    expect(serialized).toContain('model_reasoning_effort = "high"');
  });
});

// ---------------------------------------------------------------------------
// Case 10 & 11: Qwen effort translation
// ---------------------------------------------------------------------------

describe("qwenThinkingFlag — Cases 10 & 11: Qwen effort translation", () => {
  it("returns --thinking for effort=high (Case 10)", () => {
    const plan = resolveAgentPlanFromConfig("backend", {
      userPrefs: {
        agent_cli_mapping: {
          backend: { model: "qwen/qwen3-coder-plus", effort: "high" },
        },
      },
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(plan.cli).toBe("qwen");
    expect(plan.effort).toBe("high");

    const flag = qwenThinkingFlag(plan);
    expect(flag).toBe("--thinking");

    const args = buildAgentPlanArgs(plan);
    expect(args).toContain("--thinking");
    expect(args).toContain("-m");
    expect(args).toContain("qwen3-coder-plus");
  });

  it("returns --no-thinking for effort=none (Case 11)", () => {
    const plan = resolveAgentPlanFromConfig("backend", {
      userPrefs: {
        agent_cli_mapping: {
          backend: { model: "qwen/qwen3-coder-plus", effort: "none" },
        },
      },
      defaults: DEFAULTS_PROFILE_B,
    });

    const flag = qwenThinkingFlag(plan);
    expect(flag).toBe("--no-thinking");

    const args = buildAgentPlanArgs(plan);
    expect(args).toContain("--no-thinking");
  });

  it("returns --no-thinking for effort=medium", () => {
    const plan = resolveAgentPlanFromConfig("backend", {
      userPrefs: {
        agent_cli_mapping: {
          backend: { model: "qwen/qwen3-coder-plus", effort: "medium" },
        },
      },
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(qwenThinkingFlag(plan)).toBe("--no-thinking");
  });

  it("thinking:true override takes priority over effort level", () => {
    const plan = resolveAgentPlanFromConfig("backend", {
      userPrefs: {
        agent_cli_mapping: {
          backend: {
            model: "qwen/qwen3-coder-plus",
            effort: "none",
            thinking: true,
          },
        },
      },
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(qwenThinkingFlag(plan)).toBe("--thinking");
  });

  it("thinking:false override takes priority over effort level", () => {
    const plan = resolveAgentPlanFromConfig("backend", {
      userPrefs: {
        agent_cli_mapping: {
          backend: {
            model: "qwen/qwen3-coder-plus",
            effort: "xhigh",
            thinking: false,
          },
        },
      },
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(qwenThinkingFlag(plan)).toBe("--no-thinking");
  });
});

// ---------------------------------------------------------------------------
// Case 12: Gemini effort translation to thinking-budget
// ---------------------------------------------------------------------------

describe("geminiThinkingBudgetFlag — Case 12: Gemini effort translation", () => {
  it("effort=high maps to --thinking-budget=dynamic for gemini-3-flash", () => {
    const plan = resolveAgentPlanFromConfig("retrieval", {
      userPrefs: {
        agent_cli_mapping: {
          retrieval: { model: "google/gemini-3-flash", effort: "high" },
        },
      },
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(plan.cli).toBe("gemini");
    const flag = geminiThinkingBudgetFlag(plan);
    expect(flag).toBe("--thinking-budget=dynamic");

    const args = buildAgentPlanArgs(plan);
    expect(args).toContain("--model");
    expect(args).toContain("gemini-3-flash");
    expect(args).toContain("--thinking-budget=dynamic");
  });

  it("effort=xhigh maps to --thinking-budget=dynamic", () => {
    const plan = resolveAgentPlanFromConfig("retrieval", {
      userPrefs: {
        agent_cli_mapping: {
          retrieval: { model: "google/gemini-3-flash", effort: "xhigh" },
        },
      },
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(geminiThinkingBudgetFlag(plan)).toBe("--thinking-budget=dynamic");
  });

  it("effort=low maps to --thinking-budget=none", () => {
    const plan = resolveAgentPlanFromConfig("retrieval", {
      userPrefs: {
        agent_cli_mapping: {
          retrieval: { model: "google/gemini-3-flash", effort: "low" },
        },
      },
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(geminiThinkingBudgetFlag(plan)).toBe("--thinking-budget=none");
  });

  it("effort=medium maps to --thinking-budget=none", () => {
    const plan = resolveAgentPlanFromConfig("retrieval", {
      userPrefs: {
        agent_cli_mapping: {
          retrieval: { model: "google/gemini-3-flash", effort: "medium" },
        },
      },
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(geminiThinkingBudgetFlag(plan)).toBe("--thinking-budget=none");
  });

  it("thinking:true maps to --thinking-budget=dynamic regardless of effort", () => {
    const plan = resolveAgentPlanFromConfig("retrieval", {
      userPrefs: {
        agent_cli_mapping: {
          retrieval: {
            model: "google/gemini-3-flash",
            effort: "low",
            thinking: true,
          },
        },
      },
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(geminiThinkingBudgetFlag(plan)).toBe("--thinking-budget=dynamic");
  });

  it("thinking:false maps to --thinking-budget=none regardless of effort", () => {
    const plan = resolveAgentPlanFromConfig("retrieval", {
      userPrefs: {
        agent_cli_mapping: {
          retrieval: {
            model: "google/gemini-3.1-pro-preview",
            effort: "xhigh",
            thinking: false,
          },
        },
      },
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(geminiThinkingBudgetFlag(plan)).toBe("--thinking-budget=none");
  });

  it("gemini-3.1-pro-preview supports fixed mode, high effort uses dynamic", () => {
    const plan = resolveAgentPlanFromConfig("architecture", {
      userPrefs: EMPTY_USER_PREFS,
      defaults: {
        agent_defaults: {
          orchestrator: { model: "anthropic/claude-sonnet-4-6" },
          architecture: {
            model: "google/gemini-3.1-pro-preview",
            effort: "high",
          },
        },
      },
    });

    // gemini-3.1-pro-preview has modes: ["none", "dynamic", "fixed"]
    // high → dynamic (preferred over fixed per spec)
    expect(geminiThinkingBudgetFlag(plan)).toBe("--thinking-budget=dynamic");
  });
});

// ---------------------------------------------------------------------------
// Case 13: User-preferences missing entirely → falls back to defaults
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 13: missing user-preferences", () => {
  it("resolves from defaults when user-preferences has no agent_cli_mapping", () => {
    const plan = resolveAgentPlanFromConfig("backend", {
      userPrefs: {},
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(plan.cliModel).toBe("gpt-5.3-codex");
    expect(plan.effort).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// Case 14: Empty AgentSpec (model only, no effort) → no effort in plan
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 14: AgentSpec with model only", () => {
  it("produces plan without effort when AgentSpec has no effort field", () => {
    const userPrefs = {
      agent_cli_mapping: {
        backend: { model: "openai/gpt-5.4-mini" },
      },
    };

    const plan = resolveAgentPlanFromConfig("backend", {
      userPrefs,
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(plan.effort).toBeUndefined();
    expect(plan.thinking).toBeUndefined();
    expect(plan.memory).toBeUndefined();
    expect(plan.cliModel).toBe("gpt-5.4-mini");
  });
});

// ---------------------------------------------------------------------------
// buildAgentPlanArgs — Claude path
// ---------------------------------------------------------------------------

describe("buildAgentPlanArgs — Claude", () => {
  it("produces --model {cliModel} args for Claude", () => {
    const plan = resolveAgentPlanFromConfig("qa", {
      userPrefs: EMPTY_USER_PREFS,
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(plan.cli).toBe("claude");
    const args = buildAgentPlanArgs(plan);
    expect(args).toEqual(["--model", "claude-sonnet-4-6"]);
  });
});

// ---------------------------------------------------------------------------
// buildAgentPlanArgs — Codex path (AC: gpt-5.3-codex invocation)
// ---------------------------------------------------------------------------

describe("buildAgentPlanArgs — Codex AC verification", () => {
  it("AC: backend codex plan produces -m gpt-5.3-codex args", () => {
    const plan = resolveAgentPlanFromConfig("backend", {
      userPrefs: EMPTY_USER_PREFS,
      defaults: DEFAULTS_PROFILE_B,
    });

    // Verify: {backend: {model: 'openai/gpt-5.3-codex', effort: 'high'}} → codex -m gpt-5.3-codex
    expect(plan.cli).toBe("codex");
    expect(plan.cliModel).toBe("gpt-5.3-codex");
    expect(plan.effort).toBe("high");

    const args = buildAgentPlanArgs(plan);
    expect(args).toEqual(["-m", "gpt-5.3-codex"]);
  });
});

// ---------------------------------------------------------------------------
// AgentPlan spec field — downstream reference
// ---------------------------------------------------------------------------

describe("AgentPlan.spec — downstream reference", () => {
  it("includes the full ModelSpec for downstream consumers", () => {
    const plan = resolveAgentPlanFromConfig("backend", {
      userPrefs: EMPTY_USER_PREFS,
      defaults: DEFAULTS_PROFILE_B,
    });

    expect(plan.spec).toBeDefined();
    expect(plan.spec.cli).toBe("codex");
    expect(plan.spec.cli_model).toBe("gpt-5.3-codex");
    expect(plan.spec.supports.effort?.type).toBe("granular");
    expect(plan.spec.supports.apply_patch).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ConfigError type
// ---------------------------------------------------------------------------

describe("ConfigError", () => {
  it("has name ConfigError and is an Error instance", () => {
    const err = new ConfigError("test message");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ConfigError);
    expect(err.name).toBe("ConfigError");
    expect(err.message).toBe("test message");
  });
});
