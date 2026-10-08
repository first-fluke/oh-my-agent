import { execFileSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetReachableCache,
  observeWithTimeout,
} from "../../.agents/hooks/core/agentmemory-client.ts";
import { validateEventEnvelope } from "../../.agents/hooks/core/event-contract.ts";
import {
  type HookMemoryAdapter,
  withMemoryAdapter,
} from "../../.agents/hooks/core/memory-adapter.ts";
import {
  retryObservePath as legacyRetryPath,
  type OmaEvent,
} from "../../.agents/hooks/core/state-core.ts";
import { emitEvent, readEvents } from "../../.agents/hooks/core/state-emit.ts";
import { drainMemoryRetryQueue } from "../commands/memory/retry-drain.js";
import { installHooks } from "../platform/skills-installer/ssot-install.js";
import { retryObservePath } from "../state/events.js";
import { withSelectedHookMemory } from "../state/hook-memory.js";
import { createMemoryDeliveryTarget } from "../state/memory-delivery-target.js";
import { readMemoryRetryQueue } from "../state/memory-retry-queue.js";
import * as semanticMemory from "../state/semantic-memory.js";
import type { MemoryProvider } from "../types/memory.js";

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return { ...actual, homedir: vi.fn(actual.homedir) };
});

describe("standalone hook observation delivery", () => {
  let projectDir: string;
  const sid = "oma-hook-memory";
  const decision = {
    kind: "decision.made",
    payload: {
      subject: "database",
      decision: "Postgres",
      rationale: "Use relational constraints",
    },
  };

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-hook-memory-opt-out-"));
    mkdirSync(join(projectDir, ".agents"), { recursive: true });
    writeFileSync(
      join(projectDir, ".agents", "oma-config.yaml"),
      "providers:\n  semantic_memory: agentmemory\n",
    );
    vi.mocked(homedir).mockReturnValue(projectDir);
    vi.stubEnv("OMA_NO_AGENTMEMORY", undefined);
    vi.stubEnv("AGENTMEMORY_URL", undefined);
    _resetReachableCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    _resetReachableCache();
    rmSync(projectDir, { recursive: true, force: true });
  });

  function assertSingleEvent(event: OmaEvent): void {
    const events = readEvents(projectDir, sid);
    expect(events).toEqual([JSON.parse(JSON.stringify(event))]);
    expect(validateEventEnvelope(events[0])).toEqual([]);
  }

  it("acknowledges the explicit opt-out without an injected adapter", async () => {
    vi.stubEnv("OMA_NO_AGENTMEMORY", "1");
    await expect(
      observeWithTimeout({
        sessionId: sid,
        content: "disabled observation",
        source: "oma-workflow",
        projectDir,
      }),
    ).resolves.toBe(true);
  });

  it("keeps valid L1 evidence without retries when AgentMemory is explicitly disabled", async () => {
    vi.stubEnv("OMA_NO_AGENTMEMORY", "1");
    const event = await emitEvent(projectDir, sid, decision);
    assertSingleEvent(event);
    expect(existsSync(legacyRetryPath(projectDir))).toBe(false);
  });

  it("honors the opt-out in an installed standalone Bun hook runtime", () => {
    installHooks(resolve(import.meta.dirname, "../.."), projectDir);
    const output = execFileSync(
      "bun",
      [
        "--eval",
        `import { emitEvent } from "./.agents/hooks/core/state-emit.ts";
const event = await emitEvent(process.cwd(), ${JSON.stringify(sid)}, ${JSON.stringify(decision)});
process.stdout.write(JSON.stringify(event));`,
      ],
      {
        cwd: projectDir,
        env: {
          ...process.env,
          OMA_NO_AGENTMEMORY: "1",
          AGENTMEMORY_URL: "http://127.0.0.1:1",
        },
        encoding: "utf-8",
        timeout: 10_000,
      },
    );
    assertSingleEvent(JSON.parse(output));
    expect(existsSync(legacyRetryPath(projectDir))).toBe(false);
    expect(existsSync(join(projectDir, "cli"))).toBe(false);
  });

  it.each([true, false])(
    "preserves injected adapter delivery under opt-out when observe returns %s",
    async (observed) => {
      vi.stubEnv("OMA_NO_AGENTMEMORY", "1");
      const observe = vi.fn(async () => observed);
      const adapter: HookMemoryAdapter = {
        recall: async () => [],
        observe,
      };
      const event = await withMemoryAdapter(adapter, () =>
        emitEvent(projectDir, sid, decision),
      );
      assertSingleEvent(event);
      expect(observe).toHaveBeenCalledExactlyOnceWith({
        sessionId: sid,
        content: `${JSON.stringify(event)}\n`,
        source: "oma-workflow",
        projectDir,
      });
      expect(existsSync(legacyRetryPath(projectDir))).toBe(!observed);
    },
  );

  it.each([undefined, "http://127.0.0.1:1"])(
    "keeps a missing or unreachable endpoint retryable: %s",
    async (url) => {
      vi.stubEnv("AGENTMEMORY_URL", url);
      await expect(
        observeWithTimeout({
          sessionId: sid,
          content: "pending observation",
          source: "oma-workflow",
          projectDir,
        }),
      ).resolves.toBe(false);
      const event = await withSelectedHookMemory(projectDir, () =>
        emitEvent(projectDir, sid, decision),
      );
      assertSingleEvent(event);
      expect(readMemoryRetryQueue(projectDir)).toHaveLength(1);
      expect(
        JSON.parse(readMemoryRetryQueue(projectDir)[0]?.line ?? "{}"),
      ).toMatchObject({
        eventId: event.eventId,
        memoryTarget: { provider: "agentmemory" },
        memoryDelivery: { observe: true, remember: true },
      });
    },
  );

  it("returns the L1 event once when the retry append path is blocked", async () => {
    const retryPath = legacyRetryPath(projectDir);
    mkdirSync(retryPath, { recursive: true });
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const emitted = withMemoryAdapter(
      { recall: async () => [], observe: async () => false },
      () => emitEvent(projectDir, sid, decision),
    );
    await expect(emitted).resolves.toMatchObject(decision);
    assertSingleEvent(await emitted);
    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining("observation retry write failed"),
    );
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining(retryPath));
  });

  it("drains later observations after an interrupted retry tail and keeps open append writers", async () => {
    const retryPath = retryObservePath(projectDir);
    mkdirSync(dirname(retryPath), { recursive: true });
    const truncated = '{"eventId":"interrupted"';
    writeFileSync(retryPath, truncated);
    const fd = openSync(retryPath, "a");
    const remember = vi.fn(async () => true);
    const provider: MemoryProvider = {
      name: "agentmemory",
      deliveryIdentity: { identity: "hook-test" },
      status: async () => ({ provider: "agentmemory", reachable: true }),
      observe: async () => false,
      remember,
    };
    vi.spyOn(semanticMemory, "createMemoryProvider").mockReturnValue(provider);
    const target = createMemoryDeliveryTarget(projectDir, provider);
    let event: OmaEvent;
    try {
      event = await withSelectedHookMemory(projectDir, () =>
        emitEvent(projectDir, sid, decision),
      );
      writeFileSync(
        fd,
        `${JSON.stringify({
          ...event,
          eventId: "open-writer",
          memoryDelivery: { observe: true, remember: false },
          memoryTarget: target,
        })}\n`,
      );
    } finally {
      closeSync(fd);
    }
    assertSingleEvent(event);
    const observed: string[] = [];
    remember.mockClear();
    provider.observe = async (payload) => {
      observed.push(JSON.parse(payload.content).eventId);
      return true;
    };
    expect(
      await drainMemoryRetryQueue({
        projectDir,
        provider,
      }),
    ).toMatchObject({ total: 3, drained: 2, retained: 1, invalid: 1 });
    expect(observed).toEqual([event.eventId, "open-writer"]);
    expect(remember).not.toHaveBeenCalled();
    expect(readMemoryRetryQueue(projectDir).map(({ line }) => line)).toEqual([
      truncated,
    ]);
    expect(readFileSync(retryPath, "utf-8")).toContain(event.eventId);
  });
});
