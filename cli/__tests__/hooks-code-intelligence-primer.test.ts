import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  detectCodeIntelligenceProvider,
  run as runCodeIntelligencePrimer,
} from "../../.agents/hooks/core/code-intelligence-primer.ts";
import type { HandlerCtx } from "../../.agents/hooks/core/types.ts";

describe("code-intelligence-primer", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-code-intel-primer-"));
    mkdirSync(join(projectDir, ".git"), { recursive: true });
    mkdirSync(join(projectDir, ".agents"), { recursive: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  function ctx(sid: string): HandlerCtx {
    return { vendor: "claude", cwd: projectDir, sid };
  }

  it("detects serena provider from .serena/project.yml fallback", () => {
    mkdirSync(join(projectDir, ".serena"), { recursive: true });
    writeFileSync(join(projectDir, ".serena", "project.yml"), "name: test\n");
    expect(detectCodeIntelligenceProvider(projectDir)).toBe("serena");
  });

  it("detects gortex provider from oma-config.yaml", () => {
    writeFileSync(
      join(projectDir, ".agents", "oma-config.yaml"),
      "providers:\n  code_intelligence: gortex\n",
    );
    expect(detectCodeIntelligenceProvider(projectDir)).toBe("gortex");
  });

  it("detects gortex provider overlay from oma-config.local.yaml over oma-config.yaml", () => {
    writeFileSync(
      join(projectDir, ".agents", "oma-config.yaml"),
      "providers:\n  code_intelligence: serena\n",
    );
    writeFileSync(
      join(projectDir, ".agents", "oma-config.local.yaml"),
      "providers:\n  code_intelligence: gortex\n",
    );
    expect(detectCodeIntelligenceProvider(projectDir)).toBe("gortex");
  });

  it("returns null when no code-intelligence provider is configured", () => {
    expect(detectCodeIntelligenceProvider(projectDir)).toBeNull();
  });

  it("injects OMA GORTEX PRIMER for gortex provider", async () => {
    writeFileSync(
      join(projectDir, ".agents", "oma-config.yaml"),
      "providers:\n  code_intelligence: gortex\n",
    );

    const result = await runCodeIntelligencePrimer(
      { kind: "prompt", prompt: "implement feature", cwd: projectDir },
      ctx("sess-gortex"),
    );

    expect(result?.type).toBe("context");
    if (result?.type === "context") {
      expect(result.additionalContext).toContain("[OMA GORTEX PRIMER]");
      expect(result.additionalContext).toContain("Gortex MCP tools");
      expect(result.additionalContext).toContain("ignored paths");
      expect(result.additionalContext).not.toContain("OMA_CI_ALLOW_NATIVE");
    }
  });

  it("injects OMA SERENA PRIMER for serena provider", async () => {
    mkdirSync(join(projectDir, ".serena"), { recursive: true });
    writeFileSync(join(projectDir, ".serena", "project.yml"), "name: test\n");

    const result = await runCodeIntelligencePrimer(
      { kind: "prompt", prompt: "implement feature", cwd: projectDir },
      ctx("sess-serena"),
    );

    expect(result?.type).toBe("context");
    if (result?.type === "context") {
      expect(result.additionalContext).toContain("[OMA SERENA PRIMER]");
      expect(result.additionalContext).toContain("initial_instructions");
      expect(result.additionalContext).toContain("ignored paths");
      expect(result.additionalContext).not.toContain("OMA_CI_ALLOW_NATIVE");
    }
  });

  it("deduplicates within the same session", async () => {
    writeFileSync(
      join(projectDir, ".agents", "oma-config.yaml"),
      "providers:\n  code_intelligence: gortex\n",
    );

    const first = await runCodeIntelligencePrimer(
      { kind: "prompt", prompt: "first prompt", cwd: projectDir },
      ctx("sess-dedup"),
    );
    expect(first?.type).toBe("context");

    const second = await runCodeIntelligencePrimer(
      { kind: "prompt", prompt: "second prompt", cwd: projectDir },
      ctx("sess-dedup"),
    );
    expect(second).toBeNull();
  });
});
