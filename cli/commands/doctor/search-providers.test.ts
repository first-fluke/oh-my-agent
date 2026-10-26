import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { collectProviderCheck } from "./providers.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-doctor-search-"));
  mkdirSync(join(root, ".agents"));
  writeFileSync(join(root, ".agents", "oma-config.yaml"), "language: en\n");
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("reports native search as runtime-managed without a network probe", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  const report = await collectProviderCheck(root, {
    provider: "agentmemory",
    reachable: false,
  });
  expect(report.web).toEqual({
    provider: "native",
    capability: "web",
    status: "runtime-managed",
    reachability: "not-probed",
  });
  expect(report.issues).toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
});

it.each([
  ["brave", "BRAVE_SEARCH_API_KEY"],
  ["exa", "EXA_API_KEY"],
])(
  "checks %s credential presence without a search request",
  async (provider, env) => {
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      `providers: {web: ${provider}}\n`,
    );
    vi.stubEnv(env, "synthetic-doctor-key");
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network request"));
    const report = await collectProviderCheck(root, {
      provider: "agentmemory",
      reachable: false,
    });
    expect(report.web).toMatchObject({
      provider,
      status: "adapter-registered",
      credentialConfigured: true,
      reachability: "not-probed",
    });
    expect(report.issues).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  },
);

it.each([
  ["you", "unregistered"],
  ["context7", "unsupported"],
])("reports %s as %s for web search", async (provider, status) => {
  writeFileSync(
    join(root, ".agents", "oma-config.yaml"),
    `providers:\n  web: ${provider}\n`,
  );
  const report = await collectProviderCheck(root, {
    provider: "agentmemory",
    reachable: false,
  });
  expect(report.web).toMatchObject({ provider, status });
  expect(report.issues).toContain(
    `Web search provider ${provider}: ${status}; no automatic provider switch`,
  );
});
