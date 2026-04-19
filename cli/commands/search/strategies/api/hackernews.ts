import type {
  FetchContext,
  FetchResult,
  PlatformHandler,
} from "../../types.js";
import { apiFetch, extractPath, invalidInputResult } from "./helpers.js";

const HN_HOSTS = new Set([
  "news.ycombinator.com",
  "hacker-news.firebaseio.com",
]);
const ALGOLIA_SEARCH = "https://hn.algolia.com/api/v1/search";
const FIREBASE_BASE = "https://hacker-news.firebaseio.com/v0";

export const hackerNews: PlatformHandler = {
  id: "hackernews",
  match(url) {
    return HN_HOSTS.has(url.hostname);
  },
  async fetch(url, ctx) {
    const id = new URLSearchParams(url.search).get("id");
    if (!id || !/^\d+$/.test(id)) {
      return invalidInputResult({
        url: url.toString(),
        platform: "hackernews",
        reason: "Missing or invalid ?id= query parameter",
      });
    }
    return apiFetch({
      platform: "hackernews",
      url,
      fetchUrl: `${FIREBASE_BASE}/item/${id}.json`,
      ctx,
      expectJson: true,
    });
  },
  async keywordSearch(query, ctx) {
    const url = new URL(ALGOLIA_SEARCH);
    url.searchParams.set("query", query);
    return apiFetch({
      platform: "hackernews",
      url,
      fetchUrl: url.toString(),
      ctx,
      expectJson: true,
    });
  },
};

/**
 * Lobste.rs JSON — `/s/{id}.json` or `/newest.json`.
 */
export const lobsters: PlatformHandler = {
  id: "lobsters",
  match(url) {
    return url.hostname === "lobste.rs";
  },
  async fetch(url, ctx) {
    let fetchUrl = url.toString();
    if (!fetchUrl.endsWith(".json")) {
      fetchUrl = fetchUrl.replace(/\/?$/, ".json");
    }
    return apiFetch({
      platform: "lobsters",
      url,
      fetchUrl,
      ctx,
      expectJson: true,
    });
  },
};

/**
 * dev.to — `/api/articles/{username}/{slug}` via public API.
 */
export const devto: PlatformHandler = {
  id: "devto",
  match(url) {
    return url.hostname === "dev.to";
  },
  async fetch(url, ctx) {
    const path = extractPath(url, "");
    if (!path) {
      return invalidInputResult({
        url: url.toString(),
        platform: "devto",
        reason: "Cannot derive article path from URL",
      });
    }
    const apiUrl = `https://dev.to/api/articles/${path}`;
    return apiFetch({
      platform: "devto",
      url,
      fetchUrl: apiUrl,
      ctx,
      expectJson: true,
    });
  },
  async keywordSearch(query: string, ctx: FetchContext): Promise<FetchResult> {
    const apiUrl = new URL("https://dev.to/api/articles");
    apiUrl.searchParams.set("tag", query);
    apiUrl.searchParams.set("per_page", "20");
    return apiFetch({
      platform: "devto",
      url: apiUrl,
      fetchUrl: apiUrl.toString(),
      ctx,
      expectJson: true,
    });
  },
};

/**
 * V2EX — `/api/topics/show.json?id={id}`.
 */
export const v2ex: PlatformHandler = {
  id: "v2ex",
  match(url) {
    return url.hostname === "www.v2ex.com" || url.hostname === "v2ex.com";
  },
  async fetch(url, ctx) {
    const match = url.pathname.match(/^\/t\/(\d+)/);
    if (!match) {
      return invalidInputResult({
        url: url.toString(),
        platform: "v2ex",
        reason: "V2EX URL must match /t/{id}",
      });
    }
    return apiFetch({
      platform: "v2ex",
      url,
      fetchUrl: `https://www.v2ex.com/api/topics/show.json?id=${match[1]}`,
      ctx,
      expectJson: true,
    });
  },
};
