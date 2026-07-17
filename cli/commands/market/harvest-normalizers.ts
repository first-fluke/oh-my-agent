/**
 * harvest-normalizers.ts — per-source response → `SourceItem[]` adapters.
 *
 * Pure functions: each takes a raw platform response and returns the unified
 * `SourceItem` shape. No network, no env, no side effects.
 */

import { shortHash } from "../../utils/hash.js";
import type { SourceItem } from "./shared/schema.js";

/**
 * Deterministic item-id fallback for responses missing a platform id.
 * Hashing the citable fields keeps ids stable across runs so dedup/fuse and
 * the mock-replay determinism contract keep working; Math.random() would not.
 */
function fallbackId(...parts: Array<string | null | undefined>): string {
  return shortHash(parts.map((p) => p ?? ""));
}

// ---------------------------------------------------------------------------
// Reddit
// ---------------------------------------------------------------------------

const REDDIT_MEDIA_HOSTS = new Set([
  "i.redd.it",
  "v.redd.it",
  "preview.redd.it",
  "external-preview.redd.it",
]);

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
export function normalizeReddit(data: unknown, source: string): SourceItem[] {
  const items: SourceItem[] = [];
  const typed = data as {
    data?: { children?: Array<{ data?: Record<string, unknown> }> };
  };
  const children = typed?.data?.children ?? [];
  for (const child of children) {
    const d = child.data;
    if (!d) continue;
    const title = d.title != null ? String(d.title).trim() : "";
    const selftext = d.selftext != null ? String(d.selftext).trim() : "";
    const rawUrl = d.url != null ? String(d.url) : "";
    const permalink = d.permalink != null ? String(d.permalink) : "";
    const id = String(d.id ?? d.name ?? fallbackId(permalink, rawUrl, title));

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

// ---------------------------------------------------------------------------
// Hacker News (Algolia)
// ---------------------------------------------------------------------------

export function normalizeHN(data: unknown): SourceItem[] {
  const items: SourceItem[] = [];
  const typed = data as { hits?: Array<Record<string, unknown>> };
  for (const hit of typed?.hits ?? []) {
    const id = String(
      hit.objectID ??
        fallbackId(
          hit.url != null ? String(hit.url) : null,
          hit.title != null ? String(hit.title) : null,
          hit.created_at != null ? String(hit.created_at) : null,
        ),
    );
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

// ---------------------------------------------------------------------------
// Bluesky
// ---------------------------------------------------------------------------

export function normalizeBluesky(data: unknown): SourceItem[] {
  const items: SourceItem[] = [];
  const typed = data as { posts?: Array<Record<string, unknown>> };
  for (const post of typed?.posts ?? []) {
    const record = post.record as Record<string, unknown> | undefined;
    const cid = String(
      post.cid ??
        fallbackId(
          post.uri != null ? String(post.uri) : null,
          record?.text != null ? String(record.text) : null,
        ),
    );
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

// ---------------------------------------------------------------------------
// Mastodon
// ---------------------------------------------------------------------------

export function normalizeMastodon(data: unknown): SourceItem[] {
  const items: SourceItem[] = [];
  const typed = data as {
    statuses?: Array<Record<string, unknown>>;
  };
  for (const status of typed?.statuses ?? []) {
    const account = status.account as Record<string, unknown> | undefined;
    // Strip HTML tags from content
    const rawContent = status.content != null ? String(status.content) : "";
    const id = String(
      status.id ??
        fallbackId(status.url != null ? String(status.url) : null, rawContent),
    );
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

// ---------------------------------------------------------------------------
// Korean search envelope (Clien / OKKY / grounding share this shape)
// ---------------------------------------------------------------------------

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

export function normalizeClien(data: unknown): SourceItem[] {
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

export function normalizeOkky(data: unknown): SourceItem[] {
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

// ---------------------------------------------------------------------------
// Grounding (DuckDuckGo via the search layer)
// ---------------------------------------------------------------------------

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

export function normalizeGrounding(data: unknown): SourceItem[] {
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

// ---------------------------------------------------------------------------
// GitHub Issues
// ---------------------------------------------------------------------------

export function normalizeGithub(data: unknown): SourceItem[] {
  const items: SourceItem[] = [];
  const typed = data as { items?: Array<Record<string, unknown>> };
  for (const issue of typed?.items ?? []) {
    const id = String(
      issue.id ??
        fallbackId(
          issue.html_url != null ? String(issue.html_url) : null,
          issue.title != null ? String(issue.title) : null,
        ),
    );
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
