import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAgentMemoryScope } from "../../state/agentmemory-scope.js";
import { createMemoryDeliveryTarget } from "../../state/memory-delivery-target.js";
import {
  enqueueMemoryRetry,
  readMemoryRetryQueue,
} from "../../state/memory-retry-queue.js";
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
    projectDir: createAgentMemoryScope().projectDir,
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
    expect(observed[0]?.projectDir).toBe(createAgentMemoryScope().projectDir);
    expect(JSON.parse(observed[0]?.content ?? "{}")).toMatchObject({
      idempotencyKey: "codex:codex-1:user:hello",
    });
  });

  it("excludes other and unverified projects instead of retagging them as the current project", async () => {
    const observed: MemoryObservePayload[] = [];
    const own = join(projectDir, "B", "same-name");
    const other = join(projectDir, "D", "same-name");
    const result = await importAgentMemory({
      source: "codex",
      projectDir: own,
      provider: providerStub({
        observe(payload) {
          observed.push(payload);
          return true;
        },
      }),
      rawTurnLoader: async () => [
        turn({ projectDir: own, project: "same-name", text: "B only" }),
        turn({ projectDir: other, project: "same-name", text: "D only" }),
        turn({ projectDir: undefined, project: "same-name", text: "unknown" }),
        turn({ projectDir: "same-name", text: "relative path" }),
      ],
    });

    expect(result).toMatchObject({
      total: 4,
      imported: 1,
      failed: 0,
      skipped: 3,
      partial: true,
    });
    expect(result.warnings).toContain(
      "Skipped 1 turns from other projects and 2 turns without a verified project path",
    );
    expect(observed).toHaveLength(1);
    expect(observed[0]?.projectDir).toBe(
      createAgentMemoryScope(own).projectDir,
    );
    expect(JSON.parse(observed[0]?.content ?? "{}").text).toBe("B only");
  });

  it("drains retry queue when source is retry", async () => {
    const memory = providerStub({});
    enqueueMemoryRetry(
      projectDir,
      JSON.parse(eventLine("ok", "sid-ok")),
      { observe: true, remember: false },
      createMemoryDeliveryTarget(projectDir, memory),
    );

    const result = await importAgentMemory({
      source: "retry",
      projectDir,
      provider: memory,
    });

    expect(result).toMatchObject({
      source: "retry",
      total: 1,
      imported: 1,
      failed: 0,
    });
    expect(readMemoryRetryQueue(projectDir)).toEqual([]);
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
