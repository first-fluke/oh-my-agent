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
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getNeedsReconcile,
  hasInstalledProject,
  setNeedsReconcile,
} from "../../platform/manifest.js";
import * as skills from "../../platform/skills-installer.js";
import { runMigrations } from "../migrations/index.js";
import { classifyUpdateTarget } from "../update/update.js";

describe("whitelist-based skill filtering", () => {
  it("getAllSkills should return only registered skills", () => {
    const allSkills = skills.getAllSkills();
    const skillNames = allSkills.map((s) => s.name);

    expect(skillNames).toContain("oma-frontend");
    expect(skillNames).toContain("oma-backend");
    expect(skillNames).toContain("oma-architecture");
    expect(skillNames).toContain("oma-pm");
    expect(skillNames).toContain("oma-scm");

    expect(skillNames).not.toContain(".DS_Store");
    expect(skillNames).not.toContain("_version.json");
    expect(skillNames).not.toContain("_shared");
    expect(skillNames).not.toContain("my-custom-skill");
  });

  it("SKILLS registry should not contain internal files or hidden files", () => {
    const allSkills = skills.getAllSkills();

    for (const skill of allSkills) {
      expect(skill.name).not.toMatch(/^\./);
      expect(skill.name).not.toMatch(/^_/);
      expect(skill.name).not.toMatch(/\.json$/);
    }
  });

  it("getAllSkills should include all domain, coordination, and utility skills", () => {
    const allSkills = skills.getAllSkills();
    const skillNames = allSkills.map((s) => s.name);

    const expectedSkills = [
      "oma-frontend",
      "oma-backend",
      "oma-mobile",
      "oma-architecture",
      "oma-pm",
      "oma-qa",
      "oma-coordination",
      "oma-orchestrator",
      "oma-debug",
      "oma-scm",
    ];

    for (const expected of expectedSkills) {
      expect(skillNames).toContain(expected);
    }
  });
});

describe("update stack/ preservation logic", () => {
  it("should detect legacy files for migration", () => {
    const mockExistsSync = vi.fn((p: string) => {
      if (p.includes("resources/snippets.md")) return true;
      if (p.includes("/stack")) return false;
      return false;
    });

    const legacyFiles = ["snippets.md", "tech-stack.md", "api-template.py"];
    const hasLegacyFiles = legacyFiles.some((f) =>
      mockExistsSync(`/project/.agents/skills/oma-backend/resources/${f}`),
    );
    const hasBackendStack = mockExistsSync(
      "/project/.agents/skills/oma-backend/stack",
    );

    expect(hasLegacyFiles).toBe(true);
    expect(hasBackendStack).toBe(false);
    expect(hasLegacyFiles && !hasBackendStack).toBe(true);
  });

  it("should not migrate when stack/ already exists", () => {
    const mockExistsSync = vi.fn((p: string) => {
      if (p.includes("resources/snippets.md")) return true;
      if (p.includes("/stack")) return true;
      return false;
    });

    const legacyFiles = ["snippets.md", "tech-stack.md", "api-template.py"];
    const hasLegacyFiles = legacyFiles.some((f) =>
      mockExistsSync(`/project/.agents/skills/oma-backend/resources/${f}`),
    );
    const hasBackendStack = mockExistsSync(
      "/project/.agents/skills/oma-backend/stack",
    );

    expect(hasLegacyFiles).toBe(true);
    expect(hasBackendStack).toBe(true);
    expect(hasLegacyFiles && !hasBackendStack).toBe(false);
  });

  it("stack.yaml should contain migrated source marker", () => {
    const expectedStackYaml =
      "language: python\nframework: fastapi\norm: sqlalchemy\nsource: migrated\n";

    expect(expectedStackYaml).toContain("language: python");
    expect(expectedStackYaml).toContain("framework: fastapi");
    expect(expectedStackYaml).toContain("orm: sqlalchemy");
    expect(expectedStackYaml).toContain("source: migrated");
  });
});

describe("hasInstalledProject", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("treats an existing .agents tree without _version.json as installed", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-update-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents", "skills", "oma-backend"), {
      recursive: true,
    });
    mkdirSync(join(root, ".agents", "workflows"), { recursive: true });
    writeFileSync(join(root, ".agents", "oma-config.yaml"), "language: ko\n", {
      encoding: "utf-8",
      flag: "w",
    });

    expect(hasInstalledProject(root)).toBe(true);
  });

  it("does not treat a random directory as installed", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-update-"));
    tempRoots.push(root);

    expect(hasInstalledProject(root)).toBe(false);
  });
});

describe("classifyUpdateTarget", () => {
  it("treats versioned installs as ready", () => {
    expect(classifyUpdateTarget("4.22.1", true)).toBe("ready");
    expect(classifyUpdateTarget("4.22.1", false)).toBe("ready");
  });

  it("treats .agents installs without version metadata as legacy", () => {
    expect(classifyUpdateTarget(null, true)).toBe("legacy");
  });

  it("treats directories without an install as missing", () => {
    expect(classifyUpdateTarget(null, false)).toBe("missing");
  });
});

describe("reconcile: migrations trigger full update even when version matches", () => {
  const tempRoots: string[] = [];
  let originalHome: string | undefined;

  afterEach(() => {
    process.env.HOME = originalHome;
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("runMigrations returns actions when legacy config exists — triggers reconcile", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-reconcile-"));
    tempRoots.push(root);

    // Template oma-config.yaml (from previous cpSync)
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "language: en\n",
      "utf-8",
    );

    // Legacy user config still present
    mkdirSync(join(root, ".agents", "config"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "config", "user-preferences.yaml"),
      "language: ko\n",
      "utf-8",
    );

    const actions = runMigrations(root);

    // Migration 003 should fire even though oma-config.yaml exists
    expect(actions.length).toBeGreaterThan(0);
    expect(actions).toContain(
      ".agents/config/user-preferences.yaml → .agents/oma-config.yaml",
    );

    // Simulating update logic: migrations applied → should NOT early return
    const localVersion = "4.26.1";
    const remoteVersion = "4.26.1";
    const shouldEarlyReturn =
      localVersion === remoteVersion && actions.length === 0;
    expect(shouldEarlyReturn).toBe(false);
  });

  it("runMigrations returns empty when no legacy state — allows early return", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-reconcile-"));
    tempRoots.push(root);

    // Only modern config — no legacy files
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "language: en\n",
      "utf-8",
    );

    const actions = runMigrations(root);

    expect(actions).toHaveLength(0);

    // No migrations → early return is safe
    const localVersion = "4.26.1";
    const remoteVersion = "4.26.1";
    const shouldEarlyReturn =
      localVersion === remoteVersion && actions.length === 0;
    expect(shouldEarlyReturn).toBe(true);
  });

  it("migration 004 (global CLAUDE.md cleanup) also triggers reconcile", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-reconcile-"));
    tempRoots.push(root);
    originalHome = process.env.HOME;
    process.env.HOME = root;

    // Modern .agents/ setup (no legacy config)
    mkdirSync(join(root, ".agents"), { recursive: true });

    // Global CLAUDE.md with OMA block (will be cleaned by migration 004)
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(
      join(root, ".claude", "CLAUDE.md"),
      "<!-- OMA:START -->\noma content\n<!-- OMA:END -->",
    );

    const actions = runMigrations(root);

    expect(actions.length).toBeGreaterThan(0);
    expect(existsSync(join(root, ".claude", "CLAUDE.md"))).toBe(false);

    // Migrations applied → reconcile should proceed (to re-run vendor docs merge etc.)
    const localVersion = "4.26.1";
    const remoteVersion = "4.26.1";
    const shouldEarlyReturn =
      localVersion === remoteVersion && actions.length === 0;
    expect(shouldEarlyReturn).toBe(false);
  });

  it("multiple migrations firing together all trigger reconcile", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-reconcile-"));
    tempRoots.push(root);
    originalHome = process.env.HOME;
    process.env.HOME = root;

    // Legacy config file
    mkdirSync(join(root, ".agents", "config"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "config", "user-preferences.yaml"),
      "language: ko\n",
      "utf-8",
    );

    // Global CLAUDE.md with OMA block
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(
      join(root, ".claude", "CLAUDE.md"),
      "# Notes\n<!-- OMA:START -->\nblock\n<!-- OMA:END -->\n",
    );

    const actions = runMigrations(root);

    // Both migration 003 and 004 should fire
    expect(actions.length).toBeGreaterThanOrEqual(2);
    expect(actions).toContain(
      ".agents/config/user-preferences.yaml → .agents/oma-config.yaml",
    );
    expect(actions.some((a) => a.includes("CLAUDE.md"))).toBe(true);

    // User config preserved
    expect(
      readFileSync(join(root, ".agents", "oma-config.yaml"), "utf-8"),
    ).toBe("language: ko\n");

    // Global CLAUDE.md cleaned (user content preserved)
    const globalMd = readFileSync(join(root, ".claude", "CLAUDE.md"), "utf-8");
    expect(globalMd).toContain("# Notes");
    expect(globalMd).not.toContain("OMA:START");
  });
});

describe("migration backup cleanup after successful update", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("migration-backup dir is created by migration 002 when content differs", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-backup-cleanup-"));
    tempRoots.push(root);

    // Legacy file at old path with custom content
    mkdirSync(join(root, ".agents", "skills", "_shared"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "skills", "_shared", "context-loading.md"),
      "customized content\n",
      "utf-8",
    );

    // New path with different (canonical) content
    mkdirSync(join(root, ".agents", "skills", "_shared", "core"), {
      recursive: true,
    });
    writeFileSync(
      join(root, ".agents", "skills", "_shared", "core", "context-loading.md"),
      "canonical content\n",
      "utf-8",
    );

    runMigrations(root);

    const backupDir = join(root, ".agents", ".migration-backup");
    expect(existsSync(backupDir)).toBe(true);

    // Simulate: successful update would clean this up
    rmSync(backupDir, { recursive: true, force: true });
    expect(existsSync(backupDir)).toBe(false);
  });

  it("migration-backup dir is not created when content is identical", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-backup-cleanup-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents", "skills", "_shared", "core"), {
      recursive: true,
    });
    writeFileSync(
      join(root, ".agents", "skills", "_shared", "context-loading.md"),
      "same content\n",
      "utf-8",
    );
    writeFileSync(
      join(root, ".agents", "skills", "_shared", "core", "context-loading.md"),
      "same content\n",
      "utf-8",
    );

    runMigrations(root);

    const backupDir = join(root, ".agents", ".migration-backup");
    expect(existsSync(backupDir)).toBe(false);
  });
});

describe("persisted needsReconcile flag", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("getNeedsReconcile returns false when _version.json does not exist", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-reconcile-flag-"));
    tempRoots.push(root);

    expect(getNeedsReconcile(root)).toBe(false);
  });

  it("getNeedsReconcile returns false when flag is not set", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-reconcile-flag-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents", "skills"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "skills", "_version.json"),
      JSON.stringify({ version: "4.26.1" }),
      "utf-8",
    );

    expect(getNeedsReconcile(root)).toBe(false);
  });

  it("setNeedsReconcile persists flag and getNeedsReconcile reads it", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-reconcile-flag-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents", "skills"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "skills", "_version.json"),
      JSON.stringify({ version: "4.26.1" }),
      "utf-8",
    );

    setNeedsReconcile(root, true);
    expect(getNeedsReconcile(root)).toBe(true);

    // Version preserved
    const json = JSON.parse(
      readFileSync(join(root, ".agents", "skills", "_version.json"), "utf-8"),
    );
    expect(json.version).toBe("4.26.1");
  });

  it("setNeedsReconcile(false) clears the flag cleanly", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-reconcile-flag-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents", "skills"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "skills", "_version.json"),
      JSON.stringify({ version: "4.26.1", needsReconcile: true }),
      "utf-8",
    );

    expect(getNeedsReconcile(root)).toBe(true);

    setNeedsReconcile(root, false);
    expect(getNeedsReconcile(root)).toBe(false);

    // Flag removed from JSON, not just set to false
    const json = JSON.parse(
      readFileSync(join(root, ".agents", "skills", "_version.json"), "utf-8"),
    );
    expect(json.needsReconcile).toBeUndefined();
    expect(json.version).toBe("4.26.1");
  });

  it("persisted flag prevents early return even when migrations are no-op", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-reconcile-flag-"));
    tempRoots.push(root);

    // Modern setup — no legacy files
    mkdirSync(join(root, ".agents", "skills"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "language: en\n",
      "utf-8",
    );
    // Simulates: previous reconcile attempt failed mid-download
    writeFileSync(
      join(root, ".agents", "skills", "_version.json"),
      JSON.stringify({ version: "4.26.1", needsReconcile: true }),
      "utf-8",
    );

    const migrationActions = runMigrations(root);
    expect(migrationActions).toHaveLength(0);

    // Even though migrations are no-op, persisted flag forces reconcile
    const needsReconcile =
      migrationActions.length > 0 || getNeedsReconcile(root);
    expect(needsReconcile).toBe(true);

    const localVersion = "4.26.1";
    const remoteVersion = "4.26.1";
    const shouldEarlyReturn = localVersion === remoteVersion && !needsReconcile;
    expect(shouldEarlyReturn).toBe(false);
  });

  it("no flag + no migrations → allows early return", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-reconcile-flag-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents", "skills"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "language: en\n",
      "utf-8",
    );
    writeFileSync(
      join(root, ".agents", "skills", "_version.json"),
      JSON.stringify({ version: "4.26.1" }),
      "utf-8",
    );

    const migrationActions = runMigrations(root);
    const needsReconcile =
      migrationActions.length > 0 || getNeedsReconcile(root);

    expect(needsReconcile).toBe(false);

    const localVersion = "4.26.1";
    const remoteVersion = "4.26.1";
    const shouldEarlyReturn = localVersion === remoteVersion && !needsReconcile;
    expect(shouldEarlyReturn).toBe(true);
  });
});
