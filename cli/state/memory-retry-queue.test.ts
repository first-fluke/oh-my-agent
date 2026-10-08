import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OmaEvent } from "../../.agents/hooks/core/state-core.ts";
import { drainMemoryRetryQueue } from "../commands/memory/retry-drain.js";
import type { MemoryProvider } from "../types/memory.js";
import {
  createMemoryDeliveryTarget,
  memoryEndpointIdentity,
} from "./memory-delivery-target.js";
import {
  acknowledgeMemoryRetryLine,
  enqueueMemoryRetry,
  hasMemoryRetryEvent,
  memoryRetryTarget,
  readMemoryRetryQueue,
  retryObservePath,
} from "./memory-retry-queue.js";

function event(eventId = "retry-original"): OmaEvent {
  return {
    eventId,
    sid: "retry-session",
    kind: "decision.made",
    ts: "2026-10-08T00:00:00.000Z",
    writerPid: process.pid,
    payload: {
      subject: "retry",
      decision: "Keep the destination",
      rationale: "Do not retarget queued facts",
    },
  };
}
function provider(endpoint = "http://127.0.0.1:3111"): MemoryProvider {
  return {
    name: "agentmemory",
    deliveryIdentity: { endpoint },
    status: vi.fn(async () => ({
      provider: "agentmemory" as const,
      reachable: true,
    })),
    observe: vi.fn(async () => true),
    remember: vi.fn(async () => true),
  };
}

describe("scoped memory delivery queue", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-targeted-retry-"));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("retains endpoint and provider mismatches and replays when the original destination returns", async () => {
    const original = provider();
    enqueueMemoryRetry(
      root,
      event(),
      { observe: true, remember: true },
      createMemoryDeliveryTarget(root, original),
    );
    const moved = provider("http://127.0.0.1:4222");
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: moved }),
    ).toMatchObject({ drained: 0, retained: 1 });
    expect(moved.observe).not.toHaveBeenCalled();
    const honcho = {
      ...moved,
      name: "honcho" as const,
      observeEvents: false,
      deliveryIdentity: {
        endpoint: "http://127.0.0.1:8000",
        workspace: "oma",
        session: "project",
      },
    };
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: honcho }),
    ).toMatchObject({ drained: 0, retained: 1 });
    expect(honcho.remember).not.toHaveBeenCalled();
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: original }),
    ).toMatchObject({ drained: 1, retained: 0 });
  });

  it("isolates profiles and prevents copied rows from crossing ownership", async () => {
    const memory = provider();
    enqueueMemoryRetry(
      root,
      event(),
      { observe: true, remember: false },
      createMemoryDeliveryTarget(root, memory),
    );
    const source = retryObservePath(root);
    process.env.OMA_PROFILE = "1";
    expect(readMemoryRetryQueue(root)).toEqual([]);
    const destination = retryObservePath(root);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, readFileSync(source));
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: memory }),
    ).toMatchObject({ retained: 1, drained: 0 });
    expect(memory.observe).not.toHaveBeenCalled();
    process.env.OMA_PROFILE = "0";
    expect(readMemoryRetryQueue(root)).toHaveLength(1);
  });

  it("retains Honcho workspaces and project sessions independently", async () => {
    const memory: MemoryProvider = {
      ...provider("http://127.0.0.1:8000"),
      name: "honcho",
      observeEvents: false,
      deliveryIdentity: {
        endpoint: "http://127.0.0.1:8000",
        workspace: "first",
        session: "oma-original",
      },
    };
    enqueueMemoryRetry(
      root,
      event(),
      { observe: false, remember: true },
      createMemoryDeliveryTarget(root, memory),
    );
    const movedWorkspace = {
      ...memory,
      deliveryIdentity: { ...memory.deliveryIdentity, workspace: "second" },
    };
    expect(
      await drainMemoryRetryQueue({
        projectDir: root,
        provider: movedWorkspace,
      }),
    ).toMatchObject({ retained: 1 });
    const movedSession = {
      ...memory,
      deliveryIdentity: { ...memory.deliveryIdentity, session: "oma-other" },
    };
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: movedSession }),
    ).toMatchObject({ retained: 1 });
    expect(memory.remember).not.toHaveBeenCalled();
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: memory }),
    ).toMatchObject({ drained: 1 });
  });

  it("ignores unscoped queues in every profile and leaves their files unchanged", () => {
    const legacy = join(root, ".agents/state/retry/observe.jsonl");
    mkdirSync(dirname(legacy), { recursive: true });
    const content = `${JSON.stringify(event())}\n`;
    writeFileSync(legacy, content);
    writeFileSync(`${legacy}.ack.jsonl`, "historical acknowledgements\n");
    for (const profile of ["0", "1"]) {
      process.env.OMA_PROFILE = profile;
      expect(readMemoryRetryQueue(root)).toEqual([]);
    }
    expect(readFileSync(legacy, "utf-8")).toBe(content);
    expect(readFileSync(`${legacy}.ack.jsonl`, "utf-8")).toBe(
      "historical acknowledgements\n",
    );
  });

  it("ignores events without a complete delivery contract while reporting malformed rows", async () => {
    const memory = provider();
    const target = createMemoryDeliveryTarget(root, memory);
    const path = retryObservePath(root);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      [
        JSON.stringify(event("old-event")),
        JSON.stringify({
          ...event("missing-target"),
          memoryDelivery: { observe: true, remember: false },
        }),
        JSON.stringify({ ...event("missing-delivery"), memoryTarget: target }),
        "malformed-row",
        "",
      ].join("\n"),
    );
    enqueueMemoryRetry(
      root,
      event(),
      { observe: true, remember: false },
      target,
    );
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: memory }),
    ).toMatchObject({ total: 2, drained: 1, retained: 1, invalid: 1 });
    expect(memory.observe).toHaveBeenCalledOnce();
    expect(readMemoryRetryQueue(root).map(({ line }) => line)).toEqual([
      "malformed-row",
    ]);
  });

  it("preserves partial operation acknowledgements without physical file identities", async () => {
    const memory = provider();
    const target = createMemoryDeliveryTarget(root, memory);
    enqueueMemoryRetry(
      root,
      event(),
      { observe: true, remember: true },
      target,
    );
    const entry = readMemoryRetryQueue(root)[0];
    if (!entry) throw new Error("Expected the retry entry");
    acknowledgeMemoryRetryLine(root, entry, "observe");
    expect(readMemoryRetryQueue(root)[0]?.delivered).toEqual(["observe"]);
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: memory }),
    ).toMatchObject({ drained: 1 });
    expect(memory.observe).not.toHaveBeenCalled();
    expect(memory.remember).toHaveBeenCalledOnce();
    const receipts = readFileSync(
      `${retryObservePath(root)}.ack.jsonl`,
      "utf-8",
    )
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    expect(receipts).toEqual([
      { deliveryId: entry.deliveryId, dimension: "observe" },
      { deliveryId: entry.deliveryId, dimension: "remember" },
    ]);
  });

  it("keeps failed delivery tied to the original destination", async () => {
    const original = provider();
    original.observe = vi.fn(async () => false);
    enqueueMemoryRetry(
      root,
      event(),
      { observe: true, remember: false },
      createMemoryDeliveryTarget(root, original),
    );
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: original }),
    ).toMatchObject({ retained: 1 });
    const pending = readMemoryRetryQueue(root)[0];
    if (!pending) throw new Error("Expected the failed retry entry");
    expect(memoryRetryTarget(pending)?.destination.endpoint).toBe(
      "http://127.0.0.1:3111",
    );
    const moved = provider("http://127.0.0.1:4222");
    await drainMemoryRetryQueue({ projectDir: root, provider: moved });
    expect(moved.observe).not.toHaveBeenCalled();
    original.observe = vi.fn(async () => true);
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: original }),
    ).toMatchObject({ drained: 1 });
  });

  it("does not ACK or deliver during dry-run", async () => {
    const memory = provider();
    enqueueMemoryRetry(
      root,
      event(),
      { observe: true, remember: false },
      createMemoryDeliveryTarget(root, memory),
    );
    const path = retryObservePath(root);
    const before = readFileSync(path, "utf-8");
    expect(
      await drainMemoryRetryQueue({
        projectDir: root,
        provider: memory,
        dryRun: true,
      }),
    ).toMatchObject({ total: 1, retained: 1, drained: 0, dryRun: true });
    expect(memory.observe).not.toHaveBeenCalled();
    expect(existsSync(`${path}.ack.jsonl`)).toBe(false);
    expect(existsSync(`${path}.drain-lock.sqlite`)).toBe(false);
    expect(readFileSync(path, "utf-8")).toBe(before);
  });

  it("uses event and destination ACK identity for duplicate recovered rows", async () => {
    const memory = provider();
    const target = createMemoryDeliveryTarget(root, memory);
    enqueueMemoryRetry(
      root,
      event(),
      { observe: true, remember: true },
      target,
    );
    await drainMemoryRetryQueue({ projectDir: root, provider: memory });
    expect(hasMemoryRetryEvent(root, event(), target)).toBe(true);
    enqueueMemoryRetry(
      root,
      event(),
      { observe: true, remember: true },
      target,
    );
    expect(readMemoryRetryQueue(root)).toEqual([]);
    expect(memory.observe).toHaveBeenCalledOnce();
  });

  it("retains unresolved destinations and does not persist URL credentials", async () => {
    const unresolved = provider();
    unresolved.deliveryIdentity = { endpoint: null };
    enqueueMemoryRetry(
      root,
      event(),
      { observe: true, remember: false },
      createMemoryDeliveryTarget(root, unresolved),
    );
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: provider() }),
    ).toMatchObject({ retained: 1, drained: 0 });
    expect(
      memoryEndpointIdentity(
        "https://user:secret@example.test/api?token=secret#fragment",
      ),
    ).toBeNull();
  });

  it("does not share ACKs or recovery deduplication between sessions with the same eventId", async () => {
    const memory = provider();
    const target = createMemoryDeliveryTarget(root, memory);
    const first = event("same-event-id");
    const second = { ...first, sid: "another-session" };
    enqueueMemoryRetry(root, first, { observe: true, remember: false }, target);
    await drainMemoryRetryQueue({ projectDir: root, provider: memory });
    expect(hasMemoryRetryEvent(root, second, target)).toBe(false);
    enqueueMemoryRetry(
      root,
      second,
      { observe: true, remember: false },
      target,
    );
    expect(readMemoryRetryQueue(root)).toHaveLength(1);
    await drainMemoryRetryQueue({ projectDir: root, provider: memory });
    expect(memory.observe).toHaveBeenCalledTimes(2);
    expect(readMemoryRetryQueue(root)).toEqual([]);
  });

  it("delivers duplicate recovered rows once within the same drain snapshot", async () => {
    const memory = provider();
    const target = createMemoryDeliveryTarget(root, memory);
    enqueueMemoryRetry(
      root,
      event(),
      { observe: true, remember: true },
      target,
    );
    enqueueMemoryRetry(
      root,
      event(),
      { observe: true, remember: true },
      target,
    );
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: memory }),
    ).toMatchObject({ total: 2, drained: 2, retained: 0 });
    expect(memory.observe).toHaveBeenCalledOnce();
    expect(memory.remember).toHaveBeenCalledOnce();
  });

  it("passes the frozen project context to retries from a different cwd", async () => {
    const memory = provider();
    const target = createMemoryDeliveryTarget(root, memory);
    enqueueMemoryRetry(
      root,
      event(),
      { observe: true, remember: false },
      target,
    );
    await drainMemoryRetryQueue({ projectDir: root, provider: memory });
    expect(memory.observe).toHaveBeenCalledWith(
      expect.objectContaining({ projectDir: target.projectDir }),
    );
  });
});
