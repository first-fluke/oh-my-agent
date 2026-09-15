/**
 * Regression — antigravity is a homeOnly vendor: agy never reads a
 * project-scoped `.gemini/antigravity-cli/` (settings live in HOME, workspace
 * hooks in `.agents/hooks.json`), so installVendorAdaptations must NOT
 * materialize one, and must sweep the dead directory left by earlier installs.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fakeHome = { dir: "" };

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return { ...actual, homedir: () => fakeHome.dir || actual.homedir() };
});

import { installVendorAdaptations } from "./vendor-adapter.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STALE_REL = join(".gemini", "antigravity-cli");

function makeStaleInstall(root: string): void {
  const hooksDir = join(root, STALE_REL, "hooks");
  mkdirSync(hooksDir, { recursive: true });
  writeFileSync(join(hooksDir, "oma-hook.sh"), "#!/bin/sh\nexit 0\n");
  writeFileSync(
    join(root, STALE_REL, "settings.json"),
    JSON.stringify({ hooks: {}, homeOnly: true }),
  );
}

describe("installVendorAdaptations — antigravity homeOnly", () => {
  let installRoot: string;

  beforeEach(() => {
    installRoot = mkdtempSync(join(tmpdir(), "oma-vendor-adapter-"));
    fakeHome.dir = mkdtempSync(join(tmpdir(), "oma-fake-home-"));
  });

  afterEach(() => {
    rmSync(installRoot, { recursive: true, force: true });
    rmSync(fakeHome.dir, { recursive: true, force: true });
    fakeHome.dir = "";
  });

  it("does not create a project .gemini/antigravity-cli/ install", () => {
    installVendorAdaptations(repoRoot, installRoot, ["antigravity"]);
    expect(existsSync(join(installRoot, STALE_REL))).toBe(false);
  });

  it("sweeps a stale project .gemini/antigravity-cli/ left by earlier installs", () => {
    makeStaleInstall(installRoot);

    installVendorAdaptations(repoRoot, installRoot, ["antigravity"]);

    expect(existsSync(join(installRoot, STALE_REL))).toBe(false);
    // The parent `.gemini/` held nothing else — swept too.
    expect(existsSync(join(installRoot, ".gemini"))).toBe(false);
  });

  it("keeps .gemini/ when the gemini vendor owns files in it", () => {
    makeStaleInstall(installRoot);
    writeFileSync(join(installRoot, ".gemini", "settings.json"), "{}");

    installVendorAdaptations(repoRoot, installRoot, ["antigravity"]);

    expect(existsSync(join(installRoot, STALE_REL))).toBe(false);
    expect(existsSync(join(installRoot, ".gemini", "settings.json"))).toBe(
      true,
    );
  });

  it("never sweeps when installRoot is HOME — that path IS agy's real config", () => {
    makeStaleInstall(fakeHome.dir);

    installVendorAdaptations(repoRoot, fakeHome.dir, ["antigravity"]);

    expect(existsSync(join(fakeHome.dir, STALE_REL, "settings.json"))).toBe(
      true,
    );
  });
});

describe("installVendorAdaptations — Qwen native agents", () => {
  let installRoot: string;

  beforeEach(() => {
    installRoot = mkdtempSync(join(tmpdir(), "oma-qwen-vendor-adapter-"));
  });

  afterEach(() => {
    rmSync(installRoot, { recursive: true, force: true });
  });

  it("installs Qwen Code project subagents during vendor reconciliation", () => {
    installVendorAdaptations(repoRoot, installRoot, ["qwen"]);

    const backendAgent = join(
      installRoot,
      ".qwen",
      "agents",
      "backend-engineer.md",
    );
    expect(existsSync(backendAgent)).toBe(true);
  });
});
