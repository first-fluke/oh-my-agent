import { USER_AGENTS } from "../../http.js";
import type {
  FetchContext,
  FetchResult,
  PlatformHandler,
} from "../../types.js";
import { apiFetch } from "./helpers.js";

const REDDIT_HOSTS = new Set([
  "reddit.com",
  "www.reddit.com",
  "old.reddit.com",
  "np.reddit.com",
  "m.reddit.com",
]);

function toJsonUrl(url: URL): string {
  const clone = new URL(url.toString());
  clone.hostname = "www.reddit.com";
  if (!clone.pathname.endsWith(".json")) {
    clone.pathname = clone.pathname.replace(/\/?$/, "/.json");
  }
  return clone.toString();
}

export const reddit: PlatformHandler = {
  id: "reddit",
  match(url) {
    return REDDIT_HOSTS.has(url.hostname);
  },
  async fetch(url, ctx) {
    return apiFetch({
      platform: "reddit",
      url,
      fetchUrl: toJsonUrl(url),
      headers: { "User-Agent": USER_AGENTS.mobileSafari },
      ctx,
      expectJson: true,
    });
  },
  async keywordSearch(query: string, ctx: FetchContext): Promise<FetchResult> {
    const search = new URL("https://www.reddit.com/search.json");
    search.searchParams.set("q", query);
    search.searchParams.set("limit", "25");
    return apiFetch({
      platform: "reddit",
      url: search,
      fetchUrl: search.toString(),
      headers: { "User-Agent": USER_AGENTS.mobileSafari },
      ctx,
      expectJson: true,
    });
  },
};
