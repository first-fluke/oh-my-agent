/**
 * fuse.test.ts — vitest tests for fuseCandidates() and canonicalUrl().
 */

import { describe, expect, it } from "vitest";
import { canonicalUrl, fuseCandidates } from "./fuse.js";
import type { Candidate } from "./shared/schema.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_SCORES = {
  relevance: 0.5,
  freshness: 0.5,
  engagement: 0.5,
  source_quality: 0.5,
  final: 0.5,
};

function makeCandidate(
  overrides: Partial<Candidate> & Pick<Candidate, "url" | "item_id" | "source">,
): Candidate {
  return {
    title: "Test Title",
    body: null,
    snippet: null,
    author: "testauthor",
    published_at: "2024-01-01T00:00:00Z",
    engagement: {},
    metadata: {},
    scores: { ...BASE_SCORES },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// canonicalUrl
// ---------------------------------------------------------------------------

describe("canonicalUrl", () => {
  it("strips www., old., m. prefixes", () => {
    expect(canonicalUrl("https://www.reddit.com/r/x/post/1")).toBe(
      "https://reddit.com/r/x/post/1",
    );
    expect(canonicalUrl("https://old.reddit.com/r/x/post/1")).toBe(
      "https://reddit.com/r/x/post/1",
    );
    expect(canonicalUrl("https://m.reddit.com/r/x/post/1")).toBe(
      "https://reddit.com/r/x/post/1",
    );
  });

  it("removes utm_* params but keeps non-utm params", () => {
    const result = canonicalUrl(
      "https://example.com/page?utm_source=twitter&utm_medium=social&ref=home",
    );
    expect(result).toBe("https://example.com/page?ref=home");
  });

  it("trims trailing slash from path", () => {
    expect(canonicalUrl("https://example.com/path/")).toBe(
      "https://example.com/path",
    );
  });

  it("drops URL fragment", () => {
    expect(canonicalUrl("https://example.com/page#section")).toBe(
      "https://example.com/page",
    );
  });

  it("falls back to lowercased original on parse failure", () => {
    expect(canonicalUrl("not a url")).toBe("not a url");
    expect(canonicalUrl("NOT A URL")).toBe("not a url");
  });
});

// ---------------------------------------------------------------------------
// fuseCandidates
// ---------------------------------------------------------------------------

describe("fuseCandidates", () => {
  // Test 6: Per-author cap
  it("per-author cap: limits candidates per author to maxPerAuthor", () => {
    const candidates: Candidate[] = Array.from({ length: 5 }, (_, i) =>
      makeCandidate({
        item_id: `item-${i}`,
        source: "reddit",
        author: "sameauthor",
        url: `https://reddit.com/r/test/comments/${i}`,
        scores: { ...BASE_SCORES, final: (5 - i) * 0.1 },
      }),
    );

    const result = fuseCandidates(candidates, { maxPerAuthor: 3 });

    // All same author — capped at 3
    const authorCandidates = result.filter(
      (c) => (c.author ?? "").toLowerCase() === "sameauthor",
    );
    expect(authorCandidates).toHaveLength(3);
    expect(result).toHaveLength(3);
  });

  // Test 7: URL dedupe
  it("URL dedupe: two URLs with same canonical merge into one candidate with summed rrf_score", () => {
    const c1 = makeCandidate({
      item_id: "item-www",
      source: "reddit",
      url: "https://www.x.com/path/",
      author: "author1",
      scores: { ...BASE_SCORES, final: 0.8 },
    });
    const c2 = makeCandidate({
      item_id: "item-bare",
      source: "reddit",
      url: "https://x.com/path",
      author: "author2",
      scores: { ...BASE_SCORES, final: 0.6 },
    });

    const result = fuseCandidates([c1, c2]);

    // Both canonicalize to https://x.com/path → 1 candidate
    expect(result).toHaveLength(1);

    // RRF contributions: both in same source "reddit"
    // c1 has higher final (0.8) → rank 0 → 1/(60+0+1) = 1/61
    // c2 has lower final (0.6) → rank 1 → 1/(60+1+1) = 1/62
    // Sum: 1/61 + 1/62
    const expectedRrfScore = 1 / 61 + 1 / 62;
    expect(result[0]?.rrf_score).toBeCloseTo(expectedRrfScore, 10);
  });

  // Test 8: Sort order
  it("sort order: output is sorted by (-rrf_score, -scores.final, -scores.freshness)", () => {
    // Three candidates from different sources so each has rank 0 and equal rrf_score
    // Differentiate by scores.final to verify secondary sort
    const candidates: Candidate[] = [
      makeCandidate({
        item_id: "low",
        source: "reddit",
        author: "a1",
        url: "https://reddit.com/r/a",
        scores: { ...BASE_SCORES, final: 0.2, freshness: 0.5 },
      }),
      makeCandidate({
        item_id: "high",
        source: "hn",
        author: "a2",
        url: "https://news.ycombinator.com/item?id=1",
        scores: { ...BASE_SCORES, final: 0.9, freshness: 0.5 },
      }),
      makeCandidate({
        item_id: "mid",
        source: "bluesky",
        author: "a3",
        url: "https://bsky.app/profile/x/post/1",
        scores: { ...BASE_SCORES, final: 0.5, freshness: 0.5 },
      }),
    ];

    const result = fuseCandidates(candidates);

    // All have same rrf_score (rank 0 in their source), so sorted by scores.final desc
    expect(result[0]?.item_id).toBe("high");
    expect(result[1]?.item_id).toBe("mid");
    expect(result[2]?.item_id).toBe("low");
  });

  // Test 9: Multi-source merge
  it("multi-source merge: same canonical URL from 3 sources yields rrf_score = sum of 1/(60+rank) per list", () => {
    const sharedUrl = "https://example.com/article";

    const candidates: Candidate[] = [
      makeCandidate({
        item_id: "src-reddit",
        source: "reddit",
        author: "a1",
        url: sharedUrl,
        scores: { ...BASE_SCORES, final: 0.9 },
      }),
      makeCandidate({
        item_id: "src-hn",
        source: "hn",
        author: "a2",
        url: sharedUrl,
        scores: { ...BASE_SCORES, final: 0.8 },
      }),
      makeCandidate({
        item_id: "src-bluesky",
        source: "bluesky",
        author: "a3",
        url: sharedUrl,
        scores: { ...BASE_SCORES, final: 0.7 },
      }),
    ];

    const result = fuseCandidates(candidates);

    // One canonical URL across 3 sources → 1 candidate
    expect(result).toHaveLength(1);

    // Each is rank 0 in its source list → contribution = 1/(60+0+1) = 1/61
    // Total rrf_score = 3 * (1/61)
    const expectedRrfScore = 3 * (1 / 61);
    expect(result[0]?.rrf_score).toBeCloseTo(expectedRrfScore, 10);
  });

  // Test 10: Empty input
  it("empty input: returns empty array", () => {
    expect(fuseCandidates([])).toEqual([]);
  });

  // Test 11: diversityRelevanceThreshold filters low-score candidates when set
  it("diversityRelevanceThreshold: filters candidates below threshold when option is provided", () => {
    const candidates: Candidate[] = [
      makeCandidate({
        item_id: "high-score",
        source: "reddit",
        author: "auth1",
        url: "https://reddit.com/r/a",
        scores: { ...BASE_SCORES, final: 0.9 },
      }),
      makeCandidate({
        item_id: "mid-score",
        source: "hn",
        author: "auth2",
        url: "https://news.ycombinator.com/item?id=2",
        scores: { ...BASE_SCORES, final: 0.5 },
      }),
      makeCandidate({
        item_id: "low-score",
        source: "bluesky",
        author: "auth3",
        url: "https://bsky.app/profile/x/post/3",
        scores: { ...BASE_SCORES, final: 0.1 },
      }),
    ];

    // Each candidate is rank 0 in its source → rrf_score = 1/(60+1) ≈ 0.0164
    // Set threshold above that so all are filtered
    const resultFiltered = fuseCandidates(candidates, {
      diversityRelevanceThreshold: 0.1,
    });
    // rrf_score ~= 0.0164 which is below 0.1 → all filtered
    expect(resultFiltered).toHaveLength(0);

    // With a threshold of 0, no filtering occurs
    const resultZero = fuseCandidates(candidates, {
      diversityRelevanceThreshold: 0,
    });
    expect(resultZero).toHaveLength(3);
  });

  // Test 12: without diversityRelevanceThreshold, output is unchanged
  it("diversityRelevanceThreshold: without option output is identical to no option at all", () => {
    const candidates: Candidate[] = [
      makeCandidate({
        item_id: "item-1",
        source: "reddit",
        author: "auth1",
        url: "https://reddit.com/r/a",
        scores: { ...BASE_SCORES, final: 0.9 },
      }),
      makeCandidate({
        item_id: "item-2",
        source: "hn",
        author: "auth2",
        url: "https://news.ycombinator.com/item?id=2",
        scores: { ...BASE_SCORES, final: 0.5 },
      }),
    ];

    const withoutOption = fuseCandidates(candidates);
    const withNoThreshold = fuseCandidates(candidates, { rrfK: 60 });

    expect(withoutOption.map((c) => c.item_id)).toEqual(
      withNoThreshold.map((c) => c.item_id),
    );
    expect(withoutOption.map((c) => c.rrf_score)).toEqual(
      withNoThreshold.map((c) => c.rrf_score),
    );
  });
});
