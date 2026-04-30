/**
 * resolveAgentPlanFromConfig integration tests
 *
 * New API: resolveAgentPlanFromConfig(agentId, config: Partial<OmaConfig>, vendorOverride?)
 * config.model_preset selects a built-in preset; config.agents provides per-agent overrides.
 *
 * Test cases:
 *  1.  agents override takes precedence over preset default
 *  2.  thinking flag from agents override preserved
 *  3.  missing agentId falls back to orchestrator default
 *  4.  Claude cli-session model → effort dropped + WARN
 *  5.  api_only slug → throws ConfigError
 *  6.  Unknown slug → throws ConfigError with actionable message
 *  7.  vendorOverride matches native_dispatch_from → cli overridden
 *  8.  vendorOverride not in native_dispatch_from → WARN, cli NOT overridden
 *  9.  Codex effort="high" → setCodexReasoningEffort reflects "high"
 * 10.  Qwen effort="high" → --thinking flag
 * 11.  Qwen effort="none" → --no-thinking flag
 * 12.  Gemini effort translation to thinking-budget
 * 13.  No agents override → uses preset defaults directly
 * 14.  AgentSpec with model only (no effort) → no effort in plan
 * 15.  Unknown model_preset → throws ConfigError
 * 16.  custom_presets with extends merges correctly
 * 17.  buildAgentPlanArgs for Claude → --model args
 * 18.  buildAgentPlanArgs for Codex → -m args
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
// Fixtures — OmaConfig objects
// ---------------------------------------------------------------------------

/** Minimal config using codex-only preset — backend gets gpt-5.3-codex + effort:high */
const CODEX_ONLY_CONFIG = {
  language: "en",
  model_preset: "codex-only",
} as const;

/** Minimal config using claude-only preset — all agents get claude-sonnet-4-6 */
const CLAUDE_ONLY_CONFIG = {
  language: "en",
  model_preset: "claude-only",
} as const;

/** Minimal config using gemini-only preset */
const GEMINI_ONLY_CONFIG = {
  language: "en",
  model_preset: "gemini-only",
} as const;

/** Minimal config using qwen-only preset */
const QWEN_ONLY_CONFIG = {
  language: "en",
  model_preset: "qwen-only",
} as const;

// ---------------------------------------------------------------------------
// Case 1: agents override takes precedence over preset default
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 1: agents override precedence", () => {
  it("uses model from agents override, not preset default", () => {
    const config = {
      ...CODEX_ONLY_CONFIG,
      agents: {
        backend: { model: "openai/gpt-5.4", effort: "medium" as const },
      },
    };
    const plan = resolveAgentPlanFromConfig("backend", config);
    expect(plan.cliModel).toBe("gpt-5.4");
    expect(plan.cli).toBe("codex");
    expect(plan.effort).toBe("medium");
  });

  it("preserves preset defaults for agents not in override map", () => {
    const config = {
      ...CODEX_ONLY_CONFIG,
      agents: {
        backend: { model: "openai/gpt-5.4", effort: "medium" as const },
      },
    };
    // qa is not overridden — falls back to codex-only preset qa entry
    const plan = resolveAgentPlanFromConfig("qa", config);
    expect(plan.cli).toBe("codex");
  });
});

// ---------------------------------------------------------------------------
// Case 2: thinking flag from agents override
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 2: thinking flag from override", () => {
  it("picks up thinking flag from agents override", () => {
    const config = {
      ...GEMINI_ONLY_CONFIG,
      agents: {
        retrieval: {
          model: "google/gemini-3-flash",
          thinking: true as const,
        },
      },
    };
    const plan = resolveAgentPlanFromConfig("retrieval", config);
    expect(plan.cli).toBe("gemini");
    expect(plan.thinking).toBe(true);
    expect(plan.cliModel).toBe("gemini-3-flash");
  });
});

// ---------------------------------------------------------------------------
// Case 3: missing agentId falls back to orchestrator
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 3: unknown agentId falls back to orchestrator", () => {
  it("uses orchestrator preset when agentId not in preset agent_defaults", () => {
    const plan = resolveAgentPlanFromConfig(
      "nonexistent-role",
      CLAUDE_ONLY_CONFIG,
    );
    // claude-only orchestrator is claude-sonnet-4-6
    expect(plan.cli).toBe("claude");
    expect(plan.cliModel).toBe("claude-sonnet-4-6");
  });
});

// ---------------------------------------------------------------------------
// Case 4: Claude cli-session model → effort dropped + WARN
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 4: Claude effort drop (R14)", () => {
  it("drops effort and emits WARN for Claude cli-session model", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = {
      ...CLAUDE_ONLY_CONFIG,
      agents: {
        backend: {
          model: "anthropic/claude-opus-4-7",
          effort: "high" as const,
        },
      },
    };
    const plan = resolveAgentPlanFromConfig("backend", config);
    expect(plan.effort).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("effort field is ignored for Claude CLI"),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("cli-session"),
    );
    warnSpy.mockRestore();
  });

  it("does not emit WARN when effort not set for Claude model", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // claude-only qa preset has no effort
    const plan = resolveAgentPlanFromConfig("qa", CLAUDE_ONLY_CONFIG);
    expect(plan.effort).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Case 5: Unknown slug → throws ConfigError
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 5: unknown slug throws ConfigError", () => {
  it("throws ConfigError with actionable message for unregistered slug", () => {
    const config = {
      ...CODEX_ONLY_CONFIG,
      agents: {
        frontend: { model: "openai/gpt-6-future" },
      },
    };
    expect(() => resolveAgentPlanFromConfig("frontend", config)).toThrow(
      ConfigError,
    );
    expect(() => resolveAgentPlanFromConfig("frontend", config)).toThrow(
      /Unknown model slug/,
    );
  });
});

// ---------------------------------------------------------------------------
// Case 7: vendorOverride matches native_dispatch_from
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 7: vendorOverride matches native_dispatch_from", () => {
  it("overrides cli when vendorOverride is in native_dispatch_from", () => {
    // gemini-only retrieval uses google/gemini-3.1-flash-lite (native_dispatch_from: gemini)
    const plan = resolveAgentPlanFromConfig(
      "retrieval",
      GEMINI_ONLY_CONFIG,
      "gemini",
    );
    expect(plan.cli).toBe("gemini");
  });
});

// ---------------------------------------------------------------------------
// Case 8: vendorOverride not in native_dispatch_from
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 8: vendorOverride not in native_dispatch_from", () => {
  it("warns and keeps original cli when vendorOverride not supported", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // gemini-only retrieval; codex is NOT in native_dispatch_from
    const plan = resolveAgentPlanFromConfig(
      "retrieval",
      GEMINI_ONLY_CONFIG,
      "codex",
    );
    expect(plan.cli).toBe("gemini");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('"codex" is not in native_dispatch_from'),
    );
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Case 9: Codex effort="high" → setCodexReasoningEffort
// ---------------------------------------------------------------------------

describe("setCodexReasoningEffort — Case 9: Codex effort in TOML", () => {
  it("sets model_reasoning_effort to 'high'", () => {
    const base = parseCodexConfig("");
    const updated = setCodexReasoningEffort(base, "high");
    expect(updated.model_reasoning_effort).toBe("high");
  });

  it("idempotent: calling twice gives same result", () => {
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

  it("codex-only backend plan has effort=high → TOML shows model_reasoning_effort=high", () => {
    // codex-only preset: backend = { model: openai/gpt-5.3-codex, effort: high }
    const plan = resolveAgentPlanFromConfig("backend", CODEX_ONLY_CONFIG);
    expect(plan.cli).toBe("codex");
    expect(plan.effort).toBe("high");
    const tomlSettings = setCodexReasoningEffort({}, plan.effort);
    expect(tomlSettings.model_reasoning_effort).toBe("high");
    expect(serializeCodexConfig(tomlSettings)).toContain(
      'model_reasoning_effort = "high"',
    );
  });
});

// ---------------------------------------------------------------------------
// Cases 10 & 11: Qwen effort translation
// ---------------------------------------------------------------------------

describe("qwenThinkingFlag — Cases 10 & 11: Qwen effort translation", () => {
  it("returns --thinking for effort=high (Case 10)", () => {
    const config = {
      ...QWEN_ONLY_CONFIG,
      agents: {
        backend: { model: "qwen/qwen3-coder-plus", effort: "high" as const },
      },
    };
    const plan = resolveAgentPlanFromConfig("backend", config);
    expect(plan.cli).toBe("qwen");
    expect(plan.effort).toBe("high");
    expect(qwenThinkingFlag(plan)).toBe("--thinking");
    expect(buildAgentPlanArgs(plan)).toContain("--thinking");
    expect(buildAgentPlanArgs(plan)).toContain("-m");
    expect(buildAgentPlanArgs(plan)).toContain("qwen3-coder-plus");
  });

  it("returns --no-thinking for effort=none (Case 11)", () => {
    const config = {
      ...QWEN_ONLY_CONFIG,
      agents: {
        backend: {
          model: "qwen/qwen3-coder-plus",
          effort: "none" as const,
          thinking: false as const,
        },
      },
    };
    const plan = resolveAgentPlanFromConfig("backend", config);
    expect(qwenThinkingFlag(plan)).toBe("--no-thinking");
    expect(buildAgentPlanArgs(plan)).toContain("--no-thinking");
  });

  it("returns --no-thinking for effort=medium", () => {
    const config = {
      ...QWEN_ONLY_CONFIG,
      agents: {
        backend: {
          model: "qwen/qwen3-coder-plus",
          effort: "medium" as const,
          thinking: false as const,
        },
      },
    };
    const plan = resolveAgentPlanFromConfig("backend", config);
    expect(qwenThinkingFlag(plan)).toBe("--no-thinking");
  });

  it("thinking:true override takes priority over effort level", () => {
    const config = {
      ...QWEN_ONLY_CONFIG,
      agents: {
        backend: {
          model: "qwen/qwen3-coder-plus",
          effort: "none" as const,
          thinking: true as const,
        },
      },
    };
    const plan = resolveAgentPlanFromConfig("backend", config);
    expect(qwenThinkingFlag(plan)).toBe("--thinking");
  });

  it("thinking:false override takes priority over effort level", () => {
    const config = {
      ...QWEN_ONLY_CONFIG,
      agents: {
        backend: {
          model: "qwen/qwen3-coder-plus",
          effort: "xhigh" as const,
          thinking: false as const,
        },
      },
    };
    const plan = resolveAgentPlanFromConfig("backend", config);
    expect(qwenThinkingFlag(plan)).toBe("--no-thinking");
  });
});

// ---------------------------------------------------------------------------
// Case 12: Gemini effort → thinking-budget
// ---------------------------------------------------------------------------

describe("geminiThinkingBudgetFlag — Case 12: Gemini effort translation", () => {
  it("effort=high maps to --thinking-budget=dynamic for gemini-3-flash", () => {
    const config = {
      ...GEMINI_ONLY_CONFIG,
      agents: {
        retrieval: {
          model: "google/gemini-3-flash",
          effort: "high" as const,
        },
      },
    };
    const plan = resolveAgentPlanFromConfig("retrieval", config);
    expect(plan.cli).toBe("gemini");
    expect(geminiThinkingBudgetFlag(plan)).toBe("--thinking-budget=dynamic");
    const args = buildAgentPlanArgs(plan);
    expect(args).toContain("--model");
    expect(args).toContain("gemini-3-flash");
    expect(args).toContain("--thinking-budget=dynamic");
  });

  it("effort=xhigh maps to --thinking-budget=dynamic", () => {
    const config = {
      ...GEMINI_ONLY_CONFIG,
      agents: {
        retrieval: {
          model: "google/gemini-3-flash",
          effort: "xhigh" as const,
        },
      },
    };
    const plan = resolveAgentPlanFromConfig("retrieval", config);
    expect(geminiThinkingBudgetFlag(plan)).toBe("--thinking-budget=dynamic");
  });

  it("effort=low maps to --thinking-budget=none", () => {
    const config = {
      ...GEMINI_ONLY_CONFIG,
      agents: {
        retrieval: {
          model: "google/gemini-3-flash",
          effort: "low" as const,
        },
      },
    };
    const plan = resolveAgentPlanFromConfig("retrieval", config);
    expect(geminiThinkingBudgetFlag(plan)).toBe("--thinking-budget=none");
  });

  it("effort=medium maps to --thinking-budget=none", () => {
    const config = {
      ...GEMINI_ONLY_CONFIG,
      agents: {
        retrieval: {
          model: "google/gemini-3-flash",
          effort: "medium" as const,
        },
      },
    };
    const plan = resolveAgentPlanFromConfig("retrieval", config);
    expect(geminiThinkingBudgetFlag(plan)).toBe("--thinking-budget=none");
  });

  it("thinking:true maps to --thinking-budget=dynamic regardless of effort", () => {
    const config = {
      ...GEMINI_ONLY_CONFIG,
      agents: {
        retrieval: {
          model: "google/gemini-3-flash",
          effort: "low" as const,
          thinking: true as const,
        },
      },
    };
    const plan = resolveAgentPlanFromConfig("retrieval", config);
    expect(geminiThinkingBudgetFlag(plan)).toBe("--thinking-budget=dynamic");
  });

  it("thinking:false maps to --thinking-budget=none regardless of effort", () => {
    const config = {
      ...GEMINI_ONLY_CONFIG,
      agents: {
        retrieval: {
          model: "google/gemini-3.1-pro-preview",
          effort: "xhigh" as const,
          thinking: false as const,
        },
      },
    };
    const plan = resolveAgentPlanFromConfig("retrieval", config);
    expect(geminiThinkingBudgetFlag(plan)).toBe("--thinking-budget=none");
  });

  it("gemini-3.1-pro-preview high effort uses dynamic", () => {
    const config = {
      ...GEMINI_ONLY_CONFIG,
      agents: {
        architecture: {
          model: "google/gemini-3.1-pro-preview",
          effort: "high" as const,
        },
      },
    };
    const plan = resolveAgentPlanFromConfig("architecture", config);
    expect(geminiThinkingBudgetFlag(plan)).toBe("--thinking-budget=dynamic");
  });
});

// ---------------------------------------------------------------------------
// Case 13: no agents override — uses preset defaults directly
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 13: preset defaults (no override)", () => {
  it("codex-only backend uses gpt-5.3-codex + effort:high from preset", () => {
    const plan = resolveAgentPlanFromConfig("backend", CODEX_ONLY_CONFIG);
    expect(plan.cliModel).toBe("gpt-5.3-codex");
    expect(plan.effort).toBe("high");
    expect(plan.cli).toBe("codex");
  });

  it("claude-only qa uses claude-sonnet-4-6 from preset", () => {
    const plan = resolveAgentPlanFromConfig("qa", CLAUDE_ONLY_CONFIG);
    expect(plan.cli).toBe("claude");
    expect(plan.cliModel).toBe("claude-sonnet-4-6");
  });
});

// ---------------------------------------------------------------------------
// Case 14: AgentSpec with model only (no effort)
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 14: AgentSpec model-only override", () => {
  it("produces plan without effort when base preset entry has no effort", () => {
    // claude-only retrieval has no effort in preset; override just changes model
    const config = {
      ...CLAUDE_ONLY_CONFIG,
      agents: {
        retrieval: { model: "anthropic/claude-sonnet-4-6" },
      },
    };
    const plan = resolveAgentPlanFromConfig("retrieval", config);
    expect(plan.effort).toBeUndefined();
    expect(plan.thinking).toBeUndefined();
    expect(plan.memory).toBeUndefined();
    expect(plan.cliModel).toBe("claude-sonnet-4-6");
  });
});

// ---------------------------------------------------------------------------
// Case 15: Unknown model_preset → throws ConfigError
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 15: unknown model_preset", () => {
  it("throws ConfigError for unrecognised preset key", () => {
    const config = { language: "en", model_preset: "nonexistent-preset" };
    expect(() => resolveAgentPlanFromConfig("backend", config)).toThrow(
      ConfigError,
    );
    expect(() => resolveAgentPlanFromConfig("backend", config)).toThrow(
      /Unknown model_preset/,
    );
  });

  it("throws ConfigError when model_preset is absent", () => {
    expect(() =>
      resolveAgentPlanFromConfig("backend", { language: "en" }),
    ).toThrow(ConfigError);
    expect(() =>
      resolveAgentPlanFromConfig("backend", { language: "en" }),
    ).toThrow(/model_preset.*missing/i);
  });
});

// ---------------------------------------------------------------------------
// Case 16: custom_presets with extends
// ---------------------------------------------------------------------------

describe("resolveAgentPlanFromConfig — Case 16: custom_presets with extends", () => {
  it("custom preset extends claude-only and overrides backend", () => {
    const config = {
      language: "en",
      model_preset: "my-team",
      custom_presets: {
        "my-team": {
          description: "Team preset",
          extends: "claude-only",
          agent_defaults: {
            backend: {
              model: "openai/gpt-5.3-codex",
              effort: "high" as const,
            },
          },
        },
      },
    };
    // backend is overridden to codex
    const backendPlan = resolveAgentPlanFromConfig("backend", config);
    expect(backendPlan.cli).toBe("codex");
    expect(backendPlan.cliModel).toBe("gpt-5.3-codex");

    // qa is inherited from claude-only
    const qaPlan = resolveAgentPlanFromConfig("qa", config);
    expect(qaPlan.cli).toBe("claude");
  });
});

// ---------------------------------------------------------------------------
// buildAgentPlanArgs — Claude
// ---------------------------------------------------------------------------

describe("buildAgentPlanArgs — Claude", () => {
  it("produces --model {cliModel} args for Claude", () => {
    const plan = resolveAgentPlanFromConfig("qa", CLAUDE_ONLY_CONFIG);
    expect(plan.cli).toBe("claude");
    expect(buildAgentPlanArgs(plan)).toEqual(["--model", "claude-sonnet-4-6"]);
  });
});

// ---------------------------------------------------------------------------
// buildAgentPlanArgs — Codex
// ---------------------------------------------------------------------------

describe("buildAgentPlanArgs — Codex", () => {
  it("produces -m gpt-5.3-codex args for codex-only backend", () => {
    const plan = resolveAgentPlanFromConfig("backend", CODEX_ONLY_CONFIG);
    expect(plan.cli).toBe("codex");
    expect(plan.cliModel).toBe("gpt-5.3-codex");
    expect(buildAgentPlanArgs(plan)).toEqual(["-m", "gpt-5.3-codex"]);
  });
});

// ---------------------------------------------------------------------------
// AgentPlan.spec — downstream reference
// ---------------------------------------------------------------------------

describe("AgentPlan.spec — downstream reference", () => {
  it("includes the full ModelSpec for downstream consumers", () => {
    const plan = resolveAgentPlanFromConfig("backend", CODEX_ONLY_CONFIG);
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
