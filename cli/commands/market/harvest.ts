/**
 * `oma market harvest` — fan-out harvest across community sources.
 *
 * This module is the public facade + orchestration layer:
 *   - `harvest()`     — resolve sources, fan-out fetch, aggregate, cache
 *   - `runHarvest()`  — CLI argv parsing + exit codes
 *
 * The moving parts live in sibling modules:
 *   - `harvest-endpoints.ts`   — URL templates, reddit auth, window helpers
 *   - `harvest-normalizers.ts` — per-source response → SourceItem adapters
 *   - `harvest-sources.ts`     — the SOURCE_FETCHERS registry + dispatcher
 *
 * The endpoint/auth helpers are re-exported here so existing importers and the
 * endpoint regression tests keep resolving them from `./harvest.js`.
 */

import { join } from "node:path";
import {
  fetchSource,
  fetchSourceMock,
  resolveDefaultSources,
  type SourceResult,
} from "./harvest-sources.js";
import { cacheKey, parseTtl, readCache, writeCache } from "./shared/cache.js";
import {
  buildQueryWithOperators,
  loadOperatorPack,
} from "./shared/operators.js";
import { findRepoRoot } from "./shared/repo-root.js";
import {
  type HarvestOutput,
  SOURCE_TRUST_DEFAULTS,
  type SourceItem,
} from "./shared/schema.js";

// Re-exported for downstream importers and `harvest.endpoints.test.ts`.
export {
  buildPullpushUrl,
  getRedditToken,
  pullpushToListing,
  SOURCE_URL_TEMPLATES,
} from "./harvest-endpoints.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface HarvestOptions {
  query: string;
  sources?: string[];
  window?: string;
  perSourceLimit?: number;
  operatorPack?: "pain" | "positive" | "competitor" | "discovery" | "none";
  locale?: "en" | "ko";
  cacheTtl?: number;
  noCache?: boolean;
  vs?: string;
  timeoutMs?: number;
  // grounding/DDG `site:` filter list. When set + grounding in sources,
  // harvest fans out one DDG query per site and aggregates.
  sites?: string[];
  // post-filter: drop items where the raw query token doesn't appear in
  // title (low precision queries on full-text search engines like Clien).
  queryStrict?: boolean;
  // auto-widen: when the first pass yields fewer than `widenThreshold`
  // items, re-harvest with a wider window. Disabled when user pins
  // `--window` explicitly via the CLI runner (see runHarvest).
  widenOnThin?: boolean;
  widenThreshold?: number;
}

export interface HarvestResult {
  output: HarvestOutput;
  cacheHit: boolean;
}

/**
 * Cache key over every option that affects the harvest result set.
 * `sites`/`queryStrict` filter items; the widen options change the effective
 * window a thin corpus is re-fetched with — omitting any of these lets two
 * semantically different runs collide on one cache entry within the TTL.
 */
export function harvestCacheKey(
  opts: HarvestOptions,
  resolved: {
    window: string;
    limit: number;
    locale: string;
    operatorPackId: string;
    sources: string[];
  },
): string {
  return cacheKey({
    query: opts.query.trim(),
    window: resolved.window,
    sources: [...resolved.sources].sort(),
    operatorPack: resolved.operatorPackId,
    locale: resolved.locale,
    vs: opts.vs ?? null,
    perSourceLimit: resolved.limit,
    sites: opts.sites?.length ? [...opts.sites].sort() : null,
    queryStrict: opts.queryStrict ?? false,
    widenOnThin: opts.widenOnThin ?? false,
    widenThreshold: opts.widenOnThin ? (opts.widenThreshold ?? 5) : null,
  });
}

// ---------------------------------------------------------------------------
// Core harvest function
// ---------------------------------------------------------------------------

export async function harvest(
  opts: HarvestOptions,
  repoRoot: string,
): Promise<HarvestResult> {
  // 1. Sanitize query
  const rawQuery = opts.query.trim();
  if (!rawQuery) {
    throw new Error("[harvest] query must not be empty");
  }

  const window = opts.window ?? "30d";
  const limit = opts.perSourceLimit ?? 12;
  const locale = opts.locale ?? "en";
  const ttl = opts.cacheTtl ?? 15 * 60_000;
  const operatorPackId = opts.operatorPack ?? "none";
  const timeoutMs = opts.timeoutMs ?? 30_000;

  // 2. Resolve sources
  const sources = opts.sources?.length
    ? opts.sources
    : await resolveDefaultSources();

  // 3. Build query with operator pack
  const operatorPack = await loadOperatorPack(operatorPackId, repoRoot);
  const builtQuery = buildQueryWithOperators(rawQuery, operatorPack, locale);

  // 4. Cache check — the key must cover every option that changes the result
  // set (sites/queryStrict filter items; widen options change the effective
  // window), otherwise differently-flagged runs collide on one entry.
  const key = harvestCacheKey(opts, {
    window,
    limit,
    locale,
    operatorPackId,
    sources,
  });

  if (!opts.noCache) {
    const cached = await readCache<HarvestOutput>(key, ttl);
    if (cached !== null) {
      return { output: cached, cacheHit: true };
    }
  }

  // 5. Mock mode
  const isMock = process.env.OMA_MARKET_MOCK === "1";
  const fixtureDir = join(
    repoRoot,
    "cli",
    "commands",
    "market",
    "__fixtures__",
    "harvest",
  );

  // 6. Fan-out fetches (primary query)
  const primaryResults = await Promise.allSettled(
    sources.map((source) =>
      isMock
        ? fetchSourceMock(source, fixtureDir)
        : fetchSource(
            source,
            builtQuery,
            window,
            limit,
            timeoutMs,
            undefined,
            opts.sites,
          ),
    ),
  );

  // 7. Fan-out fetches for vs competitor
  let vsResults: PromiseSettledResult<SourceResult>[] = [];
  if (opts.vs) {
    const vsQuery = buildQueryWithOperators(opts.vs, operatorPack, locale);
    vsResults = await Promise.allSettled(
      sources.map((source) =>
        isMock
          ? fetchSourceMock(source, fixtureDir, opts.vs)
          : fetchSource(
              source,
              vsQuery,
              window,
              limit,
              timeoutMs,
              opts.vs,
              opts.sites,
            ),
      ),
    );
  }

  // 8. Aggregate
  const sourcesFailed: string[] = [];
  const sourcesUsed: string[] = [];
  const allItems: SourceItem[] = [];

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const primary = primaryResults[i];

    if (!source) continue;

    if (primary?.status === "fulfilled") {
      const sr = primary.value;
      if (sr.failed) {
        if (!sourcesFailed.includes(source)) {
          sourcesFailed.push(source);
        }
        if (sr.reason) {
          process.stderr.write(`[harvest] ${source} failed: ${sr.reason}\n`);
        }
      } else {
        if (!sourcesUsed.includes(source)) {
          sourcesUsed.push(source);
        }
        allItems.push(...sr.items);
      }
    } else {
      if (!sourcesFailed.includes(source)) {
        sourcesFailed.push(source);
      }
      const reason =
        primary?.status === "rejected"
          ? primary.reason instanceof Error
            ? primary.reason.message
            : String(primary.reason)
          : "unknown";
      process.stderr.write(`[harvest] ${source} failed: ${reason}\n`);
    }
  }

  // vs results
  if (opts.vs) {
    for (let i = 0; i < sources.length; i++) {
      const vsResult = vsResults[i];
      if (vsResult?.status === "fulfilled" && !vsResult.value.failed) {
        allItems.push(...vsResult.value.items);
      }
    }
  }

  // Optional --query-strict: every whitespace-separated query token must
  // appear (case-insensitive) in title OR snippet/body. AND-match — trades
  // recall for precision on full-text search engines (Clien, DDG) that
  // also match body text. Single-token queries still work as before.
  const tokens = rawQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  const strictFiltered = opts.queryStrict
    ? allItems.filter((it) => {
        const haystack = [it.title ?? "", it.snippet ?? "", it.body ?? ""]
          .join(" ")
          .toLowerCase();
        return tokens.every((tok) => haystack.includes(tok));
      })
    : allItems;

  // Tag each item with its source's default trust level unless the fetcher
  // already set one. Downstream `render --min-trust` filters on this.
  const finalItems = strictFiltered.map((it) =>
    it.trust
      ? it
      : {
          ...it,
          trust: {
            level: SOURCE_TRUST_DEFAULTS[it.source] ?? ("unknown" as const),
            score: null,
          },
        },
  );

  let output: HarvestOutput = {
    query: rawQuery,
    window,
    sources_used: sourcesUsed,
    sources_failed: sourcesFailed,
    items: finalItems,
  };

  // 8.5 Auto-widen on thin corpus.
  // When opts.widenOnThin is on and the post-filter item count is below the
  // threshold (default 5), re-harvest with the next wider window and use
  // those results if they yield more material. The recursive call disables
  // further widening to prevent loops.
  const widenThreshold = opts.widenThreshold ?? 5;
  if (opts.widenOnThin && finalItems.length < widenThreshold) {
    const widerWindow = pickWiderWindow(window);
    if (widerWindow && widerWindow !== window) {
      process.stderr.write(
        `[harvest] thin corpus (${finalItems.length} items < ${widenThreshold}); ` +
          `auto-widening window ${window} → ${widerWindow}\n`,
      );
      const wider = await harvest(
        { ...opts, window: widerWindow, widenOnThin: false },
        repoRoot,
      );
      if (wider.output.items.length > finalItems.length) {
        output = {
          ...wider.output,
          query: rawQuery,
        };
      }
    }
  }

  // 9. Write cache
  if (!opts.noCache) {
    await writeCache(key, output);
  }

  return { output, cacheHit: false };
}

/** Window-widening ladder. 7d → 30d → 90d → 180d → null (no wider). */
function pickWiderWindow(current: string): string | null {
  switch (current) {
    case "7d":
      return "30d";
    case "30d":
      return "90d";
    case "90d":
      return "180d";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

export async function runHarvest(argv: string[]): Promise<number> {
  // Parse argv: first positional is query, then options
  const args = [...argv];
  let query: string | undefined;
  let sourcesRaw: string | undefined;
  let windowVal: string | undefined;
  let perSourceLimitVal: string | undefined;
  let operatorPackVal: string | undefined;
  let localeVal: string | undefined;
  let cacheTtlVal: string | undefined;
  let noCache = false;
  let vsVal: string | undefined;
  let timeoutVal: string | undefined;
  let sitesRaw: string | undefined;
  let queryStrict = false;
  // Auto-widen: ON by default unless the user passes --no-widen or pins
  // --window. The flag --widen-on-thin lets users force it back ON even
  // when they pass --window.
  let userPinnedWindow = false;
  let widenFlag: "auto" | "off" | "force" = "auto";
  let widenThresholdVal: string | undefined;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--sources" && args[i + 1]) {
      sourcesRaw = args[++i];
    } else if (arg === "--window" && args[i + 1]) {
      windowVal = args[++i];
      userPinnedWindow = true;
    } else if (arg === "--per-source-limit" && args[i + 1]) {
      perSourceLimitVal = args[++i];
    } else if (arg === "--operator-pack" && args[i + 1]) {
      operatorPackVal = args[++i];
    } else if (arg === "--locale" && args[i + 1]) {
      localeVal = args[++i];
    } else if (arg === "--cache-ttl" && args[i + 1]) {
      cacheTtlVal = args[++i];
    } else if (arg === "--no-cache") {
      noCache = true;
    } else if (arg === "--vs" && args[i + 1]) {
      vsVal = args[++i];
    } else if (arg === "--timeout" && args[i + 1]) {
      timeoutVal = args[++i];
    } else if (arg === "--sites" && args[i + 1]) {
      sitesRaw = args[++i];
    } else if (arg === "--query-strict") {
      queryStrict = true;
    } else if (arg === "--no-widen") {
      widenFlag = "off";
    } else if (arg === "--widen-on-thin") {
      widenFlag = "force";
    } else if (arg === "--widen-threshold" && args[i + 1]) {
      widenThresholdVal = args[++i];
    } else if (!arg?.startsWith("--") && query === undefined) {
      query = arg;
    }
    i++;
  }

  if (!query?.trim()) {
    process.stderr.write("[harvest] error: query is required\n");
    return 4;
  }

  // Validate locale
  const locale = (localeVal ?? "en") as "en" | "ko";
  if (locale !== "en" && locale !== "ko") {
    process.stderr.write(
      `[harvest] error: invalid locale "${locale}" (en|ko)\n`,
    );
    return 4;
  }

  // Validate operator pack
  const validPacks = ["pain", "positive", "competitor", "discovery", "none"];
  if (operatorPackVal && !validPacks.includes(operatorPackVal)) {
    process.stderr.write(
      `[harvest] error: invalid operator-pack "${operatorPackVal}"\n`,
    );
    return 4;
  }

  const sources = sourcesRaw
    ? sourcesRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  const perSourceLimit = perSourceLimitVal
    ? Number.parseInt(perSourceLimitVal, 10)
    : undefined;

  const cacheTtl = cacheTtlVal ? parseTtl(cacheTtlVal) : undefined;
  const timeoutMs = timeoutVal
    ? Math.max(1000, Number.parseInt(timeoutVal, 10) * 1000)
    : undefined;

  // Walk up looking for `.agents/skills/oma-market/SKILL.md`.
  // Works for both source path runs and the bundled binary at cli/bin/cli.js.
  const repoRoot = findRepoRoot();

  let result: HarvestResult;
  try {
    result = await harvest(
      {
        query,
        sources,
        window: windowVal,
        perSourceLimit,
        operatorPack: operatorPackVal as
          | "pain"
          | "positive"
          | "competitor"
          | "discovery"
          | "none"
          | undefined,
        locale,
        cacheTtl,
        noCache,
        vs: vsVal,
        timeoutMs,
        sites: sitesRaw
          ? sitesRaw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        queryStrict,
        widenOnThin:
          widenFlag === "force" || (widenFlag === "auto" && !userPinnedWindow),
        widenThreshold: widenThresholdVal
          ? Number.parseInt(widenThresholdVal, 10)
          : undefined,
      },
      repoRoot,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("query must not be empty")) {
      process.stderr.write(`[harvest] error: ${msg}\n`);
      return 4;
    }
    process.stderr.write(`[harvest] error: ${msg}\n`);
    return 4;
  }

  const { output } = result;

  // Determine exit code
  if (output.sources_used.length === 0) {
    process.stdout.write(JSON.stringify(output));
    return 2;
  }

  // Check if all sources timed out (all failed with "timeout" reason)
  // We wrote "timeout" to stderr already — for v1, just return 0 if any used
  process.stdout.write(JSON.stringify(output));
  return 0;
}
