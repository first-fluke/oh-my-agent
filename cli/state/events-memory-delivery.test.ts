import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { drainMemoryRetryQueue } from "../commands/memory/retry-drain.js";
import type { MemoryProvider } from "../types/memory.js";
import { emitEventWithMemory, readEvents, retryObservePath } from "./events.js";
import { createAgentMemoryProvider } from "./memory-provider.js";
import { readMemoryRetryQueue } from "./memory-retry-queue.js";
import * as semanticMemory from "./semantic-memory.js";

function memory(overrides: Partial<MemoryProvider> = {}): MemoryProvider {
  return {
    name: "agentmemory",
    async status() {
      return { provider: "agentmemory", reachable: true };
    },
    observe: vi.fn(async () => true),
    remember: vi.fn(async () => true),
    ...overrides,
  };
}

const decision = {
  eventId: "decision-1",
  ts: "2026-10-02T00:00:00.000Z",
  kind: "decision.made",
  payload: {
    subject: "database",
    decision: "Use Postgres",
    rationale: "The app requires relational constraints",
  },
};

describe("independent event memory delivery", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-event-memory-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  it("preserves L1 and retains an unresolved destination if provider initialization throws", async () => {
    vi.spyOn(semanticMemory, "createMemoryProvider").mockImplementation(() => {
      throw new Error("invalid provider configuration");
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const event = await emitEventWithMemory(root, "s1", decision);
    expect(readEvents(root, "s1")).toEqual([event]);
    expect(readMemoryRetryQueue(root)).toHaveLength(1);
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: memory() }),
    ).toMatchObject({ drained: 0, retained: 1 });
  });

  it("retains only durable Honcho delivery after invalid provider initialization", async () => {
    mkdirSync(join(root, ".agents"));
    writeFileSync(
      join(root, ".agents/oma-config.yaml"),
      "providers: { semantic_memory: honcho }\nhoncho: { workspace_id: 42 }\n",
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await emitEventWithMemory(root, "s1", decision);
    const retry = memory({ name: "honcho", observeEvents: false });
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: retry }),
    ).toMatchObject({ drained: 0, retained: 1 });
    expect(retry.observe).not.toHaveBeenCalled();
    expect(retry.remember).not.toHaveBeenCalled();
  });

  it.each([
    { kind: "gate.passed", payload: { gate: "PLAN_GATE" } },
    { kind: "session.ended", payload: { status: "completed" } },
    {
      kind: "skill.proposal.gated",
      payload: {
        skillId: "oma-test",
        suiteHash: "suite-1",
        outcome: "accepted",
        edit: { op: "add", anchor: "## Rules", after: "Use a fallback" },
      },
    },
  ])(
    "does not queue unsupported Honcho facts after failed initialization: $kind",
    async (event) => {
      mkdirSync(join(root, ".agents"));
      writeFileSync(
        join(root, ".agents/oma-config.yaml"),
        "providers: { semantic_memory: honcho }\nhoncho: { workspace_id: 42 }\n",
      );
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const emitted = await emitEventWithMemory(root, "s1", event);
      expect(readEvents(root, "s1")).toEqual([emitted]);
      expect(existsSync(retryObservePath(root))).toBe(false);
      const repaired = memory({ name: "honcho", observeEvents: false });
      expect(
        await drainMemoryRetryQueue({ projectDir: root, provider: repaired }),
      ).toMatchObject({ total: 0, drained: 0, retained: 0 });
      expect(repaired.observe).not.toHaveBeenCalled();
      expect(repaired.remember).not.toHaveBeenCalled();
    },
  );

  it.each(["false", "throw"])(
    "retries remember returning %s after observe succeeds",
    async (failure) => {
      const event = await emitEventWithMemory(
        root,
        "original-session",
        decision,
        memory({
          remember: async () => {
            if (failure === "throw") throw new Error("unavailable");
            return false;
          },
        }),
      );
      expect(readMemoryRetryQueue(root)).toHaveLength(1);
      const retry = memory();
      expect(
        await drainMemoryRetryQueue({ projectDir: root, provider: retry }),
      ).toMatchObject({ total: 1, drained: 1, retained: 0 });
      expect(retry.observe).not.toHaveBeenCalled();
      expect(retry.remember).toHaveBeenCalledWith({
        sessionId: "original-session",
        projectDir: realpathSync(root),
        profile: process.env.OMA_PROFILE ?? "0",
        content:
          "Decision [database]: Use Postgres Rationale: The app requires relational constraints",
        importance: 8,
      });
      expect(readEvents(root, "original-session")).toEqual([event]);
    },
  );

  it("remembers despite an observe exception and retries only the original observation", async () => {
    const initial = memory({
      observe: async () => {
        throw new Error("offline");
      },
    });
    const event = await emitEventWithMemory(root, "s1", decision, initial);
    expect(initial.remember).toHaveBeenCalledOnce();
    const retry = memory();
    await drainMemoryRetryQueue({ projectDir: root, provider: retry });
    expect(retry.remember).not.toHaveBeenCalled();
    expect(retry.observe).toHaveBeenCalledWith({
      sessionId: "s1",
      content: `${JSON.stringify(event)}\n`,
      source: "oma-workflow",
      projectDir: realpathSync(root),
      profile: process.env.OMA_PROFILE ?? "0",
    });
  });

  it("retries a Honcho fact when observation is unsupported", async () => {
    const initial = memory({
      name: "honcho",
      observeEvents: false,
      remember: async () => false,
    });
    await emitEventWithMemory(root, "s1", decision, initial);
    expect(initial.observe).not.toHaveBeenCalled();
    expect(readMemoryRetryQueue(root)).toHaveLength(1);
    const retry = memory({ name: "honcho", observeEvents: false });
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: retry }),
    ).toMatchObject({ drained: 1, retained: 0 });
    expect(retry.observe).not.toHaveBeenCalled();
    expect(retry.remember).toHaveBeenCalledOnce();
  });

  it("checkpoints successful remember while observation still fails", async () => {
    const event = await emitEventWithMemory(
      root,
      "s1",
      decision,
      memory({ observe: async () => false, remember: async () => false }),
    );
    const first = memory({ observe: async () => false });
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: first }),
    ).toMatchObject({ drained: 0, retained: 1 });
    expect(first.remember).toHaveBeenCalledOnce();
    const second = memory();
    expect(
      await drainMemoryRetryQueue({ projectDir: root, provider: second }),
    ).toMatchObject({ drained: 1, retained: 0 });
    expect(second.remember).not.toHaveBeenCalled();
    expect(second.observe).toHaveBeenCalledWith(
      expect.objectContaining({ content: `${JSON.stringify(event)}\n` }),
    );
  });

  it("does not enqueue disabled memory", async () => {
    const disabled = memory({
      name: "none",
      observeEvents: false,
      remember: async () => false,
    });
    await emitEventWithMemory(root, "s1", decision, disabled);
    expect(existsSync(retryObservePath(root))).toBe(false);
  });

  it("honors injected AgentMemory disable settings without retry pollution", async () => {
    vi.stubEnv("OMA_NO_AGENTMEMORY", "0");
    const disabled = createAgentMemoryProvider({
      env: { OMA_NO_AGENTMEMORY: "1" },
      homeDir: root,
    });
    const observe = vi.spyOn(disabled, "observe");
    const remember = vi.spyOn(disabled, "remember");
    await emitEventWithMemory(root, "s1", decision, disabled);
    expect(observe).not.toHaveBeenCalled();
    expect(remember).not.toHaveBeenCalled();
    expect(existsSync(retryObservePath(root))).toBe(false);
  });

  it("keeps unavailable AgentMemory retryable when injected settings enable it", async () => {
    vi.stubEnv("OMA_NO_AGENTMEMORY", "1");
    const unavailable = createAgentMemoryProvider({ env: {}, homeDir: root });
    await emitEventWithMemory(root, "s1", decision, unavailable);
    expect(readMemoryRetryQueue(root)).toHaveLength(1);
  });

  it.each(["agentmemory", "honcho"] as const)(
    "disabling %s retains existing work without new delivery",
    async (name) => {
      await emitEventWithMemory(
        root,
        "s1",
        decision,
        memory({ remember: async () => false }),
      );
      const disabled = memory({ name, enabled: false });
      await emitEventWithMemory(
        root,
        "s1",
        { ...decision, eventId: "disabled-event" },
        disabled,
      );
      expect(
        await drainMemoryRetryQueue({ projectDir: root, provider: disabled }),
      ).toMatchObject({ total: 1, drained: 0, retained: 1 });
      expect(disabled.observe).not.toHaveBeenCalled();
      expect(disabled.remember).not.toHaveBeenCalled();
      expect(readMemoryRetryQueue(root)).toHaveLength(1);
    },
  );

  it("queues before delivery and serializes a simultaneous drain", async () => {
    let finishObserve!: () => void;
    const pending = new Promise<void>((resolve) => {
      finishObserve = resolve;
    });
    const initial = memory({
      observe: vi.fn(async () => {
        await pending;
        return true;
      }),
    });
    const emission = emitEventWithMemory(root, "s1", decision, initial);
    await vi.waitFor(() => expect(initial.observe).toHaveBeenCalledOnce());
    expect(readMemoryRetryQueue(root)).toHaveLength(1);
    const retry = memory();
    const drain = drainMemoryRetryQueue({ projectDir: root, provider: retry });
    finishObserve();
    await emission;
    expect(await drain).toMatchObject({ total: 0, drained: 0 });
    expect(initial.remember).toHaveBeenCalledOnce();
    expect(retry.observe).not.toHaveBeenCalled();
    expect(retry.remember).not.toHaveBeenCalled();
  });

  it("immediate delivery leaves unrelated backlog pending", async () => {
    await emitEventWithMemory(
      root,
      "s1",
      decision,
      memory({ observe: async () => false, remember: async () => false }),
    );
    const current = memory();
    const event = await emitEventWithMemory(
      root,
      "s1",
      {
        ...decision,
        eventId: "decision-current",
        payload: {
          ...decision.payload,
          decision: "Keep the current delivery isolated",
        },
      },
      current,
    );

    expect(current.observe).toHaveBeenCalledOnce();
    expect(current.observe).toHaveBeenCalledWith(
      expect.objectContaining({ content: `${JSON.stringify(event)}\n` }),
    );
    expect(current.remember).toHaveBeenCalledOnce();
    expect(current.remember).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Keep the current delivery isolated"),
      }),
    );
    expect(
      readMemoryRetryQueue(root).map(({ line }) => JSON.parse(line).eventId),
    ).toEqual([decision.eventId]);
    expect(readEvents(root, "s1")).toHaveLength(2);
  });

  it("retains unfinished remember when the selected retry provider does not support it", async () => {
    await emitEventWithMemory(
      root,
      "s1",
      decision,
      memory({ remember: async () => false }),
    );
    expect(
      await drainMemoryRetryQueue({
        projectDir: root,
        provider: memory({ remember: undefined }),
      }),
    ).toMatchObject({ drained: 0, retained: 1 });
    expect(readMemoryRetryQueue(root)).toHaveLength(1);
  });

  it("leaves retry progress untouched during dry-run", async () => {
    await emitEventWithMemory(
      root,
      "s1",
      decision,
      memory({ remember: async () => false }),
    );
    const retry = memory();
    expect(
      await drainMemoryRetryQueue({
        projectDir: root,
        provider: retry,
        dryRun: true,
      }),
    ).toMatchObject({ drained: 0, retained: 1, dryRun: true });
    expect(retry.observe).not.toHaveBeenCalled();
    expect(retry.remember).not.toHaveBeenCalled();
    expect(readMemoryRetryQueue(root)).toHaveLength(1);
  });
});
