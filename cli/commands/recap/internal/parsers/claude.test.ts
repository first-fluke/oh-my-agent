import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  MemoryRawTurn,
  MemoryRawTurnLoadResult,
} from "../../../../types/memory.js";

const tempHome = mkdtempSync(join(os.tmpdir(), "oma-claude-home-"));

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return { ...actual, homedir: () => tempHome };
});

const { getParsers } = await import("../registry.js");
await import("./claude.js");
const parser = getParsers().find((p) => p.name === "claude");

function rawTurns(
  result: MemoryRawTurn[] | MemoryRawTurnLoadResult | undefined,
): MemoryRawTurn[] {
  if (!result) return [];
  return Array.isArray(result) ? result : result.turns;
}

describe("claude parser", () => {
  beforeEach(() => {
    rmSync(join(tempHome, ".claude"), { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(join(tempHome, ".claude"), { recursive: true, force: true });
  });

  it("parses raw user and assistant turns from project sessions", async () => {
    const ts = new Date("2026-05-29T00:00:00.000Z").getTime();
    const projectDir = join(tempHome, ".claude", "projects", "project-a");
    const sessionPath = join(projectDir, "claude-session-1.jsonl");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(
      sessionPath,
      [
        JSON.stringify({
          type: "user",
          timestamp: new Date(ts).toISOString(),
          message: { content: "hello claude" },
        }),
        JSON.stringify({
          type: "assistant",
          timestamp: new Date(ts + 1000).toISOString(),
          message: { content: [{ type: "text", text: "hello back" }] },
        }),
      ].join("\n"),
      "utf-8",
    );

    const turns = rawTurns(await parser?.parseRaw?.(ts - 10_000, ts + 10_000));

    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({
      vendor: "claude",
      role: "user",
      text: "hello claude",
      sourcePath: sessionPath,
      vendorSessionId: "claude-session-1",
      project: "project-a",
    });
    expect(turns[1]).toMatchObject({
      role: "assistant",
      text: "hello back",
      sourcePath: sessionPath,
    });
    expect(turns[0]?.idempotencyKey).toContain("claude:claude-session-1");
  });

  it("detects claude project sessions without history.jsonl", async () => {
    mkdirSync(join(tempHome, ".claude", "projects"), { recursive: true });
    expect(await parser?.detect()).toBe(true);
  });
});
