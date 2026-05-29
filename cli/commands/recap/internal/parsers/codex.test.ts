import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  MemoryRawTurn,
  MemoryRawTurnLoadResult,
} from "../../../../types/memory.js";

const tempHome = mkdtempSync(join(os.tmpdir(), "oma-codex-home-"));

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return { ...actual, homedir: () => tempHome };
});

const { getParsers } = await import("../registry.js");
await import("./codex.js");
const parser = getParsers().find((p) => p.name === "codex");

function rawTurns(
  result: MemoryRawTurn[] | MemoryRawTurnLoadResult | undefined,
): MemoryRawTurn[] {
  if (!result) return [];
  return Array.isArray(result) ? result : result.turns;
}

describe("codex parser", () => {
  beforeEach(() => {
    rmSync(join(tempHome, ".codex"), { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(join(tempHome, ".codex"), { recursive: true, force: true });
  });

  it("parses raw user and assistant turns from session files", async () => {
    const ts = new Date("2026-05-29T00:00:00.000Z").getTime();
    const sessionDir = join(tempHome, ".codex", "sessions");
    const sessionPath = join(sessionDir, "session.jsonl");
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      sessionPath,
      [
        JSON.stringify({
          timestamp: new Date(ts - 1000).toISOString(),
          type: "session_meta",
          payload: {
            id: "codex-session-1",
            cwd: "/workspace/project-a",
          },
        }),
        JSON.stringify({
          timestamp: new Date(ts).toISOString(),
          type: "response_item",
          payload: {
            role: "user",
            content: [{ type: "input_text", text: "implement raw import" }],
          },
        }),
        JSON.stringify({
          timestamp: new Date(ts + 1000).toISOString(),
          type: "response_item",
          payload: {
            role: "assistant",
            content: [{ type: "output_text", text: "raw import done" }],
          },
        }),
      ].join("\n"),
      "utf-8",
    );

    const turns = rawTurns(await parser?.parseRaw?.(ts - 10_000, ts + 10_000));

    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({
      vendor: "codex",
      role: "user",
      text: "implement raw import",
      sourcePath: sessionPath,
      vendorSessionId: "codex-session-1",
      project: "project-a",
    });
    expect(turns[1]).toMatchObject({
      role: "assistant",
      text: "raw import done",
      sourcePath: sessionPath,
    });
    expect(turns[0]?.idempotencyKey).toContain("codex:codex-session-1");

    const again = rawTurns(await parser?.parseRaw?.(ts - 10_000, ts + 10_000));
    expect(again.map((turn) => turn.idempotencyKey)).toEqual(
      turns.map((turn) => turn.idempotencyKey),
    );
  });

  it("detects codex sessions without history.jsonl", async () => {
    mkdirSync(join(tempHome, ".codex", "sessions"), { recursive: true });
    expect(await parser?.detect()).toBe(true);
  });
});
