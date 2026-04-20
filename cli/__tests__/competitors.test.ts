import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanLeftoverDirs } from "../cli-kit/competitors.js";

describe("cleanLeftoverDirs", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("removes .omc directory from cwd", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-competitor-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".omc"), { recursive: true });
    writeFileSync(join(root, ".omc", "config.json"), "{}", "utf-8");

    cleanLeftoverDirs(root);

    expect(existsSync(join(root, ".omc"))).toBe(false);
  });

  it("removes .omx directory from cwd", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-competitor-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".omx"), { recursive: true });

    cleanLeftoverDirs(root);

    expect(existsSync(join(root, ".omx"))).toBe(false);
  });

  it("removes both .omc and .omx when both exist", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-competitor-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".omc"), { recursive: true });
    mkdirSync(join(root, ".omx"), { recursive: true });

    cleanLeftoverDirs(root);

    expect(existsSync(join(root, ".omc"))).toBe(false);
    expect(existsSync(join(root, ".omx"))).toBe(false);
  });

  it("does nothing when no leftover dirs exist", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-competitor-"));
    tempRoots.push(root);

    expect(() => cleanLeftoverDirs(root)).not.toThrow();
  });

  it("does not remove unrelated directories", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-competitor-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents"), { recursive: true });
    mkdirSync(join(root, ".omc"), { recursive: true });

    cleanLeftoverDirs(root);

    expect(existsSync(join(root, ".agents"))).toBe(true);
    expect(existsSync(join(root, ".omc"))).toBe(false);
  });
});
