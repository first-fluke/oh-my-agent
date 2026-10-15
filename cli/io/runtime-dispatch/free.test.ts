import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { freeApiKey, resolveFreeProvider } from "../../utils/free-provider.js";
import { planDispatch } from "../runtime-dispatch.js";
import { resolveAgentPlanFromConfig } from "./resolve-plan.js";

describe("free preset dispatch", () => {
  const cwd = process.cwd();
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-free-dispatch-"));
    mkdirSync(join(root, ".agents"));
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "model_preset: auto\nagents:\n  backend:\n    model: openai/gpt-5.4",
    );
    writeFileSync(
      join(root, ".agents", "oma-config.local.yaml"),
      "model_preset: free",
    );
    process.chdir(root);
  });
  afterEach(() => {
    process.chdir(cwd);
    rmSync(root, { force: true, recursive: true });
  });

  it.each(["codex", "claude", "qwen"])(
    "routes %s with the proxy model and a child-only key",
    (vendor) => {
      const env = {
        HOME: root,
        OMA_RUNTIME_VENDOR: vendor,
        FREELLM_API_KEY: "test-proxy-key",
        ANTHROPIC_API_KEY: "old-key",
        CLAUDE_CODE_USE_BEDROCK: "1",
      };
      const before = { ...env };
      const { invocation } = planDispatch(
        "backend",
        vendor,
        {
          subcommand: "exec",
          default_model: "paid-default",
          model_flag: "--model",
        },
        "-p",
        "test task",
        env,
      );
      expect(invocation.args).toContain("auto");
      expect(invocation.args.join(" ")).not.toContain("test-proxy-key");
      expect(invocation.args).not.toContain("paid-default");
      expect(env).toEqual(before);
      expect(invocation.env.OMA_MODEL_PRESET).toBe("free");
      expect(invocation.env.FREELLM_BASE_URL).toBe("http://127.0.0.1:31415/v1");
      if (vendor === "codex") {
        expect(invocation.env.OMA_FREELLM_API_KEY).toBe("test-proxy-key");
        const providerArg = invocation.args.find((arg) =>
          arg.startsWith("model_providers.oma_free="),
        );
        expect(providerArg).toBeDefined();
        if (!providerArg) throw new Error("Missing provider argument");
        const value = parseToml(providerArg);
        expect(value).toMatchObject({
          model_providers: {
            oma_free: {
              wire_api: "responses",
              requires_openai_auth: false,
              base_url: "http://127.0.0.1:31415/v1",
            },
          },
        });
      } else if (vendor === "claude") {
        expect(invocation.env.ANTHROPIC_BASE_URL).toBe(
          "http://127.0.0.1:31415",
        );
        expect(invocation.env.ANTHROPIC_AUTH_TOKEN).toBe("test-proxy-key");
        expect(invocation.env.ANTHROPIC_API_KEY).toBeUndefined();
        expect(invocation.env.CLAUDE_CODE_USE_BEDROCK).toBeUndefined();
      } else {
        expect(invocation.env.OPENAI_BASE_URL).toBe(
          "http://127.0.0.1:31415/v1",
        );
        expect(invocation.env.OPENAI_API_KEY).toBe("test-proxy-key");
        expect(invocation.args).toContain("--auth-type");
      }
    },
  );

  it("does not fall back to vendor credentials when the proxy key is missing", () => {
    expect(() =>
      planDispatch("backend", "codex", {}, null, "test", {
        OPENAI_API_KEY: "paid-key",
      }),
    ).toThrow(/requires FREELLM_API_KEY/);
  });

  it.each(["codex", "claude"])(
    "preserves the required %s restriction after free-provider routing",
    (vendor) => {
      const { invocation } = planDispatch(
        "backend",
        vendor,
        { auto_approve_flag: "--yolo" },
        null,
        "Inspect the source",
        { OMA_RUNTIME_VENDOR: vendor, FREELLM_API_KEY: "test-proxy-key" },
        { readOnly: true },
      );
      expect(invocation.env.OMA_MODEL_PRESET).toBe("free");
      expect(invocation.args).toContain(
        vendor === "codex" ? "read-only" : "plan",
      );
      expect(invocation.args).not.toContain("--yolo");
    },
  );

  it("rejects an unsupported explicit vendor", () => {
    expect(() =>
      planDispatch("backend", "cursor", {}, null, "test", {
        FREELLM_API_KEY: "test-key",
      }),
    ).toThrow(/supports codex, claude and qwen only/);
  });

  it("honors proxy env overrides, canonical key precedence, and the upstream key alias", () => {
    const provider = resolveFreeProvider(
      { free: { base_url: "http://localhost:1234", model: "local" } },
      {
        FREELLM_BASE_URL: "http://127.0.0.1:4444/v1/",
        FREELLM_MODEL: "auto:coding",
      },
    );
    expect(provider).toMatchObject({
      baseUrl: "http://127.0.0.1:4444/v1",
      model: "auto:coding",
    });
    expect(freeApiKey(provider, { FREELLMAPI_API_KEY: "upstream" })).toBe(
      "upstream",
    );
    expect(
      freeApiKey(provider, {
        FREELLM_API_KEY: "canonical",
        FREELLMAPI_API_KEY: "upstream",
      }),
    ).toBe("canonical");
    expect(() =>
      freeApiKey(
        { ...provider, apiKeyEnv: "CUSTOM_KEY" },
        { FREELLM_API_KEY: "other" },
      ),
    ).toThrow(/CUSTOM_KEY/);
  });

  it("resolves plans without credentials and prevents paid per-role overrides escaping the proxy", () => {
    const plan = resolveAgentPlanFromConfig(
      "backend",
      {
        model_preset: "free",
        agents: { backend: { model: "openai/gpt-5.4" } },
      },
      "claude",
      {},
    );
    expect(plan).toMatchObject({
      cli: "claude",
      cliModel: "auto",
      freeProvider: { apiKeyEnv: "FREELLM_API_KEY" },
    });
    expect(JSON.stringify(plan)).not.toContain("gpt-5.4");
  });

  it.each([
    "https://user:secret@example.com/v1",
    "https://example.com/v1?key=secret",
    "file:///tmp/api",
  ])(
    "rejects credential-bearing or invalid base URLs without echoing them",
    (base_url) => {
      expect(() => resolveFreeProvider({ free: { base_url } }, {})).toThrow(
        /HTTP/,
      );
      try {
        resolveFreeProvider({ free: { base_url } }, {});
      } catch (error) {
        expect(String(error)).not.toContain("secret");
      }
    },
  );
  it("preserves the free preset in a nested workspace without local config", () => {
    const first = planDispatch("backend", "codex", {}, null, "test", {
      FREELLM_API_KEY: "test-key",
      FREELLM_MODEL: "auto:coding",
    });
    mkdirSync(join(root, "child", ".agents"), { recursive: true });
    writeFileSync(
      join(root, "child", ".agents", "oma-config.yaml"),
      "model_preset: auto",
    );
    process.chdir(join(root, "child"));
    const nested = planDispatch(
      "backend",
      "codex",
      {},
      null,
      "test",
      first.invocation.env,
    );
    expect(nested.invocation.args).toContain("auto:coding");
    expect(nested.invocation.env.OMA_FREELLM_API_KEY).toBe("test-key");
  });

  it.each(["claude", "qwen"])(
    "rejects conflicting %s native settings without exposing their key",
    (vendor) => {
      mkdirSync(join(root, `.${vendor}`));
      writeFileSync(
        join(root, `.${vendor}`, "settings.json"),
        JSON.stringify({
          env: {
            [vendor === "claude" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"]:
              "private-conflict",
          },
        }),
      );
      const run = () =>
        planDispatch("backend", vendor, {}, null, "test", {
          HOME: root,
          FREELLM_API_KEY: "test-key",
        });
      expect(run).toThrow(/overriding the free route/);
      try {
        run();
      } catch (error) {
        expect(String(error)).not.toContain("private-conflict");
      }
    },
  );
});
