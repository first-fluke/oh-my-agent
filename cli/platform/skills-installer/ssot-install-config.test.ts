// installConfigs places the shared oma-config by the same rule as
// `oma update` (syncSharedConfig): never create a second shared source, and
// `force` resets only the file(s) the user already has.

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
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installConfigs } from "./ssot-install.js";

const TEMPLATE_CUE = 'package config\n\nlanguage: "en"\n';
const TEMPLATE_YAML = "language: en\n";

describe("installConfigs shared oma-config", () => {
  let repo: string;
  let project: string;
  const agents = () => join(project, ".agents");

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "oma-install-config-repo-"));
    project = mkdtempSync(join(tmpdir(), "oma-install-config-project-"));
    mkdirSync(join(repo, ".agents"), { recursive: true });
    mkdirSync(agents(), { recursive: true });
    writeFileSync(join(repo, ".agents", "oma-config.cue"), TEMPLATE_CUE);
    writeFileSync(join(repo, ".agents", "oma-config.yaml"), TEMPLATE_YAML);
  });
  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  });

  it("bootstraps only the CUE template when the user has neither", () => {
    installConfigs(repo, project);
    expect(readFileSync(join(agents(), "oma-config.cue"), "utf8")).toBe(
      TEMPLATE_CUE,
    );
    expect(existsSync(join(agents(), "oma-config.yaml"))).toBe(false);
  });

  it("keeps the user's file untouched without force", () => {
    writeFileSync(join(agents(), "oma-config.yaml"), "language: ko\n");
    installConfigs(repo, project);
    expect(readFileSync(join(agents(), "oma-config.yaml"), "utf8")).toBe(
      "language: ko\n",
    );
    expect(existsSync(join(agents(), "oma-config.cue"))).toBe(false);
  });

  it("force resets a YAML-only user's file without adding oma-config.cue", () => {
    writeFileSync(join(agents(), "oma-config.yaml"), "language: ko\n");
    installConfigs(repo, project, true);
    expect(readFileSync(join(agents(), "oma-config.yaml"), "utf8")).toBe(
      TEMPLATE_YAML,
    );
    expect(existsSync(join(agents(), "oma-config.cue"))).toBe(false);
  });

  it("force resets a CUE-only user's file without adding oma-config.yaml", () => {
    writeFileSync(join(agents(), "oma-config.cue"), 'language: "ko"\n');
    installConfigs(repo, project, true);
    expect(readFileSync(join(agents(), "oma-config.cue"), "utf8")).toBe(
      TEMPLATE_CUE,
    );
    expect(existsSync(join(agents(), "oma-config.yaml"))).toBe(false);
  });

  it("force bootstraps the CUE template when the user has neither", () => {
    installConfigs(repo, project, true);
    expect(existsSync(join(agents(), "oma-config.cue"))).toBe(true);
    expect(existsSync(join(agents(), "oma-config.yaml"))).toBe(false);
  });
});
