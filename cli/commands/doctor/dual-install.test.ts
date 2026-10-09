/**
 * Tests for checkDualInstall — dual-install detection and drift reporting.
 *
 * Install metadata lives inside `<root>/.agents/skills/_version.json` since
 * the merge of `_install.json` into `_version.json`. Tests write the file
 * directly to a temp dir to control fixtures.
 */

import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkDualInstall,
  checkOmaPathInstalls,
  findOmaOnPath,
} from "./dual-install.js";

// ── Temp dir lifecycle ───────────────────────────────────────────────────────

const tempRoots: string[] = [];

beforeEach(() => vi.stubEnv("OMA_HOME", ""));

afterEach(() => {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
  tempRoots.length = 0;
  vi.unstubAllEnvs();
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
  it("reads the explicit OMA home rather than the native vendor home", async () => {
    const projectDir = makeTempRoot("proj-");
    const homeDir = makeTempRoot("home-");
    const omaRoot = makeTempRoot("oma-");
    writeVersionFile(omaRoot, { version: "9.1.0", mode: "global" });
    writeVersionFile(homeDir, { version: "8.0.0", mode: "global" });
    vi.stubEnv("OMA_HOME", omaRoot);
    const result = await checkDualInstall(projectDir, homeDir);
    expect(result.global).toMatchObject({ installed: true, version: "9.1.0" });
  });
  it("both installs present with matching version — no version-mismatch warning", async () => {
    const projectDir = makeTempRoot("proj-");
    const homeDir = makeTempRoot("home-");

    writeVersionFile(projectDir, { version: "8.5.0", mode: "project" });
    writeVersionFile(join(homeDir, ".oma"), {
      version: "8.5.0",
      mode: "global",
    });

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
    writeVersionFile(join(homeDir, ".oma"), {
      version: "9.0.0",
      mode: "global",
    });

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

    writeVersionFile(join(homeDir, ".oma"), {
      version: "8.5.0",
      mode: "global",
    });

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
    writeVersionFile(join(homeDir, ".oma"), {
      version: "8.5.0",
      mode: "global",
    });

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
    writeVersionFile(join(homeDir, ".oma"), {
      version: "8.5.0",
      mode: "project",
    });

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

describe("oma installs on PATH", () => {
  // Lay out <root>/<name>/lib/oh-my-agent/{package.json,bin/cli.js} and a
  // <root>/<name>/bin/oma symlink, the shape npm and bun global installs use.
  function installAt(root: string, name: string, version: string): string {
    const pkg = join(root, name, "lib", "oh-my-agent");
    mkdirSync(join(pkg, "bin"), { recursive: true });
    writeFileSync(
      join(pkg, "package.json"),
      JSON.stringify({ name: "oh-my-agent", version }),
    );
    writeFileSync(join(pkg, "bin", "cli.js"), "");
    const binDir = join(root, name, "bin");
    mkdirSync(binDir, { recursive: true });
    symlinkSync(join(pkg, "bin", "cli.js"), join(binDir, "oma"));
    return binDir;
  }

  it.skipIf(process.platform === "win32")(
    "lists distinct installs in PATH order with their versions",
    () => {
      const root = makeTempRoot();
      const stale = installAt(root, "homebrew", "15.0.17");
      const current = installAt(root, "mise", "15.6.0");
      const shimDir = join(root, "shims");
      mkdirSync(shimDir);
      writeFileSync(join(shimDir, "oma"), "#!/bin/sh\n");

      const found = findOmaOnPath(
        [shimDir, stale, current, stale].join(delimiter),
        "darwin",
      );

      expect(found).toEqual([
        { path: join(stale, "oma"), version: "15.0.17" },
        { path: join(current, "oma"), version: "15.6.0" },
      ]);
    },
  );

  it("warns only when the versions on PATH differ", () => {
    expect(
      checkOmaPathInstalls([
        { path: "/opt/homebrew/bin/oma", version: "15.0.17" },
        { path: "/home/u/.bun/bin/oma", version: "15.6.0" },
      ]),
    ).toEqual([
      expect.stringContaining(
        "/opt/homebrew/bin/oma (15.0.17), /home/u/.bun/bin/oma (15.6.0)",
      ),
    ]);
    expect(
      checkOmaPathInstalls([
        { path: "/a/oma", version: "15.6.0" },
        { path: "/b/oma", version: "15.6.0" },
      ]),
    ).toEqual([]);
    expect(checkOmaPathInstalls([])).toEqual([]);
  });
});
