import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as core from "../../.agents/hooks/core/state-core.ts";
import { drainMemoryRetryQueue } from "../commands/memory/retry-drain.js";
import type { MemoryProvider } from "../types/memory.js";
import * as providers from "../utils/providers.js";
import { emitEventWithMemory, retryObservePath } from "./events.js";
import { createMemoryDeliveryTarget } from "./memory-delivery-target.js";
import { memoryOutboxDir, writeMemoryDeliveryIntent } from "./memory-outbox.js";
import * as queue from "./memory-retry-queue.js";
import * as semanticMemory from "./semantic-memory.js";

function provider(endpoint = "http://memory.test"): MemoryProvider {
  return {
    name: "agentmemory",
    deliveryIdentity: { endpoint },
    status: async () => ({ provider: "agentmemory", reachable: true }),
    observe: vi.fn(async () => true),
    remember: vi.fn(async () => true),
  };
}

function event(): core.OmaEvent {
  return {
    sid: "recovery-session",
    eventId: "recoverable-decision",
    ts: "2026-10-08T00:00:00.000Z",
    writerPid: process.pid,
    kind: "decision.made",
    payload: {
      subject: "database",
      decision: "Postgres",
      rationale: "constraints",
    },
  };
}

describe("L1-backed memory delivery recovery", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-memory-outbox-"));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  function intent(memory: MemoryProvider, original = event()) {
    return writeMemoryDeliveryIntent(
      root,
      original,
      { observe: true, remember: true },
      createMemoryDeliveryTarget(root, memory),
    );
  }

  it("persists delivery intent before the actual L1 append", async () => {
    const memory = provider();
    vi.spyOn(core, "emitEvent").mockImplementation(() => {
      expect(readdirSync(memoryOutboxDir(root))).toHaveLength(1);
      throw new Error("interrupted L1 append");
    });
    await expect(
      emitEventWithMemory(root, event().sid, event(), memory),
    ).rejects.toThrow("interrupted L1 append");
    expect(core.readEvents(root, event().sid)).toEqual([]);
    expect(memory.observe).not.toHaveBeenCalled();
    await drainMemoryRetryQueue({ projectDir: root, provider: memory });
    expect(memory.observe).not.toHaveBeenCalled();
    expect(existsSync(retryObservePath(root))).toBe(false);
  });

  it("does not reject a recorded L1 event when provider configuration and fallback both fail", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(semanticMemory, "createMemoryProvider").mockImplementation(() => {
      throw new Error("invalid provider configuration");
    });
    vi.spyOn(providers, "loadProviders").mockImplementation(() => {
      throw new Error("invalid provider configuration");
    });
    const original = await emitEventWithMemory(root, event().sid, event());
    expect(core.readEvents(root, original.sid)).toEqual([original]);
  });

  it("recovers a crash after L1 append without adding another event", async () => {
    const memory = provider();
    const original = event();
    const path = intent(memory, original);
    core.emitEvent(root, original.sid, original);
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: memory }),
    ).toMatchObject({ drained: 1, retained: 0 });
    expect(core.readEvents(root, original.sid)).toEqual([original]);
    expect(memory.observe).toHaveBeenCalledOnce();
    expect(memory.remember).toHaveBeenCalledOnce();
    expect(existsSync(path)).toBe(false);
  });

  it("retries queue append failure using the durable intent", async () => {
    const memory = provider();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const append = vi
      .spyOn(queue, "enqueueMemoryRetry")
      .mockImplementationOnce(() => {
        throw new Error("temporarily unavailable queue");
      });
    const original = await emitEventWithMemory(
      root,
      event().sid,
      event(),
      memory,
    );
    expect(core.readEvents(root, original.sid)).toEqual([original]);
    expect(memory.observe).not.toHaveBeenCalled();
    expect(readdirSync(memoryOutboxDir(root))).toHaveLength(1);
    append.mockRestore();
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: memory }),
    ).toMatchObject({ drained: 1 });
  });

  it("does not regenerate an ACKed delivery when intent cleanup was interrupted", async () => {
    const memory = provider();
    const original = await emitEventWithMemory(
      root,
      event().sid,
      event(),
      memory,
    );
    const path = intent(memory, original);
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: memory }),
    ).toMatchObject({ total: 0, drained: 0 });
    expect(memory.observe).toHaveBeenCalledOnce();
    expect(memory.remember).toHaveBeenCalledOnce();
    expect(existsSync(path)).toBe(false);
  });

  it("recovers to the original destination even after provider configuration changes", async () => {
    const originalProvider = provider("http://original.test");
    const replacement = provider("http://replacement.test");
    const original = event();
    intent(originalProvider, original);
    core.emitEvent(root, original.sid, original);
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: replacement }),
    ).toMatchObject({ total: 1, drained: 0, retained: 1 });
    expect(replacement.observe).not.toHaveBeenCalled();
    expect(replacement.remember).not.toHaveBeenCalled();
    expect(
      await drainMemoryRetryQueue({
        projectDir: root,
        provider: originalProvider,
      }),
    ).toMatchObject({ drained: 1, retained: 0 });
  });

  it("does not publish an intent without the exact L1 event payload", async () => {
    const memory = provider();
    const original = event();
    const path = intent(memory, original);
    core.emitEvent(root, original.sid, {
      ...original,
      payload: {
        subject: "database",
        decision: "SQLite",
        rationale: "different event",
      },
    });
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: memory }),
    ).toMatchObject({ total: 0, drained: 0 });
    expect(memory.observe).not.toHaveBeenCalled();
    expect(existsSync(path)).toBe(true);
  });

  it("leaves pending intents untouched in dry-run", async () => {
    const memory = provider();
    const original = event();
    const path = intent(memory, original);
    core.emitEvent(root, original.sid, original);
    await drainMemoryRetryQueue({
      projectDir: root,
      provider: memory,
      dryRun: true,
    });
    expect(existsSync(path)).toBe(true);
    expect(existsSync(retryObservePath(root))).toBe(false);
    expect(memory.observe).not.toHaveBeenCalled();
  });
});
