import type {
  FetchContext,
  FetchResult,
  PlatformHandler,
} from "../../types.js";
import { apiFetch, invalidInputResult } from "./helpers.js";

/**
 * arXiv — `export.arxiv.org/api/query`.
 */
const ARXIV_HOSTS = new Set(["arxiv.org", "www.arxiv.org"]);

export const arxiv: PlatformHandler = {
  id: "arxiv",
  match(url) {
    return ARXIV_HOSTS.has(url.hostname);
  },
  async fetch(url, ctx) {
    const idMatch = url.pathname.match(
      /\/(abs|pdf)\/([^/]+?)(?:v\d+)?(?:\.pdf)?$/,
    );
    if (!idMatch) {
      return invalidInputResult({
        url: url.toString(),
        platform: "arxiv",
        reason: "arXiv URL must be /abs/{id} or /pdf/{id}",
      });
    }
    const apiUrl = `https://export.arxiv.org/api/query?id_list=${idMatch[2]}`;
    return apiFetch({
      platform: "arxiv",
      url,
      fetchUrl: apiUrl,
      ctx,
    });
  },
  async keywordSearch(query, ctx) {
    const apiUrl = new URL("https://export.arxiv.org/api/query");
    apiUrl.searchParams.set("search_query", `all:${query}`);
    apiUrl.searchParams.set("max_results", "20");
    return apiFetch({
      platform: "arxiv",
      url: apiUrl,
      fetchUrl: apiUrl.toString(),
      ctx,
    });
  },
};

/**
 * CrossRef — `api.crossref.org/works/{doi}`.
 */
const CROSSREF_HOSTS = new Set(["doi.org", "dx.doi.org", "api.crossref.org"]);

export const crossref: PlatformHandler = {
  id: "crossref",
  match(url) {
    return CROSSREF_HOSTS.has(url.hostname);
  },
  async fetch(url, ctx) {
    const doi = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!doi || !doi.includes("/")) {
      return invalidInputResult({
        url: url.toString(),
        platform: "crossref",
        reason: "DOI path missing or malformed",
      });
    }
    const apiUrl = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
    return apiFetch({
      platform: "crossref",
      url,
      fetchUrl: apiUrl,
      ctx,
      expectJson: true,
    });
  },
  async keywordSearch(query: string, ctx: FetchContext): Promise<FetchResult> {
    const apiUrl = new URL("https://api.crossref.org/works");
    apiUrl.searchParams.set("query", query);
    apiUrl.searchParams.set("rows", "20");
    return apiFetch({
      platform: "crossref",
      url: apiUrl,
      fetchUrl: apiUrl.toString(),
      ctx,
      expectJson: true,
    });
  },
};

/**
 * Wikipedia — `/w/api.php` or REST summary endpoint.
 */
function isWikipediaHost(host: string): boolean {
  return /\.wikipedia\.org$/.test(host);
}

export const wikipedia: PlatformHandler = {
  id: "wikipedia",
  match(url) {
    return isWikipediaHost(url.hostname);
  },
  async fetch(url, ctx) {
    const match = url.pathname.match(/^\/wiki\/(.+)$/);
    if (!match) {
      return invalidInputResult({
        url: url.toString(),
        platform: "wikipedia",
        reason: "Wikipedia URL must be /wiki/{title}",
      });
    }
    const title = match[1];
    const apiUrl = `https://${url.hostname}/api/rest_v1/page/summary/${title}`;
    return apiFetch({
      platform: "wikipedia",
      url,
      fetchUrl: apiUrl,
      ctx,
      expectJson: true,
    });
  },
};

/**
 * OpenLibrary — `/works/{id}.json`, `/books/{id}.json`, or ISBN.
 */
const OPENLIB_HOSTS = new Set(["openlibrary.org", "www.openlibrary.org"]);

export const openLibrary: PlatformHandler = {
  id: "openlibrary",
  match(url) {
    return OPENLIB_HOSTS.has(url.hostname);
  },
  async fetch(url, ctx) {
    const match = url.pathname.match(/^\/(works|books|authors|isbn)\/([^/]+)/);
    if (!match) {
      return invalidInputResult({
        url: url.toString(),
        platform: "openlibrary",
        reason: "OpenLibrary URL must be /works|books|authors|isbn/{id}",
      });
    }
    const apiUrl = `https://openlibrary.org/${match[1]}/${match[2]}.json`;
    return apiFetch({
      platform: "openlibrary",
      url,
      fetchUrl: apiUrl,
      ctx,
      expectJson: true,
    });
  },
};
