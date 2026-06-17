import { describe, expect, it } from "bun:test";
import { articleToEnglishDraft, type DevtoArticle } from "./devto.ts";

const base = {
  id: 1,
  title: "Title",
  url: "https://dev.to/x",
  body_markdown: "body",
};

describe("articleToEnglishDraft tag normalization", () => {
  // dev.to's single-article endpoint returns `tag_list` as a comma-separated
  // string and `tags` as the array. Regression for the qiita sync crash
  // (`english.tags.join is not a function`).
  it("reads the array from `tags` when `tag_list` is a string", () => {
    const article = {
      ...base,
      tags: ["ai", "productivity"],
      tag_list: "ai, productivity",
    } as unknown as DevtoArticle;
    expect(articleToEnglishDraft(article).tags).toEqual(["ai", "productivity"]);
  });

  it("splits a comma-separated `tag_list` string when `tags` is absent", () => {
    const article = {
      ...base,
      tag_list: "ai, productivity, programming",
    } as unknown as DevtoArticle;
    expect(articleToEnglishDraft(article).tags).toEqual([
      "ai",
      "productivity",
      "programming",
    ]);
  });

  it("keeps an array `tag_list` from the list endpoint", () => {
    const article = {
      ...base,
      tag_list: ["ai", "agents"],
    } as DevtoArticle;
    expect(articleToEnglishDraft(article).tags).toEqual(["ai", "agents"]);
  });

  it("falls back to an empty array when tags are missing", () => {
    const article = { ...base } as unknown as DevtoArticle;
    expect(articleToEnglishDraft(article).tags).toEqual([]);
  });
});
