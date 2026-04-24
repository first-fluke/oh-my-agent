/**
 * session-cost.ts
 *
 * Session-scoped token/spawn accounting for orchestrate runs.
 * Tracks usage per agent/vendor and checks against configured quota caps
 * so users can be warned before the next agent spawn when a threshold is crossed.
 *
 * Storage: .serena/memories/session-cost-{sessionId}.md
 * Format: Markdown with YAML frontmatter + one JSON code block per record
 * Concurrency: append-only via appendFileSync (atomic on POSIX for small writes)
 *
 * Cap source precedence:
 *   1. .agents/oma-config.yaml               — canonical user config (wins)
 *   2. .agents/config/defaults.yaml          — OMA-shipped SSOT fallback
 * under top-level `session.quota_cap` key.
 */

import fs, {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import path, { join } from "node:path";
import { parse as parseYaml } from "yaml";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single usage event recorded by an agent during a session. */
export interface UsageRecord {
  sessionId: string;
  vendor: string; // claude | codex | gemini | qwen | antigravity
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

const MEMORIES_BASE = ".serena/memories";

// Session IDs are safe filename components. Reject anything that could
// traverse out of MEMORIES_BASE or embed shell/path metacharacters. The
// orchestrator generates IDs like "session-20260423-141500"; 64-char
// alphanumeric + `_-.` is more than enough. Reject everything else.
const SESSION_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

function assertSafeSessionId(sessionId: string): void {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error(
      `Invalid sessionId ${JSON.stringify(sessionId)}. Must match ${SESSION_ID_PATTERN} (alphanumeric, dot, underscore, hyphen, up to 64 chars).`,
    );
  }
}

function sessionCostFilePath(sessionId: string): string {
  assertSafeSessionId(sessionId);
  return join(MEMORIES_BASE, `session-cost-${sessionId}.md`);
}

function buildFrontmatter(sessionId: string): string {
  return `---\nsession: ${sessionId}\ncreated: ${new Date().toISOString()}\n---\n\n# Session Cost\n\n`;
}

function serializeRecord(record: UsageRecord): string {
  const json = JSON.stringify(record);
  return `\`\`\`json\n${json}\n\`\`\`\n\n`;
}

function parseRecords(content: string): UsageRecord[] {
  const records: UsageRecord[] = [];
  const pattern = /```json\n([\s\S]*?)\n```/g;

  for (const match of content.matchAll(pattern)) {
    try {
      const record = JSON.parse(match[1] ?? "") as UsageRecord;
      if (
        record &&
        typeof record.sessionId === "string" &&
        typeof record.vendor === "string" &&
        typeof record.agentId === "string" &&
        typeof record.tokens === "number" &&
        typeof record.recordedAt === "string"
      ) {
        records.push(record);
      }
    } catch {
      // skip malformed blocks -- file may be partially written
    }
  }

  return records;
}

function ensureMemoriesDir(): void {
  if (!existsSync(MEMORIES_BASE)) {
    mkdirSync(MEMORIES_BASE, { recursive: true });
  }
}

function readFileContent(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

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

function findFileUp(startDir: string, relativePath: string): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  while (current !== root) {
    const candidate = path.join(current, relativePath);
    if (fs.existsSync(candidate)) return candidate;
    current = path.dirname(current);
  }
  return null;
}

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
    findFileUp(cwd, path.join(".agents", "oma-config.yaml")),
    findFileUp(cwd, path.join(".agents", "config", "defaults.yaml")),
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
  ensureMemoriesDir();

  const fullRecord: UsageRecord = {
    ...record,
    sessionId,
    recordedAt: new Date().toISOString(),
  };

  const filePath = sessionCostFilePath(sessionId);
  const block = serializeRecord(fullRecord);

  if (!existsSync(filePath)) {
    appendFileSync(filePath, buildFrontmatter(sessionId) + block, "utf-8");
  } else {
    appendFileSync(filePath, block, "utf-8");
  }
}

/**
 * Return all usage records for the session, in order of recording.
 * Partial records (due to concurrent writes) are silently skipped.
 */
export function loadSessionUsage(sessionId: string): UsageRecord[] {
  const filePath = sessionCostFilePath(sessionId);
  const content = readFileContent(filePath);
  if (!content) return [];
  return parseRecords(content);
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
