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
import { trustPiProject } from "./trust.js";

describe("trustPiProject", () => {
  let dir: string;
  let project: string;
  let trustPath: string;

  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), "oma-pi-trust-")));
    project = join(dir, "work", "app");
    mkdirSync(project, { recursive: true });
    mkdirSync(join(dir, "agent"));
    trustPath = join(dir, "agent", "trust.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("records the project as trusted with keys sorted", () => {
    writeFileSync(trustPath, JSON.stringify({ "/z": true, "/a": null }));

    expect(trustPiProject(trustPath, project)).toEqual({
      changed: true,
      alreadyTrusted: false,
    });
    const stored = JSON.parse(readFileSync(trustPath, "utf-8"));
    expect(Object.keys(stored)).toEqual(["/a", project, "/z"].sort());
    expect(stored[project]).toBe(true);
  });

  it("follows the nearest decision upward", () => {
    writeFileSync(trustPath, JSON.stringify({ [join(dir, "work")]: true }));
    expect(trustPiProject(trustPath, project).alreadyTrusted).toBe(true);

    writeFileSync(trustPath, JSON.stringify({ [join(dir, "work")]: false }));
    const denied = trustPiProject(trustPath, project);
    expect(denied.changed).toBe(false);
    expect(denied.reason).toContain("untrusted");
  });

  it("skips when pi has never run", () => {
    const missing = join(dir, "nope", "trust.json");
    expect(trustPiProject(missing, project).changed).toBe(false);
  });
});
