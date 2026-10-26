import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { OmaConfigSchema } from "../platform/agent-config/schemas.js";
import { createMemoryProvider } from "../state/semantic-memory.js";
import {
  ExaConfigSchema,
  HonchoConfigSchema,
  loadExaConfig,
  loadProviders,
  resolveProviders,
} from "./providers.js";

const roots: string[] = [];
function project(config: string) {
  const root = mkdtempSync(join(tmpdir(), "oma-providers-"));
  roots.push(root);
  mkdirSync(join(root, ".agents"));
  writeFileSync(join(root, ".agents/oma-config.yaml"), config);
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("capability provider selection", () => {
  it("loads Exa selection and credential references without changing defaults", () => {
    const root = project(
      "providers: {web: exa}\nexa: {api_key_env: TEAM_EXA_KEY, api_key_vault: team-exa}\n",
    );
    expect(loadProviders(root).web).toBe("exa");
    expect(loadExaConfig(root)).toEqual({
      api_key_env: "TEAM_EXA_KEY",
      api_key_vault: "team-exa",
    });
    expect(resolveProviders().web).toBe("native");
    expect(
      OmaConfigSchema.safeParse({
        model_preset: "auto",
        providers: { web: "exa" },
        exa: { api_key_env: "TEAM_EXA_KEY", api_key_vault: "team-exa" },
      }).success,
    ).toBe(true);
    expect(
      OmaConfigSchema.safeParse({
        model_preset: "auto",
        exa: { api_key: "plaintext-key" },
      }).success,
    ).toBe(false);
    expect(ExaConfigSchema.safeParse({ api_key_env: "bad-name" }).success).toBe(
      false,
    );
    expect(
      ExaConfigSchema.safeParse({ api_key_vault: "../other" }).success,
    ).toBe(false);
  });
  it("shares defaults with consumers that already loaded the config layers", () => {
    expect(resolveProviders().code_intelligence).toBe("serena");
    expect(resolveProviders({ web: "native" }).code_intelligence).toBe(
      "serena",
    );
    expect(
      resolveProviders({ code_intelligence: "gortex" }).code_intelligence,
    ).toBe("gortex");
    for (const value of [
      null,
      { code_intelligence: "none" },
      { code_intelligence: "typo" },
    ]) {
      expect(() => resolveProviders(value)).toThrow();
    }
  });
  it("keeps legacy defaults, including from a nested cwd", () => {
    const root = project("language: en\nmodel_preset: codex\n");
    const sub = join(root, "src");
    mkdirSync(sub);
    expect(loadProviders(sub)).toEqual({
      docs: "context7",
      web: "native",
      code_intelligence: "serena",
      code_intelligence_guard: "block",
      semantic_memory: "agentmemory",
    });
    expect(createMemoryProvider({ projectDir: sub, env: {} }).name).toBe(
      "agentmemory",
    );
  });
  it("selects Honcho without falling back to an available AgentMemory endpoint", () => {
    const root = project("providers:\n  semantic_memory: honcho\n");
    expect(
      createMemoryProvider({
        projectDir: root,
        env: { AGENTMEMORY_URL: "http://localhost:1234" },
      }).name,
    ).toBe("honcho");
  });
  it("none disables remote observation and recall", async () => {
    const provider = createMemoryProvider({
      projectDir: project("providers:\n  semantic_memory: none\n"),
    });
    expect(provider.observeEvents).toBe(false);
    expect(await provider.recall?.({ query: "secret" })).toEqual([]);
  });
  it("accepts code_intelligence_guard: off", () => {
    expect(
      loadProviders(project("providers:\n  code_intelligence_guard: off\n"))
        .code_intelligence_guard,
    ).toBe("off");
  });
  it.each([
    "code_intelligence: typo",
    "code_intelligence_guard: warn",
    "semantic_memory: typo",
    "docs: honcho",
    "code-intelligence: gortex",
  ])("rejects invalid explicit selection %s", (selection) => {
    expect(() =>
      loadProviders(project(`providers:\n  ${selection}\n`)),
    ).toThrow();
  });
  it("validates workspace IDs and bounded budgets", () => {
    expect(
      HonchoConfigSchema.safeParse({ workspace_id: "../other" }).success,
    ).toBe(false);
    expect(HonchoConfigSchema.safeParse({ max_results: 1000 }).success).toBe(
      false,
    );
    expect(HonchoConfigSchema.safeParse({ timeout_ms: -1 }).success).toBe(
      false,
    );
  });
});
