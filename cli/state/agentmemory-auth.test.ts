import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  _resetReachableCache,
  isAgentMemoryReachable,
  recallFacts,
  resolveAgentMemorySecret as resolveHookSecret,
} from "../../.agents/hooks/core/agentmemory-client.ts";
import {
  agentMemoryAuthHeaders,
  isLoopbackUrl,
  resolveAgentMemorySecret,
} from "./agentmemory-auth.js";
import { createAgentMemoryScope } from "./agentmemory-scope.js";
import { withSelectedHookMemory } from "./hook-memory.js";
import { createAgentMemoryProvider } from "./memory-provider.js";

const SECRET = "s3cret-token-for-tests";

/** AgentMemory >= 0.9.x shape: every REST route demands the bearer secret. */
async function startAuthServer(searchBody: unknown = { results: [] }): Promise<{
  server: Server;
  url: string;
  authHeaders: Array<string | undefined>;
}> {
  const authHeaders: Array<string | undefined> = [];
  const server = createServer((req, res) => {
    authHeaders.push(req.headers.authorization);
    if (req.headers.authorization !== `Bearer ${SECRET}`) {
      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    let body = "";
    req.setEncoding("utf-8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      if (req.url === "/agentmemory/health") {
        res.end(JSON.stringify({ service: "agentmemory", status: "healthy" }));
      } else if (req.url === "/agentmemory/search") {
        res.end(JSON.stringify(searchBody));
      } else {
        res.end(JSON.stringify({ success: true, body }));
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected TCP server address");
  }
  return { server, url: `http://127.0.0.1:${address.port}`, authHeaders };
}

function makeHome(files: Record<string, string> = {}): string {
  const homeDir = mkdtempSync(join(tmpdir(), "oma-agentmemory-auth-"));
  mkdirSync(join(homeDir, ".agentmemory"), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(homeDir, ".agentmemory", name), content, "utf-8");
  }
  return homeDir;
}

describe("resolveAgentMemorySecret", () => {
  const cleanup: Array<() => void> = [];
  afterEach(() => {
    for (const fn of cleanup.splice(0)) fn();
  });

  it("prefers AGENTMEMORY_SECRET and sends it even to remote endpoints", () => {
    const homeDir = makeHome({ secret: "from-file\n" });
    cleanup.push(() => rmSync(homeDir, { recursive: true, force: true }));
    expect(
      resolveAgentMemorySecret("https://memory.example.com", {
        homeDir,
        env: { AGENTMEMORY_SECRET: " from-env " },
      }),
    ).toBe("from-env");
  });

  it("reads the env file before the stored secret for loopback endpoints", () => {
    const homeDir = makeHome({
      ".env": "# comment\nexport AGENTMEMORY_SECRET='from-dotenv' # note\n",
      secret: "from-file\n",
    });
    cleanup.push(() => rmSync(homeDir, { recursive: true, force: true }));
    expect(
      resolveAgentMemorySecret("http://127.0.0.1:3111", { homeDir, env: {} }),
    ).toBe("from-dotenv");
  });

  it("falls back to ~/.agentmemory/secret, then AGENTMEMORY_DATA_DIR/secret", () => {
    const homeDir = makeHome({ secret: "from-file\n" });
    const dataDir = mkdtempSync(join(tmpdir(), "oma-agentmemory-data-"));
    writeFileSync(join(dataDir, "secret"), "from-data-dir\n", "utf-8");
    cleanup.push(() => {
      rmSync(homeDir, { recursive: true, force: true });
      rmSync(dataDir, { recursive: true, force: true });
    });
    expect(
      resolveAgentMemorySecret("http://localhost:3111", { homeDir, env: {} }),
    ).toBe("from-file");

    const bareHome = makeHome();
    cleanup.push(() => rmSync(bareHome, { recursive: true, force: true }));
    expect(
      resolveAgentMemorySecret("http://[::1]:3111", {
        homeDir: bareHome,
        env: { AGENTMEMORY_DATA_DIR: dataDir },
      }),
    ).toBe("from-data-dir");
  });

  it("never sends a file-discovered secret to a non-loopback host", () => {
    const homeDir = makeHome({ secret: "from-file\n" });
    cleanup.push(() => rmSync(homeDir, { recursive: true, force: true }));
    expect(
      agentMemoryAuthHeaders("http://memory.internal:3111", {
        homeDir,
        env: {},
      }),
    ).toEqual({});
  });

  it("skips file discovery in explicit credential mode and ignores unexpanded env placeholders", () => {
    const homeDir = makeHome({ secret: "from-file\n" });
    cleanup.push(() => rmSync(homeDir, { recursive: true, force: true }));
    expect(
      resolveAgentMemorySecret("http://127.0.0.1:3111", {
        homeDir,
        env: { AGENTMEMORY_CREDENTIAL_MODE: "explicit" },
      }),
    ).toBe("");
    expect(
      resolveAgentMemorySecret("http://127.0.0.1:3111", {
        homeDir,
        // biome-ignore lint/suspicious/noTemplateCurlyInString: literal unexpanded placeholder under test
        env: { AGENTMEMORY_SECRET: "${AGENTMEMORY_SECRET}" },
      }),
    ).toBe("from-file");
  });

  it("classifies loopback hosts", () => {
    expect(isLoopbackUrl("http://127.0.0.1:3111")).toBe(true);
    expect(isLoopbackUrl("http://127.4.5.6")).toBe(true);
    expect(isLoopbackUrl("http://localhost")).toBe(true);
    expect(isLoopbackUrl("http://[::1]:3111")).toBe(true);
    expect(isLoopbackUrl("http://10.0.0.1")).toBe(false);
    expect(isLoopbackUrl("not a url")).toBe(false);
  });

  it("stays in sync with the hook-side mirror", () => {
    const env = { AGENTMEMORY_SECRET: "mirror" };
    expect(resolveHookSecret("http://127.0.0.1:1", env)).toBe(
      resolveAgentMemorySecret("http://127.0.0.1:1", { env }),
    );
    expect(
      resolveHookSecret("http://memory.internal", {
        AGENTMEMORY_CREDENTIAL_MODE: "explicit",
      }),
    ).toBe("");
  });
});

describe("AgentMemory bearer auth against a secret-enforcing daemon", () => {
  const cleanup: Array<() => void> = [];
  afterEach(() => {
    for (const fn of cleanup.splice(0)) fn();
    delete process.env.AGENTMEMORY_URL;
    delete process.env.AGENTMEMORY_SECRET;
    _resetReachableCache();
  });

  it("provider health/observe/remember/recall authenticate with the stored secret", async () => {
    const scope = createAgentMemoryScope();
    const { server, url, authHeaders } = await startAuthServer({
      results: [
        {
          score: 7,
          observation: {
            narrative: "Decision: authenticate recall.",
            type: "decision",
            concepts: [scope.concept],
          },
        },
      ],
    });
    cleanup.push(() => server.close());
    const homeDir = makeHome({ secret: `${SECRET}\n` });
    cleanup.push(() => rmSync(homeDir, { recursive: true, force: true }));
    const provider = createAgentMemoryProvider({
      env: { AGENTMEMORY_URL: url },
      homeDir,
    });

    await expect(provider.status()).resolves.toMatchObject({
      reachable: true,
    });
    await expect(
      provider.observe({ sessionId: "s", content: "c", source: "test" }),
    ).resolves.toBe(true);
    await expect(
      provider.remember?.({ sessionId: "s", content: "c" }),
    ).resolves.toBe(true);
    const recalled = (await provider.recall?.({ query: "authenticate" })) ?? [];
    expect(recalled.map((r) => r.text)).toEqual([
      "Decision: authenticate recall.",
    ]);
    expect(authHeaders.every((h) => h === `Bearer ${SECRET}`)).toBe(true);
  });

  it("reports 401 as unreachable when no secret is available", async () => {
    const { server, url } = await startAuthServer();
    cleanup.push(() => server.close());
    const homeDir = makeHome();
    cleanup.push(() => rmSync(homeDir, { recursive: true, force: true }));
    const provider = createAgentMemoryProvider({
      env: { AGENTMEMORY_URL: url },
      homeDir,
    });
    await expect(provider.status()).resolves.toMatchObject({
      reachable: false,
      reason: "health returned 401",
    });
  });

  it("hook client probe and CLI-hook recall send the bearer secret", async () => {
    const scope = createAgentMemoryScope();
    const { server, url, authHeaders } = await startAuthServer({
      results: [
        {
          score: 9,
          observation: {
            narrative: "Decision: hooks authenticate.",
            type: "decision",
            concepts: [scope.concept],
          },
        },
      ],
    });
    cleanup.push(() => server.close());
    process.env.AGENTMEMORY_URL = url;
    process.env.AGENTMEMORY_SECRET = SECRET;

    await expect(isAgentMemoryReachable()).resolves.toBe(true);
    const facts = await withSelectedHookMemory(
      scope.projectDir,
      () => recallFacts("hooks authenticate", 5, scope.projectDir),
      "agentmemory",
    );
    expect(facts.map((f) => f.text)).toEqual(["Decision: hooks authenticate."]);
    expect(authHeaders.length).toBeGreaterThanOrEqual(2);
    expect(authHeaders.every((h) => h === `Bearer ${SECRET}`)).toBe(true);
  });
});
