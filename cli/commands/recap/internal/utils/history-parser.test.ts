import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  findResponse,
  inWindow,
  type PairMessage,
  pathToProjectName,
  preview,
  RESPONSE_PREVIEW,
  readJsonlSync,
  streamJsonl,
} from "./history-parser.js";

const tmp = mkdtempSync(join(tmpdir(), "oma-history-parser-"));

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("preview", () => {
  it("returns short text unchanged", () => {
    expect(preview("hello")).toBe("hello");
  });

  it("truncates to RESPONSE_PREVIEW by default", () => {
    const long = "x".repeat(RESPONSE_PREVIEW + 50);
    expect(preview(long)).toHaveLength(RESPONSE_PREVIEW);
  });

  it("respects an explicit max", () => {
    expect(preview("abcdef", 3)).toBe("abc");
  });
});

describe("pathToProjectName", () => {
  it("returns the last segment", () => {
    expect(pathToProjectName("/Users/me/workspace/my-proj")).toBe("my-proj");
  });

  it("ignores trailing slashes", () => {
    expect(pathToProjectName("/Users/me/my-proj/")).toBe("my-proj");
  });

  it("returns undefined for empty or missing input", () => {
    expect(pathToProjectName(undefined)).toBeUndefined();
    expect(pathToProjectName("")).toBeUndefined();
    expect(pathToProjectName("/")).toBeUndefined();
  });
});

describe("inWindow", () => {
  it("is half-open [start, end)", () => {
    expect(inWindow(10, 10, 20)).toBe(true);
    expect(inWindow(19, 10, 20)).toBe(true);
    expect(inWindow(20, 10, 20)).toBe(false);
    expect(inWindow(9, 10, 20)).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(inWindow(Number.NaN, 0, 100)).toBe(false);
    expect(inWindow(Number.POSITIVE_INFINITY, 0, 100)).toBe(false);
  });
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

describe("streamJsonl", () => {
  it("yields parsed rows, skipping blank and malformed", async () => {
    const file = join(tmp, "b.jsonl");
    writeFileSync(file, '{"n":1}\n   \n{oops}\n{"n":2}\n');
    const rows: Array<{ n: number }> = [];
    for await (const row of streamJsonl<{ n: number }>(file)) rows.push(row);
    expect(rows).toEqual([{ n: 1 }, { n: 2 }]);
  });
});

describe("findResponse", () => {
  const msgs: PairMessage[] = [
    { role: "user", text: "q1" },
    { role: "other", text: "" },
    { role: "assistant", text: "" },
    { role: "assistant", text: "first answer" },
    { role: "assistant", text: "final answer" },
    { role: "user", text: "q2" },
    { role: "assistant", text: "second" },
  ];

  it("immediate: only the next message", () => {
    expect(findResponse(msgs, 0, "immediate")).toBeUndefined();
    expect(findResponse(msgs, 5, "immediate")).toBe("second");
  });

  it("first: first non-empty assistant before next user", () => {
    expect(findResponse(msgs, 0, "first")).toBe("first answer");
  });

  it("last: last non-empty assistant before next user", () => {
    expect(findResponse(msgs, 0, "last")).toBe("final answer");
  });

  it("returns undefined when no assistant follows", () => {
    const only: PairMessage[] = [
      { role: "user", text: "q" },
      { role: "user", text: "q2" },
    ];
    expect(findResponse(only, 0, "first")).toBeUndefined();
  });
});
