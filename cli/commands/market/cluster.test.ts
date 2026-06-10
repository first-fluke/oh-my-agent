/**
 * cluster.test.ts — vitest tests for extractEntities, overlapCoefficient,
 * and clusterCandidates from cluster.ts.
 */

import { describe, expect, it } from "vitest";
import {
  clusterCandidates,
  extractEntities,
  overlapCoefficient,
} from "./cluster.js";
import type { Candidate } from "./shared/schema.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCandidate(
  overrides: Partial<Candidate> & {
    title: string;
    source: Candidate["source"];
  },
): Candidate {
  return {
    item_id: `item-${Math.random().toString(36).slice(2)}`,
    source: overrides.source,
    title: overrides.title,
    snippet: overrides.snippet ?? "",
    url: overrides.url ?? "https://example.com",
    published_at: overrides.published_at ?? "2026-01-01T00:00:00Z",
    engagement: overrides.engagement ?? {},
    metadata: overrides.metadata ?? {},
    rrf_score: overrides.rrf_score,
    scores: overrides.scores,
  };
}

// ---------------------------------------------------------------------------
// extractEntities
// ---------------------------------------------------------------------------

describe("extractEntities", () => {
  it("1. returns non-empty Set and includes long-enough lowercase tokens like 'apple' and digit-containing token 'iphone14'", () => {
    // Note: "M2" is length 2 and excluded by the length guard (word.length <= 2).
    // Use "iPhone14" (length 8, starts uppercase, has digit) to verify digit-containing token handling.
    const result = extractEntities(
      "VS Code crashed on Apple Silicon iPhone14 Pro",
    );
    expect(result.size).toBeGreaterThan(0);
    expect(result.has("apple")).toBe(true);
    expect(result.has("iphone14")).toBe(true);
  });

  it("2. removes stopwords: 'the', 'new', 'is', 'here' are excluded", () => {
    const result = extractEntities("the new launch is here");
    expect(result.has("the")).toBe(false);
    expect(result.has("new")).toBe(false);
    expect(result.has("is")).toBe(false);
    expect(result.has("here")).toBe(false);
  });

  it("3. skips tokens with length <= 2", () => {
    const result = extractEntities("go do it ok no AI");
    // "go", "do", "it", "ok", "no" all have length <= 2 and should be excluded
    expect(result.has("go")).toBe(false);
    expect(result.has("do")).toBe(false);
    expect(result.has("it")).toBe(false);
    expect(result.has("ok")).toBe(false);
    expect(result.has("no")).toBe(false);
    // "AI" has length 2 and is allUpper, but length guard triggers first
    expect(result.has("ai")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// overlapCoefficient
// ---------------------------------------------------------------------------

describe("overlapCoefficient", () => {
  it("4. overlap of {a,b,c} and {b,c,d} = 2/3 ≈ 0.667", () => {
    const a = new Set(["a", "b", "c"]);
    const b = new Set(["b", "c", "d"]);
    const result = overlapCoefficient(a, b);
    expect(result).toBeCloseTo(2 / 3, 5);
  });

  it("5. returns 0 when either set is empty", () => {
    expect(overlapCoefficient(new Set(), new Set(["a", "b"]))).toBe(0);
    expect(overlapCoefficient(new Set(["a", "b"]), new Set())).toBe(0);
    expect(overlapCoefficient(new Set(), new Set())).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// clusterCandidates
// ---------------------------------------------------------------------------

describe("clusterCandidates", () => {
  it("6. same-topic clustering: 3 VSCode-related + 3 unrelated → 2 clusters", () => {
    const vscodeGroup: Candidate[] = [
      makeCandidate({
        title: "VSCode performance slow large projects",
        source: "reddit",
        rrf_score: 0.9,
      }),
      makeCandidate({
        title: "VSCode slow performance extensions",
        source: "hn",
        rrf_score: 0.85,
      }),
      makeCandidate({
        title: "VSCode performance degradation slow response",
        source: "github",
        rrf_score: 0.8,
      }),
    ];

    const unrelatedGroup: Candidate[] = [
      makeCandidate({
        title: "Cooking pasta garlic butter sauce recipe",
        source: "reddit",
        rrf_score: 0.7,
      }),
      makeCandidate({
        title: "Best hiking trails Patagonia Argentina",
        source: "hn",
        rrf_score: 0.65,
      }),
      makeCandidate({
        title: "Photography tips portrait lighting",
        source: "github",
        rrf_score: 0.6,
      }),
    ];

    const clusters = clusterCandidates([...vscodeGroup, ...unrelatedGroup], {
      overlapThreshold: 0.4,
    });

    // Should produce at least 2 clusters
    expect(clusters.length).toBeGreaterThanOrEqual(2);

    // One cluster should contain the 3 VSCode candidates
    const vscodeCluster = clusters.find(
      (c) =>
        c.members.length === 3 &&
        c.members.some((m) => m.title?.toLowerCase().includes("vscode")),
    );
    expect(vscodeCluster).toBeDefined();
    expect(vscodeCluster?.members).toHaveLength(3);
  });

  it("7. single candidate input → 1 cluster with cross_source_count: 1", () => {
    const candidates: Candidate[] = [
      makeCandidate({
        title: "React hooks best practices state management",
        source: "reddit",
        rrf_score: 0.5,
      }),
    ];

    const clusters = clusterCandidates(candidates);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.cross_source_count).toBe(1);
    expect(clusters[0]?.members).toHaveLength(1);
  });

  it("8. MMR representatives: cluster with 5 highly similar candidates → ≤ 3 representatives", () => {
    // All candidates share the same topic entities to ensure they cluster together
    const candidates: Candidate[] = [
      makeCandidate({
        title: "TypeScript performance optimization webpack bundling",
        source: "reddit",
        rrf_score: 0.9,
      }),
      makeCandidate({
        title: "TypeScript performance optimization webpack configuration",
        source: "hn",
        rrf_score: 0.88,
      }),
      makeCandidate({
        title: "TypeScript performance optimization webpack speed",
        source: "github",
        rrf_score: 0.85,
      }),
      makeCandidate({
        title: "TypeScript performance optimization webpack tips",
        source: "reddit",
        rrf_score: 0.82,
      }),
      makeCandidate({
        title: "TypeScript performance optimization webpack tricks",
        source: "hn",
        rrf_score: 0.8,
      }),
    ];

    const clusters = clusterCandidates(candidates, { overlapThreshold: 0.3 });

    // All 5 should end up in one or very few clusters; find the largest
    expect(clusters.length).toBeGreaterThan(0);
    const seed = clusters[0];
    if (!seed) throw new Error("clusters must be non-empty");
    const largestCluster = clusters.reduce(
      (max, c) => (c.members.length > max.members.length ? c : max),
      seed,
    );
    expect(largestCluster.representatives.length).toBeLessThanOrEqual(3);
  });

  it("9. cross_source_count: cluster members from 3 distinct sources → cross_source_count: 3", () => {
    const candidates: Candidate[] = [
      makeCandidate({
        title: "Kubernetes deployment scaling production cluster",
        source: "reddit",
        rrf_score: 0.9,
      }),
      makeCandidate({
        title: "Kubernetes scaling production deployment pods",
        source: "hn",
        rrf_score: 0.85,
      }),
      makeCandidate({
        title: "Kubernetes production cluster deployment scaling",
        source: "github",
        rrf_score: 0.8,
      }),
    ];

    const clusters = clusterCandidates(candidates, { overlapThreshold: 0.3 });

    expect(clusters.length).toBeGreaterThanOrEqual(1);
    const mainCluster = clusters.find((c) => c.members.length === 3);
    expect(mainCluster).toBeDefined();
    expect(mainCluster?.cross_source_count).toBe(3);
  });

  it("10. deterministic cluster_id: same candidates produce same cluster_id across two runs", () => {
    const candidates: Candidate[] = [
      makeCandidate({
        item_id: "fixed-1",
        title: "Python asyncio event loop performance",
        source: "reddit",
        rrf_score: 0.9,
      }),
      makeCandidate({
        item_id: "fixed-2",
        title: "Python asyncio performance event loop",
        source: "hn",
        rrf_score: 0.85,
      }),
    ];

    const run1 = clusterCandidates(candidates, { overlapThreshold: 0.3 });
    const run2 = clusterCandidates(candidates, { overlapThreshold: 0.3 });

    expect(run1.length).toBe(run2.length);
    for (let i = 0; i < run1.length; i++) {
      expect(run1[i]?.cluster_id).toBe(run2[i]?.cluster_id);
    }
  });

  it("11. empty input → returns []", () => {
    const clusters = clusterCandidates([]);
    expect(clusters).toEqual([]);
  });

  it("12. input-order independence: same candidates in two different orderings produce identical cluster output", () => {
    // Use fixed item_ids and scores so quality() is deterministic.
    const a = makeCandidate({
      item_id: "order-a",
      title: "Python asyncio event loop performance tuning",
      source: "reddit",
      url: "https://reddit.com/a",
      rrf_score: 0.9,
    });
    const b = makeCandidate({
      item_id: "order-b",
      title: "Python asyncio performance event loop tuning",
      source: "hn",
      url: "https://hn.com/b",
      rrf_score: 0.85,
    });
    const c = makeCandidate({
      item_id: "order-c",
      title: "Cooking pasta garlic butter recipe",
      source: "reddit",
      url: "https://reddit.com/c",
      rrf_score: 0.4,
    });

    const order1 = clusterCandidates([a, b, c], { overlapThreshold: 0.3 });
    const order2 = clusterCandidates([c, b, a], { overlapThreshold: 0.3 });
    const order3 = clusterCandidates([b, c, a], { overlapThreshold: 0.3 });

    expect(order1.length).toBe(order2.length);
    expect(order1.length).toBe(order3.length);
    for (let i = 0; i < order1.length; i++) {
      expect(order1[i]?.cluster_id).toBe(order2[i]?.cluster_id);
      expect(order1[i]?.cluster_id).toBe(order3[i]?.cluster_id);
      expect(order1[i]?.members.map((m) => m.item_id).sort()).toEqual(
        order2[i]?.members.map((m) => m.item_id).sort(),
      );
    }
  });
});
