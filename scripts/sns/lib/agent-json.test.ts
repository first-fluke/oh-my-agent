import { describe, expect, it } from "vitest";
import { parseAgentJson, withParseRetry } from "./agent-json.ts";

describe("parseAgentJson", () => {
  it("parses a bare JSON object", () => {
    expect(parseAgentJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("extracts JSON from a fenced ```json block wrapped in prose", () => {
    const raw = [
      "Here is the draft you asked for:",
      "```json",
      '{ "title": "x", "tags": ["a"], "body_markdown": "b {with} brace" }',
      "```",
      "Let me know if you want changes.",
    ].join("\n");
    expect(parseAgentJson(raw)).toEqual({
      title: "x",
      tags: ["a"],
      body_markdown: "b {with} brace",
    });
  });

  it("extracts a JSON object embedded in surrounding prose", () => {
    const raw = 'Sure! {"title": "x", "tags": ["a"]} — hope that helps.';
    expect(parseAgentJson(raw)).toEqual({ title: "x", tags: ["a"] });
  });

  // Cases the previous hand-rolled slicer could not handle — now repaired by jsonrepair.
  it("repairs a trailing comma", () => {
    expect(parseAgentJson('{"a":1,"b":2,}')).toEqual({ a: 1, b: 2 });
  });

  it("repairs truncated JSON (unclosed string and object)", () => {
    expect(
      parseAgentJson('{"title":"x","body_markdown":"cut off mid sen'),
    ).toEqual({ title: "x", body_markdown: "cut off mid sen" });
  });

  it("repairs Python-style constants and single quotes", () => {
    expect(parseAgentJson("{'ok': True, 'val': None}")).toEqual({
      ok: true,
      val: null,
    });
  });

  it("throws when there is no parseable JSON", () => {
    expect(() => parseAgentJson("I cannot help with that.")).toThrow(
      "No parseable JSON in agent output.",
    );
  });
});

describe("withParseRetry", () => {
  it("returns on the first successful parse without re-producing", () => {
    let produced = 0;
    const out = withParseRetry(
      () => {
        produced += 1;
        return '{"ok":true}';
      },
      (raw) => parseAgentJson(raw),
      { attempts: 3 },
    );
    expect(out).toEqual({ ok: true });
    expect(produced).toBe(1);
  });

  it("retries when parse throws, then succeeds on a later attempt", () => {
    const outputs = ["not json", "still prose", '{"title":"ok"}'];
    let i = 0;
    const retried: number[] = [];
    const out = withParseRetry(
      () => outputs[i++] ?? "",
      (raw) => parseAgentJson(raw),
      {
        attempts: 3,
        onRetry: (n) => retried.push(n),
      },
    );
    expect(out).toEqual({ title: "ok" });
    expect(i).toBe(3); // produced three times
    expect(retried).toEqual([1, 2]); // retried after attempts 1 and 2
  });

  it("rethrows the last error after exhausting all attempts", () => {
    let produced = 0;
    expect(() =>
      withParseRetry(
        () => {
          produced += 1;
          return "never json";
        },
        (raw) => parseAgentJson(raw),
        { attempts: 3 },
      ),
    ).toThrow("No parseable JSON in agent output.");
    expect(produced).toBe(3);
  });

  it("does NOT retry when parse returns a value (legitimate skip payload)", () => {
    let produced = 0;
    const out = withParseRetry(
      () => {
        produced += 1;
        return '{"skip":true,"reason":"no changes"}';
      },
      (raw) => {
        const parsed = parseAgentJson(raw) as { skip?: boolean };
        return parsed.skip ? { skipped: true } : { skipped: false };
      },
      { attempts: 3 },
    );
    expect(out).toEqual({ skipped: true });
    expect(produced).toBe(1);
  });
});
