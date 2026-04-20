import { describe, expect, it } from "vitest";
import { formatMermaid } from "../recap/internal/formatters/mermaid.js";
import type { RecapOutput } from "../recap/internal/schema.js";

function makeRecap(overrides: Partial<RecapOutput> = {}): RecapOutput {
  return {
    window: { start: 1776000000000, end: 1776086400000 },
    timezone: "UTC",
    entries: [],
    stats: {
      totalPrompts: 0,
      byTool: {},
      topProjects: [],
    },
    ...overrides,
  };
}

describe("formatMermaid", () => {
  it("returns message when no entries", () => {
    const result = formatMermaid(makeRecap());
    expect(result).toContain("No data");
  });

  it("generates gantt chart with sections per tool", () => {
    const base = 1776000000000;
    const result = formatMermaid(
      makeRecap({
        entries: [
          {
            tool: "claude",
            timestamp: base + 3_600_000,
            prompt: "hello",
            project: "my-project",
          },
          {
            tool: "claude",
            timestamp: base + 5_400_000,
            prompt: "world",
            project: "my-project",
          },
          {
            tool: "codex",
            timestamp: base + 7_200_000,
            prompt: "test",
            project: "other",
          },
        ],
      }),
    );

    expect(result).toContain("gantt");
    expect(result).toContain("section claude");
    expect(result).toContain("section codex");
    expect(result).toContain("my-project");
    expect(result).toContain("other");
  });

  it("escapes special characters in labels", () => {
    const base = 1776000000000;
    const result = formatMermaid(
      makeRecap({
        entries: [
          {
            tool: "gemini",
            timestamp: base + 1000,
            prompt: "test",
            project: "my;project#1:foo",
          },
        ],
      }),
    );

    expect(result).not.toContain(";");
    expect(result).not.toContain("#");
  });

  it("groups consecutive entries into sessions", () => {
    const base = 1776000000000;
    // 3 entries within 10 min = 1 session
    const result = formatMermaid(
      makeRecap({
        entries: [
          {
            tool: "claude",
            timestamp: base + 1000,
            prompt: "a",
            project: "proj",
          },
          {
            tool: "claude",
            timestamp: base + 300_000,
            prompt: "b",
            project: "proj",
          },
          {
            tool: "claude",
            timestamp: base + 600_000,
            prompt: "c",
            project: "proj",
          },
        ],
      }),
    );

    // Should have exactly one task line for claude section
    const claudeLines = result
      .split("\n")
      .filter((l) => l.trim().startsWith("proj"));
    expect(claudeLines).toHaveLength(1);
  });

  it("renders times in the specified timezone (UTC)", () => {
    // 1776000000000 = 2026-04-12T13:20:00Z
    const ts = 1776000000000;
    const result = formatMermaid(
      makeRecap({
        timezone: "UTC",
        entries: [{ tool: "claude", timestamp: ts, prompt: "x", project: "p" }],
      }),
    );
    expect(result).toContain("13:20");
  });

  it("renders times in Asia/Seoul (UTC+9)", () => {
    // 1776000000000 = 2026-04-12T13:20:00Z = 2026-04-12T22:20:00 KST
    const ts = 1776000000000;
    const result = formatMermaid(
      makeRecap({
        timezone: "Asia/Seoul",
        entries: [{ tool: "claude", timestamp: ts, prompt: "x", project: "p" }],
      }),
    );
    expect(result).toContain("22:20");
  });

  it("renders times in America/New_York (UTC-4 EDT in April)", () => {
    // 1776000000000 = 2026-04-12T13:20:00Z = 2026-04-12T09:20:00 EDT
    const ts = 1776000000000;
    const result = formatMermaid(
      makeRecap({
        timezone: "America/New_York",
        entries: [{ tool: "claude", timestamp: ts, prompt: "x", project: "p" }],
      }),
    );
    expect(result).toContain("09:20");
  });

  it("renders dates in the correct timezone (date boundary crossing)", () => {
    // Use a timestamp near midnight UTC: 2026-04-12T23:30:00Z
    const ts = 1776036600000; // 2026-04-12 23:30 UTC
    // In UTC: still April 12
    // In Asia/Seoul (UTC+9): April 13 08:30

    const utcResult = formatMermaid(
      makeRecap({
        timezone: "UTC",
        entries: [{ tool: "claude", timestamp: ts, prompt: "x", project: "p" }],
      }),
    );
    expect(utcResult).toContain("2026-04-12");

    const kstResult = formatMermaid(
      makeRecap({
        timezone: "Asia/Seoul",
        entries: [{ tool: "claude", timestamp: ts, prompt: "x", project: "p" }],
      }),
    );
    expect(kstResult).toContain("2026-04-13");
  });
});
