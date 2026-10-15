// A CUE-only project (`.agents/oma-config.cue`, no `oma-config.yaml`) is a
// supported layout: `oma update` no longer drops the shipped YAML template
// next to the user's CUE file. Every reader below used to open
// `.agents/oma-config.yaml` directly and silently fell back to defaults for
// such a project. They must resolve through the shared config loader instead.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getExistingLanguage } from "../commands/install/preferences.js";
import { promptProviders } from "../commands/install/provider-preferences.js";
import {
  loadSkillSection,
  readRootOmaConfig,
} from "../platform/agent-config/skill-sections.js";
import { loadAgentPersona } from "../platform/agent-config.js";
import { hasInstalledProject } from "../platform/manifest.js";
import { evaluateCueFile } from "./cue.js";

vi.mock("./cue.js", () => ({ evaluateCueFile: vi.fn() }));

const CUE_CONFIG = {
  language: "ko",
  model_preset: "claude",
  providers: { code_intelligence: "gortex", semantic_memory: "none" },
  diagram: { archify: { path: "/opt/archify" } },
};

describe("CUE-only project config readers", () => {
  let root: string;

  beforeEach(() => {
    vi.clearAllMocks();
    root = mkdtempSync(join(tmpdir(), "oma-cue-only-"));
    mkdirSync(join(root, ".agents"), { recursive: true });
    // Isolate from the developer's real global install.
    vi.stubEnv("OMA_HOME", join(root, "global-home"));
    writeFileSync(
      join(root, ".agents", "oma-config.cue"),
      'package config\n\nlanguage: "ko"\n',
    );
    vi.mocked(evaluateCueFile).mockReturnValue({
      success: true,
      data: CUE_CONFIG,
    });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("reads skill override sections from oma-config.cue", () => {
    expect(readRootOmaConfig(root)).toMatchObject({ language: "ko" });
    expect(loadSkillSection(root, "diagram")).toEqual({
      archify: { path: "/opt/archify" },
    });
  });

  it("resolves skill sections from a nested working directory", () => {
    const nested = join(root, "apps", "web");
    mkdirSync(nested, { recursive: true });
    expect(loadSkillSection(nested, "diagram")).toEqual({
      archify: { path: "/opt/archify" },
    });
  });

  it("degrades to undefined instead of throwing when CUE cannot be evaluated", () => {
    vi.mocked(evaluateCueFile).mockReturnValue({
      success: false,
      error: "boom",
    });
    expect(readRootOmaConfig(root)).toBeUndefined();
  });

  it("finds the agent persona source next to oma-config.cue", () => {
    const agentsDir = join(root, ".agents", "agents");
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(
      join(agentsDir, "backend-engineer.md"),
      "---\nname: backend-engineer\n---\n\nYou are a Backend Specialist.",
    );
    expect(loadAgentPersona("backend", root)).toBe(
      "You are a Backend Specialist.",
    );
  });

  it("offers the CUE language as the existing install language", () => {
    expect(getExistingLanguage(root)).toBe("ko");
  });

  it("keeps providers saved in oma-config.cue on an unattended reinstall", async () => {
    const selection = await promptProviders(root, true, vi.fn());
    expect(selection.providers).toMatchObject({
      code_intelligence: "gortex",
      semantic_memory: "none",
    });
  });

  it("still reinstalls unattended when oma-config.cue cannot be evaluated", async () => {
    // e.g. the `cue` binary is not on PATH yet — install only ensures it later.
    vi.mocked(evaluateCueFile).mockReturnValue({
      success: false,
      missingCli: true,
      error: "'cue' command not found in PATH",
    });
    const selection = await promptProviders(root, true, vi.fn());
    expect(selection.providers).toMatchObject({
      code_intelligence: "serena",
      web: "native",
    });
  });

  it("recognizes a CUE-only project as an existing install", () => {
    mkdirSync(join(root, ".agents", "skills"), { recursive: true });
    expect(hasInstalledProject(root)).toBe(true);
  });
});
