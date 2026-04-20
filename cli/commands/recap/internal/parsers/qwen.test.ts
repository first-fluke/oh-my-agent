import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tempHome = mkdtempSync(join(os.tmpdir(), "oma-qwen-home-"));

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return { ...actual, homedir: () => tempHome };
});

const { getParsers } = await import("../registry.js");
// import after mock so QWEN_BASE resolves to tempHome
await import("./qwen.js");
const parser = getParsers().find((p) => p.name === "qwen");

describe("qwen parser", () => {
  beforeEach(() => {
    rmSync(join(tempHome, ".qwen"), { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(join(tempHome, ".qwen"), { recursive: true, force: true });
  });

  it("returns false from detect when QWEN_BASE is missing", async () => {
    expect(await parser?.detect()).toBe(false);
  });

  it("returns [] from parse when QWEN_BASE is missing", async () => {
    const entries = await parser?.parse(0, Date.now() + 1_000_000);
    expect(entries).toEqual([]);
  });

  it("parses user-assistant pairs within window and skips out-of-range", async () => {
    const inRange = new Date("2026-04-01T10:00:00Z").getTime();
    const outOfRange = new Date("2020-01-01T00:00:00Z").getTime();
    const chatsDir = join(tempHome, ".qwen", "projects", "myproj", "chats");
    mkdirSync(chatsDir, { recursive: true });
    const lines = [
      JSON.stringify({
        type: "user",
        timestamp: new Date(inRange).toISOString(),
        sessionId: "sess-1",
        cwd: "/home/me/myproj",
        message: { parts: [{ text: "hello" }] },
      }),
      JSON.stringify({
        type: "assistant",
        timestamp: new Date(inRange + 1000).toISOString(),
        message: { parts: [{ text: "hi there" }] },
      }),
      JSON.stringify({
        type: "user",
        timestamp: new Date(outOfRange).toISOString(),
        message: { parts: [{ text: "old prompt" }] },
      }),
      "not json",
      "",
    ];
    writeFileSync(join(chatsDir, "session1.jsonl"), lines.join("\n"));

    const start = new Date("2026-03-01T00:00:00Z").getTime();
    const end = new Date("2026-05-01T00:00:00Z").getTime();
    const entries = (await parser?.parse(start, end)) ?? [];

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      tool: "qwen",
      prompt: "hello",
      response: "hi there",
      project: "myproj",
      sessionId: "sess-1",
    });
  });

  it("detect returns true when QWEN_BASE exists", async () => {
    mkdirSync(join(tempHome, ".qwen", "projects"), { recursive: true });
    expect(await parser?.detect()).toBe(true);
  });
});
