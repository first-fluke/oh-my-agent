import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyAgentDefinition } from "./agent-definition.js";
import type { DispatchPlan } from "./types.js";

function argumentAt(args: string[], index: number): string {
  const value = args[index];
  expect(value).toBeDefined();
  if (value === undefined)
    throw new Error(`Missing invocation argument ${index}`);
  return value;
}

describe("spawn role definitions", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-role-definition-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function writeRole(vendor: string, name: string, content: string) {
    const directory = join(root, `.${vendor}`, "agents");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, name), content);
  }

  function dispatch(vendor: string, args: string[]): DispatchPlan {
    return {
      mode: "external",
      runtimeVendor: "qwen",
      targetVendor: vendor,
      reason: "test",
      invocation: { command: vendor, args, env: {} },
    };
  }

  it("carries Claude persona and tools across a vendor boundary and resolves role aliases", () => {
    writeRole(
      "claude",
      "backend-engineer.md",
      [
        "---",
        "description: Backend engineer",
        "tools: Read, Write, Bash",
        "model: sonnet",
        "---",
        "Implement the API. 日本語も扱う。",
      ].join("\n"),
    );
    const plan = dispatch("claude", ["-p", "Implement route"]);
    applyAgentDefinition(plan, "backend", root, root);
    const roleIndex = plan.invocation.args.indexOf("--agents");
    expect(roleIndex).toBeGreaterThanOrEqual(0);
    expect(JSON.parse(argumentAt(plan.invocation.args, roleIndex + 1))).toEqual(
      {
        backend: {
          description: "Backend engineer",
          prompt: "Implement the API. 日本語も扱う。",
          tools: ["Read", "Write", "Bash"],
          model: "sonnet",
        },
      },
    );
    expect(plan.invocation.args.slice(0, 2)).toEqual(["--agent", "backend"]);
    expect(plan.invocation.args.slice(-2)).toEqual(["-p", "Implement route"]);
  });

  it("keeps an explicit Claude model selection and existing role selector", () => {
    writeRole(
      "claude",
      "qa-reviewer.md",
      "---\nmodel: sonnet\n---\nReview changes.",
    );
    const plan = dispatch("claude", [
      "--agent",
      "qa-reviewer",
      "--model",
      "opus",
      "-p",
      "Review",
    ]);
    applyAgentDefinition(plan, "qa-reviewer", root, root);
    expect(
      plan.invocation.args.filter((arg) => arg === "--agent"),
    ).toHaveLength(1);
    const index = plan.invocation.args.indexOf("--agents");
    expect(index).toBeGreaterThanOrEqual(0);
    expect(
      JSON.parse(argumentAt(plan.invocation.args, index + 1))["qa-reviewer"]
        .model,
    ).toBeUndefined();
    expect(plan.invocation.args).toContain("opus");
  });

  it("loads Codex instructions and effort as TOML overrides without changing its sandbox", () => {
    const prompt =
      'Check "quotes", backslashes \\ and newlines.\n한국어 instructions.';
    writeRole(
      "codex",
      "qa-reviewer.toml",
      stringifyToml({
        developer_instructions: prompt,
        model: "role-model",
        model_reasoning_effort: "high",
        sandbox_mode: "danger-full-access",
      }),
    );
    const plan = dispatch("codex", [
      "exec",
      "--sandbox",
      "read-only",
      "Review",
    ]);
    applyAgentDefinition(plan, "qa", root, root);
    const config = Object.assign(
      {},
      ...plan.invocation.args.flatMap((arg, i, args) =>
        arg === "-c" ? [parseToml(argumentAt(args, i + 1))] : [],
      ),
    );
    expect(config).toEqual({
      developer_instructions: prompt,
      model: "role-model",
      model_reasoning_effort: "high",
    });
    expect(plan.invocation.args.slice(-4)).toEqual([
      "exec",
      "--sandbox",
      "read-only",
      "Review",
    ]);
  });

  it("preserves a resolved Codex model and effort", () => {
    writeRole(
      "codex",
      "qa-reviewer.toml",
      stringifyToml({
        developer_instructions: "Review carefully.",
        model: "role-model",
        model_reasoning_effort: "high",
      }),
    );
    const plan = dispatch("codex", [
      "exec",
      "-m",
      "planned-model",
      "-c",
      'model_reasoning_effort="low"',
      "Review",
    ]);
    applyAgentDefinition(plan, "qa-reviewer", root, root);
    const configs = plan.invocation.args.flatMap((arg, i, args) =>
      arg === "-c" ? [parseToml(argumentAt(args, i + 1))] : [],
    );
    expect(configs).toEqual([
      { developer_instructions: "Review carefully." },
      { model_reasoning_effort: "low" },
    ]);
    expect(plan.invocation.args).toContain("planned-model");
  });

  it("preserves explicit Codex developer instructions", () => {
    writeRole(
      "codex",
      "qa-reviewer.toml",
      stringifyToml({
        developer_instructions: "Generated instructions.",
      }),
    );
    const plan = dispatch("codex", [
      "exec",
      '--config=developer_instructions="Explicit instructions."',
      "Review",
    ]);
    applyAgentDefinition(plan, "qa-reviewer", root, root);
    expect(plan.invocation.args).toEqual([
      "exec",
      '--config=developer_instructions="Explicit instructions."',
      "Review",
    ]);
  });

  it("merges existing Claude definitions and retains an explicit definition of the selected role", () => {
    writeRole(
      "claude",
      "qa-reviewer.md",
      "---\nmodel: sonnet\n---\nGenerated reviewer.",
    );
    const definitions = {
      other: { prompt: "Other role" },
      "qa-reviewer": {
        description: "Explicit reviewer",
        prompt: "User supplied reviewer",
      },
    };
    const plan = dispatch("claude", [
      "--agents",
      JSON.stringify(definitions),
      "-p",
      "Review",
    ]);
    applyAgentDefinition(plan, "qa-reviewer", root, root);
    const index = plan.invocation.args.indexOf("--agents");
    expect(index).toBeGreaterThanOrEqual(0);
    expect(JSON.parse(argumentAt(plan.invocation.args, index + 1))).toEqual(
      definitions,
    );
    expect(
      plan.invocation.args.filter((arg) => arg === "--agents"),
    ).toHaveLength(1);
  });

  it("uses the source persona when a worktree lacks vendor projections", () => {
    writeRole(
      "agents",
      "backend-engineer.md",
      "---\nmodel: anthropic/example\n---\nImplement the API.",
    );
    const workspace = join(root, "worktree");
    mkdirSync(workspace);
    const plan = dispatch("codex", ["exec", "Implement"]);
    applyAgentDefinition(plan, "backend", workspace, root);
    expect(parseToml(argumentAt(plan.invocation.args, 1))).toEqual({
      developer_instructions: "Implement the API.",
    });
  });

  it("leaves invocation unchanged when no definition exists", () => {
    const plan = dispatch("codex", ["exec", "Task"]);
    applyAgentDefinition(plan, "missing-role", root, root);
    expect(plan.invocation.args).toEqual(["exec", "Task"]);
  });
});
