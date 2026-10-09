import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import {
  _resetReachableCache,
  parseSearchResults,
  recallFacts,
} from "../../.agents/hooks/core/agentmemory-client.ts";
import { createAgentMemoryScope } from "../state/agentmemory-scope.js";
import { withSelectedHookMemory } from "../state/hook-memory.js";

function recallFromCliHook(
  query: string,
  limit = 5,
  projectDir = createAgentMemoryScope().projectDir,
) {
  return withSelectedHookMemory(
    projectDir,
    () => recallFacts(query, limit, projectDir),
    "agentmemory",
  );
}

async function startServer(
  searchBody: unknown,
  onSearch?: (body: Record<string, unknown>) => void,
): Promise<{
  server: Server;
  url: string;
}> {
  const server = createServer((req, res) => {
    if (req.url === "/agentmemory/health") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ service: "agentmemory", status: "healthy" }));
      return;
    }
    if (req.url === "/agentmemory/search" && req.method === "POST") {
      let body = "";
      req.setEncoding("utf-8");
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        onSearch?.(JSON.parse(body));
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(searchBody));
      });
      return;
    }
    res.statusCode = 404;
    res.end("not found");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected TCP server address");
  }
  return { server, url: `http://127.0.0.1:${address.port}` };
}

describe("CLI-backed hooks recallFacts", () => {
  const cleanup: Array<() => void> = [];
  afterEach(() => {
    for (const fn of cleanup.splice(0)) fn();
    delete process.env.AGENTMEMORY_URL;
    _resetReachableCache();
  });

  it("short-circuits an empty query without touching the network", async () => {
    // No AGENTMEMORY_URL set, so any network attempt would fail — an empty
    // result here proves the guard returned before dispatch.
    await expect(recallFromCliHook("   ", 5)).resolves.toEqual([]);
  });

  it("never rejects when the daemon transport fails (contract: best-effort)", async () => {
    // Point at a port nothing is listening on so the request fails. recallFacts
    // must honor its "never throws" contract and resolve to [] rather than
    // reject — an unguarded throw here would blank the boundary snapshot the
    // state-boundary hook emits, which surfaced as a flaky empty-output failure.
    process.env.AGENTMEMORY_URL = "http://127.0.0.1:1";
    await expect(recallFromCliHook("adopt recall", 5)).resolves.toEqual([]);
  });

  it("maps enriched results and filters the raw-observe noise floor", async () => {
    const scope = createAgentMemoryScope();
    const { server, url } = await startServer({
      format: "full",
      results: [
        {
          score: 9.3,
          observation: {
            narrative: "Decision [x]: adopt recall.",
            facts: ["adopt recall"],
            title: "Decision adopt recall",
            type: "decision",
            concepts: [scope.concept],
          },
        },
        {
          // Raw `/observe` envelope — must be dropped by the score floor.
          score: 0.0066,
          observation: {
            narrative: "",
            facts: [],
            title: "oma-workflow",
            concepts: [scope.concept],
          },
        },
        {
          // No narrative; falls back to joined facts text.
          score: 4.1,
          observation: {
            facts: ["fact a", "fact b"],
            type: "fact",
            concepts: [scope.concept],
          },
        },
      ],
    });
    cleanup.push(() => server.close());
    process.env.AGENTMEMORY_URL = url;

    const facts = await recallFromCliHook("adopt recall", 5);
    expect(facts).toEqual([
      { text: "Decision [x]: adopt recall.", source: "decision", score: 9.3 },
      { text: "fact a; fact b", source: "fact", score: 4.1 },
    ]);
  });

  it("separates same-name projects when a daemon returns mixed and unscoped results", async () => {
    const b = createAgentMemoryScope("/work/team-b/app");
    const d = createAgentMemoryScope("/work/team-d/app");
    const requests: Record<string, unknown>[] = [];
    const { server, url } = await startServer(
      {
        results: [
          {
            score: 8,
            observation: {
              narrative: "B database decision",
              concepts: [b.concept],
            },
          },
          {
            score: 9,
            observation: {
              narrative: "D database decision",
              concepts: [d.concept],
            },
          },
          {
            score: 100,
            observation: { narrative: "Legacy fact with no owner" },
          },
        ],
      },
      (body) => requests.push(body),
    );
    cleanup.push(() => server.close());
    process.env.AGENTMEMORY_URL = url;

    expect(await recallFromCliHook("네 진행", 5, b.projectDir)).toEqual([
      { text: "B database decision", score: 8, source: undefined },
    ]);
    expect(await recallFromCliHook("네 진행", 5, d.projectDir)).toEqual([
      { text: "D database decision", score: 9, source: undefined },
    ]);
    expect(b.project).not.toBe(d.project);

    expect(requests).toEqual([
      {
        query: "네 진행",
        limit: 5,
        project: b.project,
        cwd: b.projectDir,
        format: "full",
      },
      {
        query: "네 진행",
        limit: 5,
        project: d.project,
        cwd: d.projectDir,
        format: "full",
      },
    ]);
  });
});

describe("parseSearchResults recall TTL", () => {
  const NOW = Date.parse("2026-06-13T00:00:00Z");
  const body = (results: unknown[]) => JSON.stringify({ results });

  afterEach(() => {
    delete process.env.OMA_RECALL_MAX_AGE_DAYS;
  });

  it("drops facts older than the TTL while keeping fresh and undated ones", () => {
    const facts = parseSearchResults(
      body([
        {
          score: 8,
          observation: {
            narrative: "stale decision",
            type: "decision",
            timestamp: "2026-01-01T00:00:00Z", // ~5 months old → dropped
          },
        },
        {
          score: 8,
          observation: {
            narrative: "fresh decision",
            type: "decision",
            timestamp: "2026-06-10T00:00:00Z", // 3 days old → kept
          },
        },
        {
          score: 8,
          observation: { narrative: "undated decision", type: "decision" }, // unknown age → kept
        },
      ]),
      5,
      NOW,
    );
    expect(facts.map((f) => f.text)).toEqual([
      "fresh decision",
      "undated decision",
    ]);
  });

  it("disables TTL filtering when OMA_RECALL_MAX_AGE_DAYS is 0", () => {
    process.env.OMA_RECALL_MAX_AGE_DAYS = "0";
    const facts = parseSearchResults(
      body([
        {
          score: 8,
          observation: {
            narrative: "ancient decision",
            type: "decision",
            timestamp: "2020-01-01T00:00:00Z",
          },
        },
      ]),
      5,
      NOW,
    );
    expect(facts.map((f) => f.text)).toEqual(["ancient decision"]);
  });

  it("normalises epoch-seconds timestamps", () => {
    const fiveMonthsAgoSec = Math.floor(
      Date.parse("2026-01-01T00:00:00Z") / 1000,
    );
    const facts = parseSearchResults(
      body([
        {
          score: 8,
          observation: {
            narrative: "stale epoch decision",
            type: "decision",
            timestamp: fiveMonthsAgoSec,
          },
        },
      ]),
      5,
      NOW,
    );
    expect(facts).toEqual([]);
  });
});
