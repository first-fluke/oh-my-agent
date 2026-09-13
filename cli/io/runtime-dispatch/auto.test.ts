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
import { collectProfileReport } from "../../commands/doctor/profile.js";
import {
  getExistingPreset,
  patchUserConfig,
} from "../../commands/install/preferences.js";
import { resolveVendor } from "../../platform/agent-config.js";
import {
  buildAgentPlanArgs,
  planDispatch,
  resolveAgentPlanFromConfig,
} from "../runtime-dispatch.js";
import { resolveAutoVendor } from "./detect.js";

describe("auto model selection", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    "codex",
    "claude",
    "cursor",
    "antigravity",
    "qwen",
    "opencode",
    "pi",
    "grok",
    "kiro",
    "kimi",
  ])("inherits %s without selecting a model or effort", (vendor) => {
    const plan = resolveAgentPlanFromConfig(
      "backend-engineer",
      { model_preset: "auto" },
      undefined,
      { OMA_RUNTIME_VENDOR: vendor },
    );
    expect(plan).toEqual({ cli: vendor });
    expect(buildAgentPlanArgs(plan)).toEqual([]);
  });

  it("detects Codex from its session and uses default_cli only without a runtime", () => {
    expect(
      resolveAutoVendor("qwen", undefined, { CODEX_THREAD_ID: "session" }),
    ).toBe("codex");
    expect(resolveAutoVendor("qwen", undefined, {})).toBe("qwen");
    expect(resolveAutoVendor(undefined, undefined, {})).toBe("claude");
    expect(
      resolveAutoVendor("qwen", "cursor", { CODEX_THREAD_ID: "session" }),
    ).toBe("cursor");
    expect(() => resolveAutoVendor("invalid", undefined, {})).toThrow(
      "Unsupported auto dispatch vendor",
    );
  });

  it("preserves explicit cross-vendor model and effort overrides", () => {
    const plan = resolveAgentPlanFromConfig(
      "backend-engineer",
      {
        model_preset: "auto",
        agents: { backend: { model: "openai/gpt-5.5", effort: "high" } },
      },
      undefined,
      { CLAUDECODE: "1" },
    );
    expect(plan.cli).toBe("codex");
    expect(plan.effort).toBe("high");
    expect(buildAgentPlanArgs(plan)).toEqual(["-m", "gpt-5.5"]);
  });

  it("validates explicit models instead of silently inheriting", () => {
    expect(() =>
      resolveAgentPlanFromConfig(
        "backend",
        {
          model_preset: "auto",
          agents: { backend: { model: "invalid/missing" } },
        },
        undefined,
        {},
      ),
    ).toThrow("invalid/missing");
  });

  it("keeps fixed presets independent of the invoking runtime", () => {
    const plan = resolveAgentPlanFromConfig(
      "backend",
      { model_preset: "antigravity" },
      undefined,
      { CODEX_THREAD_ID: "session" },
    );
    expect(plan.cli).toBe("antigravity");
    expect(plan.cliModel).toBeDefined();
  });
});

describe("auto dispatch integration", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-auto-"));
    mkdirSync(join(root, ".agents"));
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: auto\ndefault_cli: qwen\n",
    );
    vi.spyOn(process, "cwd").mockReturnValue(root);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("OMA_RUNTIME_VENDOR", "codex");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  it("resolves the vendor using auto, overrides, and the explicit CLI target", () => {
    expect(resolveVendor("backend-engineer").vendor).toBe("codex");
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: auto\nagents:\n  backend:\n    model: anthropic/claude-sonnet-4-6\n",
    );
    expect(resolveVendor("backend-engineer").vendor).toBe("claude");
    expect(resolveVendor("backend-engineer", "cursor").vendor).toBe("cursor");
  });

  it.each([
    ["codex", "native"],
    ["claude", "native"],
    ["cursor", "native"],
    ["qwen", "external"],
    ["pi", "external"],
  ])(
    "dispatches %s without OMA model flags or effort changes",
    (vendor, mode) => {
      mkdirSync(join(root, ".codex"));
      const configPath = join(root, ".codex", "config.toml");
      const content = 'model_reasoning_effort = "low"\n';
      writeFileSync(configPath, content);
      const dispatch = planDispatch(
        "backend-engineer",
        vendor,
        {
          command: vendor,
          model_flag: "--model",
          default_model: "must-not-be-injected",
        },
        "-p",
        "hello",
        { OMA_RUNTIME_VENDOR: vendor },
      );
      expect(dispatch.mode).toBe(mode);
      expect(dispatch.invocation.args).not.toContain("--model");
      expect(dispatch.invocation.args).not.toContain("-m");
      expect(dispatch.invocation.args).not.toContain("must-not-be-injected");
      expect(readFileSync(configPath, "utf8")).toBe(content);
    },
  );

  it("uses external dispatch for a different explicit vendor while still inheriting its defaults", () => {
    const dispatch = planDispatch(
      "backend-engineer",
      "claude",
      { command: "claude", model_flag: "--model", default_model: "stale" },
      "-p",
      "hello",
      { CODEX_THREAD_ID: "session" },
    );
    expect(dispatch.mode).toBe("external");
    expect(dispatch.invocation.args).not.toContain("stale");
  });

  it("reports inherited models and preserves quoted existing presets on reinstall", async () => {
    const report = await collectProfileReport(root);
    expect(report.missingPreset).toBe(false);
    expect(
      report.rows.every(
        (row) => row.cli === "codex" && row.source === "vendor",
      ),
    ).toBe(true);
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      'language: en\nmodel_preset: "antigravity"\n',
    );
    expect(getExistingPreset(root)).toBe("antigravity");
  });

  it("patches the CUE project preset without changing its schema alternatives", () => {
    const cuePath = join(root, ".agents", "oma-config.cue");
    writeFileSync(
      cuePath,
      '#OmaConfig: {\n  model_preset: "antigravity" | "codex" | string\n}\n#OmaConfig & {\n  language: "en"\n  model_preset: "antigravity" // project selection\n}\n',
    );
    patchUserConfig(root, "ko", "auto", ["codex"]);
    const content = readFileSync(cuePath, "utf8");
    expect(content).toContain('model_preset: "antigravity" | "codex" | string');
    expect(content).toContain('model_preset: "auto" // project selection');
    expect(content).toContain('language: "ko"');
  });
});

describe("resolveAgentPlanFromConfig — dispatch ids with an -agent suffix", () => {
  it("applies the bare-key override for eval-agent and opt-agent", () => {
    const config = {
      model_preset: "auto",
      agents: {
        eval: { model: "anthropic/claude-sonnet-4-6" },
        opt: { model: "anthropic/claude-sonnet-4-6" },
      },
    } as never;
    const env = { OMA_RUNTIME_VENDOR: "claude" } as NodeJS.ProcessEnv;
    expect(
      resolveAgentPlanFromConfig("eval-agent", config, undefined, env),
    ).toMatchObject({
      cli: "claude",
      cliModel: "claude-sonnet-4-6",
    });
    expect(
      resolveAgentPlanFromConfig("opt-agent", config, undefined, env),
    ).toMatchObject({
      cli: "claude",
      cliModel: "claude-sonnet-4-6",
    });
    // No override for the bare key: auto mode keeps the vendor session model.
    expect(
      resolveAgentPlanFromConfig("judge-agent", config, undefined, env)
        .cliModel,
    ).toBeUndefined();
  });
});
