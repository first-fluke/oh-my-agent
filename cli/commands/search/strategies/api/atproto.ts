import type {
  FetchContext,
  FetchResult,
  PlatformHandler,
} from "../../types.js";
import { apiFetch, invalidInputResult } from "./helpers.js";

/**
 * Bluesky — `public.api.bsky.app`. Profile/feed endpoints are public;
 * the search endpoint returns 403 and is intentionally not wired up.
 */
const BSKY_HOSTS = new Set(["bsky.app", "www.bsky.app", "staging.bsky.app"]);
const BSKY_API = "https://public.api.bsky.app/xrpc";

export const bluesky: PlatformHandler = {
  id: "bluesky",
  match(url) {
    return (
      BSKY_HOSTS.has(url.hostname) || url.hostname === "public.api.bsky.app"
    );
  },
  async fetch(url, ctx) {
    const profileMatch = url.pathname.match(/^\/profile\/([^/]+)/);
    if (!profileMatch) {
      return invalidInputResult({
        url: url.toString(),
        platform: "bluesky",
        reason: "Bluesky URL must be /profile/{handle}",
      });
    }
    const handle = profileMatch[1];
    if (!handle) {
      return invalidInputResult({
        url: url.toString(),
        platform: "bluesky",
        reason: "Missing handle",
      });
    }
    const postMatch = url.pathname.match(/\/post\/([^/]+)/);
    const endpoint = postMatch
      ? `${BSKY_API}/app.bsky.feed.getPostThread?uri=at://${encodeURIComponent(
          handle,
        )}/app.bsky.feed.post/${postMatch[1]}`
      : `${BSKY_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`;
    return apiFetch({
      platform: "bluesky",
      url,
      fetchUrl: endpoint,
      ctx,
      expectJson: true,
    });
  },
};

/**
 * Mastodon — instance-specific. mastodon.social blocks public timelines,
 * but hachyderm.io, fosstodon.org, and similar instances allow them.
 */
const MASTODON_INSTANCE_ALLOWLIST = new Set([
  "hachyderm.io",
  "fosstodon.org",
  "mas.to",
  "infosec.exchange",
  "indieweb.social",
  "urbanists.social",
  "techhub.social",
  "front-end.social",
]);

function looksMastodon(host: string): boolean {
  if (MASTODON_INSTANCE_ALLOWLIST.has(host)) return true;
  if (host === "mastodon.social" || host === "mastodon.world") return true;
  if (host.startsWith("mastodon.")) return true;
  return false;
}

export const mastodon: PlatformHandler = {
  id: "mastodon",
  match(url) {
    return looksMastodon(url.hostname);
  },
  async fetch(url, ctx) {
    const accountMatch = url.pathname.match(/^\/@([^/]+)/);
    const tagMatch = url.pathname.match(/^\/tags\/([^/]+)/);

    if (tagMatch?.[1]) {
      const endpoint = `https://${url.hostname}/api/v1/timelines/tag/${tagMatch[1]}?limit=20`;
      return apiFetch({
        platform: "mastodon",
        url,
        fetchUrl: endpoint,
        ctx,
        expectJson: true,
      });
    }
    if (accountMatch?.[1]) {
      const lookup = `https://${url.hostname}/api/v1/accounts/lookup?acct=${encodeURIComponent(
        accountMatch[1],
      )}`;
      return apiFetch({
        platform: "mastodon",
        url,
        fetchUrl: lookup,
        ctx,
        expectJson: true,
      });
    }
    return invalidInputResult({
      url: url.toString(),
      platform: "mastodon",
      reason: "Mastodon URL must be /@{user} or /tags/{tag}",
    });
  },
  async keywordSearch(query: string, ctx: FetchContext): Promise<FetchResult> {
    const instance = "hachyderm.io";
    const endpoint = `https://${instance}/api/v1/timelines/tag/${encodeURIComponent(
      query,
    )}?limit=20`;
    return apiFetch({
      platform: "mastodon",
      url: new URL(endpoint),
      fetchUrl: endpoint,
      ctx,
      expectJson: true,
    });
  },
};
