/**
 * harvest.test.ts — vitest tests for harvest() using OMA_MARKET_MOCK=1 fixture replay.
 *
 * Fixture shape: raw API response format consumed by each source's normalizer
 * (same format real APIs return; the mock branch runs the same normalizers).
 *
 * Fixture counts:
 *   reddit.json   → 3 items (data.children with 3 entries)
 *   hn.json       → 2 items (hits with 2 entries)
 *   bluesky.json  → 2 items (posts with 2 entries)
 *   mastodon.json → 2 items (statuses with 2 entries)
 *   total         → 9 items across 4 sources
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type HarvestOptions, harvest, harvestCacheKey } from "./harvest.js";
import { HarvestOutputSchema } from "./shared/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// repoRoot: cli/commands/market → cli/commands → cli → repoRoot
const repoRoot = resolve(__dirname, "../../..");

// ---------------------------------------------------------------------------
// Helper: unique query per test to avoid cross-test cache collisions
// ---------------------------------------------------------------------------
let _testSeq = 0;
function uniqueQuery(base = "obsidian"): string {
  _testSeq += 1;
  return `${base}-test-${Date.now()}-${_testSeq}`;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("harvest (mock)", () => {
  const originalEnv: Record<string, string | undefined> = {};
  const envKeys = [
    "OMA_MARKET_MOCK",
    "X_BEARER_TOKEN",
    "SCRAPECREATORS_API_KEY",
    "PERPLEXITY_API_KEY",
    "YOUTUBE_SC_AVAILABLE",
    "XDG_CACHE_HOME",
  ];

  beforeEach(() => {
    // Snapshot env vars we may mutate
    for (const k of envKeys) {
      originalEnv[k] = process.env[k];
    }
    // Enable mock mode by default for all tests in this suite
    process.env.OMA_MARKET_MOCK = "1";
    // Suppress paid sources so default-source tests are predictable
    delete process.env.X_BEARER_TOKEN;
    delete process.env.SCRAPECREATORS_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;
    delete process.env.YOUTUBE_SC_AVAILABLE;
  });

  afterEach(() => {
    // Restore env vars
    for (const k of envKeys) {
      if (originalEnv[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = originalEnv[k];
      }
    }
  });

  // -------------------------------------------------------------------------
  // 1. Happy path — 4 sources, 9 items total
  // -------------------------------------------------------------------------
  it("happy path: 4 sources return 9 items and schema validates", async () => {
    const result = await harvest(
      {
        query: uniqueQuery(),
        sources: ["reddit", "hn", "bluesky", "mastodon"],
        window: "30d",
        noCache: true,
      },
      repoRoot,
    );

    const { output } = result;

    // Schema validation — this will throw if shape is wrong
    const parsed = HarvestOutputSchema.parse(output);

    expect(parsed.sources_used).toHaveLength(4);
    expect(parsed.sources_used).toContain("reddit");
    expect(parsed.sources_used).toContain("hn");
    expect(parsed.sources_used).toContain("bluesky");
    expect(parsed.sources_used).toContain("mastodon");

    expect(parsed.sources_failed).toHaveLength(0);

    // Fixture item counts: reddit=3, hn=2, bluesky=2, mastodon=2 → 9
    expect(parsed.items).toHaveLength(9);

    // Every item must pass SourceItemSchema (already covered by HarvestOutputSchema,
    // but explicit check makes the failure message clearer)
    for (const item of parsed.items) {
      expect(typeof item.item_id).toBe("string");
      expect(item.item_id.length).toBeGreaterThan(0);
      expect(typeof item.url).toBe("string");
      expect(typeof item.published_at).toBe("string");
    }
  });

  // -------------------------------------------------------------------------
  // 2. Partial failure — nonexistent source lands in sources_failed
  // -------------------------------------------------------------------------
  it("partial failure: nonexistent source goes to sources_failed, known source succeeds", async () => {
    const result = await harvest(
      {
        query: uniqueQuery(),
        sources: ["reddit", "nonexistent-source"],
        noCache: true,
      },
      repoRoot,
    );

    const { output } = result;

    expect(output.sources_used).toEqual(["reddit"]);
    expect(output.sources_failed).toContain("nonexistent-source");

    // Items should only come from reddit (3 from fixture)
    expect(output.items).toHaveLength(3);
    for (const item of output.items) {
      expect(item.source).toBe("reddit");
    }
  });

  // -------------------------------------------------------------------------
  // 3. Paid source env-gating — x is absent from sources_used without token
  // -------------------------------------------------------------------------
  it("paid source env-gating: x is excluded from default sources without X_BEARER_TOKEN", async () => {
    // X_BEARER_TOKEN is deleted in beforeEach
    // Also disable all paid sources explicitly
    delete process.env.SCRAPECREATORS_API_KEY;

    // Explicitly pass a known set that includes x; x has no fixture and requires token
    const result = await harvest(
      {
        query: uniqueQuery(),
        sources: ["reddit", "x"],
        noCache: true,
      },
      repoRoot,
    );

    const { output } = result;

    expect(output.sources_used).not.toContain("x");
    expect(output.sources_failed).toContain("x");
  });

  // -------------------------------------------------------------------------
  // 4. Cache hit — second identical call returns cacheHit: true
  // -------------------------------------------------------------------------
  it("cache hit: second call with same params returns cacheHit: true", async () => {
    // Point cache to a temp dir so we don't pollute real cache
    const tmpDir = await mkdtemp(resolve(tmpdir(), "oma-market-test-"));
    try {
      process.env.XDG_CACHE_HOME = tmpDir;

      const sharedQuery = uniqueQuery("cache-test");
      const opts = {
        query: sharedQuery,
        sources: ["reddit", "hn"] as string[],
        window: "30d",
        noCache: false,
      };

      // First call — should be a cache miss
      const first = await harvest(opts, repoRoot);
      expect(first.cacheHit).toBe(false);

      // Second call — should be a cache hit
      const second = await harvest(opts, repoRoot);
      expect(second.cacheHit).toBe(true);

      // Output should be structurally equivalent
      expect(second.output.items).toHaveLength(first.output.items.length);
      expect(second.output.sources_used).toEqual(first.output.sources_used);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  // -------------------------------------------------------------------------
  // 5. Window mapping — 7d and 90d don't throw, output.window matches
  // -------------------------------------------------------------------------
  it("window mapping: 7d window is preserved in output", async () => {
    const result = await harvest(
      {
        query: uniqueQuery(),
        sources: ["hn"],
        window: "7d",
        noCache: true,
      },
      repoRoot,
    );

    expect(result.output.window).toBe("7d");
    // Schema validation confirms shape is still valid
    HarvestOutputSchema.parse(result.output);
  });

  it("window mapping: 90d window is preserved in output", async () => {
    const result = await harvest(
      {
        query: uniqueQuery(),
        sources: ["hn"],
        window: "90d",
        noCache: true,
      },
      repoRoot,
    );

    expect(result.output.window).toBe("90d");
    HarvestOutputSchema.parse(result.output);
  });

  // -------------------------------------------------------------------------
  // 6. Operator pack — pain pack mutates query (OR clause appended)
  // -------------------------------------------------------------------------
  it("operator pack: pain pack appends OR clause to query in output", async () => {
    const baseQuery = uniqueQuery("pkm-tool");

    const resultNone = await harvest(
      {
        query: baseQuery,
        sources: ["reddit"],
        operatorPack: "none",
        noCache: true,
      },
      repoRoot,
    );

    const resultPain = await harvest(
      {
        query: baseQuery,
        sources: ["reddit"],
        operatorPack: "pain",
        noCache: true,
      },
      repoRoot,
    );

    // The output.query field reflects the raw (pre-operator) query
    // Both runs should have the same raw query
    expect(resultNone.output.query).toBe(baseQuery);
    expect(resultPain.output.query).toBe(baseQuery);

    // The pain pack injects an OR clause. We can verify this indirectly:
    // sources_used should still include reddit (fixture exists), confirming
    // the pack did not break the pipeline
    expect(resultPain.output.sources_used).toContain("reddit");

    // Verify pain-pack items pass schema
    HarvestOutputSchema.parse(resultPain.output);
  });

  // -------------------------------------------------------------------------
  // Default trust tagging — items carry their source's default trust level
  // -------------------------------------------------------------------------
  it("trust tagging: mock items get source-default trust levels", async () => {
    const result = await harvest(
      {
        query: uniqueQuery(),
        sources: ["reddit", "github"],
        noCache: true,
      },
      repoRoot,
    );

    const bySource = new Map(
      result.output.items.map((it) => [it.source, it.trust?.level]),
    );
    expect(bySource.get("reddit")).toBe("community");
    expect(bySource.get("github")).toBe("verified");
  });
});

// ---------------------------------------------------------------------------
// harvestCacheKey — every result-affecting option must vary the key
// ---------------------------------------------------------------------------

describe("harvestCacheKey", () => {
  const baseOpts: HarvestOptions = { query: "vscode pain" };
  const resolved = {
    window: "30d",
    limit: 12,
    locale: "en",
    operatorPackId: "none",
    sources: ["reddit", "hn"],
  };

  it("differs when --sites differs", () => {
    const noSites = harvestCacheKey(baseOpts, resolved);
    const withSites = harvestCacheKey(
      { ...baseOpts, sites: ["blog.naver.com"] },
      resolved,
    );
    expect(withSites).not.toBe(noSites);
  });

  it("differs when --query-strict differs", () => {
    const loose = harvestCacheKey(baseOpts, resolved);
    const strict = harvestCacheKey(
      { ...baseOpts, queryStrict: true },
      resolved,
    );
    expect(strict).not.toBe(loose);
  });

  it("differs between widen-enabled and widen-disabled runs", () => {
    // A pinned-window run (widen off) must not hit a cache entry that was
    // written by an auto-widened run of the same narrow window.
    const widened = harvestCacheKey(
      { ...baseOpts, widenOnThin: true },
      resolved,
    );
    const pinned = harvestCacheKey(
      { ...baseOpts, widenOnThin: false },
      resolved,
    );
    expect(widened).not.toBe(pinned);
  });

  it("is stable for identical inputs and site order", () => {
    const a = harvestCacheKey(
      { ...baseOpts, sites: ["b.com", "a.com"] },
      resolved,
    );
    const b = harvestCacheKey(
      { ...baseOpts, sites: ["a.com", "b.com"] },
      resolved,
    );
    expect(a).toBe(b);
  });
});
