// CUE-only projects (`.agents/oma-config.cue`, no `oma-config.yaml`) again:
// the install vendor selection, the install language / model_preset patch and
// `oma model propose --write` each wrote (or looked for) `oma-config.yaml`
// only, so in a CUE-only project the choice was silently dropped or refused.

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
import { patchUserConfig } from "../commands/install/preferences.js";
import {
  proposeMissingSlugs,
  writeProposalToFile,
} from "../commands/model/propose.js";
import { resolveUpdateVendors } from "../commands/update/vendors.js";
import {
  readVendorsFromConfig,
  writeVendorsToConfig,
} from "../platform/skills-installer.js";
import { loadConfigLayers } from "./config-layers.js";
import { evaluateCueFile } from "./cue.js";

vi.mock("./cue.js", () => ({ evaluateCueFile: vi.fn() }));
const { log } = vi.hoisted(() => ({
  log: { info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@clack/prompts", () => ({ log }));

/** Values the CUE file sets beyond its quoted `key: "value"` lines. */
let cueExtra: Record<string, unknown> = {};

/** Evaluate the CUE file the way `cue export` would for these fixtures. */
function fakeEvaluate(file: string) {
  const data: Record<string, unknown> = { ...cueExtra };
  for (const match of readFileSync(file, "utf8").matchAll(
    /^[\t ]*(language|model_preset):[\t ]*"([^"]*)"[\t ]*$/gm,
  ))
    data[match[1] as string] = match[2];
  return { success: true as const, data };
}

describe("CUE-only project install / propose writers", () => {
  let root: string;
  let agents: string;

  const cue = () => join(agents, "oma-config.cue");
  const shared = () => join(agents, "oma-config.yaml");
  const local = () => join(agents, "oma-config.local.yaml");
  const effective = () =>
    loadConfigLayers(root, process.env, { searchParents: false }).config;

  beforeEach(() => {
    vi.clearAllMocks();
    root = mkdtempSync(join(tmpdir(), "oma-cue-install-"));
    agents = join(root, ".agents");
    mkdirSync(agents, { recursive: true });
    vi.stubEnv("OMA_HOME", join(root, "global-home"));
    vi.stubEnv("OMA_MODEL_PRESET", undefined);
    cueExtra = {};
    writeFileSync(
      cue(),
      'package config\n\nlanguage: "en"\nmodel_preset: "auto"\n',
    );
    vi.mocked(evaluateCueFile).mockImplementation(fakeEvaluate);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("install vendor selection", () => {
    it("is read back by the vendor readers after patchUserConfig", () => {
      patchUserConfig(root, "en", "auto", ["codex", "claude"]);

      expect(readVendorsFromConfig(root)).toEqual(["codex", "claude"]);
      // `oma update` keeps an explicit selection authoritative.
      expect(resolveUpdateVendors(root)).toEqual(["claude", "codex"]);
      expect(existsSync(shared())).toBe(false);
      expect(parse(readFileSync(local(), "utf8"))).toEqual({
        vendors: ["codex", "claude"],
      });
      expect(log.info).toHaveBeenCalledWith(expect.stringContaining("vendors"));
    });

    it("keeps an explicit empty selection", () => {
      writeVendorsToConfig(root, []);
      expect(readVendorsFromConfig(root)).toEqual([]);
      expect(resolveUpdateVendors(root)).toEqual([]);
    });

    it("writes nothing when the selection is already in effect", () => {
      cueExtra = { vendors: ["claude"] };
      writeVendorsToConfig(root, ["claude"]);
      expect(existsSync(local())).toBe(false);
    });

    it("refuses to mask a CUE `vendors` map with the list, and says so", () => {
      cueExtra = { vendors: { pi: { command: "pi" } } };
      writeVendorsToConfig(root, ["claude"]);

      expect(existsSync(local())).toBe(false);
      expect(effective().vendors).toEqual({ pi: { command: "pi" } });
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("vendors"));
    });

    it("warns instead of dropping the selection while CUE cannot be evaluated", () => {
      vi.mocked(evaluateCueFile).mockReturnValue({
        success: false,
        error: "cue: command not found",
        missingCli: true,
      });
      writeVendorsToConfig(root, ["claude"]);
      expect(existsSync(local())).toBe(false);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("vendors"));
    });
  });

  it("keeps the shared oma-config.yaml vendor list when it sits beside the CUE file", () => {
    writeFileSync(
      shared(),
      "language: en\nmodel_preset: auto\nvendors:\n  - claude\n  - codex\n",
    );
    patchUserConfig(root, "en", "auto", ["claude"]);

    expect(parse(readFileSync(shared(), "utf8")).vendors).toEqual(["claude"]);
    expect(existsSync(local())).toBe(false);
    expect(readVendorsFromConfig(root)).toEqual(["claude"]);
  });

  it("warns instead of aborting the install when oma-config.local.cue is the overlay", () => {
    writeFileSync(join(agents, "oma-config.local.cue"), "package config\n");
    writeFileSync(cue(), 'package config\n\nlanguage: *"en" | string\n');
    cueExtra = { language: "en" };

    expect(() => patchUserConfig(root, "ko", "auto", ["claude"])).not.toThrow();
    expect(existsSync(local())).toBe(false);
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("oma-config.local.cue"),
    );
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("vendors"));
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("language"));
  });

  it("never corrupts an oma-config.yaml whose `vendors` is the pi map", () => {
    rmSync(cue());
    const text =
      "language: en\nmodel_preset: auto\nvendors:\n  pi:\n    command: pi\n";
    writeFileSync(shared(), text);
    writeVendorsToConfig(root, ["claude"]);

    expect(readFileSync(shared(), "utf8")).toBe(text);
    expect(effective().vendors).toEqual({ pi: { command: "pi" } });
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("vendors"));
  });

  describe("patchUserConfig language / model_preset", () => {
    it("patches quoted top-level lines in oma-config.cue in place", () => {
      patchUserConfig(root, "ko", "claude", ["claude"]);

      const text = readFileSync(cue(), "utf8");
      expect(text).toContain('language: "ko"');
      expect(text).toContain('model_preset: "claude"');
      expect(effective()).toMatchObject({
        language: "ko",
        model_preset: "claude",
      });
      expect(parse(readFileSync(local(), "utf8"))).toEqual({
        vendors: ["claude"],
      });
    });

    it("saves keys the regex cannot patch where they take effect", () => {
      const text =
        'package config\n\nlanguage: *"en" | string\nmodel_preset: *"auto" | string\n';
      writeFileSync(cue(), text);
      cueExtra = { language: "en", model_preset: "auto" };

      patchUserConfig(root, "ko", "claude", ["claude"]);

      expect(effective()).toMatchObject({
        language: "ko",
        model_preset: "claude",
      });
      expect(readFileSync(cue(), "utf8")).toBe(text);
      expect(existsSync(shared())).toBe(false);
      expect(log.info).toHaveBeenCalledWith(
        expect.stringContaining("language"),
      );
    });

    it("updates a local overlay that still overrides the patched keys", () => {
      writeFileSync(
        local(),
        "# mine\nlanguage: en\nmodel_preset: codex\ntimezone: Asia/Seoul\n",
      );

      patchUserConfig(root, "ko", "claude", ["claude"]);

      expect(readFileSync(cue(), "utf8")).toContain('language: "ko"');
      expect(effective()).toMatchObject({
        language: "ko",
        model_preset: "claude",
        timezone: "Asia/Seoul",
      });
      expect(readFileSync(local(), "utf8")).toContain("# mine");
      expect(log.info).toHaveBeenCalledWith(
        expect.stringContaining("language, model_preset"),
      );
    });

    it("leaves a local overlay alone when it already holds the choice", () => {
      const text = "language: ko\ntimezone: Asia/Seoul\n";
      writeFileSync(local(), text);
      cueExtra = { vendors: ["claude"] };

      patchUserConfig(root, "ko", "auto", ["claude"]);

      expect(readFileSync(local(), "utf8")).toBe(text);
    });

    it("warns when oma-config.local.cue still overrides a patched key", () => {
      writeFileSync(
        join(agents, "oma-config.local.cue"),
        'package config\n\nlanguage: "en"\n',
      );

      patchUserConfig(root, "ko", "auto", ["claude"]);

      expect(readFileSync(cue(), "utf8")).toContain('language: "ko"');
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringMatching(/oma-config\.local\.cue sets language,/),
      );
    });

    it("updates the local overlay of a YAML-only project too", () => {
      rmSync(cue());
      writeFileSync(shared(), "language: en\nmodel_preset: auto\n");
      writeFileSync(local(), "language: en\n");

      patchUserConfig(root, "ko", "auto", ["claude"]);

      expect(effective()).toMatchObject({
        language: "ko",
        model_preset: "auto",
      });
      expect(parse(readFileSync(local(), "utf8"))).toEqual({ language: "ko" });
    });

    it("warns when an unpatched key cannot be saved", () => {
      writeFileSync(cue(), 'package config\n\nlanguage: *"en" | string\n');
      vi.mocked(evaluateCueFile).mockReturnValue({
        success: false,
        error: "cue: command not found",
        missingCli: true,
      });

      patchUserConfig(root, "ko", "auto", ["claude"]);

      expect(existsSync(local())).toBe(false);
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining("language"),
      );
    });
  });

  describe("oma model propose --write", () => {
    const probed = (slug: string) => ({
      slug,
      probeResult: {
        slug,
        cli: "cursor",
        cliModel: slug.split("/")[1] as string,
        status: "accepted" as const,
        durationMs: 1,
      },
    });

    it("registers the proposed slug where the registry reads it", () => {
      cueExtra = {
        models: { "cursor/auto": { cli: "cursor", cli_model: "auto" } },
      };
      const result = writeProposalToFile(
        [probed("cursor/composer-3"), probed("cursor/auto")],
        root,
        "2026-10-15",
      );

      expect(result.error).toBeUndefined();
      expect(result.written).toEqual(["cursor/composer-3"]);
      expect(result.skipped).toEqual(["cursor/auto"]);
      expect(result.configPath).toBe(local());
      const models = effective().models as Record<string, unknown>;
      expect(models["cursor/composer-3"]).toMatchObject({
        cli: "cursor",
        cli_model: "composer-3",
      });
      expect(models["cursor/auto"]).toEqual({
        cli: "cursor",
        cli_model: "auto",
      });
      expect(existsSync(shared())).toBe(false);
    });

    it("keeps writing oma-config.yaml when it sits beside the CUE file", () => {
      writeFileSync(shared(), "language: en\nmodel_preset: auto\n");
      const result = writeProposalToFile(
        [probed("cursor/composer-3")],
        root,
        "2026-10-15",
      );
      expect(result.configPath).toBe(shared());
      expect(existsSync(local())).toBe(false);
    });

    it("skips a slug that only the CUE file beside oma-config.yaml defines", () => {
      writeFileSync(shared(), "language: en\nmodel_preset: auto\n");
      cueExtra = {
        models: { "cursor/auto": { cli: "cursor", cli_model: "auto" } },
      };
      const result = writeProposalToFile(
        [probed("cursor/auto"), probed("cursor/composer-3")],
        root,
        "2026-10-15",
      );

      expect(result.skipped).toEqual(["cursor/auto"]);
      expect(result.written).toEqual(["cursor/composer-3"]);
      expect(Object.keys(parse(readFileSync(shared(), "utf8")).models)).toEqual(
        ["cursor/composer-3"],
      );
    });

    it("names the CUE config in the printed proposal of a CUE-only project", () => {
      const text = proposeMissingSlugs(
        [probed("cursor/composer-3")],
        "2026-10-15",
        root,
      );
      expect(text).toContain(".agents/oma-config.cue");
      expect(text).toContain(".agents/oma-config.local.yaml");
      expect(text).not.toContain("# Add to .agents/oma-config.yaml");

      writeFileSync(shared(), "language: en\nmodel_preset: auto\n");
      expect(
        proposeMissingSlugs([probed("cursor/composer-3")], "2026-10-15", root),
      ).toContain("# Add to .agents/oma-config.yaml");
    });

    it("treats a CUE-only project nested under a YAML project as CUE-only", () => {
      writeFileSync(shared(), "language: en\nmodel_preset: auto\n");
      const nested = join(root, "pkg");
      mkdirSync(join(nested, ".agents"), { recursive: true });
      writeFileSync(
        join(nested, ".agents", "oma-config.cue"),
        "package config\n",
      );
      const result = writeProposalToFile(
        [probed("cursor/composer-3")],
        nested,
        "2026-10-15",
      );
      expect(result.configPath).toBe(
        join(nested, ".agents", "oma-config.local.yaml"),
      );
      expect(readFileSync(shared(), "utf8")).not.toContain("composer-3");
    });

    it("gives an accurate message while CUE cannot be evaluated", () => {
      vi.mocked(evaluateCueFile).mockReturnValue({
        success: false,
        error: "cue: command not found",
        missingCli: true,
      });
      const result = writeProposalToFile(
        [probed("cursor/composer-3")],
        root,
        "2026-10-15",
      );

      expect(result.written).toEqual([]);
      expect(result.error).toContain("cannot be evaluated");
      expect(result.error).not.toContain("oma install");
      expect(existsSync(local())).toBe(false);
    });
  });
});
