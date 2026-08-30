import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createAgentMemoryProvider,
  parseMemoryRecallResults,
  resolveAgentMemoryEndpoint,
} from "./memory-provider.js";

async function startServer(args: {
  version?: string;
  healthBody?: Record<string, unknown>;
  healthStatus?: number;
  observeStatus?: number;
  onObserve?: (body: string) => void;
  rememberStatus?: number;
  onRemember?: (body: string) => void;
  searchStatus?: number;
  searchBody?: unknown;
  onSearch?: (body: string) => void;
}): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    if (req.url === "/agentmemory/health") {
      res.statusCode = args.healthStatus ?? 200;
      if (args.version) res.setHeader("x-agentmemory-version", args.version);
      if (args.healthBody) {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(args.healthBody));
        return;
      }
      res.end("ok");
      return;
    }
    if (req.url === "/agentmemory/observe" && req.method === "POST") {
      let body = "";
      req.setEncoding("utf-8");
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        args.onObserve?.(body);
        res.statusCode = args.observeStatus ?? 200;
        res.end("ok");
      });
      return;
    }
    if (req.url === "/agentmemory/remember" && req.method === "POST") {
      let body = "";
      req.setEncoding("utf-8");
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        args.onRemember?.(body);
        res.statusCode = args.rememberStatus ?? 200;
        res.end(JSON.stringify({ success: true }));
      });
      return;
    }
    if (req.url === "/agentmemory/search" && req.method === "POST") {
      let body = "";
      req.setEncoding("utf-8");
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        args.onSearch?.(body);
        res.statusCode = args.searchStatus ?? 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(args.searchBody ?? { results: [] }));
      });
      return;
    }
    res.statusCode = 404;
    res.end("not found");
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected TCP server address");
  }
  return { server, url: `http://127.0.0.1:${address.port}` };
}

describe("AgentMemory provider", () => {
  const cleanup: Array<() => void> = [];

  afterEach(async () => {
    for (const fn of cleanup.splice(0)) fn();
  });

  it("resolves loopback endpoint.json port unless disabled", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "oma-agentmemory-home-"));
    cleanup.push(() => rmSync(homeDir, { recursive: true, force: true }));
    mkdirSync(join(homeDir, ".agentmemory"), { recursive: true });
    writeFileSync(
      join(homeDir, ".agentmemory", "endpoint.json"),
      JSON.stringify({ port: 3111 }),
      "utf-8",
    );

    expect(resolveAgentMemoryEndpoint({ homeDir, env: {} })).toBe(
      "http://127.0.0.1:3111",
    );
    expect(
      resolveAgentMemoryEndpoint({
        homeDir,
        env: { OMA_NO_AGENTMEMORY: "1" },
      }),
    ).toBeNull();
  });

  it("accepts an unrecognized health payload with a warning (capability-based)", async () => {
    // Version pinning proved brittle across AgentMemory's release line, so a
    // 2xx health response from the configured endpoint is reachable even when
    // neither the body shape nor the version is recognized — the mismatch is
    // surfaced as a `reason` note instead of a hard reject.
    const { server, url } = await startServer({ version: "9.0.0" });
    cleanup.push(() => server.close());
    const provider = createAgentMemoryProvider({
      env: { AGENTMEMORY_URL: url },
    });

    const status = await provider.status();
    expect(status).toMatchObject({
      provider: "agentmemory",
      reachable: true,
      version: "9.0.0",
    });
    expect(status.reason).toContain("unrecognized health payload");
    await expect(
      provider.observe({
        sessionId: "oma-test",
        content: "{}\n",
        source: "oma-workflow",
      }),
    ).resolves.toBe(true);
  });

  it("stays unreachable on a non-2xx health response", async () => {
    const { server, url } = await startServer({ healthStatus: 503 });
    cleanup.push(() => server.close());
    const provider = createAgentMemoryProvider({
      env: { AGENTMEMORY_URL: url },
    });

    await expect(provider.status()).resolves.toMatchObject({
      provider: "agentmemory",
      reachable: false,
    });
  });

  it("treats a healthy body as reachable when the version header is missing", async () => {
    const { server, url } = await startServer({
      healthBody: {
        service: "agentmemory",
        status: "healthy",
        version: "0.9.24",
      },
    });
    cleanup.push(() => server.close());
    const provider = createAgentMemoryProvider({
      env: { AGENTMEMORY_URL: url },
    });

    await expect(provider.status()).resolves.toMatchObject({
      provider: "agentmemory",
      reachable: true,
      version: "0.9.24",
    });
  });

  it("posts the AgentMemory hook-event observe envelope when reachable", async () => {
    let observed = "";
    const { server, url } = await startServer({
      version: "0.9.24",
      observeStatus: 201,
      onObserve: (body) => {
        observed = body;
      },
    });
    cleanup.push(() => server.close());
    const provider = createAgentMemoryProvider({
      env: { AGENTMEMORY_URL: url },
    });

    await expect(
      provider.observe({
        sessionId: "oma-test",
        content: '{"kind":"decision.made"}\n',
        source: "oma-workflow",
      }),
    ).resolves.toBe(true);

    const parsed = JSON.parse(observed) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      hookType: "oma-workflow",
      sessionId: "oma-test",
      content: '{"kind":"decision.made"}\n',
    });
    expect(typeof parsed.project).toBe("string");
    expect(typeof parsed.cwd).toBe("string");
    expect(typeof parsed.timestamp).toBe("string");
  });

  it("posts a durable fact through remember when reachable", async () => {
    let remembered = "";
    const { server, url } = await startServer({
      version: "0.9.24",
      rememberStatus: 200,
      onRemember: (body) => {
        remembered = body;
      },
    });
    cleanup.push(() => server.close());
    const provider = createAgentMemoryProvider({
      env: { AGENTMEMORY_URL: url },
    });

    await expect(
      provider.remember?.({
        sessionId: "oma-test",
        content: "Decision [x]: do the thing.",
        importance: 8,
      }),
    ).resolves.toBe(true);

    expect(JSON.parse(remembered)).toEqual({
      sessionId: "oma-test",
      content: "Decision [x]: do the thing.",
      importance: 8,
    });
  });

  it("returns false from remember when the daemon is unreachable", async () => {
    const provider = createAgentMemoryProvider({
      env: { OMA_NO_AGENTMEMORY: "1" },
    });
    await expect(
      provider.remember?.({ sessionId: "oma-test", content: "x" }),
    ).resolves.toBe(false);
  });

  it("recalls enriched facts through the provider search contract", async () => {
    let searchRequest = "";
    const { server, url } = await startServer({
      version: "0.9.24",
      onSearch: (body) => {
        searchRequest = body;
      },
      searchBody: {
        results: [
          {
            score: 8.5,
            observation: {
              type: "fact",
              narrative: "[skill-evolution:test:suite] successful pattern",
            },
          },
        ],
      },
    });
    cleanup.push(() => server.close());
    const provider = createAgentMemoryProvider({
      env: { AGENTMEMORY_URL: url },
    });

    await expect(
      provider.recall?.({ query: "skill evolution test", limit: 3 }),
    ).resolves.toEqual([
      {
        text: "[skill-evolution:test:suite] successful pattern",
        score: 8.5,
        source: "fact",
      },
    ]);
    expect(JSON.parse(searchRequest)).toEqual({
      query: "skill evolution test",
      limit: 3,
    });
  });

  it("parses fact arrays when a narrative is absent", () => {
    expect(
      parseMemoryRecallResults(
        {
          results: [
            { score: 2, observation: { facts: ["one", "two"] } },
            { score: 1, observation: {} },
          ],
        },
        5,
      ),
    ).toEqual([{ text: "one; two", score: 2, source: undefined }]);
  });
});
