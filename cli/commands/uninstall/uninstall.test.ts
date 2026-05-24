import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _resetInstallContext,
  setInstallContext,
} from "../../platform/install-context.js";
import { buildRemovalPlan, uninstall } from "./uninstall.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "oma-uninstall-test-"));
  tmpDirs.push(d);
  return d;
}

/**
 * Seed a minimal oma-installed layout under `root`:
 *  - .agents/skills/oma-frontend/  (real dir — oma-owned)
 *  - .agents/workflows/            (real dir — oma-owned)
 *  - .agents/rules/                (real dir — oma-owned)
 *  - .agents/config/               (real dir — oma-owned)
 *  - .agents/_install.json         (file — oma metadata)
 *  - .agents/oma-config.yaml       (file — user-owned)
 *  - .agents/mcp.json              (file — user-owned)
 *  - .claude/skills/oma-frontend -> .agents/skills/oma-frontend  (symlink — oma-owned)
 *  - .claude/skills/my-custom/     (real dir — user-authored)
 */
function seedOmaLayout(root: string): void {
  // SSOT dirs
  const agentsDir = path.join(root, ".agents");
  const skillDir = path.join(agentsDir, "skills", "oma-frontend");
  const workflowsDir = path.join(agentsDir, "workflows");
  const rulesDir = path.join(agentsDir, "rules");
  const configDir = path.join(agentsDir, "config");

  fs.mkdirSync(skillDir, { recursive: true });
  fs.mkdirSync(workflowsDir, { recursive: true });
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });

  // Metadata now lives inside _version.json (see Plan A merge)
  fs.writeFileSync(
    path.join(agentsDir, "skills", "_version.json"),
    JSON.stringify({ schemaVersion: 2, version: "8.5.2", mode: "project" }),
    "utf-8",
  );

  // User-owned
  fs.writeFileSync(
    path.join(agentsDir, "oma-config.yaml"),
    "language: en\n",
    "utf-8",
  );
  fs.writeFileSync(
    path.join(agentsDir, "mcp.json"),
    JSON.stringify({ mcpServers: {} }),
    "utf-8",
  );

  // Vendor symlink (oma-owned)
  const claudeSkillsDir = path.join(root, ".claude", "skills");
  fs.mkdirSync(claudeSkillsDir, { recursive: true });
  fs.symlinkSync(skillDir, path.join(claudeSkillsDir, "oma-frontend"));

  // User-authored real dir (not a symlink)
  fs.mkdirSync(path.join(claudeSkillsDir, "my-custom"), { recursive: true });
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  _resetInstallContext();
});

afterEach(() => {
  _resetInstallContext();
  for (const d of tmpDirs) {
    fs.rmSync(d, { recursive: true, force: true });
  }
  tmpDirs.length = 0;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("buildRemovalPlan", () => {
  it("dry-run: produces expected oma-owned entries and does not modify the fs", () => {
    const root = makeTmpDir();
    setInstallContext({ installRoot: root, mode: "project" });
    seedOmaLayout(root);

    const { omaOwned, userOwned } = buildRemovalPlan(root);

    // oma-owned: skill dir, workflows, rules, config, oma-frontend symlink
    // (_version.json — which now carries install metadata — lives inside
    // .agents/skills/ and is removed as part of the skills directory deletion)
    const omaOwnedPaths = omaOwned.map((e) => e.path);
    expect(omaOwnedPaths).toContain(
      path.join(root, ".agents", "skills", "oma-frontend"),
    );
    expect(omaOwnedPaths).toContain(path.join(root, ".agents", "workflows"));
    expect(omaOwnedPaths).toContain(path.join(root, ".agents", "rules"));
    expect(omaOwnedPaths).toContain(path.join(root, ".agents", "config"));
    expect(omaOwnedPaths).toContain(
      path.join(root, ".claude", "skills", "oma-frontend"),
    );

    // user-owned: oma-config.yaml, mcp.json, my-custom real dir
    const userOwnedPaths = userOwned.map((e) => e.path);
    expect(userOwnedPaths).toContain(
      path.join(root, ".agents", "oma-config.yaml"),
    );
    expect(userOwnedPaths).toContain(path.join(root, ".agents", "mcp.json"));
    expect(userOwnedPaths).toContain(
      path.join(root, ".claude", "skills", "my-custom"),
    );

    // oma-config.yaml must NOT be in omaOwned
    expect(omaOwnedPaths).not.toContain(
      path.join(root, ".agents", "oma-config.yaml"),
    );

    // Filesystem must be untouched
    expect(fs.existsSync(path.join(root, ".agents", "oma-config.yaml"))).toBe(
      true,
    );
    expect(
      fs.existsSync(path.join(root, ".agents", "skills", "_version.json")),
    ).toBe(true);
  });

  it("user-authored real dir in .claude/skills/ is in userOwned and NOT in omaOwned", () => {
    const root = makeTmpDir();
    setInstallContext({ installRoot: root, mode: "project" });
    seedOmaLayout(root);

    const { omaOwned, userOwned } = buildRemovalPlan(root);

    const myCustomPath = path.join(root, ".claude", "skills", "my-custom");
    expect(userOwned.map((e) => e.path)).toContain(myCustomPath);
    expect(omaOwned.map((e) => e.path)).not.toContain(myCustomPath);
  });

  it("oma-config.yaml is always in userOwned", () => {
    const root = makeTmpDir();
    setInstallContext({ installRoot: root, mode: "project" });
    seedOmaLayout(root);

    const { userOwned, omaOwned } = buildRemovalPlan(root);

    const cfgPath = path.join(root, ".agents", "oma-config.yaml");
    expect(userOwned.map((e) => e.path)).toContain(cfgPath);
    expect(omaOwned.map((e) => e.path)).not.toContain(cfgPath);
  });
});

describe("uninstall (actual removal with --yes)", () => {
  it("removes oma-owned entries and preserves user-owned files", async () => {
    const root = makeTmpDir();
    setInstallContext({ installRoot: root, mode: "project" });
    seedOmaLayout(root);

    await uninstall({ yes: true });

    // oma-owned dirs should be gone
    expect(fs.existsSync(path.join(root, ".agents", "workflows"))).toBe(false);
    expect(fs.existsSync(path.join(root, ".agents", "rules"))).toBe(false);
    expect(fs.existsSync(path.join(root, ".agents", "config"))).toBe(false);
    expect(
      fs.existsSync(path.join(root, ".agents", "skills", "oma-frontend")),
    ).toBe(false);

    // oma symlink in .claude/skills should be gone
    expect(
      fs.existsSync(path.join(root, ".claude", "skills", "oma-frontend")),
    ).toBe(false);

    // user-owned: oma-config.yaml must survive
    expect(fs.existsSync(path.join(root, ".agents", "oma-config.yaml"))).toBe(
      true,
    );

    // user-owned: mcp.json must survive
    expect(fs.existsSync(path.join(root, ".agents", "mcp.json"))).toBe(true);

    // user-authored real dir must survive
    expect(
      fs.existsSync(path.join(root, ".claude", "skills", "my-custom")),
    ).toBe(true);

    // skills/_version.json is removed with the .agents/skills directory
    expect(
      fs.existsSync(path.join(root, ".agents", "skills", "_version.json")),
    ).toBe(false);
  });
});

// ── Task 44 extended test suite ───────────────────────────────────────────────

describe("uninstall extended — dry-run vs real removal symmetry", () => {
  it("dry-run preview paths match the set of paths actually removed", async () => {
    const root = makeTmpDir();
    setInstallContext({ installRoot: root, mode: "project" });
    seedOmaLayout(root);

    // Capture the removal plan produced by buildRemovalPlan (same logic used
    // by both dry-run and the real run) so we can compare them.
    const { omaOwned: planEntries } = buildRemovalPlan(root);
    const previewPaths = new Set(planEntries.map((e) => e.path));

    // Real run: execute removal
    _resetInstallContext();
    setInstallContext({ installRoot: root, mode: "project" });
    await uninstall({ yes: true });

    // Every path that was in the preview should now be absent.
    for (const p of previewPaths) {
      expect(fs.existsSync(p), `Expected ${p} to be removed`).toBe(false);
    }
  });
});

describe("uninstall extended — user content preservation", () => {
  it("oma-config.yaml survives a full uninstall", async () => {
    const root = makeTmpDir();
    setInstallContext({ installRoot: root, mode: "project" });
    seedOmaLayout(root);

    await uninstall({ yes: true });

    const cfgPath = path.join(root, ".agents", "oma-config.yaml");
    expect(fs.existsSync(cfgPath)).toBe(true);
    expect(fs.readFileSync(cfgPath, "utf-8")).toBe("language: en\n");
  });

  it("mcp.json survives a full uninstall", async () => {
    const root = makeTmpDir();
    setInstallContext({ installRoot: root, mode: "project" });
    seedOmaLayout(root);

    await uninstall({ yes: true });

    const mcpPath = path.join(root, ".agents", "mcp.json");
    expect(fs.existsSync(mcpPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(mcpPath, "utf-8"))).toEqual({
      mcpServers: {},
    });
  });

  it("user-authored skill dir (real dir, no marker) survives", async () => {
    const root = makeTmpDir();
    setInstallContext({ installRoot: root, mode: "project" });
    seedOmaLayout(root);

    // Ensure the user-authored dir has a file in it (confirms it's a real dir)
    const userSkillDir = path.join(root, ".claude", "skills", "my-custom");
    fs.writeFileSync(
      path.join(userSkillDir, "SKILL.md"),
      "# My custom skill\n",
      "utf-8",
    );

    await uninstall({ yes: true });

    expect(fs.existsSync(userSkillDir)).toBe(true);
    expect(fs.existsSync(path.join(userSkillDir, "SKILL.md"))).toBe(true);
  });

  it("oma-owned symlink removed; user-authored real dir preserved side-by-side", async () => {
    const root = makeTmpDir();
    setInstallContext({ installRoot: root, mode: "project" });
    seedOmaLayout(root);

    const symlinkPath = path.join(root, ".claude", "skills", "oma-frontend");
    const userDirPath = path.join(root, ".claude", "skills", "my-custom");

    await uninstall({ yes: true });

    // Symlink must be gone (lstatSync to avoid following the link)
    expect(() => fs.lstatSync(symlinkPath)).toThrow();

    // User dir must be intact
    expect(fs.existsSync(userDirPath)).toBe(true);
  });
});

describe("uninstall extended — .github/prompts marker handling", () => {
  it("removes oma-generated prompt file; preserves user-authored prompt", async () => {
    const root = makeTmpDir();
    setInstallContext({ installRoot: root, mode: "project" });
    seedOmaLayout(root);

    const promptsDir = path.join(root, ".github", "prompts");
    fs.mkdirSync(promptsDir, { recursive: true });

    // oma-generated prompt (has marker)
    const omaPrompt = path.join(promptsDir, "orchestrate.prompt.md");
    fs.writeFileSync(
      omaPrompt,
      "<!-- oma:generated -->\n# Orchestrate\n",
      "utf-8",
    );

    // User-authored prompt (no marker)
    const userPrompt = path.join(promptsDir, "my-workflow.prompt.md");
    fs.writeFileSync(userPrompt, "# My Workflow\n", "utf-8");

    await uninstall({ yes: true });

    expect(fs.existsSync(omaPrompt)).toBe(false);
    expect(fs.existsSync(userPrompt)).toBe(true);
  });
});

describe("uninstall extended — idempotency", () => {
  it("second run reports nothing to remove and does not error", async () => {
    const root = makeTmpDir();
    setInstallContext({ installRoot: root, mode: "project" });
    seedOmaLayout(root);

    // First run removes everything
    await uninstall({ yes: true });

    // Second run: reset context and run again — should not throw
    _resetInstallContext();
    setInstallContext({ installRoot: root, mode: "project" });

    await expect(uninstall({ yes: true })).resolves.toBeUndefined();

    // After second run, user-owned files still present
    expect(fs.existsSync(path.join(root, ".agents", "oma-config.yaml"))).toBe(
      true,
    );
  });
});

describe("uninstall extended — non-interactive behavior", () => {
  it("CI=true bypasses interactive confirm and proceeds with removal", async () => {
    // Spec note: `isNonInteractive` in uninstall.ts treats CI=true as
    // implicit consent (same as --yes). This matches install/update semantics
    // and avoids hangs in CI runners. Verify the removal actually happens.
    const root = makeTmpDir();
    setInstallContext({ installRoot: root, mode: "project" });
    seedOmaLayout(root);

    const savedCi = process.env.CI;
    process.env.CI = "true";
    delete process.env.OMA_YES;

    try {
      await uninstall({});
      // CI mode skips confirm and runs the removal
      expect(fs.existsSync(path.join(root, ".agents", "workflows"))).toBe(
        false,
      );
    } finally {
      if (savedCi === undefined) delete process.env.CI;
      else process.env.CI = savedCi;
    }
  });

  it.skip("TODO(EC-abort): when CI=true and yes=false, verify explicit abort behavior once uninstall.ts enforces CI-abort guard", () => {
    // This test requires the production uninstall.ts to add:
    //   if (CI && !yes) { p.cancel("..."); process.exit(1); }
    // Currently uninstall.ts treats CI=true as non-interactive (proceeds
    // with the removal). Add an explicit CI-without-yes abort guard first.
  });
});
