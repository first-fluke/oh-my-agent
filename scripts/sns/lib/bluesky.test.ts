import { describe, expect, it } from "vitest";
import {
  buildAnnouncePrompt,
  detectTagFacets,
  graphemeLength,
  parseAnnouncePost,
} from "./bluesky.ts";
import type { EnglishDraft } from "./types.ts";

const english: EnglishDraft = {
  title: "oh-my-agent: cross-vendor scheduling lands",
  tags: ["ai", "opensource", "devtools"],
  body_markdown: "## What's new\n\nA cross-vendor scheduler that fires jobs.",
};

describe("graphemeLength", () => {
  it("counts ASCII by visible character", () => {
    expect(graphemeLength("hello")).toBe(5);
  });

  it("counts a multi-codepoint emoji as one grapheme", () => {
    // family emoji is several code points but one visible character
    expect(graphemeLength("👨‍👩‍👧‍👧")).toBe(1);
  });
});

describe("parseAnnouncePost", () => {
  it("accepts a valid short post", () => {
    expect(
      parseAnnouncePost('{"text":"We shipped a scheduler. #opensource"}'),
    ).toEqual({ text: "We shipped a scheduler. #opensource" });
  });

  it("trims surrounding whitespace", () => {
    expect(parseAnnouncePost('{"text":"  hi  "}')).toEqual({ text: "hi" });
  });

  it("returns a skip payload", () => {
    expect(
      parseAnnouncePost('{"skip":true,"reason":"nothing notable"}'),
    ).toEqual({ skip: true, reason: "nothing notable" });
  });

  it("throws when text is missing", () => {
    expect(() => parseAnnouncePost('{"foo":"bar"}')).toThrow(
      "missing required field (text)",
    );
  });

  it("throws when text is empty", () => {
    expect(() => parseAnnouncePost('{"text":"   "}')).toThrow(
      "missing required field (text)",
    );
  });

  it("throws when text exceeds 300 graphemes", () => {
    const long = "a".repeat(301);
    expect(() => parseAnnouncePost(JSON.stringify({ text: long }))).toThrow(
      "exceeds 300 graphemes",
    );
  });
});

describe("detectTagFacets", () => {
  it("creates a tag facet per hashtag with the # stripped from the tag value", () => {
    const facets = detectTagFacets("ship it #devtools #ai");
    expect(facets.map((f) => f.features[0]?.tag)).toEqual(["devtools", "ai"]);
    expect(facets[0]?.features[0]?.$type).toBe("app.bsky.richtext.facet#tag");
  });

  it("computes UTF-8 byte ranges that cover the #tag token", () => {
    const text = "a #ai b";
    const [facet] = detectTagFacets(text);
    // "#ai" starts at byte 2 and is 3 bytes long
    expect(facet?.index).toEqual({ byteStart: 2, byteEnd: 5 });
  });

  it("accounts for multi-byte characters before the tag", () => {
    const text = "한글 #ai"; // '한글 ' is 7 UTF-8 bytes (3+3+1)
    const [facet] = detectTagFacets(text);
    expect(facet?.index.byteStart).toBe(7);
  });

  it("strips trailing punctuation and skips numeric-only tags", () => {
    const facets = detectTagFacets("done #ai. and #123 stays out");
    expect(facets.map((f) => f.features[0]?.tag)).toEqual(["ai"]);
  });

  it("returns no facets when there are no hashtags", () => {
    expect(detectTagFacets("plain announcement, no tags")).toEqual([]);
  });
});

describe("buildAnnouncePrompt", () => {
  it("includes the title and url and forbids pasting the raw url", () => {
    const prompt = buildAnnouncePrompt(
      "SOUL",
      english,
      "https://dev.to/x/post-1",
    );
    expect(prompt).toContain(english.title);
    expect(prompt).toContain("https://dev.to/x/post-1");
    expect(prompt).toContain("do NOT paste in the text");
  });
});
