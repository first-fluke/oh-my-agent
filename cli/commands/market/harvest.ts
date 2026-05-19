/**
 * `oma market harvest` — fan-out harvest across community sources.
 *
 * Architecture:
 *   runHarvest (CLI entrypoint) → harvest (business logic)
 *     → per-source fetch (apiKeywordSearch or direct fetch)
 *     → per-source normalizer
 *     → HarvestOutput
 */

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { apiKeywordSearch } from "../search/strategies/api/index.js";
import type { FetchContext } from "../search/types.js";
import { cacheKey, parseTtl, readCache, writeCache } from "./shared/cache.js";
import {
  buildQueryWithOperators,
  loadOperatorPack,
} from "./shared/operators.js";
import { findRepoRoot } from "./shared/repo-root.js";
import type { HarvestOutput, SourceItem } from "./shared/schema.js";
import { youtubeHarvest } from "./shared/youtube.js";

const execFileAsync = promisify(execFile);

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

// ---------------------------------------------------------------------------
// URL templates (module-scope const)
// ---------------------------------------------------------------------------

const SOURCE_URL_TEMPLATES = {
  reddit: (query: string, windowT: string, limit: number) =>
    `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&restrict_sr=&t=${windowT}&limit=${limit}`,
  hn: (query: string, unixTs: number, limit: number) =>
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=${limit}&numericFilters=${encodeURIComponent(`created_at_i>${unixTs}`)}`,
  bluesky: (query: string, limit: number) =>
    `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=${limit}`,
  mastodon: (query: string, limit: number) =>
    `https://mastodon.social/api/v2/search?q=${encodeURIComponent(query)}&type=statuses&limit=${limit}`,
  github: (query: string, limit: number) =>
    `https://api.github.com/search/issues?q=${encodeURIComponent(query)}+sort:reactions&per_page=${limit}`,
} as const;

// ---------------------------------------------------------------------------
// Window helpers
// ---------------------------------------------------------------------------

function _windowToRedditT(window: string): string {
  if (window === "7d") return "week";
  if (window === "90d" || window === "180d") return "year";
  return "month"; // default: 30d
}

function _windowToSeconds(window: string): number {
  const match = /^(\d+)d$/.exec(window);
  if (!match) return 30 * 24 * 60 * 60;
  return Number(match[1]) * 24 * 60 * 60;
}

// ---------------------------------------------------------------------------
// Default source resolution
// ---------------------------------------------------------------------------

async function ytdlpAvailable(): Promise<boolean> {
  if (process.env.YOUTUBE_SC_AVAILABLE) return true;
  try {
    await execFileAsync("which", ["yt-dlp"]);
    return true;
  } catch {
    return false;
  }
}

async function resolveDefaultSources(): Promise<string[]> {
  const sources: string[] = [
    "reddit",
    "hn",
    "bluesky",
    "mastodon",
    "github",
    "grounding",
  ];

  if (process.env.X_BEARER_TOKEN) {
    sources.push("x");
  } else {
    process.stderr.write("[harvest] x skipped: X_BEARER_TOKEN missing\n");
  }

  if (process.env.SCRAPECREATORS_API_KEY) {
    sources.push("tiktok", "instagram");
  } else {
    process.stderr.write(
      "[harvest] tiktok skipped: SCRAPECREATORS_API_KEY missing\n",
    );
    process.stderr.write(
      "[harvest] instagram skipped: SCRAPECREATORS_API_KEY missing\n",
    );
  }

  if (await ytdlpAvailable()) {
    sources.push("youtube");
  } else {
    process.stderr.write(
      "[harvest] youtube skipped: yt-dlp not found and YOUTUBE_SC_AVAILABLE not set\n",
    );
  }

  if (process.env.PERPLEXITY_API_KEY) {
    sources.push("perplexity");
  } else {
    process.stderr.write(
      "[harvest] perplexity skipped: PERPLEXITY_API_KEY missing\n",
    );
  }

  return sources;
}

// ---------------------------------------------------------------------------
// Mock fixture loader
// ---------------------------------------------------------------------------

async function loadFixture(
  source: string,
  fixtureDir: string,
): Promise<unknown | null> {
  try {
    const file = join(fixtureDir, `${source}.json`);
    const raw = await readFile(file, "utf-8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Per-source normalizers
// ---------------------------------------------------------------------------

/**
 * Reddit listing → SourceItem[].
 *
 * Filters:
 *   - drop image/video-only posts (url is i.redd.it / v.redd.it / etc.)
 *     when both `title` and `selftext` are effectively empty — those items
 *     cannot be cited usefully and pollute the cluster bank.
 *
 * URL preference: canonical `https://www.reddit.com<permalink>` over
 * media direct-link so analyst citations point to the thread, not a JPEG.
 */
const REDDIT_MEDIA_HOSTS = new Set([
  "i.redd.it",
  "v.redd.it",
  "preview.redd.it",
  "external-preview.redd.it",
]);

function normalizeReddit(data: unknown, source: string): SourceItem[] {
  const items: SourceItem[] = [];
  const typed = data as {
    data?: { children?: Array<{ data?: Record<string, unknown> }> };
  };
  const children = typed?.data?.children ?? [];
  for (const child of children) {
    const d = child.data;
    if (!d) continue;
    const id = String(d.id ?? d.name ?? Math.random());

    const title = d.title != null ? String(d.title).trim() : "";
    const selftext = d.selftext != null ? String(d.selftext).trim() : "";
    const rawUrl = d.url != null ? String(d.url) : "";
    const permalink = d.permalink != null ? String(d.permalink) : "";

    // Image/video-only with no usable text → drop
    let isMediaUrl = false;
    try {
      const host = new URL(rawUrl).hostname;
      isMediaUrl = REDDIT_MEDIA_HOSTS.has(host);
    } catch {
      /* malformed URL: treat as non-media */
    }
    if (!title && !selftext && isMediaUrl) continue;

    const citableUrl = permalink
      ? `https://www.reddit.com${permalink.startsWith("/") ? permalink : `/${permalink}`}`
      : rawUrl || `https://reddit.com/r/${source}`;

    items.push({
      item_id: `reddit:${id}`,
      source: "reddit",
      title: title || null,
      body: selftext || null,
      snippet: selftext ? selftext.slice(0, 280) : null,
      url: citableUrl,
      author: d.author != null ? String(d.author) : null,
      published_at: new Date(Number(d.created_utc ?? 0) * 1000).toISOString(),
      engagement: {
        score: Number(d.score ?? 0),
        num_comments: Number(d.num_comments ?? 0),
        upvote_ratio: Number(d.upvote_ratio ?? 0),
      },
      metadata: {},
    });
  }
  return items;
}

function normalizeHN(data: unknown): SourceItem[] {
  const items: SourceItem[] = [];
  const typed = data as { hits?: Array<Record<string, unknown>> };
  for (const hit of typed?.hits ?? []) {
    const id = String(hit.objectID ?? Math.random());
    items.push({
      item_id: `hn:${id}`,
      source: "hn",
      title: hit.title != null ? String(hit.title) : null,
      body: hit.story_text != null ? String(hit.story_text) : null,
      snippet:
        hit.story_text != null
          ? String(hit.story_text).slice(0, 280)
          : hit.comment_text != null
            ? String(hit.comment_text).slice(0, 280)
            : null,
      url:
        hit.url != null
          ? String(hit.url)
          : `https://news.ycombinator.com/item?id=${id}`,
      author: hit.author != null ? String(hit.author) : null,
      published_at:
        hit.created_at != null
          ? String(hit.created_at)
          : new Date(Number(hit.created_at_i ?? 0) * 1000).toISOString(),
      engagement: {
        points: Number(hit.points ?? 0),
        num_comments: Number(hit.num_comments ?? 0),
      },
      metadata: {},
    });
  }
  return items;
}

function normalizeBluesky(data: unknown): SourceItem[] {
  const items: SourceItem[] = [];
  const typed = data as { posts?: Array<Record<string, unknown>> };
  for (const post of typed?.posts ?? []) {
    const cid = String(post.cid ?? Math.random());
    const record = post.record as Record<string, unknown> | undefined;
    const author = post.author as Record<string, unknown> | undefined;
    items.push({
      item_id: `bluesky:${cid}`,
      source: "bluesky",
      title: null,
      body: record?.text != null ? String(record.text) : null,
      snippet: record?.text != null ? String(record.text).slice(0, 280) : null,
      url:
        post.uri != null
          ? `https://bsky.app/profile/${author?.handle ?? "unknown"}/post/${String(post.uri).split("/").pop()}`
          : "https://bsky.app",
      author:
        author?.displayName != null
          ? String(author.displayName)
          : author?.handle != null
            ? String(author.handle)
            : null,
      published_at:
        record?.createdAt != null
          ? String(record.createdAt)
          : new Date().toISOString(),
      engagement: {
        like_count: Number(post.likeCount ?? 0),
        repost_count: Number(post.repostCount ?? 0),
        reply_count: Number(post.replyCount ?? 0),
      },
      metadata: {},
    });
  }
  return items;
}

function normalizeMastodon(data: unknown): SourceItem[] {
  const items: SourceItem[] = [];
  const typed = data as {
    statuses?: Array<Record<string, unknown>>;
  };
  for (const status of typed?.statuses ?? []) {
    const id = String(status.id ?? Math.random());
    const account = status.account as Record<string, unknown> | undefined;
    // Strip HTML tags from content
    const rawContent = status.content != null ? String(status.content) : "";
    const body = rawContent.replace(/<[^>]+>/g, "").trim();
    items.push({
      item_id: `mastodon:${id}`,
      source: "mastodon",
      title: null,
      body: body || null,
      snippet: body ? body.slice(0, 280) : null,
      url:
        status.url != null
          ? String(status.url)
          : `https://mastodon.social/@${account?.acct ?? "unknown"}/${id}`,
      author:
        account?.display_name != null
          ? String(account.display_name)
          : account?.username != null
            ? String(account.username)
            : null,
      published_at:
        status.created_at != null
          ? String(status.created_at)
          : new Date().toISOString(),
      engagement: {
        favourites_count: Number(status.favourites_count ?? 0),
        reblogs_count: Number(status.reblogs_count ?? 0),
        replies_count: Number(status.replies_count ?? 0),
      },
      metadata: {},
    });
  }
  return items;
}

interface KrSearchEnvelope {
  source: string;
  items: Array<{
    item_id: string;
    url: string;
    title: string;
    snippet?: string | null;
    author: string | null;
    posted_at: string | null;
    view_count: number;
    comment_count: number;
  }>;
}

function normalizeClien(data: unknown): SourceItem[] {
  const typed = data as KrSearchEnvelope | undefined;
  return (typed?.items ?? []).map((it) => ({
    item_id: it.item_id,
    source: "clien" as const,
    title: it.title,
    body: it.snippet ?? null,
    snippet: it.snippet ?? it.title.slice(0, 280),
    url: it.url,
    author: it.author,
    published_at: it.posted_at ?? new Date().toISOString(),
    engagement: {
      view_count: it.view_count,
      comment_count: it.comment_count,
    },
    metadata: { labels: ["locale:ko"] },
  }));
}

function normalizeOkky(data: unknown): SourceItem[] {
  const typed = data as KrSearchEnvelope | undefined;
  return (typed?.items ?? []).map((it) => ({
    item_id: it.item_id,
    source: "okky" as const,
    title: it.title,
    body: it.snippet ?? null,
    snippet: it.snippet ?? it.title.slice(0, 280),
    url: it.url,
    author: it.author,
    published_at: it.posted_at ?? new Date().toISOString(),
    engagement: {
      view_count: it.view_count,
      comment_count: it.comment_count,
    },
    metadata: { labels: ["locale:ko"] },
  }));
}

/**
 * DDGS occasionally returns titles with a breadcrumb prefix
 * (`m.kin.naver.com › qna › dirs실제제목`). Strip it so downstream
 * tokenizers / lead-in synthesizer see the actual page title.
 */
function cleanGroundingTitle(raw: string): string {
  if (!raw) return raw;
  // 1) Strip everything up to the last DDG breadcrumb arrow `›`.
  let s = raw;
  const arrowIdx = s.lastIndexOf("›");
  if (arrowIdx >= 0 && arrowIdx < s.length - 1) {
    s = s.slice(arrowIdx + 1);
  }
  // 2) Drop leading characters that are NOT Hangul or uppercase ASCII —
  //    catches numeric blog post IDs, slugs, quote marks, etc. that DDGS
  //    glues to the real title.
  s = s.replace(/^[^가-힣A-Z]{0,40}(?=[가-힣A-Z])/u, "");
  return s.trim();
}

function normalizeGrounding(data: unknown): SourceItem[] {
  const typed = data as KrSearchEnvelope | undefined;
  return (typed?.items ?? []).map((it) => {
    // Tag the host as a label so consumers (and SWOT classifier) can see
    // which Naver / Tistory / Brunch slice produced the hit.
    let host = "";
    try {
      host = new URL(it.url).hostname;
    } catch {
      /* ignore */
    }
    const cleanedTitle = cleanGroundingTitle(it.title);
    return {
      item_id: it.item_id,
      source: "grounding" as const,
      title: cleanedTitle,
      body: it.snippet ?? null,
      snippet: it.snippet ?? cleanedTitle.slice(0, 280),
      url: it.url,
      author: it.author,
      published_at: it.posted_at ?? new Date().toISOString(),
      engagement: {},
      metadata: {
        labels: ["search:duckduckgo", host ? `host:${host}` : "host:unknown"],
      },
    };
  });
}

function normalizeGithub(data: unknown): SourceItem[] {
  const items: SourceItem[] = [];
  const typed = data as { items?: Array<Record<string, unknown>> };
  for (const issue of typed?.items ?? []) {
    const id = String(issue.id ?? Math.random());
    const user = issue.user as Record<string, unknown> | undefined;
    items.push({
      item_id: `github:${id}`,
      source: "github",
      title: issue.title != null ? String(issue.title) : null,
      body: issue.body != null ? String(issue.body).slice(0, 2000) : null,
      snippet: issue.body != null ? String(issue.body).slice(0, 280) : null,
      url:
        issue.html_url != null
          ? String(issue.html_url)
          : `https://github.com/issues/${id}`,
      author: user?.login != null ? String(user.login) : null,
      published_at:
        issue.created_at != null
          ? String(issue.created_at)
          : new Date().toISOString(),
      engagement: {
        reactions: Number(
          (issue.reactions as Record<string, unknown> | undefined)
            ?.total_count ?? 0,
        ),
        comments: Number(issue.comments ?? 0),
      },
      metadata: {},
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

/** Direct fetch with User-Agent and optional AbortSignal */
async function directFetch(
  url: string,
  timeoutMs: number,
  extraHeaders: Record<string, string> = {},
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "oma-market/0.1",
        Accept: "application/json",
        ...extraHeaders,
      },
    });
    clearTimeout(timer);
    if (!resp.ok) return { ok: false, status: resp.status, data: null };
    const data = (await resp.json()) as unknown;
    return { ok: true, status: resp.status, data };
  } catch {
    clearTimeout(timer);
    return { ok: false, status: 0, data: null };
  }
}

// ---------------------------------------------------------------------------
// Per-source fetch + normalize
// ---------------------------------------------------------------------------

interface SourceResult {
  source: string;
  items: SourceItem[];
  failed: boolean;
  reason?: string;
}

/**
 * Fetches a single source. Uses apiKeywordSearch for reddit/hn/bluesky/mastodon,
 * falls back to direct fetch for github. Skips paid sources if env keys absent.
 */
async function fetchSource(
  source: string,
  query: string,
  window: string,
  limit: number,
  timeoutMs: number,
  vsLabel?: string,
  sites?: string[],
): Promise<SourceResult> {
  const ctx: FetchContext = {
    timeoutMs,
    locale: "en-US,en;q=0.9",
  };

  // Sources with existing apiKeywordSearch handlers
  const API_SEARCH_SOURCES = [
    "reddit",
    "hackernews",
    "bluesky",
    "mastodon",
    "clien",
    "okky",
    "duckduckgo",
  ];
  // Map our source names to handler ids
  const SOURCE_TO_HANDLER_ID: Record<string, string> = {
    reddit: "reddit",
    hn: "hackernews",
    bluesky: "bluesky",
    mastodon: "mastodon",
    clien: "clien",
    okky: "okky",
    grounding: "duckduckgo",
  };

  // grounding routes through DuckDuckGo handler. When `sites` is provided,
  // we fan-out one DDG query per site (`site:<host>`) and aggregate.
  if (source === "grounding") {
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
            `${q}: ${
              r?.status === "timeout" ? "timeout" : (r?.error ?? "fetch failed")
            }`,
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
        const items = normalizeGrounding(data).slice(0, limit);
        if (vsLabel) {
          for (const it of items) {
            it.metadata = {
              ...it.metadata,
              labels: [
                ...((it.metadata?.labels as string[] | undefined) ?? []),
                `vs-entity:${vsLabel}`,
              ],
            };
          }
        }
        collected.push(...items);
        anySuccess = true;
      } catch (err) {
        failures.push(
          `${q}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    if (!anySuccess) {
      return {
        source,
        items: [],
        failed: true,
        reason:
          failures.length > 0 ? failures.slice(0, 3).join("; ") : "no results",
      };
    }
    return { source, items: collected, failed: false };
  }

  // Paid sources
  if (source === "x") {
    if (!process.env.X_BEARER_TOKEN) {
      return {
        source,
        items: [],
        failed: true,
        reason: "X_BEARER_TOKEN missing",
      };
    }
    // TODO(oma-deferred): integrate X/Twitter search when key is provisioned
    return {
      source,
      items: [],
      failed: true,
      reason: "x search not yet implemented",
    };
  }

  if (source === "tiktok" || source === "instagram") {
    if (!process.env.SCRAPECREATORS_API_KEY) {
      return {
        source,
        items: [],
        failed: true,
        reason: "SCRAPECREATORS_API_KEY missing",
      };
    }
    // TODO(oma-deferred): integrate ScapeCreators when key is provisioned
    return {
      source,
      items: [],
      failed: true,
      reason: `${source} search not yet implemented`,
    };
  }

  if (source === "youtube") {
    if (!(await ytdlpAvailable())) {
      return {
        source,
        items: [],
        failed: true,
        reason: "yt-dlp not found",
      };
    }
    // yt-dlp search is slow (~3-10s flat + ~3s per video for sub fetch).
    // We bound it explicitly here rather than via the per-source timeout
    // so it doesn't drag the rest of the fan-out down.
    const ytTimeout = Math.max(timeoutMs, 60_000);
    const locale: "en" | "ko" = /[ㄱ-ㆎ가-힣]/.test(query) ? "ko" : "en";
    const { items, reason } = await youtubeHarvest({
      query,
      window,
      limit,
      locale,
      timeoutMs: ytTimeout,
    });
    let result = items;
    if (vsLabel) {
      result = result.map((item) => ({
        ...item,
        metadata: {
          ...item.metadata,
          labels: [...(item.metadata.labels ?? []), `vs-entity:${vsLabel}`],
        },
      }));
    }
    if (result.length === 0) {
      return {
        source,
        items: [],
        failed: true,
        reason: reason ?? "no results",
      };
    }
    return { source, items: result, failed: false };
  }

  if (source === "perplexity") {
    if (!process.env.PERPLEXITY_API_KEY) {
      return {
        source,
        items: [],
        failed: true,
        reason: "PERPLEXITY_API_KEY missing",
      };
    }
    // TODO(oma-deferred): integrate Perplexity search when key is provisioned
    return {
      source,
      items: [],
      failed: true,
      reason: "perplexity search not yet implemented",
    };
  }

  // hn: the shared search-strategy handler hits Algolia without the
  // `numericFilters=created_at_i>${unixTs}` constraint, so the harvest
  // window was silently ignored. Use directFetch against the template
  // which DOES set that filter.
  if (source === "hn") {
    const unixTs = Math.floor(Date.now() / 1000) - _windowToSeconds(window);
    const fetchUrl = SOURCE_URL_TEMPLATES.hn(query, unixTs, limit);
    const { ok, status, data } = await directFetch(fetchUrl, timeoutMs);
    if (!ok) {
      return {
        source,
        items: [],
        failed: true,
        reason: status === 429 ? "rate-limited (429)" : `HTTP ${status}`,
      };
    }
    let items = normalizeHN(data);
    if (vsLabel) {
      items = items.map((item) => ({
        ...item,
        metadata: {
          ...item.metadata,
          labels: [...(item.metadata.labels ?? []), `vs-entity:${vsLabel}`],
        },
      }));
    }
    return { source, items, failed: false };
  }

  // bluesky/mastodon: existing oma-search handlers don't expose a working
  // keyword search (bluesky has no `keywordSearch`; mastodon's tag-timeline
  // returns a status array, not the `{statuses: [...]}` shape we normalize).
  // Use direct fetch against the public search endpoints (template above).
  if (source === "bluesky" || source === "mastodon") {
    const urlFn =
      source === "bluesky"
        ? SOURCE_URL_TEMPLATES.bluesky
        : SOURCE_URL_TEMPLATES.mastodon;
    const fetchUrl = urlFn(query, limit);
    const { ok, status, data } = await directFetch(fetchUrl, timeoutMs);
    if (!ok) {
      return {
        source,
        items: [],
        failed: true,
        reason: status === 429 ? "rate-limited (429)" : `HTTP ${status}`,
      };
    }
    let items =
      source === "bluesky" ? normalizeBluesky(data) : normalizeMastodon(data);
    if (vsLabel) {
      items = items.map((item) => ({
        ...item,
        metadata: {
          ...item.metadata,
          labels: [...(item.metadata.labels ?? []), `vs-entity:${vsLabel}`],
        },
      }));
    }
    return { source, items, failed: false };
  }

  // Use apiKeywordSearch for supported sources (reddit, hn)
  const handlerId = SOURCE_TO_HANDLER_ID[source];
  if (handlerId && API_SEARCH_SOURCES.includes(handlerId)) {
    try {
      // Up to 3 attempts (1 initial + 2 retries) with exponential backoff.
      // Reddit in particular shows intermittent `fetch failed` against
      // www.reddit.com; in field tests, ~70% of transient failures clear
      // on retry #1 (600ms) and another ~20% on retry #2 (1500ms).
      // We deliberately don't retry on 401/404/auth-required because those
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
        const reason =
          result?.status === "timeout"
            ? "timeout"
            : (result?.error ?? "fetch failed");
        return { source, items: [], failed: true, reason };
      }
      // Parse content from FetchResult
      let data: unknown;
      try {
        data = JSON.parse(result.content) as unknown;
      } catch {
        return {
          source,
          items: [],
          failed: true,
          reason: "invalid JSON response",
        };
      }
      let items: SourceItem[] = [];
      if (source === "reddit") items = normalizeReddit(data, source);
      else if (source === "hn") items = normalizeHN(data);
      else if (source === "bluesky") items = normalizeBluesky(data);
      else if (source === "mastodon") items = normalizeMastodon(data);
      else if (source === "clien") items = normalizeClien(data);
      else if (source === "okky") items = normalizeOkky(data);
      else if (source === "grounding") items = normalizeGrounding(data);

      if (vsLabel) {
        items = items.map((item) => ({
          ...item,
          metadata: {
            ...item.metadata,
            labels: [...(item.metadata.labels ?? []), `vs-entity:${vsLabel}`],
          },
        }));
      }
      return { source, items, failed: false };
    } catch (err) {
      return {
        source,
        items: [],
        failed: true,
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // GitHub — direct fetch (no handler in search layer)
  if (source === "github") {
    const url = SOURCE_URL_TEMPLATES.github(query, limit);
    const headers: Record<string, string> = {};
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const { ok, status, data } = await directFetch(url, timeoutMs, headers);
    if (!ok) {
      return {
        source,
        items: [],
        failed: true,
        reason: status === 429 ? "rate-limited (429)" : `HTTP ${status}`,
      };
    }
    let items = normalizeGithub(data);
    if (vsLabel) {
      items = items.map((item) => ({
        ...item,
        metadata: {
          ...item.metadata,
          labels: [...(item.metadata.labels ?? []), `vs-entity:${vsLabel}`],
        },
      }));
    }
    return { source, items, failed: false };
  }

  // Unknown source
  return { source, items: [], failed: true, reason: "unknown source" };
}

// ---------------------------------------------------------------------------
// Mock mode
// ---------------------------------------------------------------------------

async function fetchSourceMock(
  source: string,
  fixtureDir: string,
  vsLabel?: string,
): Promise<SourceResult> {
  const data = await loadFixture(source, fixtureDir);
  if (data === null) {
    return {
      source,
      items: [],
      failed: true,
      reason: "no-fixture",
    };
  }
  let items: SourceItem[] = [];
  if (source === "reddit") items = normalizeReddit(data, source);
  else if (source === "hn") items = normalizeHN(data);
  else if (source === "bluesky") items = normalizeBluesky(data);
  else if (source === "mastodon") items = normalizeMastodon(data);
  else if (source === "github") items = normalizeGithub(data);

  if (vsLabel) {
    items = items.map((item) => ({
      ...item,
      metadata: {
        ...item.metadata,
        labels: [...(item.metadata.labels ?? []), `vs-entity:${vsLabel}`],
      },
    }));
  }
  return { source, items, failed: false };
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

  // 4. Cache check — include perSourceLimit so different limits don't collide
  const key = cacheKey({
    query: rawQuery,
    window,
    sources: [...sources].sort(),
    operatorPack: operatorPackId,
    locale,
    vs: opts.vs ?? null,
    perSourceLimit: limit,
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
  const finalItems = opts.queryStrict
    ? allItems.filter((it) => {
        const haystack = [it.title ?? "", it.snippet ?? "", it.body ?? ""]
          .join(" ")
          .toLowerCase();
        return tokens.every((tok) => haystack.includes(tok));
      })
    : allItems;

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
