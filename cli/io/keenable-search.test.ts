import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SearchProviderRegistry } from "../platform/search-providers.js";
import type { SearchProviderContext } from "../types/search-provider.js";
import { createKeenableSearchProvider } from "./keenable-search.js";

let root: string;
let context: SearchProviderContext;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-keenable-"));
  mkdirSync(join(root, ".agents"));
  writeFileSync(join(root, ".agents", "oma-config.yaml"), "language: en\n");
  context = {
    projectDir: root,
    signal: new AbortController().signal,
    resolveCredential: vi.fn(async () => undefined),
  };
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

it("uses the keyless public endpoint and prefers descriptions over snippets", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({
      results: [
        {
          url: "https://example.com",
          title: "A",
          description: "Short",
          snippet: "Long",
        },
        { url: "https://example.org", title: "B", snippet: "x".repeat(2000) },
        { title: "No URL", description: "dropped" },
        { url: "javascript:alert(1)", title: "Invalid" },
      ],
    }),
  );
  const registry = new SearchProviderRegistry([
    createKeenableSearchProvider(fetcher),
  ]);
  const result = await registry.execute(
    "keenable",
    { capability: "web", query: "rust", limit: 3 },
    context,
  );
  const [url, init] = fetcher.mock.calls[0] ?? [];
  expect(String(url)).toBe("https://api.keenable.ai/v1/search/public");
  expect(init?.headers).toMatchObject({ "X-Keenable-Title": "oh-my-agent" });
  expect(init?.headers).not.toHaveProperty("X-API-Key");
  expect(JSON.parse(String(init?.body))).toEqual({
    query: "rust",
    max_results: 3,
  });
  expect(result.sources).toHaveLength(2);
  expect(result.sources[0]?.excerpt).toBe("Short");
  expect(result.sources[1]?.excerpt).toHaveLength(1000);
});

it("uses the keyed endpoint when a credential is available", async () => {
  context.resolveCredential = vi.fn(async () => "synthetic-token");
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ results: [] }),
  );
  const registry = new SearchProviderRegistry([
    createKeenableSearchProvider(fetcher),
  ]);
  await registry.execute(
    "keenable",
    { capability: "web", query: "rust" },
    context,
  );
  const [url, init] = fetcher.mock.calls[0] ?? [];
  expect(String(url)).toBe("https://api.keenable.ai/v1/search");
  expect(init?.headers).toMatchObject({ "X-API-Key": "synthetic-token" });
  expect(context.resolveCredential).toHaveBeenCalledWith({
    env: "KEENABLE_API_KEY",
    vault: "keenable-search",
  });
});
