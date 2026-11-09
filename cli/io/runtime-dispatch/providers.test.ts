import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  providerVendors,
  resolveLlmProvider,
  resolveProviderVendor,
} from "../../utils/free-provider.js";
import { planDispatch } from "../runtime-dispatch.js";
import { resolveAgentPlanFromConfig } from "./resolve-plan.js";

const EXAONE = {
  base_url: "https://api.exaone.ai/v1",
  api_key_env: "EXAONE_API_KEY",
  transport: "chat_completions",
  default_model: "k-exaone_v2.5",
} as const;

describe("providers.<name> LLM providers", () => {
  it("resolves a declared provider, defaulting the transport to chat_completions", () => {
    const provider = resolveLlmProvider(
      "exaone",
      {
        providers: {
          code_intelligence: "serena",
          exaone: { ...EXAONE, transport: undefined },
        },
      },
      {},
    );
    expect(provider).toEqual({
      name: "exaone",
      baseUrl: "https://api.exaone.ai/v1",
      apiKeyEnv: "EXAONE_API_KEY",
      model: "k-exaone_v2.5",
      transport: "chat_completions",
    });
    expect(providerVendors(provider)).toEqual(["codex", "qwen"]);
  });

  it("appends /v1, requires api_key_env and rejects credential-bearing URLs", () => {
    expect(
      resolveLlmProvider(
        "local",
        {
          providers: {
            local: { base_url: "http://127.0.0.1:8080/", api_key_env: "K" },
          },
        },
        {},
      ).baseUrl,
    ).toBe("http://127.0.0.1:8080/v1");
    expect(() =>
      resolveLlmProvider(
        "local",
        { providers: { local: { base_url: "http://127.0.0.1:8080" } } },
        {},
      ),
    ).toThrow(/requires api_key_env/);
    expect(() =>
      resolveLlmProvider(
        "local",
        {
          providers: {
            local: {
              base_url: "https://user:secret@example.com/v1",
              api_key_env: "K",
            },
          },
        },
        {},
      ),
    ).toThrow(/HTTP\(S\)/);
    expect(() => resolveLlmProvider("nope", {}, {})).toThrow(
      /Unknown provider "nope"/,
    );
  });

  it("chooses the child CLI from the transport and refuses CLIs it cannot serve", () => {
    const config = { providers: { exaone: EXAONE }, default_cli: "claude" };
    const provider = resolveLlmProvider("exaone", config, {});
    // default_cli claude cannot speak chat_completions → first allowed CLI.
    expect(
      resolveProviderVendor(
        provider,
        { providers: config.providers },
        undefined,
        {},
      ),
    ).toBe("codex");
    expect(
      resolveProviderVendor(provider, config, undefined, {
        OMA_RUNTIME_VENDOR: "qwen",
      }),
    ).toBe("qwen");
    expect(() => resolveProviderVendor(provider, config, "claude", {})).toThrow(
      /speaks chat_completions, which oma can route through codex and qwen only/,
    );
    const anthropic = resolveLlmProvider(
      "relay",
      {
        providers: {
          relay: {
            base_url: "https://relay.example/v1",
            api_key_env: "RELAY_KEY",
            transport: "anthropic_messages",
          },
        },
      },
      {},
    );
    expect(providerVendors(anthropic)).toEqual(["claude"]);
    expect(resolveProviderVendor(anthropic, {}, undefined, {})).toBe("claude");
  });

  it("routes a role whose model is <provider>/<model-id> without consulting the registry", () => {
    const plan = resolveAgentPlanFromConfig(
      "backend",
      {
        model_preset: "auto",
        providers: { exaone: EXAONE },
        agents: {
          default: { effort: "medium" },
          backend: { model: "exaone/k-exaone_v2.5", thinking: true },
        },
      },
      undefined,
      {},
    );
    expect(plan).toMatchObject({
      cli: "codex",
      cliModel: "k-exaone_v2.5",
      providerFromPreset: false,
      effort: "medium",
      thinking: true,
      provider: { name: "exaone", transport: "chat_completions" },
    });
    expect(plan.spec).toBeUndefined();
  });

  it("routes every role through a provider preset using default_model", () => {
    const plan = resolveAgentPlanFromConfig(
      "frontend",
      {
        model_preset: "exaone",
        providers: { exaone: EXAONE },
        agents: {
          frontend: { model: "openai/gpt-5.4", effort: "high" },
        },
      },
      undefined,
      {},
    );
    expect(plan).toMatchObject({
      cli: "codex",
      cliModel: "k-exaone_v2.5",
      providerFromPreset: true,
      effort: "high",
    });
    expect(JSON.stringify(plan)).not.toContain("gpt-5.4");
    expect(() =>
      resolveAgentPlanFromConfig(
        "frontend",
        {
          model_preset: "exaone",
          providers: { exaone: { ...EXAONE, default_model: undefined } },
        },
        undefined,
        {},
      ),
    ).toThrow(/needs providers\.exaone\.default_model/);
  });

  it("fills effort, thinking and memory from agents.default for registry and auto plans", () => {
    const registry = resolveAgentPlanFromConfig(
      "backend",
      {
        model_preset: "auto",
        agents: {
          default: { effort: "low", memory: "project" },
          backend: { model: "openai/gpt-5.4", memory: "local" },
        },
      },
      undefined,
      {},
    );
    expect(registry).toMatchObject({
      cli: "codex",
      effort: "low",
      memory: "local",
    });
    const auto = resolveAgentPlanFromConfig(
      "qa",
      { model_preset: "auto", agents: { default: { thinking: false } } },
      undefined,
      { OMA_RUNTIME_VENDOR: "codex" },
    );
    expect(auto).toMatchObject({ cli: "codex", thinking: false });
    expect(auto.cliModel).toBeUndefined();
    // A cli-session model (Claude Code) never receives a default effort.
    const claude = resolveAgentPlanFromConfig(
      "backend",
      {
        model_preset: "auto",
        agents: {
          default: { effort: "high" },
          backend: { model: "anthropic/claude-sonnet-5-5" },
        },
      },
      undefined,
      {},
    );
    expect(claude.cli).toBe("claude");
    expect(claude.effort).toBeUndefined();
  });
});

describe("provider dispatch", () => {
  const cwd = process.cwd();
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-provider-dispatch-"));
    mkdirSync(join(root, ".agents"));
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      [
        "model_preset: auto",
        "providers:",
        "  code_intelligence: serena",
        "  exaone:",
        "    base_url: https://api.exaone.ai/v1",
        "    api_key_env: EXAONE_API_KEY",
        "    transport: chat_completions",
        "    default_model: k-exaone_v2.5",
        "agents:",
        "  default: { effort: medium }",
        "  backend: { model: exaone/k-exaone_v2.5 }",
        "",
      ].join("\n"),
    );
    process.chdir(root);
  });
  afterEach(() => {
    process.chdir(cwd);
    rmSync(root, { force: true, recursive: true });
  });

  it("gives a codex child a complete chat provider table and a child-only key", () => {
    const env = {
      HOME: root,
      OMA_RUNTIME_VENDOR: "codex",
      EXAONE_API_KEY: "ex-key",
    };
    const before = { ...env };
    const { invocation } = planDispatch(
      "backend",
      "codex",
      {
        subcommand: "exec",
        default_model: "paid-default",
        model_flag: "--model",
      },
      "-p",
      "test task",
      env,
    );
    expect(env).toEqual(before);
    expect(invocation.args).toContain("k-exaone_v2.5");
    expect(invocation.args).not.toContain("paid-default");
    expect(invocation.args.join(" ")).not.toContain("ex-key");
    expect(invocation.env.OMA_EXAONE_API_KEY).toBe("ex-key");
    // A single-role pin never re-routes the child's own spawns.
    expect(invocation.env.OMA_MODEL_PRESET).toBeUndefined();
    expect(invocation.env.FREELLM_BASE_URL).toBeUndefined();
    const providerArg = invocation.args.find((arg) =>
      arg.startsWith("model_providers.oma_exaone="),
    );
    expect(providerArg).toBeDefined();
    expect(parseToml(providerArg as string)).toMatchObject({
      model_providers: {
        oma_exaone: {
          name: "exaone",
          base_url: "https://api.exaone.ai/v1",
          env_key: "OMA_EXAONE_API_KEY",
          wire_api: "chat",
          requires_openai_auth: false,
        },
      },
    });
    expect(invocation.args).toContain('model_provider="oma_exaone"');
  });

  it("gives a qwen child the OpenAI-compatible endpoint and refuses claude for a chat-only provider", () => {
    const { invocation } = planDispatch(
      "backend",
      "qwen",
      {},
      "-p",
      "test task",
      { HOME: root, OMA_RUNTIME_VENDOR: "qwen", EXAONE_API_KEY: "ex-key" },
    );
    expect(invocation.env.OPENAI_BASE_URL).toBe("https://api.exaone.ai/v1");
    expect(invocation.env.OPENAI_API_KEY).toBe("ex-key");
    expect(invocation.env.OPENAI_MODEL).toBe("k-exaone_v2.5");
    expect(invocation.args).toContain("--openai-base-url");
    expect(() =>
      planDispatch("backend", "claude", {}, null, "test", {
        HOME: root,
        OMA_RUNTIME_VENDOR: "claude",
        EXAONE_API_KEY: "ex-key",
      }),
    ).toThrow(/codex and qwen only/);
  });

  it("does not fall back to the CLI's own account when the provider key is missing", () => {
    expect(() =>
      planDispatch("backend", "codex", {}, null, "test", {
        HOME: root,
        OMA_RUNTIME_VENDOR: "codex",
        OPENAI_API_KEY: "paid-key",
      }),
    ).toThrow(/provider "exaone" requires EXAONE_API_KEY/);
  });

  it("marks the route in OMA_MODEL_PRESET only when the provider is the preset", () => {
    writeFileSync(
      join(root, ".agents", "oma-config.local.yaml"),
      "model_preset: exaone\n",
    );
    const { invocation } = planDispatch("qa", "codex", {}, null, "test", {
      HOME: root,
      OMA_RUNTIME_VENDOR: "codex",
      EXAONE_API_KEY: "ex-key",
    });
    expect(invocation.env.OMA_MODEL_PRESET).toBe("exaone");
    expect(invocation.args).toContain("k-exaone_v2.5");
  });
});
