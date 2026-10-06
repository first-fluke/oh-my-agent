import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  extractUserPrompt,
  parseTimestampMs,
  readJsonlSync,
} from "./conversation-log.js";

const tmp = mkdtempSync(join(tmpdir(), "oma-conversation-log-"));

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("readJsonlSync", () => {
  it("skips blank and malformed lines", () => {
    const file = join(tmp, "a.jsonl");
    writeFileSync(file, '{"a":1}\n\n{ bad\n{"a":2}\n');
    expect(readJsonlSync<{ a: number }>(file)).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("returns [] for a missing file", () => {
    expect(readJsonlSync(join(tmp, "missing.jsonl"))).toEqual([]);
  });
});

describe("parseTimestampMs", () => {
  it("accepts epoch numbers and ISO strings, else 0", () => {
    expect(parseTimestampMs(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(parseTimestampMs("2026-01-01T00:00:00.000Z")).toBe(
      Date.parse("2026-01-01T00:00:00.000Z"),
    );
    expect(parseTimestampMs("not a date")).toBe(0);
    expect(parseTimestampMs(undefined)).toBe(0);
  });
});

describe("extractUserPrompt", () => {
  it("extracts text from user_query tags", () => {
    expect(
      extractUserPrompt(
        "<user_query>\nDOES CHANGES FITS CURSOR-AGENT? REVIEW IT\n</user_query>",
      ),
    ).toBe("DOES CHANGES FITS CURSOR-AGENT? REVIEW IT");
  });

  it("returns null for user_info payloads", () => {
    expect(
      extractUserPrompt("<user_info>OS Version: darwin</user_info>"),
    ).toBeNull();
  });
});
