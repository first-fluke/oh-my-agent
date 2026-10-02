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
import {
  observeWithTimeout,
  recallFacts,
} from "../../.agents/hooks/core/agentmemory-client.js";
import { currentMemoryAdapter } from "../../.agents/hooks/core/memory-adapter.js";
import { onBoundary } from "../../.agents/hooks/core/state-boundary.js";
import { setActiveSession } from "../../.agents/hooks/core/state-marker.js";
import { syncProviderMcp } from "../platform/provider-mcp.js";
import { emitEventWithMemory, eventsPath, retryObservePath } from "./events.js";
import { withSelectedHookMemory } from "./hook-memory.js";

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
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("provider-aware CLI hooks", () => {
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
  it("forwards a durable decision through the selected provider", async () => {
    const root = project("honcho");
    vi.stubEnv("HONCHO_API_KEY", "test-key");
    const fetch = vi.fn().mockImplementation(async () => Response.json({}));
    vi.stubGlobal("fetch", fetch);
    await withSelectedHookMemory(root, () =>
      observeWithTimeout({
        sessionId: "run",
        source: "oma-workflow",
        content: JSON.stringify({
          kind: "decision.made",
          payload: {
            subject: "database",
            decision: "Postgres",
            rationale: "Use relational constraints",
            unrelated: "not for memory",
          },
        }),
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(fetch.mock.calls)).toContain(
      "Decision [database]: Postgres",
    );
    expect(JSON.stringify(fetch.mock.calls)).not.toContain("not for memory");
  });
});
