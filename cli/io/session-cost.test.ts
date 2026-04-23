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

import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock node:fs (default import) + named exports used by session-cost.ts
// ---------------------------------------------------------------------------

const mockFs = vi.hoisted(() => {
  const store: Record<string, string> = {};

  return {
    store,
    existsSync: vi.fn((p: string) => p in store),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn((p: string, _enc: string) => {
      if (p in store) return store[p];
      throw Object.assign(new Error(`ENOENT: ${p}`), { code: "ENOENT" });
    }),
    appendFileSync: vi.fn((p: string, data: string, _enc: string) => {
      store[p] = (store[p] ?? "") + data;
    }),
  };
});

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
    default: defaultObj,
    // Named exports used by session-cost.ts imports
    existsSync: mockFs.existsSync,
    mkdirSync: mockFs.mkdirSync,
    readFileSync: mockFs.readFileSync,
    appendFileSync: mockFs.appendFileSync,
  };
});

import {
  checkCap,
  formatPromptMessage,
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
  mockFs.existsSync.mockImplementation((p: string) => p in mockFs.store);
  mockFs.readFileSync.mockImplementation((p: string, _enc: string) => {
    if (p in mockFs.store) return mockFs.store[p];
    throw Object.assign(new Error(`ENOENT: ${p}`), { code: "ENOENT" });
  });
  mockFs.appendFileSync.mockImplementation(
    (p: string, data: string, _enc: string) => {
      mockFs.store[p] = (mockFs.store[p] ?? "") + data;
    },
  );
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

    const filePath = join(".serena/memories", `session-cost-${SESSION}.md`);
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
    const filePath = join(".serena/memories", `session-cost-${SESSION}.md`);
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
