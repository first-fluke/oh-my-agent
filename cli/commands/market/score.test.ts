/**
 * score.test.ts — vitest tests for scoreItems() from score.ts.
 */

import { describe, expect, it } from "vitest";
import { scoreItems, validateScoreItems } from "./score.js";
import type { SourceItem } from "./shared/schema.js";

// ---------------------------------------------------------------------------
// Fixed timestamp for determinism: approximately 2025-05-23T00:00:00Z
// ---------------------------------------------------------------------------

const NOW_MS = 1747958400000;

// ---------------------------------------------------------------------------
// Helper: build a minimal SourceItem fixture
// ---------------------------------------------------------------------------

function makeItem(
  overrides: Partial<SourceItem> & Pick<SourceItem, "source">,
): SourceItem {
  return {
    item_id: `item-${Math.random().toString(36).slice(2)}`,
    url: "https://example.com",
    published_at: new Date(NOW_MS).toISOString(),
    engagement: {},
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("scoreItems", () => {
  // -------------------------------------------------------------------------
  // 1. Same input — 3 intents produce different orderings
  // -------------------------------------------------------------------------
  it("same input 3 intents differ", () => {
    const items: SourceItem[] = [
      makeItem({
        item_id: "r1",
        source: "reddit",
        published_at: new Date(NOW_MS - 2 * 86_400_000).toISOString(),
        engagement: {
          score: 5000,
          num_comments: 800,
          upvote_ratio: 0.95,
          top_comment_score: 200,
        },
      }),
      makeItem({
        item_id: "h1",
        source: "hn",
        published_at: new Date(NOW_MS - 10 * 86_400_000).toISOString(),
        engagement: { points: 900, num_comments: 300 },
      }),
      makeItem({
        item_id: "b1",
        source: "bluesky",
        published_at: new Date(NOW_MS - 1 * 86_400_000).toISOString(),
        engagement: { like_count: 100, repost_count: 50, reply_count: 20 },
      }),
      makeItem({
        item_id: "g1",
        source: "github",
        published_at: new Date(NOW_MS - 30 * 86_400_000).toISOString(),
        engagement: { reactions: 400, comments: 150 },
      }),
    ];

    const sortByFinal = (candidates: ReturnType<typeof scoreItems>) =>
      [...candidates].sort(
        (a, b) => (b.scores?.final ?? 0) - (a.scores?.final ?? 0),
      );

    const painRanked = sortByFinal(
      scoreItems(items, { intent: "pain", nowMs: NOW_MS }),
    );
    const trendRanked = sortByFinal(
      scoreItems(items, { intent: "trend", nowMs: NOW_MS }),
    );
    const competitorRanked = sortByFinal(
      scoreItems(items, { intent: "competitor", nowMs: NOW_MS }),
    );

    // Top items differ across at least two of the three intents
    const painTop = painRanked[0]?.item_id;
    const trendTop = trendRanked[0]?.item_id;
    const competitorTop = competitorRanked[0]?.item_id;

    const allSame = painTop === trendTop && trendTop === competitorTop;
    expect(allSame).toBe(false);

    // Or final scores differ for at least one item across intents
    const painFinals = scoreItems(items, { intent: "pain", nowMs: NOW_MS }).map(
      (c) => c.scores?.final,
    );
    const trendFinals = scoreItems(items, {
      intent: "trend",
      nowMs: NOW_MS,
    }).map((c) => c.scores?.final);
    const anyDiffers = painFinals.some((v, i) => v !== trendFinals[i]);
    expect(anyDiffers).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. Missing engagement falls back to source-quality + freshness
  // -------------------------------------------------------------------------
  it("missing engagement falls back to source-quality + freshness", () => {
    const item = makeItem({
      source: "reddit",
      engagement: {},
      published_at: new Date(NOW_MS - 1 * 86_400_000).toISOString(),
    });

    const [candidate] = scoreItems([item], { intent: "pain", nowMs: NOW_MS });
    if (!candidate) throw new Error("scoreItems returned empty array");

    // engagement raw = 0 (no non-zero fields) → normalized engagement = 0
    expect(candidate.scores?.engagement).toBeCloseTo(0, 2);

    // source_quality for reddit = 0.6 > 0
    expect(candidate.scores?.source_quality).toBeGreaterThan(0);

    // final > 0 because source_quality and freshness contribute
    expect(candidate.scores?.final).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 3. Freshness ranges by mode
  // -------------------------------------------------------------------------
  it("freshness ranges by mode", () => {
    const publishedAt = new Date(NOW_MS - 5 * 86_400_000).toISOString();
    const item = makeItem({ source: "hn", published_at: publishedAt });

    const [balanced] = scoreItems([item], {
      intent: "pain",
      freshnessMode: "balanced_recent",
      nowMs: NOW_MS,
    });
    const [strict] = scoreItems([item], {
      intent: "pain",
      freshnessMode: "strict_recent",
      nowMs: NOW_MS,
    });
    const [evergreen] = scoreItems([item], {
      intent: "pain",
      freshnessMode: "evergreen_ok",
      nowMs: NOW_MS,
    });

    if (!balanced || !strict || !evergreen)
      throw new Error("scoreItems returned undefined entry");

    const bFresh = balanced.scores?.freshness ?? -1;
    const sFresh = strict.scores?.freshness ?? -1;
    const eFresh = evergreen.scores?.freshness ?? -1;

    // Values must differ
    expect(bFresh).not.toBeCloseTo(sFresh, 2);
    expect(bFresh).not.toBeCloseTo(eFresh, 2);
    expect(sFresh).not.toBeCloseTo(eFresh, 2);

    // balanced_recent ∈ [0.10, 0.90] — raw score in [10..90], normalized /100
    expect(bFresh).toBeGreaterThanOrEqual(0.1);
    expect(bFresh).toBeLessThanOrEqual(0.9);

    // strict_recent ∈ [0, 1]
    expect(sFresh).toBeGreaterThanOrEqual(0);
    expect(sFresh).toBeLessThanOrEqual(1.0);

    // evergreen_ok ∈ [0.40, 1.00] — floor of 40/100=0.4
    expect(eFresh).toBeGreaterThanOrEqual(0.4);
    expect(eFresh).toBeLessThanOrEqual(1.0);

    // Verify expected computed values
    // days=5, base=85
    // balanced: (85*0.8+10)/100 = 0.78
    // strict:   85/100 = 0.85
    // evergreen: (85*0.6+40)/100 = 0.91
    expect(bFresh).toBeCloseTo(0.78, 2);
    expect(sFresh).toBeCloseTo(0.85, 2);
    expect(eFresh).toBeCloseTo(0.91, 2);
  });

  // -------------------------------------------------------------------------
  // 4. Pain blend matches spec
  // -------------------------------------------------------------------------
  it("pain blend matches spec", () => {
    // Use grounding (source_quality=0.9), strict_recent at nowMs (freshness=1.0),
    // and extremely large engagement (normalizes to 1.0 after clamping).
    const _item = makeItem({
      source: "grounding",
      published_at: new Date(NOW_MS).toISOString(),
      engagement: {
        // grounding has no entry in ENGAGEMENT_WEIGHTS so raw=0
        // Use youtube to get clamped engagement=1.0
      },
    });

    // Since grounding has no ENGAGEMENT_WEIGHTS entry, engagement will be 0.
    // Use youtube with huge numbers to get engagement=1.0.
    const itemYt = makeItem({
      source: "youtube",
      published_at: new Date(NOW_MS).toISOString(),
      // youtube weights: views=0.4, likes=0.3, comments=0.3
      // log1p(1e13)≈29.93; sum = 29.93*(0.4+0.3+0.3)=29.93 → /30 ≈ 0.998 → clamped 1.0
      engagement: { views: 1e13, likes: 1e13, comments: 1e13 },
      // source_quality for youtube = 0.85; freshness strict_recent = 1.0
      // pain blend: 1.0*0.4 + 1.0*0.3 + 0.85*0.3 + 0.5*0.0 = 0.4+0.3+0.255 = 0.955
    });

    const [candidate] = scoreItems([itemYt], {
      intent: "pain",
      freshnessMode: "strict_recent",
      nowMs: NOW_MS,
    });

    if (!candidate) throw new Error("scoreItems returned empty array");

    expect(candidate.scores?.engagement).toBeCloseTo(1.0, 2);
    expect(candidate.scores?.freshness).toBeCloseTo(1.0, 2);
    // source_quality = 0.85 for youtube
    expect(candidate.scores?.source_quality).toBeCloseTo(0.85, 2);
    // pain final = 1.0*0.4 + 1.0*0.3 + 0.85*0.3 + 0.5*0.0 = 0.955
    expect(candidate.scores?.final).toBeCloseTo(0.955, 2);
    // Allow generous tolerance per task spec: should be approximately 1.0
    expect(candidate.scores?.final).toBeGreaterThan(0.9);
  });

  // -------------------------------------------------------------------------
  // 5. All sources covered
  // -------------------------------------------------------------------------
  it("all sources covered", () => {
    // Known sources from SourceNameSchema + truthsocial (in SOURCE_QUALITY map)
    const sources = [
      "reddit",
      "hn",
      "x",
      "bluesky",
      "mastodon",
      "github",
      "youtube",
      "tiktok",
      "instagram",
      "polymarket",
      "perplexity",
      "grounding",
      // truthsocial is in SOURCE_QUALITY map; cast as known source
    ] as const;

    const items: SourceItem[] = sources.map((source) =>
      makeItem({
        item_id: `item-${source}`,
        source: source as SourceItem["source"],
        published_at: new Date(NOW_MS - 7 * 86_400_000).toISOString(),
        engagement: buildEngagementForSource(source),
      }),
    );

    // Also include truthsocial (in SOURCE_QUALITY but not SourceNameSchema enum)
    const truthsocialItem = makeItem({
      item_id: "item-truthsocial",
      source: "truthsocial" as SourceItem["source"],
      published_at: new Date(NOW_MS - 7 * 86_400_000).toISOString(),
      engagement: { likes: 100, reposts: 50, replies: 25 },
    });

    const allItems = [...items, truthsocialItem];
    const candidates = scoreItems(allItems, { intent: "pain", nowMs: NOW_MS });

    expect(candidates).toHaveLength(allItems.length);

    for (const candidate of candidates) {
      const eng = candidate.scores?.engagement;
      const sq = candidate.scores?.source_quality;

      // engagement must not be NaN
      expect(eng).not.toBeNaN();
      expect(typeof eng).toBe("number");

      // source_quality must be > 0 (minimum is DEFAULT_SOURCE_QUALITY=0.6)
      expect(sq).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// validateScoreItems — stage-boundary schema validation
// ---------------------------------------------------------------------------

describe("validateScoreItems", () => {
  it("accepts well-formed items and applies schema defaults", () => {
    const items = validateScoreItems([
      {
        item_id: "hn:1",
        source: "hn",
        url: "https://news.ycombinator.com/item?id=1",
        published_at: new Date(NOW_MS).toISOString(),
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.engagement).toEqual({});
    expect(items[0]?.metadata).toEqual({});
  });

  it("rejects unknown source values instead of scoring them with defaults", () => {
    expect(() =>
      validateScoreItems([
        {
          item_id: "x:1",
          source: "myspace",
          url: "https://example.com",
          published_at: new Date(NOW_MS).toISOString(),
        },
      ]),
    ).toThrow(/schema mismatch at items\.0\.source/);
  });

  it("rejects items missing required fields", () => {
    expect(() =>
      validateScoreItems([{ item_id: "hn:1", source: "hn" }]),
    ).toThrow(/schema mismatch/);
  });
});

// ---------------------------------------------------------------------------
// Helper: build representative engagement for each source
// ---------------------------------------------------------------------------

function buildEngagementForSource(source: string): Record<string, number> {
  switch (source) {
    case "reddit":
      return {
        score: 500,
        num_comments: 100,
        upvote_ratio: 0.92,
        top_comment_score: 80,
      };
    case "hn":
      return { points: 300, num_comments: 80 };
    case "x":
      return { likes: 200, reposts: 50, replies: 30, quotes: 10 };
    case "bluesky":
      return { like_count: 150, repost_count: 40, reply_count: 20 };
    case "mastodon":
      return { favourites_count: 120, reblogs_count: 30, replies_count: 15 };
    case "github":
      return { reactions: 200, comments: 50 };
    case "youtube":
      return { views: 50000, likes: 2000, comments: 500 };
    case "tiktok":
      return { plays: 100000, likes: 5000, comments: 300 };
    case "instagram":
      return { views: 30000, likes: 3000, comments: 200 };
    case "polymarket":
      return { volume: 50000, liquidity: 20000 };
    case "perplexity":
      return {};
    case "grounding":
      return {};
    default:
      return {};
  }
}
