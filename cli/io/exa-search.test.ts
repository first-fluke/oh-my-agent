import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SearchProviderRegistry } from "../platform/search-providers.js";
import type { SearchProviderContext } from "../types/search-provider.js";
import { createExaSearchProvider } from "./exa-search.js";

let root: string;
let context: SearchProviderContext;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-exa-"));
  mkdirSync(join(root, ".agents"));
  writeFileSync(join(root, ".agents", "oma-config.yaml"), "language: en\n");
  context = {
    projectDir: root,
    signal: new AbortController().signal,
    resolveCredential: vi.fn(async () => "synthetic-token"),
  };
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

it("sends Exa's search contract and preserves provenance without ranking it as trust", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({
      requestId: "request-123",
      resolvedSearchType: "auto",
      results: [
        {
          url: "https://example.com/article",
          title: "Example",
          publishedDate: "2026-10-26T00:00:00.000Z",
          highlights: ["First excerpt", "Second excerpt"],
          score: 0.89,
          author: "Author",
        },
        { url: "javascript:alert(1)" },
        { url: "https://user:password@example.com/private" },
        { url: "not a URL" },
        { url: "http://example.org", text: "Full text", title: null },
        { url: "https://example.net", highlights: [] },
      ],
    }),
  );
  const registry = new SearchProviderRegistry([
    createExaSearchProvider(fetcher),
  ]);
  const result = await registry.execute(
    "exa",
    { capability: "web", query: "  C++ & Rust  ", limit: 2 },
    context,
  );
  const [url, init] = fetcher.mock.calls[0] ?? [];
  expect(String(url)).toBe("https://api.exa.ai/search");
  expect(init).toMatchObject({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "synthetic-token",
    },
    signal: context.signal,
    redirect: "error",
  });
  expect(JSON.parse(String(init?.body))).toEqual({
    query: "C++ & Rust",
    type: "auto",
    numResults: 2,
    contents: { highlights: true },
  });
  expect(context.resolveCredential).toHaveBeenCalledWith({
    env: "EXA_API_KEY",
    vault: "exa-search",
  });
  expect(result.sources).toEqual([
    {
      url: "https://example.com/article",
      title: "Example",
      excerpt: "First excerpt\nSecond excerpt",
      publishedAt: "2026-10-26T00:00:00.000Z",
    },
    {
      url: "http://example.org",
      title: undefined,
      excerpt: "Full text",
      publishedAt: undefined,
    },
  ]);
  expect(result.sources[0]).not.toHaveProperty("score");
  expect(result.sources[0]).not.toHaveProperty("trust");
  expect(result.extensions).toMatchObject({
    exa: {
      requestId: "request-123",
      resolvedSearchType: "auto",
      results: [{ score: 0.89, author: "Author" }, { text: "Full text" }],
    },
  });
  expect(JSON.stringify(result)).not.toContain("synthetic-token");
});

it("uses configured credential references without a network status probe", async () => {
  writeFileSync(
    join(root, ".agents", "oma-config.yaml"),
    "exa: {api_key_env: CUSTOM_EXA, api_key_vault: custom-exa}\n",
  );
  const fetcher = vi.fn<typeof fetch>();
  const registry = new SearchProviderRegistry([
    createExaSearchProvider(fetcher),
  ]);
  expect(await registry.status("exa", "web", context)).toEqual({
    available: true,
    reachability: "not-probed",
  });
  expect(context.resolveCredential).toHaveBeenCalledWith({
    env: "CUSTOM_EXA",
    vault: "custom-exa",
  });
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([undefined, "\ninvalid", "invalid\r", "invalid\0", " "])(
  "fails without a usable credential (%s) instead of fabricating results",
  async (key) => {
    context.resolveCredential = async () => key;
    const fetcher = vi.fn<typeof fetch>();
    const registry = new SearchProviderRegistry([
      createExaSearchProvider(fetcher),
    ]);
    expect((await registry.status("exa", "web", context)).available).toBe(
      false,
    );
    await expect(
      registry.execute("exa", { capability: "web", query: "test" }, context),
    ).rejects.toThrow("Exa credential unavailable");
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("does not expose credential-store errors", async () => {
  context.resolveCredential = async () => {
    throw new Error("synthetic-private-value");
  };
  const registry = new SearchProviderRegistry([
    createExaSearchProvider(vi.fn<typeof fetch>()),
  ]);
  expect(
    JSON.stringify(await registry.status("exa", "web", context)),
  ).not.toContain("synthetic-private-value");
  await expect(
    registry.execute("exa", { capability: "web", query: "test" }, context),
  ).rejects.toThrow("Exa credential unavailable");
});

it.each([401, 402, 403, 429, 500, 503])(
  "reports HTTP %s without echoing upstream errors",
  async (status) => {
    const registry = new SearchProviderRegistry([
      createExaSearchProvider(
        async () => new Response("synthetic-private-value", { status }),
      ),
    ]);
    await expect(
      registry.execute("exa", { capability: "web", query: "test" }, context),
    ).rejects.toThrow(`Exa search failed (HTTP ${status}).`);
  },
);

it("redacts network errors and preserves abort reasons", async () => {
  const registry = new SearchProviderRegistry([
    createExaSearchProvider(async () => {
      throw new Error("synthetic-private-value");
    }),
  ]);
  await expect(
    registry.execute("exa", { capability: "web", query: "test" }, context),
  ).rejects.toThrow("Exa search request failed.");
  const controller = new AbortController();
  controller.abort(new Error("deadline"));
  context.signal = controller.signal;
  await expect(
    registry.execute("exa", { capability: "web", query: "test" }, context),
  ).rejects.toThrow("deadline");
});

it.each(["", " ", "x".repeat(4001)])(
  "rejects an empty or oversized query before credentials or HTTP",
  async (query) => {
    const fetcher = vi.fn<typeof fetch>();
    const registry = new SearchProviderRegistry([
      createExaSearchProvider(fetcher),
    ]);
    await expect(
      registry.execute("exa", { capability: "web", query }, context),
    ).rejects.toThrow("Exa queries require");
    expect(context.resolveCredential).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each([0, 101, 1.5, NaN])(
  "rejects invalid result limit %s",
  async (limit) => {
    const fetcher = vi.fn<typeof fetch>();
    const registry = new SearchProviderRegistry([
      createExaSearchProvider(fetcher),
    ]);
    await expect(
      registry.execute(
        "exa",
        { capability: "web", query: "test", limit },
        context,
      ),
    ).rejects.toThrow("Exa result limit");
    expect(context.resolveCredential).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("accepts empty results and nullable optional metadata but rejects malformed payloads", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ results: [] }))
    .mockResolvedValueOnce(
      Response.json({
        results: [
          {
            url: "https://example.com",
            title: null,
            publishedDate: null,
            highlights: null,
            text: null,
          },
        ],
      }),
    )
    .mockResolvedValueOnce(Response.json({ results: "invalid" }))
    .mockResolvedValueOnce(
      Response.json({
        results: [{ url: "https://example.com", highlights: 4 }],
      }),
    )
    .mockResolvedValueOnce(new Response("not-json"));
  const registry = new SearchProviderRegistry([
    createExaSearchProvider(fetcher),
  ]);
  const search = () =>
    registry.execute("exa", { capability: "web", query: "test" }, context);
  expect((await search()).sources).toEqual([]);
  expect((await search()).sources).toEqual([
    {
      url: "https://example.com",
      title: undefined,
      excerpt: undefined,
      publishedAt: undefined,
    },
  ]);
  await expect(search()).rejects.toThrow("invalid search response");
  await expect(search()).rejects.toThrow("invalid search response");
  await expect(search()).rejects.toThrow("invalid JSON");
});

it("bounds response bytes with or without a content-length header", async () => {
  const oversized = "x".repeat(2 * 1024 * 1024 + 1);
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response("{}", {
        headers: { "content-length": String(oversized.length) },
      }),
    )
    .mockResolvedValueOnce(new Response(oversized));
  const registry = new SearchProviderRegistry([
    createExaSearchProvider(fetcher),
  ]);
  const search = () =>
    registry.execute("exa", { capability: "web", query: "test" }, context);
  await expect(search()).rejects.toThrow("2 MiB limit");
  await expect(search()).rejects.toThrow("2 MiB limit");
});

it("honors cancellation during credential resolution before requesting", async () => {
  context.resolveCredential = () => new Promise(() => {});
  const controller = new AbortController();
  context.signal = controller.signal;
  const fetcher = vi.fn<typeof fetch>();
  const registry = new SearchProviderRegistry([
    createExaSearchProvider(fetcher),
  ]);
  const search = registry.execute(
    "exa",
    { capability: "web", query: "test" },
    context,
  );
  controller.abort(new Error("deadline"));
  await expect(search).rejects.toThrow("deadline");
  expect(fetcher).not.toHaveBeenCalled();
});

it("cancels a stalled response body when the caller aborts", async () => {
  const cancel = vi.fn();
  const stream = new ReadableStream<Uint8Array>({ cancel });
  const fetcher = vi.fn<typeof fetch>(async () => new Response(stream));
  const controller = new AbortController();
  context.signal = controller.signal;
  const registry = new SearchProviderRegistry([
    createExaSearchProvider(fetcher),
  ]);
  const search = registry.execute(
    "exa",
    { capability: "web", query: "test" },
    context,
  );
  await vi.waitFor(() => expect(stream.locked).toBe(true));
  controller.abort(new Error("deadline"));
  await expect(search).rejects.toThrow("deadline");
  expect(cancel).toHaveBeenCalledOnce();
});
