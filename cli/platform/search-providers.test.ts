import { describe, expect, it, vi } from "vitest";
import type {
  SearchProviderContext,
  SearchProviderDefinition,
} from "../types/search-provider.js";
import {
  createSearchProviderRegistry,
  SearchProviderRegistry,
} from "./search-providers.js";

function fixture(): SearchProviderDefinition {
  return {
    id: "fixture",
    label: "Fixture search",
    capabilities: ["web", "contents"],
    transport: "api",
    authentication: { mode: "required", env: "FIXTURE_API_KEY" },
    adapter: {
      status: vi.fn(async () => ({
        available: true,
        reachability: "not-probed" as const,
      })),
      execute: vi.fn(async (request) => ({
        provider: "fixture",
        capability: request.capability,
        sources: [{ url: "https://example.com", title: "Example" }],
        extensions: { vendorScore: 0.75 },
      })),
    },
  };
}
function context(signal = new AbortController().signal): SearchProviderContext {
  return {
    projectDir: "/project",
    signal,
    resolveCredential: vi.fn(async () => undefined),
  };
}

describe("search provider registry", () => {
  it("keeps runtime-native web search and Context7 docs separate without claiming reachability", () => {
    const registry = createSearchProviderRegistry();
    expect(registry.list("web").map((p) => p.id)).toEqual([
      "native",
      "brave",
      "exa",
    ]);
    expect(registry.list("docs").map((p) => p.id)).toEqual(["context7"]);
    expect(registry.inspect("native", "web")).toEqual({
      provider: "native",
      capability: "web",
      status: "runtime-managed",
      reachability: "not-probed",
    });
    expect(registry.inspect("context7", "web").status).toBe("unsupported");
    expect(registry.inspect("exa", "web")).toMatchObject({
      status: "adapter-registered",
      reachability: "not-probed",
    });
    expect(registry.inspect("you", "web").status).toBe("unregistered");
  });

  it("registers an adapter and dispatches only supported requests with their context and provenance", async () => {
    const registry = createSearchProviderRegistry();
    const provider = fixture();
    registry.register(provider);
    const ctx = context();
    const request = {
      capability: "web" as const,
      query: "typed interfaces",
      limit: 5,
    };
    const result = await registry.execute("fixture", request, ctx);
    expect(provider.adapter?.execute).toHaveBeenCalledWith(request, ctx);
    expect(result.sources).toHaveLength(1);
    expect(result.extensions).toEqual({ vendorScore: 0.75 });
    expect(ctx.resolveCredential).not.toHaveBeenCalled();
    expect(provider.adapter?.status).not.toHaveBeenCalled();
    expect(registry.inspect("fixture", "web").status).toBe(
      "adapter-registered",
    );
  });

  it("fails explicitly for missing providers, capabilities and adapters without fallback", async () => {
    const registry = createSearchProviderRegistry();
    const provider = fixture();
    registry.register(provider);
    await expect(
      registry.execute("you", { capability: "web", query: "test" }, context()),
    ).rejects.toThrow("unregistered");
    await expect(
      registry.execute(
        "fixture",
        { capability: "research", query: "test" },
        context(),
      ),
    ).rejects.toThrow("unsupported");
    await expect(
      registry.execute(
        "native",
        { capability: "web", query: "test" },
        context(),
      ),
    ).rejects.toThrow("no CLI adapter");
    expect(provider.adapter?.execute).not.toHaveBeenCalled();
    registry.register({ ...fixture(), id: "pending", adapter: undefined });
    expect(registry.inspect("pending", "web").status).toBe("adapter-missing");
  });

  it("rejects duplicate IDs and invalid registrations without replacing an adapter", () => {
    const registry = new SearchProviderRegistry([fixture()]);
    expect(() => registry.register(fixture())).toThrow("already registered");
    expect(() => registry.register({ ...fixture(), id: "../plugin" })).toThrow(
      "Invalid search provider ID",
    );
    expect(() =>
      registry.register({ ...fixture(), id: "empty", capabilities: [] }),
    ).toThrow("Invalid search capabilities");
    expect(registry.list()).toHaveLength(1);
  });

  it("snapshots metadata and keeps registrations isolated between instances", () => {
    const provider = fixture();
    const registry = new SearchProviderRegistry([provider]);
    provider.capabilities = ["research"];
    provider.authentication.env = "CHANGED";
    expect(registry.resolve("fixture", "web").authentication.env).toBe(
      "FIXTURE_API_KEY",
    );
    expect(new SearchProviderRegistry().list()).toEqual([]);
  });

  it("does not call an adapter when already cancelled", async () => {
    const provider = fixture();
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    await expect(
      new SearchProviderRegistry([provider]).execute(
        "fixture",
        { capability: "web", query: "test" },
        context(controller.signal),
      ),
    ).rejects.toThrow("cancelled");
    expect(provider.adapter?.execute).not.toHaveBeenCalled();
  });

  it("bounds a stalled adapter and cleans up cancellation listeners", async () => {
    const provider = fixture();
    if (!provider.adapter) throw new Error("missing fixture");
    provider.adapter.execute = vi.fn(() => new Promise<never>(() => {}));
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const result = new SearchProviderRegistry([provider]).execute(
      "fixture",
      { capability: "web", query: "test" },
      context(controller.signal),
    );
    controller.abort(new Error("deadline"));
    await expect(result).rejects.toThrow("deadline");
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("rejects results attributed to a different provider", async () => {
    const provider = fixture();
    if (!provider.adapter) throw new Error("missing fixture");
    provider.adapter.execute = async () => ({
      provider: "other",
      capability: "web",
      sources: [],
    });
    await expect(
      new SearchProviderRegistry([provider]).execute(
        "fixture",
        { capability: "web", query: "test" },
        context(),
      ),
    ).rejects.toThrow("mismatched provenance");
  });
});
