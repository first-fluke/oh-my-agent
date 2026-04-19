import type {
  FetchContext,
  FetchResult,
  PlatformHandler,
} from "../../types.js";
import { arxiv, crossref, openLibrary, wikipedia } from "./academic.js";
import { bluesky, mastodon } from "./atproto.js";
import { devto, hackerNews, lobsters, v2ex } from "./hackernews.js";
import { errorResult } from "./helpers.js";
import { naverBlog, naverFinance } from "./naver.js";
import { reddit } from "./reddit.js";
import { npmRegistry, pypiRegistry } from "./registry.js";
import { stackExchange } from "./stackexchange.js";
import { twitter } from "./twitter.js";

/**
 * Platform registry ordered by specificity — subdomain matches first.
 */
export const PLATFORM_HANDLERS: PlatformHandler[] = [
  twitter,
  reddit,
  hackerNews,
  stackExchange,
  bluesky,
  mastodon,
  arxiv,
  crossref,
  wikipedia,
  openLibrary,
  lobsters,
  devto,
  v2ex,
  npmRegistry,
  pypiRegistry,
  naverBlog,
  naverFinance,
];

export function findHandler(url: URL): PlatformHandler | null {
  for (const handler of PLATFORM_HANDLERS) {
    if (handler.match(url)) return handler;
  }
  return null;
}

export async function apiStrategy(
  url: URL,
  ctx: FetchContext,
): Promise<FetchResult | null> {
  const handler = findHandler(url);
  if (!handler) return null;
  try {
    return await handler.fetch(url, ctx);
  } catch (err) {
    return errorResult({
      url: url.toString(),
      platform: handler.id,
      error: err,
    });
  }
}

export async function apiKeywordSearch(
  query: string,
  ctx: FetchContext,
  platforms?: string[],
): Promise<FetchResult[]> {
  const targets = platforms
    ? PLATFORM_HANDLERS.filter(
        (h) => platforms.includes(h.id) && h.keywordSearch,
      )
    : PLATFORM_HANDLERS.filter((h) => h.keywordSearch);

  return Promise.all(
    targets.map(async (handler) => {
      try {
        const searcher = handler.keywordSearch;
        if (!searcher) {
          return errorResult({
            url: "",
            platform: handler.id,
            error: new Error("keywordSearch not implemented"),
          });
        }
        return await searcher(query, ctx);
      } catch (err) {
        return errorResult({
          url: "",
          platform: handler.id,
          error: err,
        });
      }
    }),
  );
}

export { PLATFORM_HANDLERS as apiHandlers };
