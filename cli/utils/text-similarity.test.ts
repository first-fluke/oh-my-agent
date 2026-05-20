import { describe, expect, it } from "vitest";
import { pairwiseSimilarity } from "./text-similarity.js";

describe("pairwiseSimilarity", () => {
  it("returns empty for fewer than two docs", () => {
    expect(pairwiseSimilarity([])).toEqual([]);
    expect(pairwiseSimilarity([{ id: "a", text: "hello world" }])).toEqual([]);
  });

  it("scores near-duplicate descriptions higher than unrelated ones", () => {
    const pairs = pairwiseSimilarity([
      {
        id: "frontend",
        text: "React Next.js TypeScript UI component frontend rendering",
      },
      {
        id: "frontend-twin",
        text: "Frontend React Next.js TypeScript UI component rendering",
      },
      {
        id: "db",
        text: "Database schema migration PostgreSQL indexing vector",
      },
    ]);
    const twinPair = pairs.find(
      (p) =>
        (p.a === "frontend" && p.b === "frontend-twin") ||
        (p.b === "frontend" && p.a === "frontend-twin"),
    );
    const cross = pairs.find(
      (p) =>
        (p.a === "frontend" && p.b === "db") ||
        (p.b === "frontend" && p.a === "db"),
    );
    expect(twinPair).toBeDefined();
    expect(cross).toBeDefined();
    expect(twinPair?.similarity).toBeGreaterThan(0.7);
    expect(cross?.similarity).toBeLessThan(0.2);
  });

  it("sorts results by similarity descending", () => {
    const pairs = pairwiseSimilarity([
      { id: "a", text: "alpha beta gamma" },
      { id: "b", text: "alpha beta delta" },
      { id: "c", text: "epsilon zeta eta" },
    ]);
    for (let i = 1; i < pairs.length; i++) {
      const prev = pairs[i - 1];
      const curr = pairs[i];
      if (!prev || !curr) continue;
      expect(prev.similarity).toBeGreaterThanOrEqual(curr.similarity);
    }
  });
});
