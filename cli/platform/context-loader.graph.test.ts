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
  it("loads the entry skill once and defers supporting content", () => {
    const context = loadGraphContext("custom-agent", "Simple", root);
    expect(context).not.toContain("REFERENCE_DETAILS");
    expect(context).toContain("resources/details.md");
    expect(context).not.toContain("UNRELATED_CONTENT");
    expect(
      context.match(/### .agents\/skills\/custom-skill\/SKILL.md/g),
    ).toHaveLength(1);
  });
  it("preserves the required entry skill and reports a soft budget overrun", () => {
    const bundle = resolveContextBundle("custom-agent", "Simple", root, {
      graph: true,
      maxTokens: 1,
    });
    expect(bundle.resources).toEqual([".agents/skills/custom-skill/SKILL.md"]);
    expect(bundle.budgetExceeded).toBe(true);
    expect(bundle.skipped).toContain(
      ".agents/skills/custom-skill/resources/details.md",
    );
  });
  it("does not load all shared resources for an unknown agent", () => {
    expect(loadGraphContext("missing", "Complex", root)).toBe("");
  });
  it("does not inject a referenced specialist or conditional protocol at any difficulty", () => {
    mkdirSync(join(root, ".agents/skills/_shared/conditional"), {
      recursive: true,
    });
    writeFileSync(
      join(root, ".agents/skills/_shared/conditional/experiment-ledger.md"),
      "EXPERIMENT_BODY",
    );
    writeFileSync(
      join(root, ".agents/skills/custom-skill/SKILL.md"),
      "# Custom\n[ledger](../_shared/conditional/experiment-ledger.md)\n[other](../unrelated/SKILL.md)",
    );
    for (const difficulty of ["Simple", "Medium", "Complex"] as const) {
      const context = loadGraphContext("custom-agent", difficulty, root);
      expect(context).not.toContain("EXPERIMENT_BODY");
      expect(context).not.toContain("UNRELATED_CONTENT");
      expect(context).toContain("# Custom");
    }
  });
  it("loads an explicitly selected supporting reference once", () => {
    const file = ".agents/skills/custom-skill/resources/details.md";
    const bundle = resolveContextBundle("custom-agent", "Medium", root, {
      graph: true,
      requestedResources: [file, file],
    });
    expect(bundle.resources).toEqual([
      ".agents/skills/custom-skill/SKILL.md",
      file,
    ]);
    expect(() =>
      resolveContextBundle("custom-agent", "Medium", root, {
        requestedResources: ["../../secret.md"],
      }),
    ).toThrow(/not a reference/);
  });
});
