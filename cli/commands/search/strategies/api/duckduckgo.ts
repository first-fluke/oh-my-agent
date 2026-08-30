/**
 * Web grounding via DDGS metasearch (uvx-launched Python CLI).
 *
 * Requires `uv` on PATH (one-line install: `curl -LsSf https://astral.sh/uv/install.sh | sh`).
 * `uvx ddgs` is invoked per query — supply `site:<host>` operators inside
 * the query string; consumers (e.g. `oma search` site-scoped fan-out)
 * one query per site.
 *
 * No regex/HTML scraping. If uv is missing or ddgs fails, the handler
 * surfaces a clear actionable error rather than silently degrading.
 */

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { FetchResult, PlatformHandler } from "../../types.js";
import { apiFetch, errorResult, invalidInputResult } from "./helpers.js";

const execFileAsync = promisify(execFile);

const DDG_HOSTS = new Set(["html.duckduckgo.com", "duckduckgo.com"]);
const SEARCH_URL = "https://html.duckduckgo.com/html/";

const UV_INSTALL_HINT =
  "Install uv once: curl -LsSf https://astral.sh/uv/install.sh | sh";

// ---------------------------------------------------------------------------
// uvx availability cache
// ---------------------------------------------------------------------------

let _uvxAvailable: boolean | undefined;

async function checkUvx(): Promise<boolean> {
  if (_uvxAvailable !== undefined) return _uvxAvailable;
  try {
    await execFileAsync("uvx", ["--version"], { timeout: 5_000 });
    _uvxAvailable = true;
  } catch {
    _uvxAvailable = false;
  }
  return _uvxAvailable;
}

// ---------------------------------------------------------------------------
// uvx ddgs invocation
// ---------------------------------------------------------------------------

interface DdgsRecord {
  title?: string;
  href?: string;
  body?: string;
}

interface DdgItem {
  item_id: string;
  url: string;
  title: string;
  snippet: string | null;
  author: null;
  posted_at: null;
  view_count: 0;
  comment_count: 0;
}

async function ddgsViaUvx(
  query: string,
  maxResults: number,
  timeoutMs: number,
): Promise<DdgItem[]> {
  // ddgs writes to a file when `-o <path>.json`; stdout-only is not
  // supported. Per-call temp dir for cleanup safety.
  const dir = await mkdtemp(join(tmpdir(), "oma-ddgs-"));
  const outFile = join(dir, "result.json");
  try {
    await execFileAsync(
      "uvx",
      [
        "ddgs",
        "text",
        "-q",
        query,
        "-m",
        String(maxResults),
        "-o",
        outFile,
        "-nc",
      ],
      // First invocation pulls packages (lxml/primp ~25MB). Allow generous
      // timeout so the cold path doesn't immediately fail.
      { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 },
    );
    const raw = await readFile(outFile, "utf-8");
    const parsed = JSON.parse(raw) as DdgsRecord[];
    const items: DdgItem[] = [];
    const seen = new Set<string>();
    for (const r of parsed) {
      if (!r.href || !r.title) continue;
      if (seen.has(r.href)) continue;
      seen.add(r.href);
      items.push({
        item_id: `ddg:${r.href}`,
        url: r.href,
        title: r.title.trim(),
        snippet: r.body ? r.body.trim().slice(0, 320) : null,
        author: null,
        posted_at: null,
        view_count: 0,
        comment_count: 0,
      });
    }
    return items;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const duckduckgo: PlatformHandler = {
  id: "duckduckgo",
  match(url) {
    return DDG_HOSTS.has(url.hostname);
  },
  async fetch(url, ctx) {
    return apiFetch({
      platform: "duckduckgo",
      url,
      fetchUrl: url.toString(),
      ctx,
      mapBody: (raw) => raw,
    });
  },
  async keywordSearch(query, ctx): Promise<FetchResult> {
    if (!query.trim()) {
      return invalidInputResult({
        url: SEARCH_URL,
        platform: "duckduckgo",
        reason: "empty query",
      });
    }
    const maxResults = 20;

    if (!(await checkUvx())) {
      return errorResult({
        url: SEARCH_URL,
        platform: "duckduckgo",
        error: new Error(
          `uvx not found on PATH — grounding requires uv. ${UV_INSTALL_HINT}`,
        ),
      });
    }

    try {
      const items = await ddgsViaUvx(query, maxResults, ctx.timeoutMs * 2);
      return {
        url: SEARCH_URL,
        status: "ok",
        strategy: "api",
        platform: "duckduckgo",
        httpStatus: 200,
        content: JSON.stringify({ source: "duckduckgo", items }),
        elapsedMs: 0,
        signals: [],
      };
    } catch (err) {
      return errorResult({
        url: SEARCH_URL,
        platform: "duckduckgo",
        error: err,
      });
    }
  },
};
