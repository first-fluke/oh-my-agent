import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildGraph, selectGraph } from "./graph.js";

describe("graph", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("selects custom skill references and reverse impacts across Codex and workflows", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-graph-impact-"));
    tempRoots.push(root);
    const files = {
      ".agents/skills/custom-skill/SKILL.md":
        "Read [details](resources/details.md)",
      ".agents/skills/custom-skill/resources/details.md":
        "See [skill](../SKILL.md)",
      ".agents/workflows/custom.md": "Use custom-skill for this task.",
      ".codex/agents/custom-agent.toml": 'instructions = "Read custom-skill"',
      "cli/custom.test.ts":
        'readFileSync(".agents/skills/custom-skill/resources/details.md")',
    };
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(join(root, file, ".."), { recursive: true });
      writeFileSync(join(root, file), content);
    }
    const graph = buildGraph(root);
    const focused = selectGraph(graph, ["skill:custom-skill"], "dependencies");
    expect(focused.nodes.map((node) => node.id)).toEqual([
      "skill:custom-skill",
      "resource:custom-skill/resources/details.md",
    ]);
    const impacted = selectGraph(
      graph,
      [".agents/skills/custom-skill/resources/details.md"],
      "dependents",
    );
    expect(impacted.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining([
        "workflow:custom",
        "agent:custom-agent",
        "skill:custom-skill",
      ]),
    );
    expect(impacted.checks).toEqual([
      ["bun", "run", "--cwd", "cli", "test", "custom.test.ts"],
    ]);
    expect(
      selectGraph(graph, ["unknown-file"], "dependents").unmatched,
    ).toEqual(["unknown-file"]);
  });

  it("tracks nested shared resources recursively", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-graph-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents", "skills", "oma-backend", "resources"), {
      recursive: true,
    });
    mkdirSync(
      join(root, ".agents", "skills", "_shared", "core", "api-contracts"),
      {
        recursive: true,
      },
    );
    mkdirSync(join(root, ".agents", "skills", "_shared", "conditional"), {
      recursive: true,
    });
    mkdirSync(join(root, ".agents", "workflows"), { recursive: true });

    writeFileSync(
      join(root, ".agents", "skills", "oma-backend", "SKILL.md"),
      ["# Backend", "", "See `../_shared/core/context-loading.md`."].join("\n"),
    );
    writeFileSync(
      join(
        root,
        ".agents",
        "skills",
        "oma-backend",
        "resources",
        "execution-protocol.md",
      ),
      "See `../_shared/core/api-contracts/template.md`.",
    );
    writeFileSync(
      join(root, ".agents", "skills", "_shared", "core", "context-loading.md"),
      "# Context Loading\n",
    );
    writeFileSync(
      join(
        root,
        ".agents",
        "skills",
        "_shared",
        "core",
        "api-contracts",
        "template.md",
      ),
      "# Template\n",
    );
    writeFileSync(
      join(
        root,
        ".agents",
        "skills",
        "_shared",
        "conditional",
        "quality-score.md",
      ),
      "# Quality Score\n",
    );
    writeFileSync(
      join(root, ".agents", "workflows", "orchestrate.md"),
      "Load `.agents/skills/_shared/conditional/quality-score.md` when needed.",
    );

    const graph = buildGraph(root);
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    const edgeIds = new Set(
      graph.edges.map((edge) => `${edge.from}->${edge.to}`),
    );

    expect(nodeIds).toContain("shared:core");
    expect(nodeIds).toContain("shared:core/context-loading");
    expect(nodeIds).toContain("shared:core/api-contracts");
    expect(nodeIds).toContain("shared:core/api-contracts/template");
    expect(nodeIds).toContain("shared:conditional/quality-score");

    expect(edgeIds).toContain("skill:oma-backend->shared:core/context-loading");
    expect(edgeIds).toContain(
      "skill:oma-backend->shared:core/api-contracts/template",
    );
    expect(edgeIds).toContain(
      "workflow:orchestrate->shared:conditional/quality-score",
    );
  });
});
