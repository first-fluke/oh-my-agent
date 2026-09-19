/**
 * Regression tests for the vendor JSON envelope unwrapper.
 *
 * The weekly SNS cross-post job started failing every run once this repo's
 * `model_preset` moved from `antigravity` to `auto`: agy prints the model's
 * text verbatim, claude prints `{"type":"result","result":"<text>",...}`. The
 * author step parses a JSON article out of runAgent's return value, so the
 * envelope parsed as a valid object with none of the expected fields and all
 * three retry attempts failed identically.
 */

import { describe, expect, it } from "bun:test";
import { unwrapVendorResponse } from "./agent-spawn.ts";

const ARTICLE = '{"title":"Weekly","tags":["oma"],"body_markdown":"# Hi"}';

describe("unwrapVendorResponse", () => {
  it("extracts the model text from a claude --output-format json envelope", () => {
    const envelope = JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      result: ARTICLE,
      usage: { inputTokens: 10 },
    });

    expect(unwrapVendorResponse(envelope, ".result")).toBe(ARTICLE);
  });

  it("extracts from the last JSON line of a streamed JSONL response", () => {
    const stream = [
      JSON.stringify({ type: "progress", step: 1 }),
      JSON.stringify({ type: "progress", step: 2 }),
      JSON.stringify({ type: "result", response: ARTICLE }),
    ].join("\n");

    expect(unwrapVendorResponse(stream, ".response")).toBe(ARTICLE);
  });

  it("returns stdout untouched for a vendor that declares no response_jq", () => {
    // antigravity / kiro print the model's text directly.
    expect(unwrapVendorResponse(ARTICLE, undefined)).toBe(ARTICLE);
    expect(unwrapVendorResponse(ARTICLE, "")).toBe(ARTICLE);
  });

  it("returns stdout untouched when it is plain text, not an envelope", () => {
    // A vendor configured with response_jq but invoked without its JSON flag.
    expect(unwrapVendorResponse(ARTICLE, ".result")).toBe(ARTICLE);
    expect(unwrapVendorResponse("just prose", ".result")).toBe("just prose");
  });

  it("returns stdout untouched when the envelope lacks the configured key", () => {
    const envelope = JSON.stringify({ type: "result", output: ARTICLE });
    expect(unwrapVendorResponse(envelope, ".result")).toBe(envelope);
  });

  it("returns stdout untouched when the key holds a non-string", () => {
    const envelope = JSON.stringify({ result: { nested: ARTICLE } });
    expect(unwrapVendorResponse(envelope, ".result")).toBe(envelope);
  });

  it("walks a dotted response_jq path", () => {
    const envelope = JSON.stringify({ data: { text: ARTICLE } });
    expect(unwrapVendorResponse(envelope, ".data.text")).toBe(ARTICLE);
  });

  it("never loses output: unparseable JSON falls through", () => {
    const truncated = '{"result":"half an env';
    expect(unwrapVendorResponse(truncated, ".result")).toBe(truncated);
  });
});
