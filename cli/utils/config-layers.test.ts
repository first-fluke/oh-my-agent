import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadUserConfig } from "../io/runtime-dispatch/config-loader.js";
import { resolveVendor } from "../platform/agent-config.js";
import { loadOmaConfig } from "./config.js";
import { ConfigLayerError, loadConfigLayers } from "./config-layers.js";
import { evaluateCueFile } from "./cue.js";
import { loadProviders } from "./providers.js";

vi.mock("./cue.js", () => ({ evaluateCueFile: vi.fn() }));

describe("project-local config", () => {
  let root: string;
  const cwd = process.cwd();
  beforeEach(() => {
    vi.clearAllMocks();
    root = mkdtempSync(join(tmpdir(), "oma-config-local-"));
    mkdirSync(join(root, ".agents"));
    vi.stubEnv("OMA_HOME", join(root, "global-home"));
  });
  afterEach(() => {
    process.chdir(cwd);
    rmSync(root, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });
  const put = (name: string, value: string) =>
    writeFileSync(join(root, ".agents", name), value);
  const putGlobal = (name: string, value: string) => {
    const definitions = join(root, "global-home", ".agents");
    mkdirSync(definitions, { recursive: true });
    writeFileSync(join(definitions, name), value);
  };

  it("merges global defaults, nearest project, and local settings in order", () => {
    putGlobal(
      "oma-config.yaml",
      "model_preset: auto\nproviders:\n  semantic_memory: agentmemory\n  code_intelligence: serena\nagents:\n  backend:\n    model: openai/gpt-5.4\n    effort: high\ndocs:\n  exclude: [global]\n",
    );
    put(
      "oma-config.yaml",
      "providers:\n  semantic_memory: none\nagents:\n  backend:\n    effort: low\ndocs:\n  exclude: [project]\n",
    );
    put(
      "oma-config.local.yaml",
      "agents:\n  backend:\n    effort: medium\ndocs:\n  exclude: [local]\n",
    );

    const { config, sources } = loadConfigLayers(root);
    expect(config.providers).toMatchObject({
      semantic_memory: "none",
      code_intelligence: "serena",
    });
    expect(config.agents?.backend).toEqual({
      model: "openai/gpt-5.4",
      effort: "medium",
    });
    expect(config.docs?.exclude).toEqual(["local"]);
    expect(sources).toEqual({
      global: join(root, "global-home", ".agents", "oma-config.yaml"),
      shared: join(root, ".agents", "oma-config.yaml"),
      local: join(root, ".agents", "oma-config.local.yaml"),
    });
    expect(loadProviders(root).semantic_memory).toBe("none");
    expect(loadOmaConfig(root)).toEqual(config);
    expect(loadUserConfig(root)).toEqual(config);
  });

  it("loads global config without assigning it project ownership", () => {
    putGlobal("oma-config.yaml", "timezone: UTC\ntelemetry: true\n");
    const { config, sources } = loadConfigLayers(root);
    expect(config).toEqual({ timezone: "UTC", telemetry: true });
    expect(sources.global).toBe(
      join(root, "global-home", ".agents", "oma-config.yaml"),
    );
    expect(sources.shared).toBeUndefined();
    expect(sources.local).toBeUndefined();
    expect(loadOmaConfig(root)).toEqual(config);
  });

  it("applies global local settings before project settings only once", () => {
    putGlobal("oma-config.yaml", "model_preset: auto\ntimezone: UTC\n");
    putGlobal("oma-config.local.yaml", "timezone: Asia/Seoul\n");
    put("oma-config.yaml", "timezone: Australia/Sydney\n");
    expect(loadConfigLayers(root).config.timezone).toBe("Australia/Sydney");

    const global = loadConfigLayers(join(root, "global-home"));
    expect(global.config.timezone).toBe("Asia/Seoul");
    expect(global.sources).toEqual({
      global: join(root, "global-home", ".agents", "oma-config.yaml"),
      globalLocal: join(
        root,
        "global-home",
        ".agents",
        "oma-config.local.yaml",
      ),
    });
  });

  it("stops at an empty child .agents instead of inheriting an ancestor project", () => {
    putGlobal("oma-config.yaml", "timezone: UTC\n");
    put("oma-config.yaml", "timezone: Asia/Seoul\n");
    put("oma-config.local.yaml", "providers:\n  semantic_memory: honcho\n");
    const child = join(root, "child");
    mkdirSync(join(child, ".agents"), { recursive: true });
    expect(loadConfigLayers(child)).toMatchObject({
      config: { timezone: "UTC" },
      sources: {
        global: join(root, "global-home", ".agents", "oma-config.yaml"),
      },
    });
    expect(loadConfigLayers(child).config.providers).toBeUndefined();
    expect(loadConfigLayers(child).sources.local).toBeUndefined();
  });

  it("applies the environment override after global and project configs", () => {
    putGlobal("oma-config.yaml", "model_preset: claude\n");
    put("oma-config.yaml", "model_preset: qwen\n");
    put("oma-config.local.yaml", "model_preset: codex\n");
    expect(
      loadConfigLayers(root, {
        OMA_HOME: join(root, "global-home"),
        OMA_MODEL_PRESET: "free",
      }),
    ).toMatchObject({
      config: { model_preset: "free" },
      sources: { environment: "OMA_MODEL_PRESET" },
    });
  });

  it("merges nested fields, replaces arrays, and shares values across readers", () => {
    put(
      "oma-config.yaml",
      "model_preset: auto\nfree:\n  model: auto\n  api_key_env: TEST_KEY\nagents:\n  backend:\n    model: openai/gpt-5.4\n    effort: high\ndocs:\n  exclude: [one, two]\n",
    );
    put(
      "oma-config.local.yaml",
      "model_preset: free\nfree:\n  base_url: http://127.0.0.1:31415/v1\nagents:\n  backend:\n    effort: low\ndocs:\n  exclude: [three]\n",
    );
    const { config, sources } = loadConfigLayers(root);
    expect(config.free).toEqual({
      model: "auto",
      api_key_env: "TEST_KEY",
      base_url: "http://127.0.0.1:31415/v1",
    });
    expect(config.agents?.backend).toEqual({
      model: "openai/gpt-5.4",
      effort: "low",
    });
    expect(config.docs?.exclude).toEqual(["three"]);
    expect(sources.local).toBe(join(root, ".agents", "oma-config.local.yaml"));
    expect(loadUserConfig(root)).toEqual(config);
    expect(loadOmaConfig(root)).toEqual(config);
    process.chdir(root);
    expect(resolveVendor("backend", "qwen").vendor).toBe("qwen");
  });

  it("evaluates CUE layers separately before overriding conflicting scalars", () => {
    put("oma-config.cue", 'model_preset: "auto"');
    put("oma-config.local.cue", 'model_preset: "free"');
    vi.mocked(evaluateCueFile).mockImplementation((file) => ({
      success: true,
      data: { model_preset: file.includes(".local.") ? "free" : "auto" },
    }));
    expect(loadConfigLayers(root).config.model_preset).toBe("free");
    expect(evaluateCueFile).toHaveBeenCalledTimes(2);
  });

  it("does not mix a child YAML project with parent CUE or local settings", () => {
    put("oma-config.cue", 'model_preset: "free"');
    put("oma-config.local.yaml", "model_preset: free");
    const child = join(root, "child");
    mkdirSync(join(child, ".agents"), { recursive: true });
    writeFileSync(
      join(child, ".agents", "oma-config.yaml"),
      "model_preset: auto",
    );
    mkdirSync(join(child, "src"));
    expect(loadConfigLayers(join(child, "src")).config.model_preset).toBe(
      "auto",
    );
    expect(evaluateCueFile).not.toHaveBeenCalled();
  });

  it.each(["- free", "free: {", "model_preset: free\nmodel_preset: auto"])(
    "rejects invalid local YAML (%s) without falling back",
    (content) => {
      put("oma-config.yaml", "model_preset: auto");
      put("oma-config.local.yaml", content);
      expect(() => loadOmaConfig(root)).toThrow(ConfigLayerError);
      expect(() => loadUserConfig(root)).toThrow(ConfigLayerError);
    },
  );

  it("does not ignore an unevaluable local CUE file", () => {
    put("oma-config.yaml", "model_preset: auto");
    put("oma-config.local.cue", 'model_preset: "free"');
    vi.mocked(evaluateCueFile).mockReturnValue({
      success: false,
      missingCli: true,
    });
    expect(() => loadUserConfig(root)).toThrow(/Install CUE/);
  });

  it("rejects ambiguous local files", () => {
    put("oma-config.local.cue", 'model_preset: "free"');
    put("oma-config.local.yaml", "model_preset: auto");
    expect(() => loadConfigLayers(root)).toThrow(/keep only one/);
  });

  it("ignores prototype properties and preserves null and false", () => {
    put(
      "oma-config.yaml",
      "model_preset: auto\ntelemetry: true\ntimezone: UTC",
    );
    put(
      "oma-config.local.yaml",
      "__proto__:\n  polluted: true\ntelemetry: false\ntimezone: null",
    );
    const config = loadConfigLayers(root).config;
    expect(config.telemetry).toBe(false);
    expect(config.timezone).toBeNull();
    expect(Object.hasOwn(config, "__proto__")).toBe(false);
  });
  it("applies the preset environment override even without a config", () => {
    expect(
      loadUserConfig(root, { OMA_MODEL_PRESET: "free" }).model_preset,
    ).toBe("free");
    put("oma-config.yaml", "model_preset: auto");
    expect(loadConfigLayers(root, { OMA_MODEL_PRESET: "free" })).toMatchObject({
      config: { model_preset: "free" },
      sources: { environment: "OMA_MODEL_PRESET" },
    });
  });

  it("does not ignore an invalid shared file when a local overlay exists", () => {
    put("oma-config.yaml", "free: {");
    put("oma-config.local.yaml", "model_preset: free");
    expect(() => loadOmaConfig(root)).toThrow(ConfigLayerError);
  });
});
