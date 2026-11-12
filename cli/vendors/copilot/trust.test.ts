import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trustCopilotFolder } from "./trust.js";

const HEADER =
  "// User settings belong in settings.json.\n// This file is managed automatically.\n";

describe("trustCopilotFolder", () => {
  let dir: string;
  let project: string;
  let configPath: string;

  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), "oma-copilot-trust-")));
    project = join(dir, "project");
    mkdirSync(join(project, "sub"), { recursive: true });
    configPath = join(dir, "config.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("appends the project's realpath and keeps the header and other keys", () => {
    writeFileSync(
      configPath,
      `${HEADER}{\n  "trustedFolders": ["/elsewhere"],\n  "appTipShown": true\n}\n`,
    );

    expect(trustCopilotFolder(configPath, project)).toEqual({
      changed: true,
      alreadyTrusted: false,
    });
    const text = readFileSync(configPath, "utf-8");
    expect(text.startsWith(HEADER)).toBe(true);
    expect(JSON.parse(text.slice(HEADER.length))).toEqual({
      trustedFolders: ["/elsewhere", project],
      appTipShown: true,
    });
  });

  it("treats a trusted parent or legacy entry as already trusting the project", () => {
    writeFileSync(configPath, JSON.stringify({ trustedFolders: [dir] }));
    expect(
      trustCopilotFolder(configPath, join(project, "sub")).alreadyTrusted,
    ).toBe(true);
    writeFileSync(configPath, JSON.stringify({ trusted_folders: [project] }));
    expect(trustCopilotFolder(configPath, project).alreadyTrusted).toBe(true);
  });

  it("does not let a sibling with a shared prefix cover the project", () => {
    writeFileSync(
      configPath,
      JSON.stringify({ trustedFolders: [`${project}-old`] }),
    );
    expect(trustCopilotFolder(configPath, project).changed).toBe(true);
  });

  it("skips a missing or unparseable config", () => {
    expect(trustCopilotFolder(configPath, project).changed).toBe(false);
    writeFileSync(configPath, "{ nope");
    expect(trustCopilotFolder(configPath, project).changed).toBe(false);
    expect(readFileSync(configPath, "utf-8")).toBe("{ nope");
  });
});
