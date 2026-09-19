import { describe, expect, it } from "vitest";
import {
  buildSyncReviewPrompt,
  buildTranslatePrompt,
  parsePortugueseDraft,
} from "./tabnews.ts";
import type { EnglishDraft, PortugueseDraft } from "./types.ts";

describe("parsePortugueseDraft", () => {
  it("parses a valid draft (no tags field)", () => {
    const raw = JSON.stringify({
      title: "Titulo",
      body: "corpo",
      source_url: "https://dev.to/x",
    });
    expect(parsePortugueseDraft(raw)).toEqual({
      title: "Titulo",
      body: "corpo",
      source_url: "https://dev.to/x",
    });
  });

  it("ignores an unexpected tags field gracefully", () => {
    const raw = JSON.stringify({
      title: "Titulo",
      body: "corpo",
      source_url: "https://dev.to/x",
      tags: ["ai"],
    });
    const parsed = parsePortugueseDraft(raw);
    expect("tags" in parsed).toBe(false);
  });

  it("returns a skip payload when the agent skips", () => {
    const raw = JSON.stringify({ skip: true, reason: "empty article" });
    expect(parsePortugueseDraft(raw)).toEqual({
      skip: true,
      reason: "empty article",
    });
  });

  it("throws when required fields are missing", () => {
    const raw = JSON.stringify({ title: "Titulo", body: "corpo" });
    expect(() => parsePortugueseDraft(raw)).toThrow(/missing required fields/);
  });
});

const english: EnglishDraft = {
  title: "oh-my-agent: failed runs now turn into skill regression tests",
  tags: ["ai", "oss"],
  body_markdown: "# Body",
  source_url: "https://dev.to/x/article",
};

const draft: PortugueseDraft = {
  title: "oh-my-agent: runs que falham viram testes de regressao",
  body: "# Corpo",
  source_url: "https://dev.to/x/article",
};

// Same guard as the Qiita sync prompts: a translated title must carry the
// source title's claim and nothing more (a sync run once added a version
// number to the Japanese title alone).
describe("TabNews sync prompts constrain the title", () => {
  it("makes the translator keep the source title's claim", () => {
    const prompt = buildTranslatePrompt("SOUL", english);
    expect(prompt).toContain(english.title);
    expect(prompt).toContain("faithful translation of the source title");
    expect(prompt).toContain("version numbers");
  });

  it("stops the reviewer from reintroducing title drift", () => {
    const prompt = buildSyncReviewPrompt("REVIEW", "SOUL", english, draft);
    expect(prompt).toContain(english.title);
    expect(prompt).toContain(
      "faithful translation of the English source title",
    );
    expect(prompt).toContain("version numbers");
  });
});
