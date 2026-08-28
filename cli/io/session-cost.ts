/**
 * session-cost.ts
 *
 * Session-scoped token/spawn accounting for orchestrate runs.
 * Tracks usage per agent/vendor and checks against configured quota caps
 * so users can be warned before the next agent spawn when a threshold is crossed.
 *
 * Storage: .agents/state/memories/session-cost-{sessionId}.md (legacy
 * .serena/memories fallback) via the shared MarkdownRecordStore
 * (see io/markdown-records.ts).
 *
 * Cap source precedence:
 *   1. .agents/oma-config.yaml               — canonical user config (wins)
 *   2. .agents/config/defaults.yaml          — OMA-shipped SSOT fallback
 * under top-level `session.quota_cap` key.
 */

import fs, { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { findFileUpwards } from "../utils/fs-utils.js";
import {
  createMarkdownRecordStore,
  readFileContent,
} from "./markdown-records.js";
import { getCoordinationStoreDirs } from "./memory.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single usage event recorded by an agent during a session. */
export interface UsageRecord {
  sessionId: string;
  vendor: string; // claude | codex | gemini | qwen | antigravity | grok
  agentId: string;
  tokens: number;
  estimatedCostNote?: string; // e.g. "codex_plus_quota_30pct"
  recordedAt: string; // ISO8601
}

/**
 * Quota caps to enforce.
 * All fields optional — omitting a field means that dimension is uncapped.
 */
export interface QuotaCap {
  tokens?: number; // total token budget across all vendors
  perVendor?: Partial<Record<string, number>>; // per-vendor token budgets
  spawnCount?: number; // max total spawns (records) regardless of tokens
}

/** Result returned by checkCap. */
export interface CheckCapResult {
  exceeded: boolean;
  reason?: "tokens" | "perVendor" | "spawnCount";
  current: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const usageStore = createMarkdownRecordStore<UsageRecord>({
  filePrefix: "session-cost",
  title: "Session Cost",
  isRecordValid: (value) => {
    const record = value as UsageRecord | null;
    return (
      !!record &&
      typeof record.sessionId === "string" &&
      typeof record.vendor === "string" &&
      typeof record.agentId === "string" &&
      typeof record.tokens === "number" &&
      typeof record.recordedAt === "string"
    );
  },
});

// ---------------------------------------------------------------------------
// Config loading — same pattern as runtime-dispatch.ts
// ---------------------------------------------------------------------------

type RawQuotaCap = {
  tokens?: number;
  spawn_count?: number;
  per_vendor?: Partial<Record<string, number>>;
};

type RawSessionConfig = {
  quota_cap?: RawQuotaCap;
};

type RawConfigFile = {
  session?: RawSessionConfig;
};

function loadRawConfig(filePath: string): RawConfigFile {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseYaml(content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as RawConfigFile;
    }
    return {};
  } catch {
    return {};
  }
}

function normalizeQuotaCap(raw: RawQuotaCap): QuotaCap {
  const cap: QuotaCap = {};
  if (typeof raw.tokens === "number") cap.tokens = raw.tokens;
  if (typeof raw.spawn_count === "number") cap.spawnCount = raw.spawn_count;
  if (raw.per_vendor && typeof raw.per_vendor === "object") {
    cap.perVendor = { ...raw.per_vendor };
  }
  return cap;
}

/**
 * Load quota cap from config files.
 *
 * Precedence (first match wins):
 *   1. .agents/oma-config.yaml                — canonical user config
 *   2. .agents/config/defaults.yaml           — OMA-shipped SSOT fallback
 *
 * Returns null if no cap is configured.
 */
export function loadQuotaCap(cwd: string = process.cwd()): QuotaCap | null {
  const candidates = [
    findFileUpwards(cwd, path.join(".agents", "oma-config.yaml")),
    findFileUpwards(cwd, path.join(".agents", "config", "defaults.yaml")),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const config = loadRawConfig(candidate);
    if (config.session?.quota_cap) {
      return normalizeQuotaCap(config.session.quota_cap);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record a usage event for an agent in the session.
 * Creates the file with YAML frontmatter on first write.
 * Uses appendFileSync for concurrent-safe (POSIX atomic) appends.
 */
export function recordUsage(
  sessionId: string,
  record: Omit<UsageRecord, "sessionId" | "recordedAt">,
): void {
  usageStore.append(sessionId, {
    ...record,
    sessionId,
    recordedAt: new Date().toISOString(),
  });
}

/**
 * Return all usage records for the session, in order of recording.
 * Partial records (due to concurrent writes) are silently skipped.
 */
export function loadSessionUsage(sessionId: string): UsageRecord[] {
  return usageStore.load(sessionId);
}

/**
 * Per-vendor input-token pricing in USD per 1M tokens.
 *
 * Conservative midpoints across each vendor's coding-tier model lineup as
 * of 2026-05.
 *
 * Sources:
 * - xAI: https://docs.x.ai/developers/pricing (grok-4.3 = $1.25/M input)
 * - Others: internal midpoints for coding models.
 *
 * recordUsage only captures prompt-input character estimates, so the
 * resulting USD figure is a floor, not a billing-accurate amount.
 */
export const DEFAULT_VENDOR_PRICING: Record<string, number> = {
  claude: 3,
  codex: 5,
  gemini: 0.3,
  qwen: 0,
  antigravity: 0.3,
  cursor: 5,
  grok: 1.25, // xAI Grok-4.3 / grok-4.20 series (May 2026) — see https://docs.x.ai/developers/pricing
};

/**
 * Estimate input-token cost in USD for a vendor.
 * Unknown vendors fall back to the Claude rate.
 */
export function estimateUsd(
  tokens: number,
  vendor: string,
  pricing: Record<string, number> = DEFAULT_VENDOR_PRICING,
): number {
  const rate = pricing[vendor] ?? pricing.claude ?? 3;
  return (tokens / 1_000_000) * rate;
}

/**
 * Load usage records from every session-cost-*.md file in the project
 * coordination store (canonical + legacy dirs). Used by `oma stats` to surface
 * cumulative cost telemetry. Missing directory or unreadable files are
 * skipped silently.
 */
export function listAllSessionUsage(
  cwd: string = process.cwd(),
): UsageRecord[] {
  const all: UsageRecord[] = [];
  const seen = new Set<string>();
  for (const baseDir of getCoordinationStoreDirs(cwd)) {
    if (!existsSync(baseDir)) continue;
    let entries: string[];
    try {
      entries = readdirSync(baseDir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.startsWith("session-cost-") || !entry.endsWith(".md"))
        continue;
      if (seen.has(entry)) continue;
      seen.add(entry);
      const content = readFileContent(path.join(baseDir, entry));
      if (!content) continue;
      all.push(...usageStore.parse(content));
    }
  }
  return all;
}

/**
 * Check whether any cap in the provided QuotaCap has been exceeded for the session.
 *
 * Evaluation order (first exceeded cap wins):
 *  1. spawnCount — total number of records
 *  2. tokens — sum of all tokens across all vendors
 *  3. perVendor — per-vendor token sum
 *
 * Returns { exceeded: false } when no cap is configured or none are crossed.
 */
export function checkCap(sessionId: string, cap: QuotaCap): CheckCapResult {
  const records = loadSessionUsage(sessionId);

  // 1. spawn count
  if (cap.spawnCount !== undefined) {
    const current = records.length;
    if (current >= cap.spawnCount) {
      return {
        exceeded: true,
        reason: "spawnCount",
        current,
        limit: cap.spawnCount,
      };
    }
  }

  // 2. total tokens
  if (cap.tokens !== undefined) {
    const current = records.reduce((sum, r) => sum + r.tokens, 0);
    if (current >= cap.tokens) {
      return {
        exceeded: true,
        reason: "tokens",
        current,
        limit: cap.tokens,
      };
    }
  }

  // 3. per-vendor tokens
  if (cap.perVendor) {
    const vendorTotals: Record<string, number> = {};
    for (const r of records) {
      vendorTotals[r.vendor] = (vendorTotals[r.vendor] ?? 0) + r.tokens;
    }
    for (const [vendor, limit] of Object.entries(cap.perVendor)) {
      if (limit === undefined) continue;
      const current = vendorTotals[vendor] ?? 0;
      if (current >= limit) {
        return {
          exceeded: true,
          reason: "perVendor",
          current,
          limit,
        };
      }
    }
  }

  // No cap exceeded (or no cap configured)
  return {
    exceeded: false,
    current: records.reduce((sum, r) => sum + r.tokens, 0),
    limit: cap.tokens ?? 0,
  };
}

/**
 * Format a human-readable prompt message for the user when a cap is exceeded.
 * Designed for T17 (Review Loop cost termination) to display before next spawn.
 */
export function formatPromptMessage(result: CheckCapResult): string {
  if (!result.exceeded) {
    return "";
  }

  switch (result.reason) {
    case "spawnCount":
      return (
        `[Session quota] Spawn limit reached: ${result.current} of ${result.limit} spawns used. ` +
        `The orchestrator will not start the next agent until you confirm or increase the limit ` +
        `(session.quota_cap.spawn_count in oma-config.yaml).`
      );
    case "tokens":
      return (
        `[Session quota] Token limit reached: ${result.current.toLocaleString()} of ` +
        `${result.limit.toLocaleString()} tokens consumed. ` +
        `The orchestrator will not start the next agent until you confirm or increase the limit ` +
        `(session.quota_cap.tokens in oma-config.yaml).`
      );
    case "perVendor":
      return (
        `[Session quota] Per-vendor token limit reached: ${result.current.toLocaleString()} of ` +
        `${result.limit.toLocaleString()} tokens consumed for this vendor. ` +
        `The orchestrator will not start the next agent until you confirm or increase the limit ` +
        `(session.quota_cap.per_vendor in oma-config.yaml).`
      );
    default:
      return (
        `[Session quota] Usage limit exceeded (current: ${result.current}, limit: ${result.limit}). ` +
        `The orchestrator will not start the next agent until you confirm or adjust your quota cap ` +
        `(session.quota_cap in oma-config.yaml).`
      );
  }
}
