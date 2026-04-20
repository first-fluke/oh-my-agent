import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tempHome = mkdtempSync(join(os.tmpdir(), "oma-gemini-home-"));

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return { ...actual, homedir: () => tempHome };
});

const { getParsers } = await import("../registry.js");
await import("./gemini.js");
const parser = getParsers().find((p) => p.name === "gemini");

describe("gemini parser", () => {
  beforeEach(() => {
    rmSync(join(tempHome, ".gemini"), { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(join(tempHome, ".gemini"), { recursive: true, force: true });
  });

  it("returns false from detect when tmp base is missing", async () => {
    expect(await parser?.detect()).toBe(false);
  });

  it("returns [] from parse when tmp base is missing", async () => {
    const entries = await parser?.parse(0, Date.now() + 1_000_000);
    expect(entries).toEqual([]);
  });

  it("parses user-gemini message pairs within window", async () => {
    const inRange = new Date("2026-04-01T10:00:00Z").getTime();
    const outOfRange = new Date("2020-01-01T00:00:00Z").getTime();
    const chatsDir = join(tempHome, ".gemini", "tmp", "my-proj", "chats");
    mkdirSync(chatsDir, { recursive: true });
    const session = {
      sessionId: "sess-1",
      messages: [
        {
          type: "user",
          timestamp: new Date(inRange).toISOString(),
          content: [{ text: "hello gemini" }],
          model: "gemini-2.0",
        },
        {
          type: "gemini",
          timestamp: new Date(inRange + 1000).toISOString(),
          content: [{ text: "hi back" }],
        },
        {
          type: "user",
          timestamp: new Date(outOfRange).toISOString(),
          content: [{ text: "ancient prompt" }],
        },
      ],
    };
    writeFileSync(join(chatsDir, "session-1.json"), JSON.stringify(session));

    const start = new Date("2026-03-01T00:00:00Z").getTime();
    const end = new Date("2026-05-01T00:00:00Z").getTime();
    const entries = (await parser?.parse(start, end)) ?? [];

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      tool: "gemini",
      prompt: "hello gemini",
      response: "hi back",
      project: "my-proj",
      sessionId: "sess-1",
      metadata: { model: "gemini-2.0" },
    });
  });

  it("skips unreadable session files without crashing", async () => {
    const chatsDir = join(tempHome, ".gemini", "tmp", "broken", "chats");
    mkdirSync(chatsDir, { recursive: true });
    writeFileSync(join(chatsDir, "session-broken.json"), "{ not json");
    const entries = await parser?.parse(0, Date.now() + 1_000_000);
    expect(entries).toEqual([]);
  });

  it("detect returns true when tmp base exists", async () => {
    mkdirSync(join(tempHome, ".gemini", "tmp"), { recursive: true });
    expect(await parser?.detect()).toBe(true);
  });
});
