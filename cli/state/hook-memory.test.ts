import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as agentMemoryClient from "../../.agents/hooks/core/agentmemory-client.js";
import {
  observeWithTimeout,
  recallFacts,
} from "../../.agents/hooks/core/agentmemory-client.js";
import { currentMemoryAdapter } from "../../.agents/hooks/core/memory-adapter.js";
import { onBoundary } from "../../.agents/hooks/core/state-boundary.js";
import { retryObservePath as legacyRetryPath } from "../../.agents/hooks/core/state-core.js";
import { emitEvent as emitHookEvent } from "../../.agents/hooks/core/state-emit.js";
import { setActiveSession } from "../../.agents/hooks/core/state-marker.js";
import { drainMemoryRetryQueue } from "../commands/memory/retry-drain.js";
import { http } from "../io/http.js";
import { syncProviderMcp } from "../platform/provider-mcp.js";
import type { MemoryProvider } from "../types/memory.js";
import {
  emitEvent,
  emitEventWithMemory,
  eventsPath,
  readEvents,
  retryObservePath,
} from "./events.js";
import { withSelectedHookMemory } from "./hook-memory.js";
import {
  parseMemoryRetryLine,
  readMemoryRetryQueue,
} from "./memory-retry-queue.js";
import * as semanticMemory from "./semantic-memory.js";

const roots: string[] = [];
function project(provider: string) {
  const root = mkdtempSync(join(tmpdir(), "oma-hook-provider-"));
  roots.push(root);
  mkdirSync(join(root, ".agents"));
  writeFileSync(
    join(root, ".agents/oma-config.yaml"),
    `providers:\n  semantic_memory: ${provider}\nhoncho:\n  workspace_id: test-workspace\n`,
  );
  return root;
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("provider-aware CLI hooks", () => {
  it("routes AgentMemory hook facts through the scoped durable queue without legacy duplication", async () => {
    const root = project("agentmemory");
    const provider: MemoryProvider = {
      name: "agentmemory",
      deliveryIdentity: { endpoint: "http://memory.test" },
      status: async () => ({ provider: "agentmemory", reachable: true }),
      observe: vi.fn(async () => true),
      remember: vi.fn(async () => false),
    };
    vi.spyOn(semanticMemory, "createMemoryProvider").mockReturnValue(provider);
    const event = await withSelectedHookMemory(root, () =>
      emitHookEvent(root, "agentmemory-hook", {
        kind: "decision.made",
        payload: {
          subject: "database",
          decision: "Postgres",
          rationale: "constraints",
        },
      }),
    );
    expect(readEvents(root, event.sid)).toEqual([event]);
    expect(provider.observe).toHaveBeenCalledOnce();
    expect(provider.remember).toHaveBeenCalledOnce();
    expect(existsSync(legacyRetryPath(root))).toBe(false);
    const pending = readMemoryRetryQueue(root);
    expect(pending).toHaveLength(1);
    expect(parseMemoryRetryLine(pending[0]?.line ?? "")).toMatchObject({
      event: { eventId: event.eventId },
      target: {
        provider: "agentmemory",
        destination: { endpoint: "http://memory.test" },
      },
    });
  });

  it("preserves AgentMemory hook project scope and score/age filtering", async () => {
    const root = project("agentmemory");
    vi.stubEnv("AGENTMEMORY_URL", "http://memory.test");
    vi.spyOn(agentMemoryClient, "isAgentMemoryReachable").mockResolvedValue(
      true,
    );
    const post = vi.spyOn(http, "post").mockResolvedValue({
      status: 200,
      data: {
        results: [
          { score: 0.1, observation: { narrative: "noise" } },
          {
            score: 5,
            timestamp: new Date().toISOString(),
            observation: { narrative: "current fact" },
          },
          {
            score: 4,
            timestamp: new Date(Date.now() - 31 * 86400000).toISOString(),
            observation: { narrative: "expired fact" },
          },
        ],
      },
    });
    expect(
      await withSelectedHookMemory(root, () =>
        recallFacts("decision", 5, root),
      ),
    ).toEqual([{ text: "current fact", score: 5, source: undefined }]);
    expect(post).toHaveBeenCalledWith(
      "http://memory.test/agentmemory/search",
      expect.objectContaining({ query: "decision", limit: 5, cwd: root }),
      expect.objectContaining({ timeout: 2000 }),
    );
  });

  it("skips malformed semantic envelopes instead of treating raw hook content as facts", async () => {
    const root = project("honcho");
    const remember = vi.fn(async () => true);
    vi.spyOn(semanticMemory, "createMemoryProvider").mockReturnValue({
      name: "honcho",
      observeEvents: false,
      async status() {
        return { provider: "honcho", reachable: true };
      },
      async observe() {
        return false;
      },
      remember,
    });
    await withSelectedHookMemory(root, () =>
      observeWithTimeout({
        sessionId: "s1",
        source: "hook",
        projectDir: root,
        content: JSON.stringify({
          eventId: "raw-envelope",
          sid: "s1",
          ts: "2026-10-03T00:00:00.000Z",
          writerPid: process.pid,
          kind: "decision.made",
          payload: { subject: "database", decision: "Postgres" },
        }),
      }),
    );
    expect(remember).not.toHaveBeenCalled();
    expect(readMemoryRetryQueue(root)).toEqual([]);
  });
  it.each([
    {
      kind: "decision.made",
      payload: {
        subject: "database",
        decision: "Postgres",
        rationale: "Use relational constraints",
      },
      remember: true,
    },
    { kind: "gate.passed", payload: { gate: "PLAN_GATE" }, remember: false },
    {
      kind: "skill.proposal.gated",
      payload: {
        skillId: "oma-test",
        suiteHash: "suite-1",
        outcome: "accepted",
        edit: { op: "add", anchor: "## Rules", after: "Use a fallback" },
      },
      remember: false,
    },
  ])(
    "still runs the local hook after failed Honcho initialization: $kind",
    async ({ kind, payload, remember }) => {
      const root = project("honcho");
      writeFileSync(
        join(root, ".agents/oma-config.yaml"),
        "providers: { semantic_memory: honcho }\nhoncho: { workspace_id: 42 }\n",
      );
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const event = await withSelectedHookMemory(root, async () => {
        expect(await recallFacts("decision", 5, root)).toEqual([]);
        return emitHookEvent(root, "failed-init-hook", { kind, payload });
      });
      expect(readEvents(root, event.sid)).toEqual([event]);
      const pending = readMemoryRetryQueue(root);
      expect(pending).toHaveLength(remember ? 1 : 0);
      if (remember) {
        if (!pending[0]) throw new Error("Expected the queued hook fact");
        expect(parseMemoryRetryLine(pending[0].line)).toMatchObject({
          event: JSON.parse(JSON.stringify(event)),
          delivery: { observe: false, remember: true },
        });
      }
    },
  );
  it.each(["false", "throw"])(
    "retains Honcho remember %s for an already appended hook fact",
    async (failure) => {
      const root = project("honcho");
      const initial: MemoryProvider = {
        name: "honcho",
        observeEvents: false,
        async status() {
          return { provider: "honcho", reachable: true };
        },
        observe: vi.fn(async () => false),
        remember: vi.fn(async () => {
          if (failure === "throw") throw new Error("Honcho unavailable");
          return false;
        }),
      };
      vi.spyOn(semanticMemory, "createMemoryProvider").mockReturnValue(initial);
      const event = emitEvent(root, "original-hook-session", {
        eventId: "original-hook-event",
        kind: "decision.made",
        payload: {
          subject: "database",
          decision: "Postgres",
          rationale: "Use relational constraints",
        },
      });
      expect(
        await withSelectedHookMemory(root, () =>
          observeWithTimeout({
            sessionId: event.sid,
            source: "oma-workflow",
            content: `${JSON.stringify(event)}\n`,
            projectDir: root,
          }),
        ),
      ).toBe(true);
      expect(initial.observe).not.toHaveBeenCalled();
      expect(initial.remember).toHaveBeenCalledOnce();
      const pending = readMemoryRetryQueue(root);
      expect(pending).toHaveLength(1);
      if (!pending[0]) throw new Error("Expected the pending hook fact");
      expect(parseMemoryRetryLine(pending[0].line)).toMatchObject({
        event: JSON.parse(JSON.stringify(event)),
        delivery: { observe: false, remember: true },
      });
      expect(readEvents(root, event.sid)).toEqual([event]);
      const repaired = {
        ...initial,
        observe: vi.fn(async () => false),
        remember: vi.fn(async () => true),
      };
      expect(
        await drainMemoryRetryQueue({ projectDir: root, provider: repaired }),
      ).toMatchObject({ total: 1, drained: 1, retained: 0 });
      expect(repaired.observe).not.toHaveBeenCalled();
      expect(repaired.remember).toHaveBeenCalledWith({
        sessionId: event.sid,
        content:
          "Decision [database]: Postgres Rationale: Use relational constraints",
        importance: 8,
      });
      expect(readEvents(root, event.sid)).toEqual([event]);
    },
  );
  it("injects inferred long-term context at a session boundary without remembering it again", async () => {
    const root = project("honcho");
    vi.stubEnv("HONCHO_API_KEY", "test-key");
    setActiveSession(root, "main", "workflow-test");
    const fetch = vi.fn(async (url: string) =>
      Response.json(
        url.endsWith("/representation")
          ? { representation: "Prefer managed infrastructure." }
          : [],
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const context = await withSelectedHookMemory(root, () =>
      onBoundary(root, "claude", "new-session", "deployment preference"),
    );
    expect(context).toContain("Prefer managed infrastructure");
    expect(context).toContain("Advisory only");
    expect(context).toContain("/representation");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(
      await withSelectedHookMemory(root, () =>
        onBoundary(root, "claude", "new-session", "same session"),
      ),
    ).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each(["honcho", "none"])(
    "standalone hooks keep raw events local after linking %s",
    async (provider) => {
      const root = project(provider);
      syncProviderMcp(root, []);
      const adapter = currentMemoryAdapter(root);
      expect(adapter).toBeDefined();
      expect(await adapter?.recall("query", 5)).toEqual([]);
      expect(
        await adapter?.observe({
          sessionId: "s1",
          content: "raw transcript",
          source: "hook",
        }),
      ).toBe(true);
      writeFileSync(
        join(root, ".agents/oma-config.yaml"),
        "providers: { semantic_memory: agentmemory }\n",
      );
      syncProviderMcp(root, []);
      expect(currentMemoryAdapter(root)).toBeUndefined();
    },
  );
  it("none retains local evidence without network calls or retry pollution", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const root = project("none");
    await emitEventWithMemory(root, "s1", {
      kind: "decision.made",
      payload: {
        subject: "DB",
        decision: "Postgres",
        rationale: "Use relational constraints",
      },
    });
    expect(readFileSync(eventsPath(root, "s1"), "utf8")).toContain("Postgres");
    expect(existsSync(retryObservePath(root))).toBe(false);
    await withSelectedHookMemory(root, async () => {
      expect(await recallFacts("decision")).toEqual([]);
      expect(
        await observeWithTimeout({
          sessionId: "s1",
          content: "raw",
          source: "hook",
        }),
      ).toBe(true);
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("isolates concurrent hook providers and never mirrors raw envelopes", async () => {
    const none = project("none");
    const honcho = project("honcho");
    vi.stubEnv("HONCHO_API_KEY", "test-key");
    const fetch = vi.fn().mockImplementation(async () => Response.json([]));
    vi.stubGlobal("fetch", fetch);
    await Promise.all([
      withSelectedHookMemory(none, async () => {
        await Promise.resolve();
        await recallFacts("do not send");
      }),
      withSelectedHookMemory(honcho, async () => {
        await Promise.resolve();
        await recallFacts("selected fact");
        await observeWithTimeout({
          sessionId: "s",
          content: JSON.stringify({
            kind: "task.started",
            payload: { raw: "private transcript" },
          }),
          source: "hook",
        });
      }),
    ]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(fetch.mock.calls)).not.toContain("do not send");
    expect(JSON.stringify(fetch.mock.calls)).not.toContain(
      "private transcript",
    );
  });
  it("forwards a durable decision even when AgentMemory is disabled", async () => {
    const root = project("honcho");
    vi.stubEnv("HONCHO_API_KEY", "test-key");
    vi.stubEnv("OMA_NO_AGENTMEMORY", "1");
    const fetch = vi.fn().mockImplementation(async () => Response.json({}));
    vi.stubGlobal("fetch", fetch);
    const event = emitEvent(root, "run", {
      kind: "decision.made",
      payload: {
        subject: "database",
        decision: "Postgres",
        rationale: "Use relational constraints",
        unrelated: "not for memory",
      },
    });
    await withSelectedHookMemory(root, () =>
      observeWithTimeout({
        sessionId: "run",
        source: "oma-workflow",
        content: `${JSON.stringify(event)}\n`,
        projectDir: root,
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(fetch.mock.calls)).toContain(
      "Decision [database]: Postgres",
    );
    expect(JSON.stringify(fetch.mock.calls)).not.toContain("not for memory");
    expect(readEvents(root, event.sid)).toEqual([event]);
    expect(readMemoryRetryQueue(root)).toEqual([]);
  });
});
