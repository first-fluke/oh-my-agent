import { describe, expect, it } from "vitest";
import { buildGraphData } from "../lib/recap/graph.js";
import type { NormalizedEntry } from "../lib/recap/schema.js";

function entry(
  overrides: Partial<NormalizedEntry> & { timestamp: number },
): NormalizedEntry {
  return {
    tool: "claude",
    prompt: "test",
    ...overrides,
  };
}

describe("buildGraphData", () => {
  it("returns empty for no entries", () => {
    const { nodes, edges } = buildGraphData([]);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it("creates nodes from projects", () => {
    const { nodes } = buildGraphData([
      entry({ timestamp: 1000, project: "alpha" }),
      entry({ timestamp: 2000, project: "alpha" }),
      entry({ timestamp: 3000, project: "beta" }),
    ]);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].id).toBe("alpha");
    expect(nodes[0].count).toBe(2);
    expect(nodes[1].id).toBe("beta");
    expect(nodes[1].count).toBe(1);
  });

  it("assigns primaryTool from most-used tool per project", () => {
    const { nodes } = buildGraphData([
      entry({ timestamp: 1000, project: "proj", tool: "claude" }),
      entry({ timestamp: 2000, project: "proj", tool: "gemini" }),
      entry({ timestamp: 3000, project: "proj", tool: "gemini" }),
    ]);
    expect(nodes[0].primaryTool).toBe("gemini");
  });

  it("creates edges between projects used within 30min", () => {
    const base = 1776000000000;
    const { edges } = buildGraphData([
      entry({ timestamp: base, project: "alpha" }),
      entry({ timestamp: base + 60_000, project: "beta" }), // 1min later
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0].weight).toBe(1);
  });

  it("does not create edges for projects >30min apart", () => {
    const base = 1776000000000;
    const { edges } = buildGraphData([
      entry({ timestamp: base, project: "alpha" }),
      entry({ timestamp: base + 31 * 60_000, project: "beta" }), // 31min later
    ]);
    expect(edges).toHaveLength(0);
  });

  it("does not create self-edges", () => {
    const base = 1776000000000;
    const { edges } = buildGraphData([
      entry({ timestamp: base, project: "alpha" }),
      entry({ timestamp: base + 1000, project: "alpha" }),
    ]);
    expect(edges).toHaveLength(0);
  });

  it("accumulates edge weights", () => {
    const base = 1776000000000;
    const { edges } = buildGraphData([
      entry({ timestamp: base, project: "alpha" }),
      entry({ timestamp: base + 1000, project: "beta" }),
      entry({ timestamp: base + 2000, project: "alpha" }),
      entry({ timestamp: base + 3000, project: "beta" }),
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0].weight).toBeGreaterThan(1);
  });

  it("respects top-K limit", () => {
    const { nodes } = buildGraphData(
      [
        entry({ timestamp: 1000, project: "a" }),
        entry({ timestamp: 2000, project: "a" }),
        entry({ timestamp: 3000, project: "a" }),
        entry({ timestamp: 4000, project: "b" }),
        entry({ timestamp: 5000, project: "b" }),
        entry({ timestamp: 6000, project: "c" }),
      ],
      2,
    );
    expect(nodes).toHaveLength(2);
    expect(nodes[0].id).toBe("a");
    expect(nodes[1].id).toBe("b");
  });

  it("excludes edges to filtered-out nodes", () => {
    const base = 1776000000000;
    const { edges } = buildGraphData(
      [
        entry({ timestamp: base, project: "big" }),
        entry({ timestamp: base + 1, project: "big" }),
        entry({ timestamp: base + 2, project: "big" }),
        entry({ timestamp: base + 1000, project: "small" }), // within 30min of "big"
      ],
      1, // top-1 = only "big"
    );
    expect(edges).toHaveLength(0);
  });

  it("groups unknown projects", () => {
    const { nodes } = buildGraphData([
      entry({ timestamp: 1000 }),
      entry({ timestamp: 2000 }),
    ]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("(unknown)");
  });
});
