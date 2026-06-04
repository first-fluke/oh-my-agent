import { describe, expect, it } from "vitest";
import { DEFAULT_VIDEO_CONFIG } from "./config.js";
import { ProviderUnavailableError } from "./errors.js";
import { defaultVideoRegistry, VideoProviderRegistry } from "./registry.js";

describe("VideoProviderRegistry", () => {
  it("resolves providers by capability and configured order", () => {
    const registry = defaultVideoRegistry(DEFAULT_VIDEO_CONFIG);
    const providers = registry.resolve("visual", ["pexels", "oma-image"]);
    expect(providers.map((provider) => provider.id)).toEqual([
      "pexels",
      "oma-image",
    ]);
  });

  it("throws auth-required error when a capability order has no provider", () => {
    const registry = new VideoProviderRegistry();
    expect(() => registry.resolve("visual", ["missing"])).toThrow(
      ProviderUnavailableError,
    );
  });

  it("reports env-gated provider availability", async () => {
    const registry = defaultVideoRegistry(DEFAULT_VIDEO_CONFIG);
    const availability = await registry.availability();
    const pexels = availability.find((entry) => entry.id === "pexels");
    expect(pexels?.availability.ok).toBe(false);
    expect(pexels?.availability.reason).toContain("PEXELS_API_KEY");
  });
});
