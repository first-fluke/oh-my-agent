import { describe, expect, it } from "vitest";
import type { EffortLevel, ModelSpec } from "../../platform/model-registry.js";
import { agyModelForEffort, buildAgentPlanArgs } from "./plan-args.js";
import type { AgentPlan } from "./types.js";

// ---------------------------------------------------------------------------
// plan-args.test.ts — antigravity (agy) model resolution.
//
// Regression context: agy models are addressed by the display IDs printed by
// `agy models` ("Gemini 3.1 Pro (High)"); the registry slug form
// (`gemini-3.1-pro`) matches no model, so the subagent dies before its prompt
// runs (print mode: `Error: invalid --model`; ACP driver: `unknown model`).
// ---------------------------------------------------------------------------

function agyPlan(
  cliModel: string,
  levels: EffortLevel[],
  effort?: EffortLevel,
): AgentPlan & { cliModel: string } {
  const spec = {
    cli: "antigravity",
    cli_model: cliModel,
    supports: {
      effort: { type: "granular", levels },
      apply_patch: false,
      task_budget: false,
      prompt_cache: true,
      computer_use: false,
      native_dispatch_from: ["antigravity"],
      api_only: false,
    },
    auth_hint: "",
  } as ModelSpec;
  return { cli: "antigravity", cliModel, effort, spec };
}

describe("agyModelForEffort", () => {
  it("keeps the registry default tier when the agent pins no effort", () => {
    expect(
      agyModelForEffort(agyPlan("Gemini 3.1 Pro (High)", ["low", "high"])),
    ).toBe("Gemini 3.1 Pro (High)");
  });

  it("swaps the tier suffix for a published effort level", () => {
    expect(
      agyModelForEffort(
        agyPlan("Gemini 3.1 Pro (High)", ["low", "high"], "low"),
      ),
    ).toBe("Gemini 3.1 Pro (Low)");
  });

  it("uses the XHigh tier when agy publishes it (Gemini 4 Hydrogen)", () => {
    expect(
      agyModelForEffort(
        agyPlan(
          "Gemini 4 Hydrogen (High)",
          ["low", "medium", "high", "xhigh"],
          "xhigh",
        ),
      ),
    ).toBe("Gemini 4 Hydrogen (XHigh)");
  });

  it("collapses xhigh onto the published High tier", () => {
    expect(
      agyModelForEffort(
        agyPlan("Gemini 3.1 Pro (Low)", ["low", "high"], "xhigh"),
      ),
    ).toBe("Gemini 3.1 Pro (High)");
  });

  // agy rejects the whole invocation on an unknown model string rather than
  // degrading, so an unpublished tier must fall back instead of being invented.
  it("falls back to the default when the tier is not published", () => {
    expect(
      agyModelForEffort(
        agyPlan("Gemini 3.1 Pro (High)", ["low", "high"], "medium"),
      ),
    ).toBe("Gemini 3.1 Pro (High)");
  });

  it("leaves a model without a tier suffix untouched", () => {
    expect(
      agyModelForEffort(agyPlan("GPT-OSS 120B", ["low", "high"], "low")),
    ).toBe("GPT-OSS 120B");
  });
});

describe("buildAgentPlanArgs — antigravity", () => {
  it("passes the agy display ID, never the slug form", () => {
    const args = buildAgentPlanArgs(
      agyPlan("Gemini 3.1 Pro (High)", ["low", "high"]),
    );
    expect(args).toEqual(["--model", "Gemini 3.1 Pro (High)"]);
    expect(args).not.toContain("gemini-3.1-pro");
  });
});
