import { describe, expect, it } from "vitest";
import type { ImageConfig } from "./config.js";
import { defaultRegistry, Registry, resetRegistry } from "./registry.js";
import type {
  GenerateInput,
  GenerateResult,
  HealthResult,
  VendorProvider,
} from "./types.js";

class FakeProvider implements VendorProvider {
  constructor(
    public readonly name: string,
    private healthResult: HealthResult,
  ) {}
  async health(): Promise<HealthResult> {
    return this.healthResult;
  }
  async generate(_: GenerateInput): Promise<GenerateResult[]> {
    return [];
  }
}

describe("Registry", () => {
  it("registers and lists providers in insertion order", () => {
    const r = new Registry();
    r.register(
      new FakeProvider("a", { ok: true, supportedModels: ["m1"] }),
    ).register(
      new FakeProvider("b", { ok: false, reason: "other", hint: "x" }),
    );
    expect(r.list().map((p) => p.name)).toEqual(["a", "b"]);
  });

  it("runs health checks in parallel and preserves order", async () => {
    const r = new Registry();
    r.register(
      new FakeProvider("ok1", { ok: true, supportedModels: [] }),
    ).register(
      new FakeProvider("bad", {
        ok: false,
        reason: "not-authenticated",
        hint: "login",
      }),
    );
    const results = await r.listHealthy();
    expect(results.map((x) => x.provider.name)).toEqual(["ok1", "bad"]);
    expect(results[0]?.health.ok).toBe(true);
    expect(results[1]?.health.ok).toBe(false);
  });

  it("captures thrown health errors as unhealthy", async () => {
    class BrokenProvider implements VendorProvider {
      readonly name = "broken";
      async health(): Promise<HealthResult> {
        throw new Error("boom");
      }
      async generate(): Promise<GenerateResult[]> {
        return [];
      }
    }
    const r = new Registry();
    r.register(new BrokenProvider());
    const results = await r.listHealthy();
    const h = results[0]?.health;
    expect(h?.ok).toBe(false);
    if (h && !h.ok) {
      expect(h.hint).toBe("boom");
    }
  });
});

describe("defaultRegistry", () => {
  function makeConfig(overrides: Partial<ImageConfig["vendors"]>): ImageConfig {
    return {
      defaultOutputDir: "x",
      defaultVendor: "auto",
      defaultSize: "1024x1024",
      defaultQuality: "auto",
      defaultCount: 1,
      defaultTimeoutSec: 180,
      vendors: {
        codex: { enabled: true, model: "gpt-image-2" },
        gemini: { enabled: true, model: "gemini-2.5-flash-image" },
        pollinations: { enabled: true, model: "flux" },
        ...overrides,
      },
      costGuardrail: { estimateThresholdUsd: 0.2, perImageUsd: {} },
      compare: { folderPattern: "x", manifest: true },
      naming: { singleFolderPattern: "x" },
      language: "en",
    };
  }

  it("skips providers whose vendors[<name>].enabled is false", () => {
    resetRegistry();
    const registry = defaultRegistry(
      makeConfig({
        gemini: { enabled: false, model: "gemini-2.5-flash-image" },
      }),
    );
    const names = registry.list().map((p) => p.name);
    expect(names).toContain("codex");
    expect(names).toContain("pollinations");
    expect(names).not.toContain("gemini");
    resetRegistry();
  });

  it("includes all providers when all are enabled", () => {
    resetRegistry();
    const registry = defaultRegistry(makeConfig({}));
    const names = registry.list().map((p) => p.name);
    expect(names).toEqual(
      expect.arrayContaining(["codex", "gemini", "pollinations"]),
    );
    resetRegistry();
  });
});
