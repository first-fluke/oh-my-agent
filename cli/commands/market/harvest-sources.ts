/**
 * harvest-sources.ts — the fetch layer: one handler per community source,
 * wired into a `SOURCE_FETCHERS` registry that `fetchSource` dispatches over.
 *
 * Each handler takes the same `FetchArgs` and returns a `SourceResult`. Shared
 * concerns (vs-entity labelling, direct fetch, retry/backoff) are factored into
 * small helpers so adding a source is a one-line registry entry rather than
 * another branch in a 400-line conditional.
 *
 * The implementation lives in `harvest-sources/`:
 *   - `harvest-sources/result.ts`   — SourceResult + shared fetch helpers
 *   - `harvest-sources/fetchers.ts` — per-source fetchers + SOURCE_FETCHERS
 *   - `harvest-sources/ytdlp.ts`    — yt-dlp availability probe
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  normalizeBluesky,
  normalizeGithub,
  normalizeHN,
  normalizeMastodon,
  normalizeReddit,
} from "./harvest-normalizers.js";
import { SOURCE_FETCHERS } from "./harvest-sources/fetchers.js";
import {
  applyVsLabel,
  fail,
  ok,
  type SourceResult,
} from "./harvest-sources/result.js";
import { ytdlpAvailable } from "./harvest-sources/ytdlp.js";
import type { SourceItem } from "./shared/schema.js";

export { applyVsLabel, type SourceResult };

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Fetch a single source via its registered handler. Keeps the original
 * positional signature so the orchestrator (`harvest`) is unchanged.
 */
export async function fetchSource(
  source: string,
  query: string,
  window: string,
  limit: number,
  timeoutMs: number,
  vsLabel?: string,
  sites?: string[],
): Promise<SourceResult> {
  const fetcher = SOURCE_FETCHERS[source];
  if (!fetcher) return fail(source, "unknown source");
  return fetcher({ source, query, window, limit, timeoutMs, vsLabel, sites });
}

// ---------------------------------------------------------------------------
// Default source resolution
// ---------------------------------------------------------------------------

export async function resolveDefaultSources(): Promise<string[]> {
  // reddit stays keyless: its anonymous search.json is 403-blocked, so the
  // reddit source resolves through the pullpush.io archive (keyless) by
  // default, and upgrades to live oauth.reddit.com when REDDIT_CLIENT_ID /
  // REDDIT_CLIENT_SECRET are set. See fetchReddit.
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
// Mock mode
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

const MOCK_NORMALIZERS: Record<string, (data: unknown) => SourceItem[]> = {
  reddit: (data) => normalizeReddit(data, "reddit"),
  hn: normalizeHN,
  bluesky: normalizeBluesky,
  mastodon: normalizeMastodon,
  github: normalizeGithub,
};

export async function fetchSourceMock(
  source: string,
  fixtureDir: string,
  vsLabel?: string,
): Promise<SourceResult> {
  const data = await loadFixture(source, fixtureDir);
  if (data === null) return fail(source, "no-fixture");
  const normalize = MOCK_NORMALIZERS[source];
  const items = normalize ? normalize(data) : [];
  return ok(source, applyVsLabel(items, vsLabel));
}
