import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  freeApiKey,
  probeFreeProvider,
  resolveFreeProvider,
} from "./free-provider.js";

describe("FreeLLMAPI readiness", () => {
  let server: Server | undefined;
  afterEach(async () => {
    vi.unstubAllGlobals();
    const activeServer = server;
    if (activeServer)
      await new Promise<void>((resolve) => activeServer.close(() => resolve()));
    server = undefined;
  });

  it("uses the unified bearer key at /v1/models without issuing inference", async () => {
    const requests: Array<{ path?: string; auth?: string }> = [];
    server = createServer((req, res) => {
      requests.push({ path: req.url, auth: req.headers.authorization });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "auto" }] }));
    });
    const activeServer = server;
    await new Promise<void>((resolve) =>
      activeServer.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as AddressInfo).port;
    await probeFreeProvider(
      resolveFreeProvider(
        { free: { base_url: `http://127.0.0.1:${port}` } },
        {},
      ),
      { FREELLM_API_KEY: "test-key" },
    );
    expect(requests).toEqual([{ path: "/v1/models", auth: "Bearer test-key" }]);
  });

  it.each([401, 429, 503])(
    "reports HTTP %i without echoing server response bodies",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () => new Response("sensitive upstream diagnostic", { status }),
        ),
      );
      await expect(
        probeFreeProvider(resolveFreeProvider({}, {}), {
          FREELLM_API_KEY: "test-key",
        }),
      ).rejects.toThrow(`HTTP ${status}`);
    },
  );

  it("reports connection errors without echoing credentials from fetch errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("request contained secret-key");
      }),
    );
    await expect(
      probeFreeProvider(resolveFreeProvider({}, {}), {
        FREELLM_API_KEY: "secret-key",
      }),
    ).rejects.toThrow("Cannot reach FreeLLMAPI");
  });

  it("does not send a request when the configured key is absent", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      probeFreeProvider(resolveFreeProvider({}, {}), {}),
    ).rejects.toThrow("requires FREELLM_API_KEY");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("aborts the readiness request when the whole execution is cancelled", async () => {
    const controller = new AbortController();
    let requestedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, options: RequestInit) =>
          new Promise((_, reject) => {
            requestedSignal = options.signal ?? undefined;
            requestedSignal?.addEventListener(
              "abort",
              () => reject(requestedSignal?.reason),
              { once: true },
            );
          }),
      ),
    );
    const pending = probeFreeProvider(
      resolveFreeProvider({}, {}),
      { FREELLM_API_KEY: "test-key" },
      controller.signal,
    );
    controller.abort(new Error("cancelled"));
    await expect(pending).rejects.toThrow("Cannot reach FreeLLMAPI");
    expect(requestedSignal?.aborted).toBe(true);
  });

  it("rejects literal api keys and invalid environment names", () => {
    expect(() =>
      resolveFreeProvider({ free: { api_key: "secret" } } as never, {}),
    ).toThrow("Unknown free setting");
    expect(() =>
      resolveFreeProvider({ free: { api_key_env: "bad key" } }, {}),
    ).toThrow("environment variable name");
    expect(() =>
      freeApiKey(resolveFreeProvider({}, {}), { FREELLM_API_KEY: "abc\ndef" }),
    ).toThrow("invalid characters");
  });
});
