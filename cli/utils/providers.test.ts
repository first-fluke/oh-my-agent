import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryProvider } from "../state/semantic-memory.js";
import { HonchoConfigSchema, loadProviders } from "./providers.js";

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
