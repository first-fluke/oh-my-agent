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
    expect(turns.every((turn) => turn.projectDir === undefined)).toBe(true);
  });

  it("preserves only each raw record's explicit absolute cwd", async () => {
    const ts = new Date("2026-05-29T00:00:00.000Z").getTime();
    const projectDir = join(tempHome, ".claude", "projects", "shared-name");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(
      join(projectDir, "claude-session.jsonl"),
      [
        "/workspace/a/shared-name",
        "/workspace/b/shared-name",
        "relative/shared-name",
        undefined,
      ]
        .map((cwd, index) =>
          JSON.stringify({
            type: index % 2 === 0 ? "user" : "assistant",
            timestamp: new Date(ts + index).toISOString(),
            cwd,
            message: { content: `message ${index}` },
          }),
        )
        .join("\n"),
    );

    const turns = rawTurns(await parser?.parseRaw?.(ts, ts + 10_000));
    expect(turns).toHaveLength(4);
    expect(turns.map((turn) => turn.projectDir)).toEqual([
      "/workspace/a/shared-name",
      "/workspace/b/shared-name",
      undefined,
      undefined,
    ]);
    expect(turns.every((turn) => turn.project === "shared-name")).toBe(true);
  });

  it("detects claude project sessions without history.jsonl", async () => {
    mkdirSync(join(tempHome, ".claude", "projects"), { recursive: true });
    expect(await parser?.detect()).toBe(true);
  });

  it("response pairing: two prompts sharing an 80+ char prefix each get their own response", async () => {
    // Both prompts start with the same 80 characters but diverge after that.
    const sharedPrefix = "A".repeat(80);
    const promptA = `${sharedPrefix} - topic Alpha`;
    const promptB = `${sharedPrefix} - topic Beta`;

    const ts = new Date("2026-05-29T12:00:00.000Z").getTime();
    const claudeDir = join(tempHome, ".claude");
    const historyPath = join(claudeDir, "history.jsonl");
    const projectDir = join(claudeDir, "projects", "test-project");
    const sessionPath = join(projectDir, "session-abc.jsonl");

    mkdirSync(claudeDir, { recursive: true });
    mkdirSync(projectDir, { recursive: true });

    // Write history.jsonl (what the `parse()` method reads for the prompt list)
    writeFileSync(
      historyPath,
      [
        JSON.stringify({
          timestamp: ts,
          display: promptA,
          project: "/test/project",
          sessionId: "session-abc",
        }),
        JSON.stringify({
          timestamp: ts + 2000,
          display: promptB,
          project: "/test/project",
          sessionId: "session-abc",
        }),
      ].join("\n"),
      "utf-8",
    );

    // Write the session file with paired turns (user A → assistant A → user B → assistant B)
    writeFileSync(
      sessionPath,
      [
        JSON.stringify({
          type: "user",
          timestamp: new Date(ts).toISOString(),
          message: { content: promptA },
        }),
        JSON.stringify({
          type: "assistant",
          timestamp: new Date(ts + 1000).toISOString(),
          message: { content: [{ type: "text", text: "Response for Alpha" }] },
        }),
        JSON.stringify({
          type: "user",
          timestamp: new Date(ts + 2000).toISOString(),
          message: { content: promptB },
        }),
        JSON.stringify({
          type: "assistant",
          timestamp: new Date(ts + 3000).toISOString(),
          message: { content: [{ type: "text", text: "Response for Beta" }] },
        }),
      ].join("\n"),
      "utf-8",
    );

    const entries = await parser?.parse(ts - 10_000, ts + 10_000);
    expect(entries).toHaveLength(2);

    const entryA = entries?.find((e) => e.prompt === promptA);
    const entryB = entries?.find((e) => e.prompt === promptB);

    expect(entryA).toBeDefined();
    expect(entryB).toBeDefined();
    expect(entryA?.response).toContain("Alpha");
    expect(entryB?.response).toContain("Beta");
    // Cross-assignment must not happen
    expect(entryA?.response).not.toContain("Beta");
    expect(entryB?.response).not.toContain("Alpha");
  });
});
