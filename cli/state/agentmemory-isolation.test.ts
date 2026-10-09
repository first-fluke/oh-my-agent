import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type AgentMemoryScope,
  createAgentMemoryScope,
  scopedAgentMemorySessionId,
} from "./agentmemory-scope.js";
import { searchScopedAgentMemory } from "./agentmemory-search.js";
import { emitEventWithMemory, readEvents } from "./events.js";
import { createAgentMemoryProvider } from "./memory-provider.js";
import {
  parseMemoryRetryLine,
  readMemoryRetryQueue,
} from "./memory-retry-queue.js";

interface RequestRecord {
  path: string;
  body: Record<string, unknown>;
}

interface SearchEntry {
  score: number;
  sessionId: string;
  observation: Record<string, unknown>;
}

async function startSharedServer() {
  const requests: RequestRecord[] = [];
  const results: SearchEntry[] = [];
  const server = createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/agentmemory/health") {
      res.end(JSON.stringify({ service: "agentmemory", status: "healthy" }));
      return;
    }
    let raw = "";
    req.setEncoding("utf-8");
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      const body = JSON.parse(raw || "{}") as Record<string, unknown>;
      const path = req.url ?? "";
      requests.push({ path, body });
      if (path === "/agentmemory/remember") {
        // AgentMemory 0.9.24 projects remembered records into observations,
        // retaining concepts but replacing the session with "memory".
        results.push({
          score: 8,
          sessionId: "memory",
          observation: {
            id: `mem-${results.length}`,
            sessionId: "memory",
            type: "decision",
            narrative: body.content,
            concepts: body.concepts,
          },
        });
        res.statusCode = 201;
        res.end(JSON.stringify({ success: true }));
        return;
      }
      if (path === "/agentmemory/observe") {
        const data = body.data as Record<string, unknown>;
        results.push({
          score: 7,
          sessionId: String(body.sessionId),
          observation: {
            id: `obs-${results.length}`,
            sessionId: body.sessionId,
            type: "discovery",
            narrative: data.content,
            concepts: [],
          },
        });
        res.statusCode = 201;
        res.end(JSON.stringify({ success: true }));
        return;
      }
      if (path === "/agentmemory/search") {
        // Deliberately ignore project/cwd: the client must enforce isolation.
        res.end(JSON.stringify({ format: "full", results }));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not found" }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected a TCP server address");
  }
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
    requests,
    results,
  };
}

describe("AgentMemory isolation on a shared endpoint", () => {
  const roots: string[] = [];
  const servers: Server[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.closeAllConnections();
            server.close((error) => (error ? reject(error) : resolve()));
          }),
      ),
    );
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
    vi.unstubAllEnvs();
  });

  function projects() {
    const root = mkdtempSync(join(tmpdir(), "oma-memory-isolation-"));
    roots.push(root);
    const b = join(root, "b", "app");
    const d = join(root, "d", "app");
    mkdirSync(join(b, ".git"), { recursive: true });
    mkdirSync(join(d, ".git"), { recursive: true });
    return { root, b, d };
  }

  async function fixture() {
    const shared = await startSharedServer();
    servers.push(shared.server);
    return shared;
  }

  function memory(scope: AgentMemoryScope, text: string): SearchEntry {
    return {
      score: 8,
      sessionId: "memory",
      observation: {
        sessionId: "memory",
        narrative: text,
        concepts: [scope.concept],
      },
    };
  }

  it("returns only each project's writes when the server ignores all search filters", async () => {
    const { b, d } = projects();
    const shared = await fixture();
    const env = { AGENTMEMORY_URL: shared.url, OMA_PROFILE: "0" };
    const providerB = createAgentMemoryProvider({ projectDir: b, env });
    const providerD = createAgentMemoryProvider({ projectDir: d, env });
    const profileB = createAgentMemoryProvider({
      projectDir: b,
      env: { ...env, OMA_PROFILE: "1" },
    });
    const scopeB = createAgentMemoryScope(b, env);
    const scopeD = createAgentMemoryScope(d, env);

    await expect(
      providerB.remember?.({ sessionId: "same-sid", content: "B decision" }),
    ).resolves.toBe(true);
    await expect(
      providerD.remember?.({ sessionId: "same-sid", content: "D decision" }),
    ).resolves.toBe(true);
    await expect(
      profileB.remember?.({ sessionId: "same-sid", content: "Other profile" }),
    ).resolves.toBe(true);
    await expect(
      providerB.observe({
        sessionId: "same-sid",
        content: "B event",
        source: "oma-workflow",
      }),
    ).resolves.toBe(true);
    await expect(
      providerD.observe({
        sessionId: "same-sid",
        content: "D event",
        source: "oma-workflow",
      }),
    ).resolves.toBe(true);
    shared.results.unshift({
      score: 99,
      sessionId: "memory",
      observation: { narrative: "Unscoped legacy memory", concepts: [] },
    });

    const recalledB = await providerB.recall?.({
      query: " decision ",
      limit: 8,
    });
    const recalledD = await providerD.recall?.({ query: "decision", limit: 8 });
    const recalledProfile = await profileB.recall?.({
      query: "decision",
      limit: 8,
    });
    expect(recalledB?.map((result) => result.text)).toEqual([
      "B decision",
      "B event",
    ]);
    expect(recalledD?.map((result) => result.text)).toEqual([
      "D decision",
      "D event",
    ]);
    expect(recalledProfile?.map((result) => result.text)).toEqual([
      "Other profile",
    ]);

    const writes = shared.requests.filter(
      (request) => request.path !== "/agentmemory/search",
    );
    expect(writes[0]?.body).toMatchObject({
      project: scopeB.project,
      concepts: [scopeB.concept],
      sessionId: scopedAgentMemorySessionId(scopeB, "same-sid"),
    });
    expect(writes[1]?.body).toMatchObject({
      project: scopeD.project,
      concepts: [scopeD.concept],
      sessionId: scopedAgentMemorySessionId(scopeD, "same-sid"),
    });
    expect(writes[3]?.body).toMatchObject({
      project: scopeB.project,
      cwd: scopeB.projectDir,
      sessionId: scopedAgentMemorySessionId(scopeB, "same-sid"),
      data: { content: "B event" },
    });
    expect(
      shared.requests
        .filter((request) => request.path === "/agentmemory/search")
        .map((request) => request.body),
    ).toEqual([
      {
        query: "decision",
        limit: 8,
        project: scopeB.project,
        cwd: scopeB.projectDir,
        format: "full",
      },
      {
        query: "decision",
        limit: 8,
        project: scopeD.project,
        cwd: scopeD.projectDir,
        format: "full",
      },
      {
        query: "decision",
        limit: 8,
        project: createAgentMemoryScope(b, { OMA_PROFILE: "1" }).project,
        cwd: scopeB.projectDir,
        format: "full",
      },
    ]);
  });

  it("shares durable memories across vendors and session IDs in one project", async () => {
    const { b } = projects();
    const shared = await fixture();
    const env = { AGENTMEMORY_URL: shared.url, OMA_PROFILE: "0" };
    const codex = createAgentMemoryProvider({
      projectDir: b,
      env: { ...env, OMA_VENDOR: "codex" },
    });
    const claude = createAgentMemoryProvider({
      projectDir: b,
      env: { ...env, OMA_VENDOR: "claude" },
    });

    await expect(
      codex.remember?.({
        sessionId: "codex-first",
        content: "Shared project convention",
      }),
    ).resolves.toBe(true);
    await expect(
      claude.observe({
        sessionId: "claude-second",
        content: "Follow-up event",
        source: "oma-workflow",
      }),
    ).resolves.toBe(true);
    const recalled = await claude.recall?.({ query: "convention" });
    expect(recalled?.map((result) => result.text)).toEqual([
      "Shared project convention",
      "Follow-up event",
    ]);
    expect(shared.requests[0]?.body.project).toBe(
      shared.requests[1]?.body.project,
    );
    expect(shared.requests[0]?.body.sessionId).not.toBe(
      shared.requests[1]?.body.sessionId,
    );
  });

  it("rejects writes to another project through an explicitly bound provider", async () => {
    const { b, d } = projects();
    const shared = await fixture();
    const provider = createAgentMemoryProvider({
      projectDir: b,
      env: { AGENTMEMORY_URL: shared.url, OMA_PROFILE: "0" },
    });

    await expect(
      provider.remember?.({
        sessionId: "sid",
        content: "wrong owner",
        projectDir: d,
      }),
    ).resolves.toBe(false);
    await expect(
      provider.observe({
        sessionId: "sid",
        content: "wrong owner",
        projectDir: d,
        source: "oma-workflow",
      }),
    ).resolves.toBe(false);
    expect(shared.requests).toEqual([]);
    expect(shared.results).toEqual([]);
  });

  it("retains a profile-0 event for retry instead of sending it through a profile-1 provider", async () => {
    const { root, b } = projects();
    vi.stubEnv("OMA_STATE_HOME", join(root, "state-home"));
    vi.stubEnv("OMA_PROFILE", "0");
    const shared = await fixture();
    const env = { AGENTMEMORY_URL: shared.url, OMA_PROFILE: "1" };
    const provider = createAgentMemoryProvider({ projectDir: b, env });
    const event = await emitEventWithMemory(
      b,
      "profile-0-session",
      {
        kind: "decision.made",
        payload: {
          subject: "database",
          decision: "Use Postgres",
          rationale: "Keep relational constraints",
        },
      },
      provider,
    );

    expect(readEvents(b, event.sid)).toEqual([event]);
    expect(shared.requests).toEqual([]);
    expect(shared.results).toEqual([]);
    const pending = readMemoryRetryQueue(b);
    expect(pending).toHaveLength(1);
    expect(parseMemoryRetryLine(pending[0]?.line ?? "")).toMatchObject({
      event: { eventId: event.eventId, sid: event.sid },
      delivery: { observe: true, remember: true },
      target: {
        profile: "0",
        projectId: createAgentMemoryScope(b, { OMA_PROFILE: "0" }).projectId,
        projectDir: createAgentMemoryScope(b, { OMA_PROFILE: "0" }).projectDir,
      },
    });

    // Direct writes without a forced delivery profile still belong to the
    // provider's selected profile, independently of process.env.
    await expect(
      provider.remember?.({
        sessionId: "profile-1-session",
        content: "Profile 1's own memory",
      }),
    ).resolves.toBe(true);
    const profile1 = createAgentMemoryScope(b, env);
    expect(shared.requests).toHaveLength(1);
    expect(shared.requests[0]?.body).toMatchObject({
      project: profile1.project,
      concepts: [profile1.concept],
      sessionId: scopedAgentMemorySessionId(profile1, "profile-1-session"),
    });
    expect(readMemoryRetryQueue(b)).toEqual(pending);
  });

  it("accepts a canonical alias of the bound project and recalls its write", async () => {
    const { root, b } = projects();
    const alias = join(root, "b-alias");
    symlinkSync(b, alias, "dir");
    const shared = await fixture();
    const env = { AGENTMEMORY_URL: shared.url, OMA_PROFILE: "0" };
    const provider = createAgentMemoryProvider({ projectDir: b, env });

    await expect(
      provider.remember?.({
        sessionId: "alias-session",
        content: "Canonical project memory",
        projectDir: alias,
      }),
    ).resolves.toBe(true);
    expect(shared.requests[0]?.body.project).toBe(
      createAgentMemoryScope(b, env).project,
    );
    expect(
      (await provider.recall?.({ query: "canonical" }))?.map(
        (result) => result.text,
      ),
    ).toEqual(["Canonical project memory"]);
  });

  it.each(["marker", "directory"] as const)(
    "keeps retry writes under their original worktree scope after its %s is removed",
    async (removed) => {
      const { root } = projects();
      const parent = join(root, "parent-repo");
      const worktree = join(parent, ".worktrees", "feature");
      mkdirSync(join(parent, ".git"), { recursive: true });
      mkdirSync(worktree, { recursive: true });
      writeFileSync(
        join(worktree, ".git"),
        "gitdir: ../../.git/worktrees/feature\n",
      );
      const shared = await fixture();
      const env = { AGENTMEMORY_URL: shared.url, OMA_PROFILE: "0" };
      const original = createAgentMemoryScope(worktree, env);
      const parentScope = createAgentMemoryScope(parent, env);
      shared.results.push(memory(parentScope, "Parent repo memory"));

      if (removed === "marker") rmSync(join(worktree, ".git"));
      else rmSync(worktree, { recursive: true });
      const bound = createAgentMemoryProvider({ projectDir: worktree, env });
      const retry = createAgentMemoryProvider({ env });

      await expect(
        bound.remember?.({
          sessionId: "recovered-session",
          content: "Original worktree memory",
          projectDir: worktree,
        }),
      ).resolves.toBe(true);
      await expect(
        retry.observe({
          sessionId: "recovered-session",
          content: "Delayed worktree event",
          projectDir: worktree,
          source: "oma-workflow",
        }),
      ).resolves.toBe(true);
      expect(shared.requests[0]?.body).toMatchObject({
        project: original.project,
        concepts: [original.concept],
        sessionId: scopedAgentMemorySessionId(original, "recovered-session"),
      });
      expect(shared.requests[1]?.body).toMatchObject({
        project: original.project,
        cwd: original.projectDir,
        sessionId: scopedAgentMemorySessionId(original, "recovered-session"),
      });
      expect(shared.requests[0]?.body.project).not.toBe(parentScope.project);
      expect(
        (await bound.recall?.({ query: "worktree" }))?.map(
          (result) => result.text,
        ),
      ).toEqual(["Original worktree memory", "Delayed worktree event"]);
      expect(shared.requests[2]?.body).toMatchObject({
        project: original.project,
        cwd: original.projectDir,
        format: "full",
      });
    },
  );

  it("uses the same full-result ownership checks in the shared search helper", async () => {
    const { b, d } = projects();
    const shared = await fixture();
    const scope = createAgentMemoryScope(b, { OMA_PROFILE: "0" });
    const foreign = createAgentMemoryScope(d, { OMA_PROFILE: "0" });
    const owned = memory(scope, "owned");
    shared.results.push(
      memory(foreign, "foreign"),
      memory(createAgentMemoryScope(b, { OMA_PROFILE: "1" }), "other profile"),
      {
        ...memory(scope, "conflicting marker"),
        observation: {
          narrative: "conflicting marker",
          concepts: [scope.concept, foreign.concept],
        },
      },
      {
        ...memory(scope, "conflicting session"),
        sessionId: scopedAgentMemorySessionId(foreign, "sid"),
      },
      {
        ...memory(scope, "conflicting project"),
        observation: {
          ...owned.observation,
          project: foreign.project,
          narrative: "conflicting project",
        },
      },
      { score: 99, sessionId: "memory", observation: { narrative: "legacy" } },
      owned,
    );

    await expect(
      searchScopedAgentMemory({
        endpoint: `${shared.url}/`,
        scope,
        query: " owned ",
        limit: 3,
      }),
    ).resolves.toEqual({ results: [owned] });
    expect(shared.requests[0]?.body).toEqual({
      query: "owned",
      limit: 3,
      project: scope.project,
      cwd: scope.projectDir,
      format: "full",
    });
  });

  it("does not send an empty query to the shared server", async () => {
    const { b } = projects();
    const shared = await fixture();
    await expect(
      searchScopedAgentMemory({
        endpoint: shared.url,
        scope: createAgentMemoryScope(b, { OMA_PROFILE: "0" }),
        query: " \n ",
        limit: 8,
      }),
    ).resolves.toEqual({ results: [] });
    expect(shared.requests).toEqual([]);
  });
});
