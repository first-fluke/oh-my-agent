import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { retryObservePath } from "../../state/events.js";
import type {
  MemoryObservePayload,
  MemoryProvider,
  MemoryProviderStatus,
  MemoryRawTurn,
} from "../../types/memory.js";
import { importAgentMemory } from "./import.js";

function providerStub(args: {
  status?: MemoryProviderStatus;
  observe?: (payload: MemoryObservePayload) => Promise<boolean> | boolean;
}): MemoryProvider {
  return {
    name: args.status?.provider ?? "agentmemory",
    async status() {
      return (
        args.status ?? {
          provider: "agentmemory",
          reachable: true,
          endpoint: "http://127.0.0.1:1234",
        }
      );
    },
    async observe(payload) {
      return args.observe?.(payload) ?? true;
    },
  };
}

function turn(overrides: Partial<MemoryRawTurn> = {}): MemoryRawTurn {
  return {
    vendor: "codex",
    role: "user",
    text: "hello",
    timestamp: Date.now(),
    vendorSessionId: "codex-1",
    idempotencyKey: "codex:codex-1:user:hello",
    ...overrides,
  };
}

function eventLine(eventId: string, sid = "oma-test"): string {
  return JSON.stringify({
    eventId,
    ts: "2026-05-27T00:00:00.000Z",
    sid,
    kind: "decision.made",
    writerPid: 1,
  });
}

describe("memory import", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-memory-import-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("previews raw turn imports without observing AgentMemory", async () => {
    let observeCount = 0;
    const result = await importAgentMemory({
      source: "codex",
      since: "1d",
      dryRun: true,
      provider: providerStub({
        observe() {
          observeCount += 1;
          return true;
        },
      }),
      async rawTurnLoader() {
        return [turn(), turn({ role: "assistant", text: "hi" })];
      },
    });

    expect(result).toMatchObject({
      source: "codex",
      total: 2,
      imported: 0,
      failed: 0,
      dryRun: true,
    });
    expect(observeCount).toBe(0);
  });

  it("imports raw turns through the memory provider", async () => {
    const observed: MemoryObservePayload[] = [];
    const result = await importAgentMemory({
      source: "codex",
      provider: providerStub({
        observe(payload) {
          observed.push(payload);
          return true;
        },
      }),
      async rawTurnLoader() {
        return [turn()];
      },
    });

    expect(result).toMatchObject({
      total: 1,
      imported: 1,
      failed: 0,
    });
    expect(observed[0]?.source).toBe("oma-memory-import:codex");
    expect(JSON.parse(observed[0]?.content ?? "{}")).toMatchObject({
      idempotencyKey: "codex:codex-1:user:hello",
    });
  });

  it("drains retry queue when source is retry", async () => {
    const retryPath = retryObservePath(projectDir);
    mkdirSync(dirname(retryPath), { recursive: true });
    writeFileSync(retryPath, `${eventLine("ok", "sid-ok")}\n`, "utf-8");

    const result = await importAgentMemory({
      source: "retry",
      projectDir,
      provider: providerStub({}),
    });

    expect(result).toMatchObject({
      source: "retry",
      total: 1,
      imported: 1,
      failed: 0,
    });
    expect(readFileSync(retryPath, "utf-8")).toBe("");
  });

  it("rejects retry mixed with vendor imports", async () => {
    await expect(
      importAgentMemory({ source: "retry,codex", dryRun: true }),
    ).rejects.toThrow("cannot be combined");
  });

  it("reports cursor imports as partial unless forced", async () => {
    const result = await importAgentMemory({
      source: "cursor",
      dryRun: true,
      async rawTurnLoader() {
        return [];
      },
    });

    expect(result.partial).toBe(true);
    expect(result.warnings[0]).toContain("cursor import");
  });
});
