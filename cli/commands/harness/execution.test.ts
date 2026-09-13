import { describe, expect, it } from "vitest";
import {
  buildHarnessEnvironment,
  HARNESS_ENV_PASSTHROUGH,
  harnessManifestDifferences,
  resolveHarnessExecutionManifest,
} from "./execution.js";

const source: NodeJS.ProcessEnv = {
  PATH: "/usr/bin",
  HOME: "/home/tester",
  LANG: "C.UTF-8",
  OMA_STATE_HOME: "/tmp/oma-state",
  ANTHROPIC_API_KEY: "claude-secret",
  OPENAI_API_KEY: "openai-secret",
  AWS_SECRET_ACCESS_KEY: "aws-secret",
  DEPLOY_TOKEN: "deploy-secret",
  NPM_TOKEN: "npm-secret",
};

describe("harness environment policy", () => {
  it("passes only base, OMA, and vendor variables and forces memory off", () => {
    const { env, policy } = buildHarnessEnvironment("claude", source);
    expect(Object.keys(env).sort()).toEqual([
      "ANTHROPIC_API_KEY",
      "HOME",
      "LANG",
      "OMA_NO_AGENTMEMORY",
      "OMA_STATE_HOME",
      "PATH",
    ]);
    expect(env.OMA_NO_AGENTMEMORY).toBe("1");
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.DEPLOY_TOKEN).toBeUndefined();
    expect(policy).toMatchObject({
      mode: "allowlist",
      vendor: "claude",
      vendorKnown: true,
      forced: ["OMA_NO_AGENTMEMORY"],
      extra: [],
      dropped: 4,
    });
    expect(policy.passed).toEqual([
      "ANTHROPIC_API_KEY",
      "HOME",
      "LANG",
      "OMA_STATE_HOME",
      "PATH",
    ]);
    expect(JSON.stringify(policy)).not.toContain("secret");
  });

  it("keeps a builder's own additions but not variables it merely copied", () => {
    const invocationEnv: NodeJS.ProcessEnv = {
      ...source,
      OPENAI_BASE_URL: "http://127.0.0.1:1/v1",
    };
    const { env, policy } = buildHarnessEnvironment(
      "codex",
      source,
      invocationEnv,
    );
    expect(env.OPENAI_BASE_URL).toBe("http://127.0.0.1:1/v1");
    expect(env.OPENAI_API_KEY).toBe("openai-secret");
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(policy.dropped).toBe(4);
  });

  it("honours an explicit passthrough list and flags unknown vendors", () => {
    const { env, policy } = buildHarnessEnvironment("mystery", {
      ...source,
      [HARNESS_ENV_PASSTHROUGH]: "DEPLOY_TOKEN, bad-name",
    });
    expect(env.DEPLOY_TOKEN).toBe("deploy-secret");
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(policy.vendorKnown).toBe(false);
    expect(policy.extra).toEqual(["DEPLOY_TOKEN"]);
  });
});

describe("harness execution manifest", () => {
  it("describes an injected dispatch without probing any vendor process", () => {
    const manifest = resolveHarnessExecutionManifest({
      agent: "backend",
      vendor: "codex",
      vendorConfig: {},
      env: source,
      injected: true,
    });
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      dispatchMode: "injected",
      modelSource: "injected",
      model: null,
      cliVersionStatus: "not-probed",
      memory: "disabled",
      confinement: { network: "unrestricted", credentials: "inherited" },
    });
    expect(manifest.omaVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(manifest.manifestHash).toMatch(/^[a-f0-9]{64}$/);
    const again = resolveHarnessExecutionManifest({
      agent: "backend",
      vendor: "codex",
      vendorConfig: {},
      env: source,
      injected: true,
    });
    expect(again.manifestHash).toBe(manifest.manifestHash);
  });

  it("records the resolved command, probed CLI version, and vendor default model", () => {
    const probed: string[] = [];
    const manifest = resolveHarnessExecutionManifest({
      agent: "backend",
      vendor: "codex",
      vendorConfig: { default_model: "gpt-5.4" },
      env: source,
      probeVersion: (command, env) => {
        probed.push(command);
        expect(env.OMA_NO_AGENTMEMORY).toBe("1");
        expect(env.ANTHROPIC_API_KEY).toBeUndefined();
        return "codex-cli 0.154.0";
      },
    });
    expect(probed).toEqual([manifest.command]);
    expect(manifest.command).toBe("codex");
    expect(manifest.dispatchMode).toBe("external");
    expect(manifest.cliVersion).toBe("codex-cli 0.154.0");
    expect(manifest.cliVersionStatus).toBe("probed");
    expect(manifest.environmentPolicy.passed).not.toContain(
      "ANTHROPIC_API_KEY",
    );
    expect(manifest.environmentPolicy.passed).toContain("OPENAI_API_KEY");
    if (manifest.modelSource === "vendor-default")
      expect(manifest.model).toBe("gpt-5.4");
  });

  it("reports an unavailable probe instead of inventing a version", () => {
    const manifest = resolveHarnessExecutionManifest({
      agent: "backend",
      vendor: "codex",
      vendorConfig: {},
      env: source,
      probeVersion: () => null,
    });
    expect(manifest.cliVersion).toBeNull();
    expect(manifest.cliVersionStatus).toBe("unavailable");
    const unprobed = resolveHarnessExecutionManifest({
      agent: "backend",
      vendor: "codex",
      vendorConfig: {},
      env: source,
      probeVersion: false,
    });
    expect(unprobed.cliVersionStatus).toBe("not-probed");
  });

  it("names every changed condition and refuses to compare unprobed versions", () => {
    const base = resolveHarnessExecutionManifest({
      agent: "backend",
      vendor: "codex",
      vendorConfig: {},
      env: source,
      probeVersion: () => "codex-cli 0.154.0",
    });
    expect(harnessManifestDifferences(base, base)).toEqual([]);
    expect(harnessManifestDifferences(undefined, base)).toEqual([
      "Recorded execution conditions are unavailable; the record predates execution manifests",
    ]);
    const changed = {
      ...base,
      vendor: "claude",
      model: "claude-sonnet-5",
      cliVersion: "claude 2.1.0",
    };
    expect(harnessManifestDifferences(base, changed)).toEqual([
      'vendor: recorded "codex", current "claude"',
      `model: recorded ${JSON.stringify(base.model)}, current "claude-sonnet-5"`,
      'cliVersion: recorded "codex-cli 0.154.0", current "claude 2.1.0"',
    ]);
    const unprobed = {
      ...base,
      cliVersion: null,
      cliVersionStatus: "unavailable" as const,
    };
    expect(harnessManifestDifferences(base, unprobed)).toEqual([
      "cliVersion: not comparable; a probe was unavailable",
    ]);
  });
});
