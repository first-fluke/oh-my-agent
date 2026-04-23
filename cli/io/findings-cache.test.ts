/**
 * T11 Unit tests: findings-cache
 *
 * Tests (10 total):
 *  1. record/lookup roundtrip -- recorded finding is returned by lookup
 *  2. miss returns null -- unknown symbol returns null
 *  3. kind filter -- lookupFinding(session, symbol, "file") does not match "symbol" kind
 *  4. kind=undefined matches any kind
 *  5. listFindings returns all records in order
 *  6. clearSession wipes the file
 *  7. clearSession on non-existent session is a no-op
 *  8. non-serializable result throws clear error
 *  9. second record for same symbol returns latest (most-recently recorded)
 * 10. concurrent-safe appends: multiple records all parseable
 */

import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock node:fs so tests do not touch the real filesystem
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
    unlinkSync: vi.fn((p: string) => {
      delete store[p];
    }),
  };
});

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: mockFs.existsSync,
    mkdirSync: mockFs.mkdirSync,
    readFileSync: mockFs.readFileSync,
    appendFileSync: mockFs.appendFileSync,
    unlinkSync: mockFs.unlinkSync,
  };
});

import {
  clearSession,
  type FindingRecord,
  listFindings,
  lookupFinding,
  recordFinding,
} from "./findings-cache.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SESSION = "session-20260423-141500";

function makeRecord(overrides: Partial<FindingRecord> = {}): FindingRecord {
  return {
    symbol: "ModelSpec",
    kind: "symbol",
    result: { line: 42, file: "src/models.ts" },
    recordedAt: new Date().toISOString(),
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
  mockFs.unlinkSync.mockImplementation((p: string) => {
    delete mockFs.store[p];
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("recordFinding + lookupFinding", () => {
  it("roundtrip: recorded finding is returned by lookup", () => {
    const record = makeRecord({ symbol: "UserRepo", kind: "symbol" });
    recordFinding(SESSION, record);

    const found = lookupFinding(SESSION, "UserRepo");
    expect(found).not.toBeNull();
    expect(found?.symbol).toBe("UserRepo");
    expect(found?.kind).toBe("symbol");
    expect(found?.result).toEqual(record.result);
  });

  it("miss: unknown symbol returns null", () => {
    recordFinding(SESSION, makeRecord({ symbol: "KnownSymbol" }));
    const found = lookupFinding(SESSION, "UnknownSymbol");
    expect(found).toBeNull();
  });

  it("kind filter: kind='file' does not match a 'symbol' record", () => {
    recordFinding(
      SESSION,
      makeRecord({ symbol: "SharedThing", kind: "symbol" }),
    );
    const found = lookupFinding(SESSION, "SharedThing", "file");
    expect(found).toBeNull();
  });

  it("kind filter: undefined kind matches any kind", () => {
    recordFinding(SESSION, makeRecord({ symbol: "AnyKind", kind: "pattern" }));
    const found = lookupFinding(SESSION, "AnyKind");
    expect(found).not.toBeNull();
    expect(found?.kind).toBe("pattern");
  });

  it("second record for same symbol returns the most recently recorded one", () => {
    recordFinding(
      SESSION,
      makeRecord({ symbol: "Evolving", result: { v: 1 } }),
    );
    recordFinding(
      SESSION,
      makeRecord({ symbol: "Evolving", result: { v: 2 } }),
    );

    const found = lookupFinding(SESSION, "Evolving");
    expect(found?.result).toEqual({ v: 2 });
  });
});

describe("listFindings", () => {
  it("returns all records in insertion order", () => {
    const r1 = makeRecord({ symbol: "Alpha", kind: "symbol" });
    const r2 = makeRecord({ symbol: "Beta", kind: "pattern" });
    const r3 = makeRecord({ symbol: "Gamma", kind: "file" });

    recordFinding(SESSION, r1);
    recordFinding(SESSION, r2);
    recordFinding(SESSION, r3);

    const all = listFindings(SESSION);
    expect(all).toHaveLength(3);
    expect(all[0]?.symbol).toBe("Alpha");
    expect(all[1]?.symbol).toBe("Beta");
    expect(all[2]?.symbol).toBe("Gamma");
  });

  it("returns empty array when no session file exists", () => {
    const all = listFindings("nonexistent-session");
    expect(all).toEqual([]);
  });
});

describe("clearSession", () => {
  it("wipes the session findings file", () => {
    recordFinding(SESSION, makeRecord());
    expect(listFindings(SESSION)).toHaveLength(1);

    clearSession(SESSION);
    expect(listFindings(SESSION)).toEqual([]);
  });

  it("is a no-op when session file does not exist", () => {
    expect(() => clearSession("ghost-session")).not.toThrow();
  });
});

describe("serialization guard", () => {
  it("throws a clear error when result is not JSON-serializable", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const record = makeRecord({ symbol: "Bad", result: circular });
    expect(() => recordFinding(SESSION, record)).toThrow(
      /FindingsCache.*Bad.*not JSON-serializable/,
    );
  });
});

describe("concurrent-safe appends", () => {
  it("all records appended to same session file are parseable", () => {
    // Simulate multiple agents writing concurrently by calling recordFinding
    // in quick succession (appendFileSync is atomic on POSIX).
    const records = Array.from({ length: 5 }, (_, i) =>
      makeRecord({
        symbol: `Symbol${i}`,
        kind: "symbol",
        agentId: `agent-${i}`,
      }),
    );

    for (const r of records) {
      recordFinding(SESSION, r);
    }

    const all = listFindings(SESSION);
    expect(all).toHaveLength(5);

    for (let i = 0; i < 5; i++) {
      expect(all[i]?.symbol).toBe(`Symbol${i}`);
      expect(all[i]?.agentId).toBe(`agent-${i}`);
    }
  });
});

describe("file format", () => {
  it("session file contains YAML frontmatter with session id", () => {
    recordFinding(SESSION, makeRecord());

    const filePath = join(".serena/memories", `findings-${SESSION}.md`);
    const content = mockFs.store[filePath] ?? "";

    expect(content).toMatch(/^---\nsession: session-20260423-141500/);
    expect(content).toContain("created:");
    expect(content).toContain("# Findings");
  });
});
