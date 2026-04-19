import { XMLParser } from "fast-xml-parser";
import { httpFetch } from "./http.js";
import { parseMetadata } from "./metadata.js";
import type { FetchContext, FetchResult } from "./types.js";

/**
 * RSS / Atom feed discovery and parsing.
 * Discovery tactics: `<link rel="alternate">` on the target page →
 * URL pattern guessing (/rss, /feed, /atom.xml, /rss.xml, /index.xml).
 */

const URL_PATTERNS = ["/rss", "/feed", "/atom.xml", "/rss.xml", "/index.xml"];

export interface FeedEntry {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  content?: string;
}

export interface FeedDocument {
  kind: "rss" | "atom" | "unknown";
  title?: string;
  description?: string;
  link?: string;
  entries: FeedEntry[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function extractText(node: unknown): string | undefined {
  if (node == null) return undefined;
  if (typeof node === "string") return node;
  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (typeof record["#text"] === "string") return record["#text"];
    if (typeof record["#cdata"] === "string") return record["#cdata"];
  }
  return undefined;
}

function extractAtomLink(links: unknown): string | undefined {
  for (const link of asArray(links) as Array<Record<string, unknown>>) {
    const href = link?.["@_href"];
    const rel = link?.["@_rel"];
    if (typeof href === "string" && (rel === undefined || rel === "alternate"))
      return href;
  }
  return undefined;
}

export function parseFeed(xml: string): FeedDocument | null {
  let data: Record<string, unknown>;
  try {
    data = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return null;
  }
  const rss = data.rss as Record<string, unknown> | undefined;
  if (rss) {
    const channel = rss.channel as Record<string, unknown> | undefined;
    if (!channel) return null;
    const items = asArray(channel.item) as Array<Record<string, unknown>>;
    return {
      kind: "rss",
      title: extractText(channel.title),
      description: extractText(channel.description),
      link: extractText(channel.link),
      entries: items.map((item) => ({
        title: extractText(item.title),
        link: extractText(item.link),
        pubDate: extractText(item.pubDate),
        description: extractText(item.description),
        content:
          extractText(item["content:encoded"]) ?? extractText(item.content),
      })),
    };
  }
  const feed = data.feed as Record<string, unknown> | undefined;
  if (feed) {
    const items = asArray(feed.entry) as Array<Record<string, unknown>>;
    return {
      kind: "atom",
      title: extractText(feed.title),
      description: extractText(feed.subtitle),
      link: extractAtomLink(feed.link),
      entries: items.map((entry) => ({
        title: extractText(entry.title),
        link: extractAtomLink(entry.link),
        pubDate: extractText(entry.published) ?? extractText(entry.updated),
        description: extractText(entry.summary),
        content: extractText(entry.content) ?? extractText(entry.summary),
      })),
    };
  }
  return null;
}

export async function discoverFeed(
  target: URL,
  ctx: FetchContext,
): Promise<FetchResult & { feedUrl?: string; feed?: FeedDocument }> {
  const started = performance.now();

  // Try fetching the target page first to inspect <link rel="alternate">.
  let candidateFeedUrl: string | undefined;
  try {
    const resp = await httpFetch(target.toString(), {
      timeoutMs: ctx.timeoutMs,
      locale: ctx.locale,
      signal: ctx.signal,
    });
    if (resp.ok) {
      const metadata = parseMetadata(resp.text);
      candidateFeedUrl = metadata.alternate?.[0]?.href;
    }
  } catch {
    // ignore — fall through to URL-pattern probes
  }

  const feedCandidates = new Set<string>();
  if (candidateFeedUrl) {
    try {
      feedCandidates.add(new URL(candidateFeedUrl, target).toString());
    } catch {
      // invalid URL; skip
    }
  }
  for (const pattern of URL_PATTERNS) {
    feedCandidates.add(
      new URL(pattern, `${target.protocol}//${target.host}`).toString(),
    );
  }

  for (const candidate of feedCandidates) {
    if (ctx.signal?.aborted) break;
    try {
      const resp = await httpFetch(candidate, {
        timeoutMs: ctx.timeoutMs,
        locale: ctx.locale,
        signal: ctx.signal,
      });
      if (!resp.ok || resp.text.length < 50) continue;
      const feed = parseFeed(resp.text);
      if (!feed || feed.entries.length === 0) continue;
      return {
        url: target.toString(),
        status: "ok",
        strategy: "probe",
        platform: "rss",
        httpStatus: resp.status,
        content: resp.text,
        contentType: resp.headers.get("content-type") ?? undefined,
        elapsedMs: Math.round(performance.now() - started),
        signals: [],
        feedUrl: candidate,
        feed,
      };
    } catch {}
  }

  return {
    url: target.toString(),
    status: "not-found",
    strategy: "probe",
    platform: "rss",
    content: "",
    elapsedMs: Math.round(performance.now() - started),
    signals: [],
    error: "no RSS/Atom feed discovered",
  };
}

export function googleNewsRss(query: string, locale = "en-US"): string {
  const [lang, country] = locale.split("-");
  const base = new URL("https://news.google.com/rss/search");
  base.searchParams.set("q", query);
  base.searchParams.set("hl", lang ?? "en");
  base.searchParams.set("gl", country ?? "US");
  base.searchParams.set("ceid", `${country ?? "US"}:${lang ?? "en"}`);
  return base.toString();
}
