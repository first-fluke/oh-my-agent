import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installVendorAgents } from "./agent-composer.js";

describe("native agent configuration with auto", () => {
  let source: string;
  let target: string;
  beforeEach(() => {
    source = mkdtempSync(join(tmpdir(), "oma-auto-source-"));
    target = mkdtempSync(join(tmpdir(), "oma-auto-target-"));
    mkdirSync(join(source, ".agents", "agents", "variants"), {
      recursive: true,
    });
    mkdirSync(join(target, ".agents"));
    writeFileSync(
      join(source, ".agents", "oma-config.yaml"),
      "model_preset: antigravity\n",
    );
    writeFileSync(
      join(source, ".agents", "agents", "backend-engineer.md"),
      "---\nname: backend-engineer\ndescription: Backend work\n---\nImplement the assigned backend task.\n",
    );
    writeFileSync(
      join(source, ".agents", "agents", "variants", "codex.json"),
      JSON.stringify({
        vendor: "codex",
        destDir: ".codex/agents",
        modelDefault: "vendor-model",
        effortDefault: "medium",
        toolsDefault: [],
        protocolPath:
          ".agents/skills/_shared/runtime/execution-protocols/codex.md",
        agents: {},
      }),
    );
  });
  afterEach(() => {
    rmSync(source, { recursive: true, force: true });
    rmSync(target, { recursive: true, force: true });
  });

  function generate(config: string): string {
    writeFileSync(join(target, ".agents", "oma-config.yaml"), config);
    expect(installVendorAgents(source, target, "codex")).toBe(1);
    return readFileSync(
      join(target, ".codex", "agents", "backend-engineer.toml"),
      "utf8",
    );
  }

  it("keeps vendor agent definitions when no model is explicitly overridden", () => {
    const output = generate("model_preset: auto\n");
    expect(output).toContain('model = "vendor-model"');
    expect(output).toContain('model_reasoning_effort = "medium"');
  });

  it("applies the installed project's same-vendor override over native defaults", () => {
    const output = generate(
      "model_preset: auto\nagents:\n  backend:\n    model: openai/gpt-5.5\n    effort: high\n",
    );
    expect(output).toContain('model = "gpt-5.5"');
    expect(output).toContain('model_reasoning_effort = "high"');
  });

  it("keeps cross-vendor model overrides out of incompatible native files", () => {
    const output = generate(
      "model_preset: auto\nagents:\n  backend:\n    model: anthropic/claude-sonnet-4-6\n",
    );
    expect(output).toContain('model = "vendor-model"');
    expect(output).not.toContain("claude-sonnet");
  });
});

describe("native agent configuration with a pinned preset", () => {
  let source: string;
  let target: string;
  beforeEach(() => {
    source = mkdtempSync(join(tmpdir(), "oma-preset-source-"));
    target = mkdtempSync(join(tmpdir(), "oma-preset-target-"));
    const agents = join(source, ".agents", "agents");
    mkdirSync(join(agents, "variants"), { recursive: true });
    mkdirSync(join(target, ".agents"));
    writeFileSync(
      join(source, ".agents", "oma-config.yaml"),
      "model_preset: auto\n",
    );
    for (const [name, role] of [
      ["backend-engineer", "Backend work"],
      ["architecture-reviewer", "Architecture review"],
    ]) {
      writeFileSync(
        join(agents, `${name}.md`),
        `---\nname: ${name}\ndescription: ${role}\n---\nDo the assigned task.\n`,
      );
    }
    writeFileSync(
      join(agents, "variants", "codex.json"),
      JSON.stringify({
        vendor: "codex",
        destDir: ".codex/agents",
        modelDefault: "inherit",
        effortDefault: "medium",
        toolsDefault: [],
        agents: {},
      }),
    );
    writeFileSync(
      join(agents, "variants", "claude.json"),
      JSON.stringify({
        vendor: "claude",
        destDir: ".claude/agents",
        modelDefault: "sonnet",
        toolsDefault: [],
        agents: {},
      }),
    );
  });
  afterEach(() => {
    rmSync(source, { recursive: true, force: true });
    rmSync(target, { recursive: true, force: true });
  });

  function generate(
    config: string,
    vendor: "codex" | "claude",
    file: string,
  ): string {
    writeFileSync(join(target, ".agents", "oma-config.yaml"), config);
    expect(installVendorAgents(source, target, vendor)).toBe(2);
    return readFileSync(join(target, `.${vendor}`, "agents", file), "utf8");
  }

  it("pins the preset's routed Codex model and effort instead of the variant default", () => {
    const output = generate(
      "model_preset: codex\n",
      "codex",
      "backend-engineer.toml",
    );
    expect(output).toContain('model = "gpt-6.1-terra"');
    expect(output).toContain('model_reasoning_effort = "high"');
  });

  it("applies an agents override on top of the preset", () => {
    const output = generate(
      "model_preset: codex\nagents:\n  backend:\n    model: openai/gpt-6-luna\n    effort: low\n",
      "codex",
      "backend-engineer.toml",
    );
    expect(output).toContain('model = "gpt-6-luna"');
    expect(output).toContain('model_reasoning_effort = "low"');
  });

  it("inherits the parent model for a role the preset routes to another vendor", () => {
    const output = generate(
      "model_preset: mixed\n",
      "codex",
      "architecture-reviewer.toml",
    );
    expect(output).not.toMatch(/^model = /m);
  });

  it("pins the preset's Claude model per role", () => {
    const output = generate(
      "model_preset: claude\n",
      "claude",
      "architecture-reviewer.md",
    );
    expect(output).toMatch(/^model: claude-opus-5-5$/m);
  });

  it("inherits the parent model when the preset cannot be resolved", () => {
    const output = generate(
      "model_preset: missing-preset\n",
      "codex",
      "backend-engineer.toml",
    );
    expect(output).not.toMatch(/^model = /m);
  });
});
