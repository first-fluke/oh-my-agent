// `oma install` saved its choices before ensuring the `cue` binary (that ran
// only later, inside the Serena branch). In a fresh CUE-only install on a
// machine without `cue`, CUE could not be evaluated while saving, so the
// vendor selection (and any key the CUE regex cannot patch) was dropped.

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";

const { cue, log } = vi.hoisted(() => ({
  cue: { installed: false },
  log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
}));
vi.mock("@clack/prompts", () => ({ log }));
vi.mock("../../utils/cue.js", async () => {
  const { readFileSync: read } =
    await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ensureCueBinary: vi.fn(() => {
      cue.installed = true;
      return { status: "installed" };
    }),
    evaluateCueFile: vi.fn((file: string) => {
      if (!cue.installed)
        return {
          success: false,
          missingCli: true,
          error: "'cue' command not found in PATH",
        };
      const data: Record<string, unknown> = {};
      for (const match of read(file, "utf8").matchAll(
        /^[\t ]*(language|model_preset):[\t ]*"([^"]*)"[\t ]*$/gm,
      ))
        data[match[1] as string] = match[2];
      return { success: true, data };
    }),
  };
});

const { ensureCueBinary } = await import("../../utils/cue.js");
const { persistInstallPreferences } = await import("./persist-preferences.js");
const { readVendorsFromConfig } = await import(
  "../../platform/skills-installer.js"
);

describe("persistInstallPreferences", () => {
  let root: string;
  let agents: string;
  const choices = {
    language: "ko",
    modelPreset: "claude",
    vendors: ["codex" as const, "claude" as const],
    devToolsBrowsers: [],
    providers: {
      providers: {
        web: "native",
        code_intelligence: "gortex" as const,
        semantic_memory: "agentmemory" as const,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cue.installed = false;
    root = mkdtempSync(join(tmpdir(), "oma-persist-prefs-"));
    agents = join(root, ".agents");
    mkdirSync(agents, { recursive: true });
    vi.stubEnv("OMA_HOME", join(root, "global-home"));
    vi.stubEnv("OMA_MODEL_PRESET", undefined);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("ensures the cue binary before saving a CUE-only project's choices", () => {
    writeFileSync(
      join(agents, "oma-config.cue"),
      'package config\n\nlanguage: "en"\nmodel_preset: "auto"\n',
    );

    // Serena is not selected: the cue check must not depend on that branch.
    const { cueChecked } = persistInstallPreferences(root, choices);

    expect(cueChecked).toBe(true);
    expect(ensureCueBinary).toHaveBeenCalledTimes(1);
    expect(readVendorsFromConfig(root)).toEqual(["codex", "claude"]);
    const overlay = parse(
      readFileSync(join(agents, "oma-config.local.yaml"), "utf8"),
    );
    expect(overlay.vendors).toEqual(["codex", "claude"]);
    expect(overlay.providers).toEqual({ code_intelligence: "gortex" });
    expect(log.warn).not.toHaveBeenCalledWith(
      expect.stringContaining("cannot be evaluated"),
    );
  });

  it("leaves a YAML-only project's cue check to the Serena branch", () => {
    writeFileSync(
      join(agents, "oma-config.yaml"),
      "language: en\nmodel_preset: auto\n",
    );

    const { cueChecked } = persistInstallPreferences(root, choices);

    expect(cueChecked).toBe(false);
    expect(ensureCueBinary).not.toHaveBeenCalled();
    expect(existsSync(join(agents, "oma-config.local.yaml"))).toBe(false);
    const saved = parse(readFileSync(join(agents, "oma-config.yaml"), "utf8"));
    expect(saved).toMatchObject({
      language: "ko",
      model_preset: "claude",
      vendors: ["codex", "claude"],
    });
  });
});
