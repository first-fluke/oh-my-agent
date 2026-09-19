import { describe, expect, it } from "vitest";
import {
  buildSyncReviewPrompt,
  buildTranslatePrompt,
  buildWeeklyJapanesePrompt,
} from "./qiita.ts";
import type { EnglishDraft, JapaneseDraft } from "./types.ts";

const english: EnglishDraft = {
  title: "oh-my-agent: failed runs now turn into skill regression tests",
  tags: ["ai", "oss"],
  body_markdown: "# Body",
  source_url: "https://dev.to/x/article",
};

const draft: JapaneseDraft = {
  title: "oh-my-agent: 失敗した実行をスキルの回帰テストに変える",
  body: "# 本文",
  tags: ["AI"],
  source_url: "https://dev.to/x/article",
};

// Regression: a sync run retitled the Qiita post
// "oh-my-agent 14.13.1: ..." while dev.to and TabNews carried the untouched
// title. Neither the translate nor the review prompt constrained the title, so
// the ~70-character target in SOUL.md invited the translator to pad it with a
// version number that the source title never claimed.
describe("Qiita sync prompts constrain the title", () => {
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

  it("leaves the weekly prompt free to write an original title", () => {
    // The weekly path drafts from git context, so there is no source title to
    // stay faithful to and the rule must not leak into it.
    const prompt = buildWeeklyJapanesePrompt("SOUL", "commits");
    expect(prompt).not.toContain("faithful translation");
  });
});
