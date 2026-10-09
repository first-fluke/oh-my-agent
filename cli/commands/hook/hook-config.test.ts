import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectCodeIntelligenceGuardMode,
  detectCodeIntelligenceProvider,
} from "../../../.agents/hooks/core/code-intelligence-primer.js";
import { resolveHookConfig } from "./hook-config.js";

describe("hook config inheritance", () => {
  let root: string;
  let project: string;
  let globalDefinitions: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-hook-global-config-"));
    project = join(root, "project");
    globalDefinitions = join(root, "global", ".agents");
    mkdirSync(project);
    mkdirSync(globalDefinitions, { recursive: true });
    vi.stubEnv("OMA_HOME", join(root, "global"));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  it("applies global providers without projecting unrelated project hook settings", () => {
    writeFileSync(
      join(globalDefinitions, "oma-config.yaml"),
      "providers:\n  code_intelligence: gortex\n  code_intelligence_guard: off\n  semantic_memory: none\nrefactor_guard:\n  enabled: true\nlanguage: ko\n",
    );
    const resolved = resolveHookConfig(project);
    expect(resolved.memory).toBe("none");
    expect(resolved.config).toEqual({
      providers: {
        code_intelligence: "gortex",
        code_intelligence_guard: "off",
        semantic_memory: "none",
      },
    });
    expect(detectCodeIntelligenceProvider(project, resolved.config)).toBe(
      "gortex",
    );
    expect(detectCodeIntelligenceGuardMode(project, resolved.config)).toBe(
      "off",
    );
    expect(resolved.config?.refactor_guard).toBeUndefined();
    expect(resolved.config?.language).toBeUndefined();
  });

  it("keeps project and local provider overrides ahead of global defaults", () => {
    writeFileSync(
      join(globalDefinitions, "oma-config.yaml"),
      "providers:\n  code_intelligence: gortex\n  code_intelligence_guard: off\n  semantic_memory: agentmemory\nrefactor_guard:\n  enabled: true\n",
    );
    const definitions = join(project, ".agents");
    mkdirSync(definitions);
    writeFileSync(
      join(definitions, "oma-config.yaml"),
      "providers:\n  code_intelligence: serena\nrefactor_guard:\n  enabled: false\n",
    );
    writeFileSync(
      join(definitions, "oma-config.local.yaml"),
      "providers:\n  code_intelligence_guard: block\n  semantic_memory: none\n",
    );
    const resolved = resolveHookConfig(project);
    expect(resolved.memory).toBe("none");
    expect(detectCodeIntelligenceProvider(project, resolved.config)).toBe(
      "serena",
    );
    expect(detectCodeIntelligenceGuardMode(project, resolved.config)).toBe(
      "block",
    );
    expect(resolved.config?.refactor_guard).toEqual({ enabled: false });
  });

  it("ignores ancestor project providers while retaining global defaults", () => {
    mkdirSync(join(root, ".agents"));
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "providers:\n  code_intelligence: serena\n  semantic_memory: honcho\n",
    );
    writeFileSync(
      join(globalDefinitions, "oma-config.yaml"),
      "providers:\n  code_intelligence: gortex\n  semantic_memory: none\n",
    );
    const resolved = resolveHookConfig(project);
    expect(resolved.memory).toBe("none");
    expect(resolved.config?.providers).toEqual(
      expect.objectContaining({ code_intelligence: "gortex" }),
    );
  });

  it("does not grant a project hook config solely from global non-provider fields", () => {
    writeFileSync(
      join(globalDefinitions, "oma-config.yaml"),
      "refactor_guard:\n  enabled: true\n",
    );
    expect(resolveHookConfig(project)).toEqual({ memory: "agentmemory" });
  });
});
