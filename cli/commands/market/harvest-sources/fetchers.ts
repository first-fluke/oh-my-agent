/**
 * Per-source fetchers + the `SOURCE_FETCHERS` registry. Each handler takes the
 * same `FetchArgs` and returns a `SourceResult`; shared concerns live in
 * `result.ts` so adding a source is a one-line registry entry rather than
 * another branch in a 400-line conditional.
 */

import { apiKeywordSearch } from "../../search/strategies/api/index.js";
import type { FetchContext } from "../../search/types.js";
import {
  buildPullpushUrl,
  getRedditToken,
  pullpushToListing,
  REDDIT_UA,
  SOURCE_URL_TEMPLATES,
  windowToRedditT,
  windowToSeconds,
} from "../harvest-endpoints.js";
import {
  normalizeBluesky,
  normalizeClien,
  normalizeGithub,
  normalizeGrounding,
  normalizeHN,
  normalizeMastodon,
  normalizeOkky,
  normalizeReddit,
} from "../harvest-normalizers.js";
import type { SourceItem } from "../shared/schema.js";
import { youtubeHarvest } from "../shared/youtube.js";
import {
  applyVsLabel,
  directFetch,
  fail,
  httpReason,
  ok,
  type SourceFetcher,
} from "./result.js";
import { ytdlpAvailable } from "./ytdlp.js";

/**
 * Direct-fetch a `(query, limit)` search endpoint and normalize the result.
 * Covers bluesky / mastodon / github (which only differ by URL + normalizer +
 * optional auth headers).
 */
function directSearchFetcher(
  buildUrl: (query: string, limit: number) => string,
  normalize: (data: unknown) => SourceItem[],
  buildHeaders?: () => Record<string, string>,
): SourceFetcher {
  return async ({ source, query, limit, timeoutMs, vsLabel }) => {
    const url = buildUrl(query, limit);
    const {
      ok: okay,
      status,
      data,
    } = await directFetch(url, timeoutMs, buildHeaders?.());
    if (!okay) return fail(source, httpReason(status));
    return ok(source, applyVsLabel(normalize(data), vsLabel));
  };
}

/** grounding → DuckDuckGo handler, optionally fanned out per `site:` filter. */
const fetchGrounding: SourceFetcher = async ({
  source,
  query,
  limit,
  timeoutMs,
  vsLabel,
  sites,
}) => {
  const ctx: FetchContext = { timeoutMs, locale: "en-US,en;q=0.9" };
  const expandedQueries =
    sites && sites.length > 0
      ? sites.map((s) => `${query} site:${s}`)
      : [query];
  const collected: SourceItem[] = [];
  let anySuccess = false;
  const failures: string[] = [];
  for (const q of expandedQueries) {
    try {
      const results = await apiKeywordSearch(q, ctx, ["duckduckgo"]);
      const r = results[0];
      if (!r || r.status !== "ok") {
        failures.push(
          `${q}: ${r?.status === "timeout" ? "timeout" : (r?.error ?? "fetch failed")}`,
        );
        continue;
      }
      let data: unknown;
      try {
        data = JSON.parse(r.content) as unknown;
      } catch {
        failures.push(`${q}: invalid JSON`);
        continue;
      }
      collected.push(...normalizeGrounding(data).slice(0, limit));
      anySuccess = true;
    } catch (err) {
      failures.push(
        `${q}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (!anySuccess) {
    return fail(
      source,
      failures.length > 0 ? failures.slice(0, 3).join("; ") : "no results",
    );
  }
  return ok(source, applyVsLabel(collected, vsLabel));
};

/**
 * hn: the shared search-strategy handler hits Algolia without the
 * `numericFilters=created_at_i>${unixTs}` constraint, so the harvest window was
 * silently ignored. Use directFetch against the template which DOES set it.
 */
const fetchHn: SourceFetcher = async ({
  source,
  query,
  window,
  limit,
  timeoutMs,
  vsLabel,
}) => {
  const unixTs = Math.floor(Date.now() / 1000) - windowToSeconds(window);
  const url = SOURCE_URL_TEMPLATES.hn(query, unixTs, limit);
  const { ok: okay, status, data } = await directFetch(url, timeoutMs);
  if (!okay) return fail(source, httpReason(status));
  return ok(source, applyVsLabel(normalizeHN(data), vsLabel));
};

/**
 * reddit: anonymous search.json is 403-blocked (even with browser TLS
 * impersonation). Two keyless-first tiers:
 *   1. live oauth.reddit.com when REDDIT_CLIENT_ID/SECRET are set (freshest)
 *   2. pullpush.io archive otherwise (keyless; lags live reddit but covers
 *      historical pain mining — the path VoC playbooks recommend)
 */
const fetchReddit: SourceFetcher = async ({
  source,
  query,
  window,
  limit,
  timeoutMs,
  vsLabel,
}) => {
  // Tier 1 — live OAuth.
  const token = await getRedditToken(timeoutMs);
  if (token) {
    const url = SOURCE_URL_TEMPLATES.reddit(
      query,
      windowToRedditT(window),
      limit,
    );
    const { ok: okay, data } = await directFetch(url, timeoutMs, {
      Authorization: `Bearer ${token}`,
      "User-Agent": REDDIT_UA,
    });
    if (okay) {
      return ok(source, applyVsLabel(normalizeReddit(data, source), vsLabel));
    }
    process.stderr.write(
      "[harvest] reddit oauth call failed; falling back to pullpush archive\n",
    );
  }

  // Tier 2 — keyless pullpush.io archive.
  const {
    ok: okay,
    status,
    data,
  } = await directFetch(buildPullpushUrl(query, limit), timeoutMs);
  if (!okay) return fail(source, httpReason(status));
  return ok(
    source,
    applyVsLabel(normalizeReddit(pullpushToListing(data), source), vsLabel),
  );
};

/**
 * Korean full-text sources (clien / okky) go through the shared search-strategy
 * `apiKeywordSearch` handler with bounded retry/backoff.
 */
function apiSearchFetcher(
  handlerId: string,
  normalize: (data: unknown) => SourceItem[],
): SourceFetcher {
  return async ({ source, query, timeoutMs, vsLabel }) => {
    const ctx: FetchContext = { timeoutMs, locale: "en-US,en;q=0.9" };
    try {
      // Up to 3 attempts (1 initial + 2 retries) with exponential backoff.
      // We deliberately don't retry on not-found/auth-required because those
      // mean the request itself is malformed or denied.
      const BACKOFFS_MS = [600, 1500];
      let results = await apiKeywordSearch(query, ctx, [handlerId]);
      let result = results[0];
      for (let attempt = 0; attempt < BACKOFFS_MS.length; attempt++) {
        const retryable =
          !result ||
          (result.status !== "ok" &&
            result.status !== "not-found" &&
            result.status !== "auth-required");
        if (!retryable) break;
        const backoff = BACKOFFS_MS[attempt] ?? 1500;
        process.stderr.write(
          `[harvest] ${source} retry #${attempt + 1} after ${backoff}ms (status=${result?.status ?? "no-result"})\n`,
        );
        await new Promise((r) => setTimeout(r, backoff));
        results = await apiKeywordSearch(query, ctx, [handlerId]);
        result = results[0];
      }
      if (!result || result.status !== "ok") {
        return fail(
          source,
          result?.status === "timeout"
            ? "timeout"
            : (result?.error ?? "fetch failed"),
        );
      }
      let data: unknown;
      try {
        data = JSON.parse(result.content) as unknown;
      } catch {
        return fail(source, "invalid JSON response");
      }
      return ok(source, applyVsLabel(normalize(data), vsLabel));
    } catch (err) {
      return fail(source, err instanceof Error ? err.message : String(err));
    }
  };
}

const fetchGithub: SourceFetcher = directSearchFetcher(
  SOURCE_URL_TEMPLATES.github,
  normalizeGithub,
  () => {
    const headers: Record<string, string> = {};
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
  },
);

/** youtube: yt-dlp powered, with an explicitly widened timeout. */
const fetchYoutube: SourceFetcher = async ({
  source,
  query,
  window,
  limit,
  timeoutMs,
  vsLabel,
}) => {
  if (!(await ytdlpAvailable())) return fail(source, "yt-dlp not found");
  // yt-dlp search is slow (~3-10s flat + ~3s per video for sub fetch). Bound it
  // explicitly so it doesn't drag the rest of the fan-out down.
  const ytTimeout = Math.max(timeoutMs, 60_000);
  const locale: "en" | "ko" = /[ㄱ-ㆎ가-힣]/.test(query) ? "ko" : "en";
  const { items, reason } = await youtubeHarvest({
    query,
    window,
    limit,
    locale,
    timeoutMs: ytTimeout,
  });
  if (items.length === 0) return fail(source, reason ?? "no results");
  return ok(source, applyVsLabel(items, vsLabel));
};

/** Paid-source stub: refuses with an env-key reason until integrated. */
function deferredSourceFetcher(envKey: string, label?: string): SourceFetcher {
  return async ({ source }) => {
    if (!process.env[envKey]) return fail(source, `${envKey} missing`);
    // TODO(oma-deferred): integrate when key is provisioned.
    return fail(source, `${label ?? source} search not yet implemented`);
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const SCRAPECREATORS = deferredSourceFetcher("SCRAPECREATORS_API_KEY");

export const SOURCE_FETCHERS: Record<string, SourceFetcher> = {
  grounding: fetchGrounding,
  hn: fetchHn,
  reddit: fetchReddit,
  bluesky: directSearchFetcher(SOURCE_URL_TEMPLATES.bluesky, normalizeBluesky),
  mastodon: directSearchFetcher(
    SOURCE_URL_TEMPLATES.mastodon,
    normalizeMastodon,
  ),
  github: fetchGithub,
  clien: apiSearchFetcher("clien", normalizeClien),
  okky: apiSearchFetcher("okky", normalizeOkky),
  youtube: fetchYoutube,
  x: deferredSourceFetcher("X_BEARER_TOKEN", "x"),
  tiktok: SCRAPECREATORS,
  instagram: SCRAPECREATORS,
  perplexity: deferredSourceFetcher("PERPLEXITY_API_KEY", "perplexity"),
};
