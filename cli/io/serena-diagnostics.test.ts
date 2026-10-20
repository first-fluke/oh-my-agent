import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DaemonRegistry } from "./serena-daemon/registry.js";
import {
  existingSerenaDiagnostics,
  parseFileDiagnostics,
} from "./serena-diagnostics.js";

const mocks = vi.hoisted(() => ({ readRegistry: vi.fn() }));
vi.mock("./serena-daemon/registry.js", () => ({
  readRegistry: mocks.readRegistry,
}));

const grouped = {
  "sample.ts": {
    Error: {
      "<file>": [
        {
          message: "Unknown variable",
          range: {
            start: { line: 2, character: 3 },
            end: { line: 2, character: 4 },
          },
          code: 2304,
          source: "ts",
        },
      ],
    },
  },
};

describe("existing Serena diagnostic provider", () => {
  let root: string;
  let server: Server | undefined;
  beforeEach(() => {
    root = realpathSync(
      mkdtempSync(join(tmpdir(), "oma-diagnostic-provider-")),
    );
    mocks.readRegistry.mockReset().mockReturnValue({});
  });
  afterEach(async () => {
    if (server) {
      server.closeAllConnections();
      const active = server;
      await new Promise<void>((resolve) => active.close(() => resolve()));
      server = undefined;
    }
    rmSync(root, { recursive: true, force: true });
  });

  async function start(sse: boolean, failure = false) {
    const requests: Array<{
      method: string;
      session?: string;
      tool?: unknown;
    }> = [];
    server = createServer(async (req, res) => {
      if (req.method === "DELETE") {
        requests.push({
          method: "DELETE",
          session: req.headers["mcp-session-id"] as string,
        });
        res.writeHead(200).end();
        return;
      }
      let text = "";
      for await (const chunk of req) text += chunk.toString();
      const rpc = JSON.parse(text);
      requests.push({
        method: rpc.method,
        session: req.headers["mcp-session-id"] as string,
        tool: rpc.params,
      });
      if (rpc.method === "notifications/initialized") {
        res.writeHead(202).end();
        return;
      }
      const result =
        rpc.method === "initialize"
          ? {
              protocolVersion: "2024-11-05",
              capabilities: {},
              serverInfo: { name: "fixture", version: "1" },
            }
          : failure
            ? {
                isError: true,
                content: [{ type: "text", text: "Unsupported language" }],
              }
            : { content: [{ type: "text", text: JSON.stringify(grouped) }] };
      const response = JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result });
      res.writeHead(200, {
        "content-type": sse ? "text/event-stream" : "application/json",
        "mcp-session-id": "fixture-session",
      });
      res.end(
        sse
          ? `\n: ping\n\nevent: message\ndata: {"jsonrpc":"2.0","method":"notifications/progress"}\n\nevent: message\ndata: ${response}\n\n`
          : response,
      );
    });
    const active = server;
    await new Promise<void>((resolve) =>
      active.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Fixture has no TCP address");
    mocks.readRegistry.mockReturnValue({
      project: {
        root,
        context: "oma",
        port: address.port,
        pid: process.pid,
        startedAt: "fixture",
      },
    } satisfies DaemonRegistry);
    return requests;
  }

  for (const sse of [false, true])
    it(`initializes, reads and closes over ${sse ? "SSE" : "JSON"}`, async () => {
      const requests = await start(sse);
      const provider = existingSerenaDiagnostics(root);
      expect(provider).not.toBeNull();
      if (!provider?.close) throw new Error("Fixture provider unavailable");
      const signal = AbortSignal.timeout(2000);
      expect(await provider.read("sample.ts", signal)).toEqual([
        {
          severity: "Error",
          message: "Unknown variable",
          line: 3,
          column: 4,
          code: 2304,
          source: "ts",
        },
      ]);
      await provider.close(signal);
      expect(requests.map((request) => request.method)).toEqual([
        "initialize",
        "notifications/initialized",
        "tools/call",
        "DELETE",
      ]);
      expect(
        requests
          .slice(1)
          .every((request) => request.session === "fixture-session"),
      ).toBe(true);
      expect(requests[2]?.tool).toEqual({
        name: "get_diagnostics_for_file",
        arguments: { relative_path: "sample.ts", min_severity: 2 },
      });
    });

  it("never substitutes failed diagnostics with an empty result", async () => {
    await start(false, true);
    const provider = existingSerenaDiagnostics(root);
    if (!provider) throw new Error("Fixture provider unavailable");
    await expect(
      provider.read("sample.ts", AbortSignal.timeout(2000)),
    ).rejects.toThrow("Diagnostics tool failed");
  });

  it("does not start a missing daemon or select another project's daemon", () => {
    expect(existingSerenaDiagnostics(root)).toBeNull();
    mocks.readRegistry.mockReturnValue({
      other: {
        root: "/another/project",
        context: "oma",
        port: 1234,
        pid: process.pid,
      },
    });
    expect(existingSerenaDiagnostics(root)).toBeNull();
  });

  it("rejects malformed, out-of-scope and truncated diagnostic results", () => {
    expect(parseFileDiagnostics({}, "sample.ts")).toEqual([]);
    for (const value of [
      null,
      "truncated",
      { "other.ts": grouped["sample.ts"] },
      { "sample.ts": { Error: { "<file>": [{ message: "missing range" }] } } },
    ]) {
      expect(() => parseFileDiagnostics(value, "sample.ts")).toThrow();
    }
  });
});
