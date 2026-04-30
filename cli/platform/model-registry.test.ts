import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// model-registry.test.ts
// Tests for CORE_REGISTRY, getModelSpec, hasModelSpec, api_only guard,
// and T14: user models.yaml merge / override / validation.
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

// ---------------------------------------------------------------------------
// T14: User models.yaml — loadUserModels + reloadRegistry
// ---------------------------------------------------------------------------

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Write a temporary models.yaml under a temp dir and return the dir path. */
function makeTempProjectDir(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oma-model-registry-"));
  const configDir = path.join(dir, ".agents", "config");
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, "models.yaml"), content, "utf-8");
  return dir;
}

const VALID_SPUD_YAML = `
models:
  "openai/gpt-5.5-spud":
    cli: "codex"
    cli_model: "gpt-5.5-spud"
    supports:
      effort:
        type: "granular"
        levels: ["none", "low", "medium", "high", "xhigh"]
      apply_patch: true
      task_budget: false
      prompt_cache: false
      computer_use: true
      native_dispatch_from: ["codex"]
      api_only: false
    auth_hint: "ChatGPT Plus/Pro subscription"
`;

const OVERRIDE_OPUS_YAML = `
models:
  "anthropic/claude-opus-4-7":
    cli: "claude"
    cli_model: "claude-opus-4-7-OVERRIDDEN"
    supports:
      effort:
        type: "cli-session"
        auto_default: "xhigh"
      apply_patch: false
      task_budget: true
      prompt_cache: true
      computer_use: false
      native_dispatch_from: ["claude"]
      api_only: false
    auth_hint: "User override test"
`;

const API_ONLY_YAML = `
models:
  "openai/user-api-only-model":
    cli: "codex"
    cli_model: "user-api-only-model"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: []
      api_only: true
    auth_hint: "API only model"
`;

const INVALID_SCHEMA_YAML = `
models:
  "openai/bad-entry":
    cli: "INVALID_CLI"
    cli_model: ""
    supports:
      effort: null
      apply_patch: "not-a-boolean"
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: []
      api_only: false
    auth_hint: ""
  "openai/gpt-5.5-spud":
    cli: "codex"
    cli_model: "gpt-5.5-spud"
    supports:
      effort:
        type: "granular"
        levels: ["none", "low", "medium", "high", "xhigh"]
      apply_patch: true
      task_budget: false
      prompt_cache: false
      computer_use: true
      native_dispatch_from: ["codex"]
      api_only: false
    auth_hint: "ChatGPT Plus/Pro subscription"
`;

const MALFORMED_YAML = `
models: {unclosed bracket
`;

describe("T14: loadUserModels", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty Map when models.yaml does not exist (no crash)", async () => {
    const { loadUserModels } = await import("./model-registry.js");
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "oma-no-config-"));
    try {
      const result = loadUserModels(emptyDir);
      expect(result.size).toBe(0);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it("loads a valid user-only slug from models.yaml", async () => {
    const { loadUserModels } = await import("./model-registry.js");
    const dir = makeTempProjectDir(VALID_SPUD_YAML);
    try {
      const result = loadUserModels(dir);
      expect(result.has("openai/gpt-5.5-spud")).toBe(true);
      const spec = result.get("openai/gpt-5.5-spud");
      expect(spec?.cli_model).toBe("gpt-5.5-spud");
      expect(spec?.supports.computer_use).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loads an override entry for an existing core slug", async () => {
    const { loadUserModels } = await import("./model-registry.js");
    const dir = makeTempProjectDir(OVERRIDE_OPUS_YAML);
    try {
      const result = loadUserModels(dir);
      expect(result.has("anthropic/claude-opus-4-7")).toBe(true);
      expect(result.get("anthropic/claude-opus-4-7")?.cli_model).toBe(
        "claude-opus-4-7-OVERRIDDEN",
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects user entry with api_only: true — warns and excludes", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { loadUserModels } = await import("./model-registry.js");
    const dir = makeTempProjectDir(API_ONLY_YAML);
    try {
      const result = loadUserModels(dir);
      expect(result.has("openai/user-api-only-model")).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("openai/user-api-only-model"),
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("api_only=true"),
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("skips invalid Zod entry with error log; valid sibling entry still loads", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { loadUserModels } = await import("./model-registry.js");
    const dir = makeTempProjectDir(INVALID_SCHEMA_YAML);
    try {
      const result = loadUserModels(dir);
      expect(result.has("openai/bad-entry")).toBe(false);
      expect(result.has("openai/gpt-5.5-spud")).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("openai/bad-entry"),
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("handles malformed YAML gracefully — logs error, returns empty Map", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { loadUserModels } = await import("./model-registry.js");
    const dir = makeTempProjectDir(MALFORMED_YAML);
    try {
      const result = loadUserModels(dir);
      expect(result.size).toBe(0);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("models.yaml"),
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("T14: reloadRegistry — merged registry behavior", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("user-only slug add: getModelSpec returns spec after reloadRegistry", async () => {
    const { reloadRegistry, getModelSpec } = await import(
      "./model-registry.js"
    );
    const dir = makeTempProjectDir(VALID_SPUD_YAML);
    try {
      reloadRegistry(dir);
      const spec = getModelSpec("openai/gpt-5.5-spud");
      expect(spec).toBeDefined();
      expect(spec?.cli_model).toBe("gpt-5.5-spud");
      expect(spec?.auth_hint).toBe("ChatGPT Plus/Pro subscription");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      reloadRegistry(os.tmpdir());
    }
  });

  it("core override: user entry wins for the same slug", async () => {
    const { reloadRegistry, getModelSpec } = await import(
      "./model-registry.js"
    );
    const dir = makeTempProjectDir(OVERRIDE_OPUS_YAML);
    try {
      reloadRegistry(dir);
      const spec = getModelSpec("anthropic/claude-opus-4-7");
      expect(spec?.cli_model).toBe("claude-opus-4-7-OVERRIDDEN");
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'User override for slug "anthropic/claude-opus-4-7"',
        ),
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      reloadRegistry(os.tmpdir());
    }
  });

  it("api_only user entry: rejected — does not appear in merged registry", async () => {
    const { reloadRegistry, hasModelSpec } = await import(
      "./model-registry.js"
    );
    const dir = makeTempProjectDir(API_ONLY_YAML);
    try {
      reloadRegistry(dir);
      expect(hasModelSpec("openai/user-api-only-model")).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      reloadRegistry(os.tmpdir());
    }
  });

  it("missing models.yaml: core registry still fully accessible after reload", async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "oma-no-models-"));
    const { reloadRegistry, getModelSpec, CORE_REGISTRY } = await import(
      "./model-registry.js"
    );
    try {
      const merged = reloadRegistry(emptyDir);
      expect(merged.size).toBe(12);
      expect(getModelSpec("anthropic/claude-opus-4-7")).toBeDefined();
      expect(CORE_REGISTRY.has("openai/gpt-5.4")).toBe(true);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
      reloadRegistry(os.tmpdir());
    }
  });

  it("malformed YAML: core registry unaffected after reload", async () => {
    const { reloadRegistry, getModelSpec } = await import(
      "./model-registry.js"
    );
    const dir = makeTempProjectDir(MALFORMED_YAML);
    try {
      const merged = reloadRegistry(dir);
      expect(merged.size).toBe(12);
      expect(getModelSpec("openai/gpt-5.4")).toBeDefined();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      reloadRegistry(os.tmpdir());
    }
  });

  it("invalid Zod entry skipped; valid sibling still in merged registry", async () => {
    const { reloadRegistry, getModelSpec, hasModelSpec } = await import(
      "./model-registry.js"
    );
    const dir = makeTempProjectDir(INVALID_SCHEMA_YAML);
    try {
      reloadRegistry(dir);
      expect(hasModelSpec("openai/bad-entry")).toBe(false);
      expect(getModelSpec("openai/gpt-5.5-spud")).toBeDefined();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      reloadRegistry(os.tmpdir());
    }
  });
});

describe("buildUnknownSlugError", () => {
  it("scaffolds a models: block for a known-vendor OpenRouter slug", async () => {
    const { buildUnknownSlugError } = await import("./model-registry.js");
    const msg = buildUnknownSlugError("anthropic/claude-3-7-sonnet", "backend");
    expect(msg).toContain('Unknown model slug "anthropic/claude-3-7-sonnet"');
    expect(msg).toContain('for agent "backend"');
    expect(msg).toContain("anthropic (CLI: claude)");
    expect(msg).toMatch(/models:\n\s+anthropic\/claude-3-7-sonnet:/);
    expect(msg).toContain("cli: claude");
    expect(msg).toContain("cli_model: claude-3-7-sonnet");
    expect(msg).toContain("native_dispatch_from: [claude]");
    expect(msg).toContain("Built-in anthropic slugs");
    expect(msg).toContain("https://openrouter.ai/models");
  });

  it("scaffolds for openai/codex pairing", async () => {
    const { buildUnknownSlugError } = await import("./model-registry.js");
    const msg = buildUnknownSlugError("openai/gpt-99-future");
    expect(msg).toContain("openai (CLI: codex)");
    expect(msg).toContain("cli_model: gpt-99-future");
  });

  it("scaffolds for google/gemini pairing", async () => {
    const { buildUnknownSlugError } = await import("./model-registry.js");
    const msg = buildUnknownSlugError("google/gemini-99-flash");
    expect(msg).toContain("google (CLI: gemini)");
  });

  it("scaffolds for qwen pairing", async () => {
    const { buildUnknownSlugError } = await import("./model-registry.js");
    const msg = buildUnknownSlugError("qwen/qwen99-plus");
    expect(msg).toContain("qwen (CLI: qwen)");
  });

  it("falls back to manual-cli guidance for unknown owner", async () => {
    const { buildUnknownSlugError } = await import("./model-registry.js");
    const msg = buildUnknownSlugError("mistral/large-99");
    expect(msg).toContain('Owner "mistral" is not bundled');
    expect(msg).toContain("anthropic (claude)");
    expect(msg).toContain("openai (codex)");
    expect(msg).toContain("cli: <your-cli-binary>");
    expect(msg).toContain("cli_model: large-99");
    expect(msg).not.toContain("openrouter.ai/models"); // no scaffold for unsupported owner
  });

  it("omits the agent context when agentId is not provided", async () => {
    const { buildUnknownSlugError } = await import("./model-registry.js");
    const msg = buildUnknownSlugError("anthropic/claude-3-7-sonnet");
    expect(msg).not.toContain("for agent");
  });

  it("handles malformed slug (no slash) gracefully", async () => {
    const { buildUnknownSlugError } = await import("./model-registry.js");
    const msg = buildUnknownSlugError("just-a-name");
    expect(msg).toContain('Unknown model slug "just-a-name"');
    // No vendor → falls into the "manual" branch
    expect(msg).toContain("not bundled with a forkable CLI");
  });
});

describe("listBuiltInSlugsByOwner", () => {
  it("returns sorted slugs for anthropic", async () => {
    const { listBuiltInSlugsByOwner } = await import("./model-registry.js");
    const slugs = listBuiltInSlugsByOwner("anthropic");
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs.every((s) => s.startsWith("anthropic/"))).toBe(true);
    const sorted = [...slugs].sort();
    expect(slugs).toEqual(sorted);
  });

  it("returns empty array for unknown owner", async () => {
    const { listBuiltInSlugsByOwner } = await import("./model-registry.js");
    expect(listBuiltInSlugsByOwner("nonexistent")).toEqual([]);
  });
});
