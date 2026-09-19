import { describe, expect, it } from "vitest";
import { parsePortugueseDraft } from "./tabnews.ts";

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
