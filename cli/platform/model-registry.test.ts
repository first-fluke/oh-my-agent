import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// model-registry.test.ts
// Tests for CORE_REGISTRY, getModelSpec, hasModelSpec, and api_only guard.
// ---------------------------------------------------------------------------

describe("CORE_REGISTRY", () => {
  const EXPECTED_SLUGS = [
    "anthropic/claude-opus-4-7",
    "anthropic/claude-sonnet-4-6",
    "anthropic/claude-haiku-4-5",
    "openai/gpt-5.4",
    "openai/gpt-5.4-pro",
    "openai/gpt-5.4-mini",
    "openai/gpt-5.3-codex",
    "google/gemini-3.1-pro-preview",
    "google/gemini-3-flash",
    "google/gemini-3.1-flash-lite",
    "qwen/qwen3-coder-plus",
    "qwen/qwen3-coder-next",
  ] as const;

  it("contains exactly 12 slugs (Anthropic 3, OpenAI 4, Google 3, Qwen 2)", async () => {
    const { CORE_REGISTRY } = await import("./model-registry.js");
    expect(CORE_REGISTRY.size).toBe(12);
  });

  it.each(EXPECTED_SLUGS)("includes slug: %s", async (slug) => {
    const { CORE_REGISTRY } = await import("./model-registry.js");
    expect(CORE_REGISTRY.has(slug)).toBe(true);
  });

  it("does not contain api_only slug openai/gpt-5.4-nano", async () => {
    const { CORE_REGISTRY } = await import("./model-registry.js");
    expect(CORE_REGISTRY.has("openai/gpt-5.4-nano")).toBe(false);
  });

  it("does not contain any moonshotai/* slug", async () => {
    const { CORE_REGISTRY } = await import("./model-registry.js");
    for (const slug of CORE_REGISTRY.keys()) {
      expect(slug.startsWith("moonshotai/")).toBe(false);
    }
  });

  it("does not contain any antigravity cli entries", async () => {
    const { CORE_REGISTRY } = await import("./model-registry.js");
    for (const spec of CORE_REGISTRY.values()) {
      expect(spec.cli).not.toBe("antigravity");
    }
  });

  it("all entries have api_only: false", async () => {
    const { CORE_REGISTRY } = await import("./model-registry.js");
    for (const [slug, spec] of CORE_REGISTRY) {
      expect(spec.supports.api_only, `${slug} must not be api_only`).toBe(
        false,
      );
    }
  });
});

describe("getModelSpec", () => {
  it("returns a valid ModelSpec for anthropic/claude-opus-4-7", async () => {
    const { getModelSpec } = await import("./model-registry.js");
    const spec = getModelSpec("anthropic/claude-opus-4-7");
    expect(spec).toBeDefined();
    expect(spec?.cli).toBe("claude");
    expect(spec?.cli_model).toBe("claude-opus-4-7");
    expect(spec?.supports.effort).toMatchObject({
      type: "cli-session",
      auto_default: "xhigh",
    });
    expect(spec?.supports.prompt_cache).toBe(true);
    expect(spec?.supports.api_only).toBe(false);
  });

  it("returns undefined for an unknown slug (does not throw)", async () => {
    const { getModelSpec } = await import("./model-registry.js");
    const result = getModelSpec("unknown/does-not-exist");
    expect(result).toBeUndefined();
  });

  it("returns undefined for api_only slug openai/gpt-5.4-nano", async () => {
    const { getModelSpec } = await import("./model-registry.js");
    const result = getModelSpec("openai/gpt-5.4-nano");
    expect(result).toBeUndefined();
  });
});

describe("hasModelSpec", () => {
  it("returns true for a registered slug", async () => {
    const { hasModelSpec } = await import("./model-registry.js");
    expect(hasModelSpec("openai/gpt-5.3-codex")).toBe(true);
  });

  it("returns false for an unknown slug", async () => {
    const { hasModelSpec } = await import("./model-registry.js");
    expect(hasModelSpec("unknown/model")).toBe(false);
  });

  it("returns false for the excluded api_only slug", async () => {
    const { hasModelSpec } = await import("./model-registry.js");
    expect(hasModelSpec("openai/gpt-5.4-nano")).toBe(false);
  });
});

describe("api_only initialization guard", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits a console.warn for each api_only entry during module initialization", async () => {
    await import("./model-registry.js");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("openai/gpt-5.4-nano"),
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("api_only=true"),
    );
  });

  it("excludes api_only entries from the exported map after initialization", async () => {
    const { CORE_REGISTRY } = await import("./model-registry.js");
    for (const [, spec] of CORE_REGISTRY) {
      expect(spec.supports.api_only).toBe(false);
    }
  });
});

describe("ModelSpec shape validation", () => {
  it("Anthropic slugs use cli-session effort type", async () => {
    const { getModelSpec } = await import("./model-registry.js");
    const slugs = [
      "anthropic/claude-opus-4-7",
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-haiku-4-5",
    ];
    for (const slug of slugs) {
      const spec = getModelSpec(slug);
      expect(spec?.supports.effort).toMatchObject({ type: "cli-session" });
    }
  });

  it("OpenAI Codex slugs use granular effort type with all 5 levels", async () => {
    const { getModelSpec } = await import("./model-registry.js");
    const slugs = [
      "openai/gpt-5.4",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.3-codex",
    ];
    for (const slug of slugs) {
      const spec = getModelSpec(slug);
      expect(spec?.supports.effort).toMatchObject({
        type: "granular",
        levels: ["none", "low", "medium", "high", "xhigh"],
      });
      expect(spec?.supports.apply_patch).toBe(true);
    }
  });

  it("Google Gemini slugs use thinking-budget effort type", async () => {
    const { getModelSpec } = await import("./model-registry.js");
    const slugs = [
      "google/gemini-3.1-pro-preview",
      "google/gemini-3-flash",
      "google/gemini-3.1-flash-lite",
    ];
    for (const slug of slugs) {
      const spec = getModelSpec(slug);
      expect(spec?.supports.effort).toMatchObject({ type: "thinking-budget" });
    }
  });

  it("Qwen slugs use binary-thinking effort type", async () => {
    const { getModelSpec } = await import("./model-registry.js");
    const slugs = ["qwen/qwen3-coder-plus", "qwen/qwen3-coder-next"];
    for (const slug of slugs) {
      const spec = getModelSpec(slug);
      expect(spec?.supports.effort).toMatchObject({ type: "binary-thinking" });
      expect(spec?.supports.native_dispatch_from).toHaveLength(0);
    }
  });

  it("gpt-5.4 has computer_use: true", async () => {
    const { getModelSpec } = await import("./model-registry.js");
    const spec = getModelSpec("openai/gpt-5.4");
    expect(spec?.supports.computer_use).toBe(true);
  });

  it("all entries have a non-empty auth_hint", async () => {
    const { CORE_REGISTRY } = await import("./model-registry.js");
    for (const [slug, spec] of CORE_REGISTRY) {
      expect(spec.auth_hint, `${slug} must have auth_hint`).toBeTruthy();
    }
  });
});
