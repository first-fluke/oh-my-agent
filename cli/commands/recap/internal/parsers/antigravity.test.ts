import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tempHome = mkdtempSync(join(os.tmpdir(), "oma-antigravity-home-"));

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return { ...actual, homedir: () => tempHome };
});

const { getParsers } = await import("../registry.js");
await import("./antigravity.js");
const parser = getParsers().find((p) => p.name === "antigravity");

const AGY = join(tempHome, ".gemini", "antigravity-cli");

function writeTranscript(conversationId: string, lines: unknown[]): void {
  const dir = join(AGY, "brain", conversationId, ".system_generated", "logs");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "transcript.jsonl"),
    lines.map((l) => JSON.stringify(l)).join("\n"),
  );
}

describe("antigravity parser", () => {
  beforeEach(() => {
    rmSync(join(tempHome, ".gemini"), { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(join(tempHome, ".gemini"), { recursive: true, force: true });
  });

  it("returns false from detect when brain dir is missing", async () => {
    expect(await parser?.detect()).toBe(false);
  });

  it("returns [] from parse when brain dir is missing", async () => {
    const entries = await parser?.parse(0, Date.now() + 1_000_000);
    expect(entries).toEqual([]);
  });

  it("detect returns true when brain dir exists", async () => {
    mkdirSync(join(AGY, "brain"), { recursive: true });
    expect(await parser?.detect()).toBe(true);
  });

  it("pairs USER_INPUT with the model response and resolves project", async () => {
    const inRange = new Date("2026-05-25T10:00:00Z").getTime();
    const outOfRange = new Date("2020-01-01T00:00:00Z").getTime();
    const cid = "conv-1";

    writeTranscript(cid, [
      {
        step_index: 0,
        source: "USER_EXPLICIT",
        type: "USER_INPUT",
        created_at: new Date(inRange).toISOString(),
        content:
          "<USER_REQUEST>\nbuild the parser\n</USER_REQUEST>\n<ADDITIONAL_METADATA>\nThe current local time is: x\n</ADDITIONAL_METADATA>",
      },
      {
        step_index: 1,
        source: "MODEL",
        type: "PLANNER_RESPONSE",
        created_at: new Date(inRange + 1000).toISOString(),
        content: "",
      },
      {
        step_index: 2,
        source: "MODEL",
        type: "PLANNER_RESPONSE",
        created_at: new Date(inRange + 2000).toISOString(),
        content: "Here is the final answer.",
      },
      {
        step_index: 3,
        source: "USER_EXPLICIT",
        type: "USER_INPUT",
        created_at: new Date(outOfRange).toISOString(),
        content: "<USER_REQUEST>ancient</USER_REQUEST>",
      },
    ]);

    // history.jsonl supplies the workspace for this conversation.
    mkdirSync(AGY, { recursive: true });
    writeFileSync(
      join(AGY, "history.jsonl"),
      JSON.stringify({
        display: "build the parser",
        timestamp: inRange,
        workspace: "/Users/me/workspace/my-proj",
        conversationId: cid,
      }),
    );

    const start = new Date("2026-05-01T00:00:00Z").getTime();
    const end = new Date("2026-06-01T00:00:00Z").getTime();
    const entries = (await parser?.parse(start, end)) ?? [];

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      tool: "antigravity",
      prompt: "build the parser",
      response: "Here is the final answer.",
      project: "my-proj",
      sessionId: cid,
    });
  });

  it("falls back to cache for workspace when history lacks the id", async () => {
    const inRange = new Date("2026-05-25T11:00:00Z").getTime();
    const cid = "conv-cache";

    writeTranscript(cid, [
      {
        step_index: 0,
        source: "USER_EXPLICIT",
        type: "USER_INPUT",
        created_at: new Date(inRange).toISOString(),
        content: "<USER_REQUEST>hello</USER_REQUEST>",
      },
    ]);

    mkdirSync(join(AGY, "cache"), { recursive: true });
    writeFileSync(
      join(AGY, "cache", "last_conversations.json"),
      JSON.stringify({ "/Users/me/workspace/cached-proj": cid }),
    );

    const entries =
      (await parser?.parse(0, Date.now() + 1_000_000))?.filter(
        (e) => e.sessionId === cid,
      ) ?? [];

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      tool: "antigravity",
      prompt: "hello",
      project: "cached-proj",
      response: undefined,
    });
  });

  it("skips conversations without a transcript and bad lines", async () => {
    const cid = "conv-broken";
    const dir = join(AGY, "brain", cid, ".system_generated", "logs");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "transcript.jsonl"), "{ not json\n\n");
    const entries = await parser?.parse(0, Date.now() + 1_000_000);
    expect(entries).toEqual([]);
  });

  it("recovers truncated content from transcript_full.jsonl when truncated_fields includes content", async () => {
    const inRange = new Date("2026-05-25T12:00:00Z").getTime();
    const cid = "conv-truncated";
    const dir = join(AGY, "brain", cid, ".system_generated", "logs");
    mkdirSync(dir, { recursive: true });

    writeFileSync(
      join(dir, "transcript.jsonl"),
      [
        JSON.stringify({
          step_index: 0,
          source: "USER_EXPLICIT",
          type: "USER_INPUT",
          created_at: new Date(inRange).toISOString(),
          content: "<USER_REQUEST>short...",
          truncated_fields: ["content"],
        }),
        JSON.stringify({
          step_index: 1,
          source: "MODEL",
          type: "PLANNER_RESPONSE",
          created_at: new Date(inRange + 1000).toISOString(),
          content: "truncated response...",
          truncated_fields: ["content"],
        }),
      ].join("\n"),
    );

    writeFileSync(
      join(dir, "transcript_full.jsonl"),
      [
        JSON.stringify({
          step_index: 0,
          source: "USER_EXPLICIT",
          type: "USER_INPUT",
          created_at: new Date(inRange).toISOString(),
          content:
            "<USER_REQUEST>full prompt from transcript_full</USER_REQUEST>",
        }),
        JSON.stringify({
          step_index: 1,
          source: "MODEL",
          type: "PLANNER_RESPONSE",
          created_at: new Date(inRange + 1000).toISOString(),
          content: "full response from transcript_full",
        }),
      ].join("\n"),
    );

    const start = new Date("2026-05-01T00:00:00Z").getTime();
    const end = new Date("2026-06-01T00:00:00Z").getTime();
    const entries = (await parser?.parse(start, end)) ?? [];

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      tool: "antigravity",
      prompt: "full prompt from transcript_full",
      response: "full response from transcript_full",
      sessionId: cid,
    });
  });
});
