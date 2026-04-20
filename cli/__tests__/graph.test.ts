import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildGraph } from "../cli-kit/graph.js";

describe("graph", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
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
