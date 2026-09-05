import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadGraphContext, resolveContextBundle } from "./context-loader.js";

describe("graph-backed runtime context", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-context-graph-"));
    for (const [file, content] of Object.entries({
      ".agents/agents/custom-agent.md": "Use custom-skill.",
      ".agents/skills/custom-skill/SKILL.md":
        "# Custom\nRead [details](resources/details.md)",
      ".agents/skills/custom-skill/resources/details.md":
        "REFERENCE_DETAILS\n[cycle](../SKILL.md)",
      ".agents/skills/unrelated/SKILL.md": "UNRELATED_CONTENT",
    })) {
      mkdirSync(join(root, file, ".."), { recursive: true });
      writeFileSync(join(root, file), content);
    }
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
  it("loads actual referenced content while excluding unrelated skills", () => {
    const context = loadGraphContext("custom-agent", "Simple", root);
    expect(context).toContain("REFERENCE_DETAILS");
    expect(context).not.toContain("UNRELATED_CONTENT");
    expect(
      context.match(/### .agents\/skills\/custom-skill\/SKILL.md/g),
    ).toHaveLength(1);
  });
  it("reports deferred references instead of exceeding the resource budget", () => {
    const bundle = resolveContextBundle("custom-agent", "Simple", root, {
      graph: true,
      maxTokens: 1,
    });
    expect(bundle.resources).toHaveLength(0);
    expect(bundle.skipped).toHaveLength(2);
  });
  it("does not load all shared resources for an unknown agent", () => {
    expect(loadGraphContext("missing", "Complex", root)).toBe("");
  });
});
