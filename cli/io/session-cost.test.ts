/**
 * T15 Unit tests: session-cost
 *
 * Tests (10 total):
 *  1.  recordUsage + loadSessionUsage roundtrip -- record is returned
 *  2.  loadSessionUsage on missing session -- returns empty array
 *  3.  checkCap no cap configured -- exceeded: false
 *  4.  checkCap under token limit -- exceeded: false
 *  5.  checkCap token limit hit -- exceeded: true, reason: "tokens"
 *  6.  checkCap spawn limit hit -- exceeded: true, reason: "spawnCount"
 *  7.  checkCap per-vendor limit hit -- exceeded: true, reason: "perVendor"
 *  8.  checkCap per-vendor under limit while total is above vendor sub-limit -- not exceeded
 *  9.  malformed JSON blocks in file are skipped (partial-write resilience)
 * 10.  formatPromptMessage returns non-empty string for all exceeded reasons
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock node:fs (default import) + named exports used by session-cost.ts
// ---------------------------------------------------------------------------

const mockFs = vi.hoisted(() => {
  const store: Record<string, string> = {};
  // Normalize Windows backslashes so production code using path.join (which
  // emits "\\" on win32) can still look up keys seeded with POSIX "/".
  const norm = (p: string) => p.replace(/\\/g, "/");

  return {
    store,
    existsSync: vi.fn((p: string) => norm(p) in store),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn((p: string, _enc: string) => {
      const np = norm(p);
      if (np in store) return store[np];
      throw Object.assign(new Error(`ENOENT: ${p}`), { code: "ENOENT" });
    }),
    appendFileSync: vi.fn((p: string, data: string, _enc: string) => {
      const np = norm(p);
      store[np] = (store[np] ?? "") + data;
    }),
    readdirSync: vi.fn((p: string) => {
      const np = norm(p);
      const prefix = np.endsWith("/") ? np : `${np}/`;
      const entries = new Set<string>();
      for (const key of Object.keys(store)) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const firstSegment = rest.split("/")[0];
        if (firstSegment) entries.add(firstSegment);
      }
      return Array.from(entries);
    }),
  };
});

const normPath = (p: string) => p.replace(/\\/g, "/");

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  // Default export (used for fs.existsSync, fs.readFileSync in config loader)
  const defaultObj = {
    ...actual,
    existsSync: mockFs.existsSync,
    mkdirSync: mockFs.mkdirSync,
    readFileSync: mockFs.readFileSync,
    appendFileSync: mockFs.appendFileSync,
  };
  return {
    ...defaultObj,
    default: { ...defaultObj, readdirSync: mockFs.readdirSync },
    // Named exports used by session-cost.ts imports
    existsSync: mockFs.existsSync,
    mkdirSync: mockFs.mkdirSync,
    readFileSync: mockFs.readFileSync,
    appendFileSync: mockFs.appendFileSync,
    readdirSync: mockFs.readdirSync,
  };
});

import {
  checkCap,
  DEFAULT_VENDOR_PRICING,
  estimateUsd,
  formatPromptMessage,
  listAllSessionUsage,
  loadSessionUsage,
  type QuotaCap,
  recordUsage,
  type UsageRecord,
} from "./session-cost.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SESSION = "session-20260423-141500";

function makeRecord(
  overrides: Partial<Omit<UsageRecord, "sessionId" | "recordedAt">> = {},
): Omit<UsageRecord, "sessionId" | "recordedAt"> {
  return {
    vendor: "claude",
    agentId: "oma-backend",
    tokens: 1000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset the in-memory store and call counts before every test
  for (const key of Object.keys(mockFs.store)) {
    delete mockFs.store[key];
  }
  vi.clearAllMocks();
  // Re-attach the store-backed implementations after clearAllMocks
  mockFs.existsSync.mockImplementation(
    (p: string) => normPath(p) in mockFs.store,
  );
  mockFs.readFileSync.mockImplementation((p: string, _enc: string) => {
    const np = normPath(p);
    if (np in mockFs.store) return mockFs.store[np];
    throw Object.assign(new Error(`ENOENT: ${p}`), { code: "ENOENT" });
  });
  mockFs.appendFileSync.mockImplementation(
    (p: string, data: string, _enc: string) => {
      const np = normPath(p);
      mockFs.store[np] = (mockFs.store[np] ?? "") + data;
    },
  );
  mockFs.readdirSync.mockImplementation((p: string) => {
    const np = normPath(p);
    const prefix = np.endsWith("/") ? np : `${np}/`;
    const entries = new Set<string>();
    for (const key of Object.keys(mockFs.store)) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const firstSegment = rest.split("/")[0];
      if (firstSegment) entries.add(firstSegment);
    }
    return Array.from(entries);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("recordUsage + loadSessionUsage", () => {
  it("roundtrip: recorded usage is returned by loadSessionUsage", () => {
    recordUsage(
      SESSION,
      makeRecord({ vendor: "codex", agentId: "oma-db", tokens: 5000 }),
    );

    const records = loadSessionUsage(SESSION);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      sessionId: SESSION,
      vendor: "codex",
      agentId: "oma-db",
      tokens: 5000,
    });
    expect(records[0]?.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns empty array when session file does not exist", () => {
    const records = loadSessionUsage("nonexistent-session");
    expect(records).toEqual([]);
  });

  it("multiple records are returned in insertion order", () => {
    recordUsage(SESSION, makeRecord({ agentId: "agent-1", tokens: 100 }));
    recordUsage(SESSION, makeRecord({ agentId: "agent-2", tokens: 200 }));
    recordUsage(SESSION, makeRecord({ agentId: "agent-3", tokens: 300 }));

    const records = loadSessionUsage(SESSION);
    expect(records).toHaveLength(3);
    expect(records[0]?.agentId).toBe("agent-1");
    expect(records[1]?.agentId).toBe("agent-2");
    expect(records[2]?.agentId).toBe("agent-3");
  });

  it("file contains YAML frontmatter with session id", () => {
    recordUsage(SESSION, makeRecord());

    // mock store keys are normalized to POSIX (see norm() above) so that
    // path.join output on win32 still resolves. Read the same way.
    const filePath = `.agents/state/memories/session-cost-${SESSION}.md`;
    const content = mockFs.store[filePath] ?? "";
    expect(content).toMatch(/^---\nsession: session-20260423-141500/);
    expect(content).toContain("created:");
    expect(content).toContain("# Session Cost");
  });
});

describe("checkCap — no cap configured", () => {
  it("returns exceeded: false with empty cap object", () => {
    recordUsage(SESSION, makeRecord({ tokens: 999999 }));

    const result = checkCap(SESSION, {});
    expect(result.exceeded).toBe(false);
  });
});

describe("checkCap — token limit", () => {
  it("returns exceeded: false when total tokens are under limit", () => {
    recordUsage(SESSION, makeRecord({ tokens: 100 }));
    recordUsage(SESSION, makeRecord({ tokens: 200 }));

    const cap: QuotaCap = { tokens: 500000 };
    const result = checkCap(SESSION, cap);
    expect(result.exceeded).toBe(false);
    expect(result.current).toBe(300);
  });

  it("returns exceeded: true with reason 'tokens' when limit is hit", () => {
    recordUsage(SESSION, makeRecord({ tokens: 300000 }));
    recordUsage(SESSION, makeRecord({ tokens: 250000 }));

    const cap: QuotaCap = { tokens: 500000 };
    const result = checkCap(SESSION, cap);
    expect(result.exceeded).toBe(true);
    expect(result.reason).toBe("tokens");
    expect(result.current).toBe(550000);
    expect(result.limit).toBe(500000);
  });
});

describe("checkCap — spawn count limit", () => {
  it("counts pending spawns without persisting them as completed usage", () => {
    recordUsage(SESSION, makeRecord({ tokens: 50 }));
    const result = checkCap(SESSION, { spawnCount: 2 }, [
      { vendor: "qwen", tokens: 70 },
    ]);
    expect(result).toEqual({
      exceeded: true,
      reason: "spawnCount",
      current: 2,
      limit: 2,
    });
    expect(loadSessionUsage(SESSION)).toHaveLength(1);
  });

  it("includes pending input estimates in the total token cap", () => {
    recordUsage(SESSION, makeRecord({ tokens: 50 }));
    expect(
      checkCap(SESSION, { tokens: 120 }, [{ vendor: "qwen", tokens: 70 }]),
    ).toMatchObject({ exceeded: true, reason: "tokens", current: 120 });
  });

  it("returns exceeded: true with reason 'spawnCount' when spawn limit is hit", () => {
    for (let i = 0; i < 5; i++) {
      recordUsage(SESSION, makeRecord({ agentId: `agent-${i}`, tokens: 100 }));
    }

    const cap: QuotaCap = { spawnCount: 5 };
    const result = checkCap(SESSION, cap);
    expect(result.exceeded).toBe(true);
    expect(result.reason).toBe("spawnCount");
    expect(result.current).toBe(5);
    expect(result.limit).toBe(5);
  });

  it("spawn count check takes precedence over token check", () => {
    for (let i = 0; i < 10; i++) {
      recordUsage(SESSION, makeRecord({ agentId: `agent-${i}`, tokens: 100 }));
    }

    // Both caps exceeded, but spawnCount is checked first
    const cap: QuotaCap = { spawnCount: 5, tokens: 500 };
    const result = checkCap(SESSION, cap);
    expect(result.reason).toBe("spawnCount");
  });
});

describe("checkCap — per-vendor limit", () => {
  it("adds only the matching vendor's pending tokens to its cap", () => {
    recordUsage(SESSION, makeRecord({ vendor: "codex", tokens: 40 }));
    const pending = Object.freeze([
      { vendor: "qwen", tokens: 5000 },
      { vendor: "codex", tokens: 60 },
    ]);
    expect(checkCap(SESSION, { perVendor: { codex: 100 } }, pending)).toEqual({
      exceeded: true,
      reason: "perVendor",
      current: 100,
      limit: 100,
    });
    expect(pending).toHaveLength(2);
    expect(loadSessionUsage(SESSION)).toHaveLength(1);
  });

  it("returns exceeded: true with reason 'perVendor' when vendor limit is hit", () => {
    recordUsage(SESSION, makeRecord({ vendor: "codex", tokens: 200000 }));
    recordUsage(SESSION, makeRecord({ vendor: "codex", tokens: 150000 }));
    recordUsage(SESSION, makeRecord({ vendor: "claude", tokens: 50000 }));

    const cap: QuotaCap = { perVendor: { codex: 300000 } };
    const result = checkCap(SESSION, cap);
    expect(result.exceeded).toBe(true);
    expect(result.reason).toBe("perVendor");
    expect(result.current).toBe(350000);
    expect(result.limit).toBe(300000);
  });

  it("does not exceed when only the other vendor is over the sub-limit", () => {
    recordUsage(SESSION, makeRecord({ vendor: "claude", tokens: 400000 }));
    // codex usage is zero — only codex has a per-vendor cap
    const cap: QuotaCap = { perVendor: { codex: 300000 } };
    const result = checkCap(SESSION, cap);
    expect(result.exceeded).toBe(false);
  });
});

describe("malformed file resilience", () => {
  it("skips malformed JSON blocks and returns parseable records", () => {
    // Manually inject a file with a malformed block in the middle
    const filePath = `.serena/memories/session-cost-${SESSION}.md`;
    const good1 = JSON.stringify({
      sessionId: SESSION,
      vendor: "claude",
      agentId: "agent-1",
      tokens: 500,
      recordedAt: new Date().toISOString(),
    });
    const good2 = JSON.stringify({
      sessionId: SESSION,
      vendor: "claude",
      agentId: "agent-2",
      tokens: 750,
      recordedAt: new Date().toISOString(),
    });
    const content =
      `---\nsession: ${SESSION}\ncreated: 2026-04-23T00:00:00.000Z\n---\n\n# Session Cost\n\n` +
      `\`\`\`json\n${good1}\n\`\`\`\n\n` +
      `\`\`\`json\n{MALFORMED JSON!!!\n\`\`\`\n\n` +
      `\`\`\`json\n${good2}\n\`\`\`\n\n`;

    mockFs.store[filePath] = content;

    const records = loadSessionUsage(SESSION);
    expect(records).toHaveLength(2);
    expect(records[0]?.agentId).toBe("agent-1");
    expect(records[1]?.agentId).toBe("agent-2");
  });
});

describe("formatPromptMessage", () => {
  it("returns empty string when not exceeded", () => {
    const result = formatPromptMessage({
      exceeded: false,
      current: 100,
      limit: 500000,
    });
    expect(result).toBe("");
  });

  it("returns non-empty string for 'tokens' reason", () => {
    const result = formatPromptMessage({
      exceeded: true,
      reason: "tokens",
      current: 550000,
      limit: 500000,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("Token limit");
    expect(result).toContain("500,000");
  });

  it("returns non-empty string for 'spawnCount' reason", () => {
    const result = formatPromptMessage({
      exceeded: true,
      reason: "spawnCount",
      current: 51,
      limit: 50,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("Spawn limit");
    expect(result).toContain("51");
  });

  it("returns non-empty string for 'perVendor' reason", () => {
    const result = formatPromptMessage({
      exceeded: true,
      reason: "perVendor",
      current: 350000,
      limit: 300000,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("Per-vendor");
    expect(result).toContain("300,000");
  });

  it("returns non-empty fallback string for unknown reason", () => {
    const result = formatPromptMessage({
      exceeded: true,
      reason: undefined,
      current: 1,
      limit: 0,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("Usage limit exceeded");
  });
});

// ---------------------------------------------------------------------------
// Security — sessionId validation blocks path traversal
// ---------------------------------------------------------------------------

describe("sessionId validation — security hardening", () => {
  for (const bad of [
    "../../../evil",
    "abc/../../tmp",
    "sess\\..\\win",
    "has space",
    "has;semi",
    "",
    "x".repeat(65),
  ]) {
    it(`rejects unsafe sessionId ${JSON.stringify(bad)}`, () => {
      expect(() =>
        recordUsage(bad, { vendor: "claude", agentId: "x", tokens: 1 }),
      ).toThrow(/Invalid sessionId/);
      expect(() => loadSessionUsage(bad)).toThrow(/Invalid sessionId/);
      expect(() => checkCap(bad, { tokens: 100 })).toThrow(/Invalid sessionId/);
    });
  }

  for (const good of [
    "session-20260423-141500",
    "abc_123.4",
    "Session-ABC-01",
  ]) {
    it(`accepts safe sessionId ${JSON.stringify(good)}`, () => {
      expect(() => loadSessionUsage(good)).not.toThrow();
    });
  }
});

describe("estimateUsd", () => {
  it("computes USD using vendor rate for known vendor", () => {
    expect(estimateUsd(1_000_000, "claude")).toBeCloseTo(3, 6);
    expect(estimateUsd(2_000_000, "codex")).toBeCloseTo(10, 6);
    expect(estimateUsd(500_000, "gemini")).toBeCloseTo(0.15, 6);
    expect(estimateUsd(1_000_000, "grok")).toBeCloseTo(1.25, 6);
  });

  it("falls back to claude rate for unknown vendor", () => {
    const claudeRate = DEFAULT_VENDOR_PRICING.claude ?? 3;
    expect(estimateUsd(1_000_000, "totally-unknown")).toBeCloseTo(
      claudeRate,
      6,
    );
  });

  it("returns 0 for zero tokens regardless of vendor", () => {
    for (const vendor of Object.keys(DEFAULT_VENDOR_PRICING)) {
      expect(estimateUsd(0, vendor)).toBe(0);
    }
  });

  it("honors caller-supplied pricing override", () => {
    expect(
      estimateUsd(1_000_000, "claude", { claude: 99, codex: 99, gemini: 99 }),
    ).toBeCloseTo(99, 6);
  });
});

describe("listAllSessionUsage", () => {
  it("returns empty array when memories dir does not exist", () => {
    expect(listAllSessionUsage("/some/nonexistent/cwd")).toEqual([]);
  });

  it("aggregates records across multiple session-cost files", () => {
    // Seed the in-memory FS with two session files in the same cwd
    const cwd = "/fake/cwd";
    const baseDir = `${cwd}/.serena/memories`;

    // Touch the dir so existsSync reports true
    mockFs.store[baseDir] = "<dir-sentinel>";

    recordUsageInDir(baseDir, "alpha", {
      vendor: "claude",
      agentId: "oma-backend",
      tokens: 1000,
    });
    recordUsageInDir(baseDir, "alpha", {
      vendor: "codex",
      agentId: "oma-frontend",
      tokens: 2000,
    });
    recordUsageInDir(baseDir, "beta", {
      vendor: "gemini",
      agentId: "oma-db",
      tokens: 500,
    });

    const all = listAllSessionUsage(cwd);
    expect(all).toHaveLength(3);
    expect(all.map((r) => r.vendor).sort()).toEqual([
      "claude",
      "codex",
      "gemini",
    ]);
  });

  it("ignores non session-cost files in memories dir", () => {
    const cwd = "/fake/cwd2";
    const baseDir = `${cwd}/.serena/memories`;
    mockFs.store[baseDir] = "<dir-sentinel>";
    mockFs.store[`${baseDir}/task-board.md`] = "# unrelated";
    mockFs.store[`${baseDir}/other-file.txt`] = "not json";
    expect(listAllSessionUsage(cwd)).toEqual([]);
  });
});

// Helper for listAllSessionUsage tests: write a record to a specific
// memories dir (bypassing process.cwd()) by reusing the json-block format.
function recordUsageInDir(
  baseDir: string,
  sessionId: string,
  record: Omit<UsageRecord, "sessionId" | "recordedAt">,
): void {
  const filePath = `${baseDir}/session-cost-${sessionId}.md`;
  const full: UsageRecord = {
    ...record,
    sessionId,
    recordedAt: new Date().toISOString(),
  };
  const existing = mockFs.store[filePath] ?? "";
  const header = existing
    ? ""
    : `---\nsession: ${sessionId}\ncreated: ${new Date().toISOString()}\n---\n\n# Session Cost\n\n`;
  const block = `\`\`\`json\n${JSON.stringify(full)}\n\`\`\`\n\n`;
  mockFs.store[filePath] = existing + header + block;
}
