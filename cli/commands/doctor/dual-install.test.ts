/**
 * Tests for checkDualInstall — dual-install detection and drift reporting.
 *
 * Install metadata lives inside `<root>/.agents/skills/_version.json` since
 * the merge of `_install.json` into `_version.json`. Tests write the file
 * directly to a temp dir to control fixtures.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkDualInstall } from "./dual-install.js";

// ── Temp dir lifecycle ───────────────────────────────────────────────────────

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
  tempRoots.length = 0;
});

function makeTempRoot(prefix = "oma-dual-install-"): string {
  const root = mkdtempSync(`${tmpdir()}/${prefix}`);
  tempRoots.push(root);
  return root;
}

// ── Fixture helpers ──────────────────────────────────────────────────────────

type VersionFixture = {
  version: string;
  mode?: "project" | "global";
  schemaVersion?: number;
};

function writeVersionFile(root: string, fixture: VersionFixture): void {
  const versionDir = join(root, ".agents", "skills");
  mkdirSync(versionDir, { recursive: true });
  const payload: Record<string, unknown> = { version: fixture.version };
  if (fixture.mode !== undefined) payload.mode = fixture.mode;
  if (fixture.schemaVersion !== undefined) {
    payload.schemaVersion = fixture.schemaVersion;
  } else if (fixture.mode !== undefined) {
    payload.schemaVersion = 2;
  }
  writeFileSync(
    join(versionDir, "_version.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf-8",
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("checkDualInstall", () => {
  it("both installs present with matching version — no version-mismatch warning", async () => {
    const projectDir = makeTempRoot("proj-");
    const homeDir = makeTempRoot("home-");

    writeVersionFile(projectDir, { version: "8.5.0", mode: "project" });
    writeVersionFile(homeDir, { version: "8.5.0", mode: "global" });

    const result = await checkDualInstall(projectDir, homeDir);

    expect(result.project.installed).toBe(true);
    expect(result.global.installed).toBe(true);
    const versionMismatch = result.warnings.find((w) =>
      w.includes("Version mismatch"),
    );
    expect(versionMismatch).toBeUndefined();
  });

  it("both installs present with version mismatch — warning contains both versions and update hint", async () => {
    const projectDir = makeTempRoot("proj-");
    const homeDir = makeTempRoot("home-");

    writeVersionFile(projectDir, { version: "8.5.0", mode: "project" });
    writeVersionFile(homeDir, { version: "9.0.0", mode: "global" });

    const result = await checkDualInstall(projectDir, homeDir);

    const versionMismatch = result.warnings.find((w) =>
      w.includes("Version mismatch"),
    );
    expect(versionMismatch).toBeDefined();
    expect(versionMismatch).toContain("8.5.0");
    expect(versionMismatch).toContain("9.0.0");
    expect(versionMismatch).toContain("oma update");
  });

  it("project only — global is not installed, no version mismatch warning", async () => {
    const projectDir = makeTempRoot("proj-");
    const homeDir = makeTempRoot("home-");

    writeVersionFile(projectDir, { version: "8.5.0", mode: "project" });

    const result = await checkDualInstall(projectDir, homeDir);

    expect(result.project.installed).toBe(true);
    expect(result.global.installed).toBe(false);
    const versionMismatch = result.warnings.find((w) =>
      w.includes("Version mismatch"),
    );
    expect(versionMismatch).toBeUndefined();
  });

  it("global only — project is not installed", async () => {
    const projectDir = makeTempRoot("proj-");
    const homeDir = makeTempRoot("home-");

    writeVersionFile(homeDir, { version: "8.5.0", mode: "global" });

    const result = await checkDualInstall(projectDir, homeDir);

    expect(result.project.installed).toBe(false);
    expect(result.global.installed).toBe(true);
  });

  it("neither install present — warning suggests running install", async () => {
    const projectDir = makeTempRoot("proj-");
    const homeDir = makeTempRoot("home-");

    const result = await checkDualInstall(projectDir, homeDir);

    expect(result.project.installed).toBe(false);
    expect(result.global.installed).toBe(false);
    const hasInstallHint = result.warnings.some((w) => /oma install/i.test(w));
    expect(hasInstallHint).toBe(true);
  });

  it("project has wrong mode (global) — mode-mismatch warning", async () => {
    const projectDir = makeTempRoot("proj-");
    const homeDir = makeTempRoot("home-");

    writeVersionFile(projectDir, { version: "8.5.0", mode: "global" });
    writeVersionFile(homeDir, { version: "8.5.0", mode: "global" });

    const result = await checkDualInstall(projectDir, homeDir);

    const modeMismatch = result.warnings.find((w) =>
      w.includes('expected "project"'),
    );
    expect(modeMismatch).toBeDefined();
  });

  it("global has wrong mode (project) — mode-mismatch warning", async () => {
    const projectDir = makeTempRoot("proj-");
    const homeDir = makeTempRoot("home-");

    writeVersionFile(projectDir, { version: "8.5.0", mode: "project" });
    writeVersionFile(homeDir, { version: "8.5.0", mode: "project" });

    const result = await checkDualInstall(projectDir, homeDir);

    const modeMismatch = result.warnings.find((w) =>
      w.includes('expected "global"'),
    );
    expect(modeMismatch).toBeDefined();
  });

  it("legacy install (schemaVersion=1, no mode) emits backfill hint", async () => {
    const projectDir = makeTempRoot("proj-");
    const homeDir = makeTempRoot("home-");

    writeVersionFile(projectDir, { version: "8.0.0", schemaVersion: 1 });

    const result = await checkDualInstall(projectDir, homeDir);

    expect(result.project.installed).toBe(true);
    expect(result.project.mode).toBe(null);
    const backfillHint = result.warnings.find((w) =>
      w.includes("pre-dates the install-mode marker"),
    );
    expect(backfillHint).toBeDefined();
  });
});
