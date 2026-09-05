#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs";
import type { IncomingHttpHeaders } from "node:http";
import http from "node:http";
import https from "node:https";
import { homedir } from "node:os";
import { basename, join } from "node:path";

function endpointUrl(): string | null {
  if (process.env.OMA_NO_AGENTMEMORY === "1") return null;
  if (process.env.AGENTMEMORY_URL) return process.env.AGENTMEMORY_URL;

  const endpointPath = join(homedir(), ".agentmemory", "endpoint.json");
  if (!existsSync(endpointPath)) return null;

  try {
    const cfg = JSON.parse(readFileSync(endpointPath, "utf-8")) as {
      port?: number;
      url?: string;
    };
    if (typeof cfg.port === "number") return `http://127.0.0.1:${cfg.port}`;
    if (typeof cfg.url === "string" && cfg.url.trim()) return cfg.url;
    return null;
  } catch {
    return null;
  }
}

let reachable: boolean | null = null;

/**
 * Test-only: clear the memoized reachability probe so cases that point
 * `AGENTMEMORY_URL` at different endpoints don't leak a cached verdict into each
 * other (the probe is intentionally memoized once per process at runtime).
 */
export function _resetReachableCache(): void {
  reachable = null;
}

function requestAgentMemory(
  baseUrl: string,
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  } = {},
): Promise<{ statusCode: number; headers: IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(path, baseUrl);
    const client = target.protocol === "https:" ? https : http;
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      reject(new Error(`unsupported protocol ${target.protocol}`));
      return;
    }

    const body = options.body;
    const headers = { ...(options.headers ?? {}) };
    if (body !== undefined && headers["content-length"] === undefined) {
      headers["content-length"] = String(Buffer.byteLength(body));
    }

    const req = client.request(
      target,
      {
        method: options.method ?? "GET",
        headers,
      },
      (res) => {
        let responseBody = "";
        res.setEncoding("utf-8");
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: responseBody,
          });
        });
        res.on("error", reject);
      },
    );
    req.setTimeout(options.timeoutMs ?? 500, () => {
      req.destroy(new Error("request timed out"));
    });
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

export async function isAgentMemoryReachable(): Promise<boolean> {
  if (reachable !== null) return reachable;
  const url = endpointUrl();
  if (!url) {
    reachable = false;
    return reachable;
  }

  try {
    const response = await requestAgentMemory(url, "/agentmemory/health");
    // Capability-based acceptance: any 2xx health response from the
    // explicitly configured endpoint counts as reachable. Version pinning
    // proved brittle (the published line already jumped from 0.11/0.12
    // design targets to 0.9.x service builds), so payload shape and version
    // are no longer gating.
    reachable = response.statusCode >= 200 && response.statusCode < 300;
    return reachable;
  } catch {
    reachable = false;
    return reachable;
  }
}

export interface RecalledFact {
  text: string;
  source?: string;
  score?: number;
}

interface SearchResult {
  score?: number;
  timestamp?: unknown;
  created_at?: unknown;
  observation?: {
    narrative?: unknown;
    facts?: unknown;
    title?: unknown;
    type?: unknown;
    timestamp?: unknown;
    created_at?: unknown;
  };
}

/**
 * Recall TTL: facts older than this many days are dropped from the snapshot so
 * stale, long-resolved decisions stop rehydrating every boundary. Default 30
 * days; set `OMA_RECALL_MAX_AGE_DAYS=0` (or a non-positive value) to disable.
 * Returns the max age in ms, or null when disabled.
 */
function recallMaxAgeMs(): number | null {
  const raw = process.env.OMA_RECALL_MAX_AGE_DAYS;
  const days = raw === undefined ? 30 : Number(raw);
  if (!Number.isFinite(days) || days <= 0) return null;
  return days * 24 * 60 * 60 * 1000;
}

/**
 * Best-effort timestamp extraction from a search result. AgentMemory's response
 * envelope is not contractually fixed across versions, so several candidate
 * field names / locations are probed. Numeric epoch seconds are normalised to
 * ms. Returns null when no parseable timestamp is present — callers then keep
 * the fact (TTL filtering is fail-open, never dropping facts of unknown age).
 */
function extractTimestampMs(entry: SearchResult): number | null {
  const obs = entry.observation ?? {};
  const candidates: unknown[] = [
    obs.timestamp,
    obs.created_at,
    entry.timestamp,
    entry.created_at,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate < 1e12 ? candidate * 1000 : candidate;
    }
    if (typeof candidate === "string" && candidate.trim()) {
      const parsed = Date.parse(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

export function parseSearchResults(
  body: string,
  k: number,
  nowMs: number = Date.now(),
): RecalledFact[] {
  let parsed: { results?: unknown };
  try {
    parsed = JSON.parse(body) as { results?: unknown };
  } catch {
    return [];
  }
  if (!Array.isArray(parsed.results)) return [];

  const minScore = (() => {
    const raw = Number(process.env.OMA_RECALL_MIN_SCORE);
    return Number.isFinite(raw) ? raw : 1;
  })();

  const maxAgeMs = recallMaxAgeMs();
  const cutoffMs = maxAgeMs === null ? null : nowMs - maxAgeMs;

  const facts: RecalledFact[] = [];
  for (const entry of parsed.results as SearchResult[]) {
    const score = typeof entry.score === "number" ? entry.score : 0;
    // Raw `/observe` envelopes score near-zero (~0.006); enriched facts score
    // in the single digits. Drop the noise floor so the snapshot stays useful.
    if (score < minScore) continue;
    // TTL: drop facts older than the cutoff (fail-open on unknown age).
    if (cutoffMs !== null) {
      const tsMs = extractTimestampMs(entry);
      if (tsMs !== null && tsMs < cutoffMs) continue;
    }
    const obs = entry.observation ?? {};
    const narrative =
      typeof obs.narrative === "string" && obs.narrative.trim()
        ? obs.narrative.trim()
        : "";
    const factsText = Array.isArray(obs.facts)
      ? obs.facts.filter((f): f is string => typeof f === "string").join("; ")
      : "";
    const title = typeof obs.title === "string" ? obs.title.trim() : "";
    const text = narrative || factsText || title;
    if (!text) continue;
    const source = typeof obs.type === "string" ? obs.type : undefined;
    facts.push({ text, source, score });
    if (facts.length >= k) break;
  }
  return facts;
}

/**
 * Recall enriched facts from AgentMemory for boundary rehydration. Best-effort:
 * returns [] when the daemon is unreachable, on timeout (recall budget 2s per
 * design D34), or on any parse/transport error — never throws, never blocks L1.
 */
export async function recallFacts(
  query: string,
  k = 5,
  projectDir: string = process.cwd(),
): Promise<RecalledFact[]> {
  if (!query.trim()) return [];
  // The whole body is guarded so this honors its "never throws" contract: the
  // reachability probe and endpoint resolution can throw under load (e.g. a
  // socket error from the shared daemon), and an unguarded throw here blanks the
  // boundary snapshot the hook would otherwise emit. Degrade to local-only.
  try {
    if (!(await isAgentMemoryReachable())) return [];
    const url = endpointUrl();
    if (!url) return [];
    const response = await requestAgentMemory(url, "/agentmemory/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Match the project identity used by observeWithTimeout. The query's
      // project-name term is a relevance hint, not a scope restriction.
      body: JSON.stringify({
        query,
        limit: k,
        project: basename(projectDir),
        cwd: projectDir,
      }),
      timeoutMs: 2000,
    });
    if (response.statusCode < 200 || response.statusCode >= 300) return [];
    return parseSearchResults(response.body, k);
  } catch {
    return [];
  }
}

export async function observeWithTimeout(payload: {
  sessionId: string;
  content: string;
  source: string;
  projectDir?: string;
}): Promise<boolean> {
  // Fully guarded (best-effort, never throws): the reachability probe and
  // endpoint resolution can throw under load, and a throw here must not abort
  // the hook that fired the observe.
  try {
    if (!(await isAgentMemoryReachable())) return false;
    const url = endpointUrl();
    if (!url) return false;
    // AgentMemory's /observe expects a hook-event envelope
    // (hookType, sessionId, project, cwd, timestamp) carrying the content.
    const cwd = payload.projectDir ?? process.cwd();
    const response = await requestAgentMemory(url, "/agentmemory/observe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hookType: payload.source,
        sessionId: payload.sessionId,
        project: basename(cwd),
        cwd,
        timestamp: new Date().toISOString(),
        content: payload.content,
      }),
    });
    return response.statusCode >= 200 && response.statusCode < 300;
  } catch {
    return false;
  }
}
