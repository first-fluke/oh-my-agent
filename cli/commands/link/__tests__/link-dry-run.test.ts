import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Companion to link.test.ts, which mocks the whole installer layer.
 *
 * This file leaves every project-scoped writer REAL — skills-installer, rules,
 * agent-composer, safe-write, gitignore — and mocks only the writers that
 * escape the install root. That split buys two things link.test.ts cannot
 * assert:
 *
 *  1. A missing `dryRun` guard on a HOME-scoped writer mutates the developer's
 *     actual home directory, not the fixture, so a "no files appeared under the
 *     temp root" check would still pass. Those writers are mocked here purely
 *     so the assertion is `not.toHaveBeenCalled()` instead of a wrecked HOME.
 *  2. The fixture is a real git repo, so `ensureOmaProjectGitignore` is armed.
 *     link.test.ts notes its own fixture is not a repo, which makes that writer
 *     a silent no-op there.
 */

const homeWriters = {
  trust: vi.fn(() => ({ changed: false, alreadyTrusted: true })),
  agyHud: vi.fn(() => ({ installed: false, reason: "stubbed" })),
  agyMcp: vi.fn(() => undefined),
  kimiHooks: vi.fn(() => ({ installed: false, reason: "stubbed" })),
  kimiMcp: vi.fn(() => ({ installed: false })),
  grokTelemetry: vi.fn(),
  grokProjectMcp: vi.fn(),
  cursorAttribution: vi.fn(),
};

vi.mock("../../../vendors/claude/trust.js", () => ({
  ensureClaudeWorkspaceTrust: (...args: unknown[]) =>
    homeWriters.trust(...(args as [])),
}));

vi.mock("../../../vendors/antigravity/hud.js", () => ({
  installAntigravityHud: (...args: unknown[]) =>
    homeWriters.agyHud(...(args as [])),
}));

vi.mock("../../../vendors/antigravity/mcp.js", () => ({
  applyAntigravityMcpConfig: (...args: unknown[]) =>
    homeWriters.agyMcp(...(args as [])),
}));

vi.mock("../../../vendors/kimi/hooks.js", () => ({
  installKimiHooks: (...args: unknown[]) =>
    homeWriters.kimiHooks(...(args as [])),
}));

vi.mock("../../../vendors/kimi/mcp.js", () => ({
  installKimiMcp: (...args: unknown[]) => homeWriters.kimiMcp(...(args as [])),
}));

// needs* probes are forced true so a missing guard actually reaches the writer.
// Left false, these tests would pass even with the guards deleted.
vi.mock("../../../vendors/grok/settings.js", () => ({
  applyGrokTelemetryConfig: (...args: unknown[]) =>
    homeWriters.grokTelemetry(...(args as [])),
  applyGrokProjectMcp: (...args: unknown[]) =>
    homeWriters.grokProjectMcp(...(args as [])),
  needsGrokTelemetryUpdate: () => true,
  needsGrokProjectMcpUpdate: () => true,
}));

vi.mock("../../../vendors/cursor/settings.js", () => ({
  disableCursorAgentAttribution: (...args: unknown[]) =>
    homeWriters.cursorAttribution(...(args as [])),
}));

import {
  _resetInstallContext,
  setInstallContext,
} from "../../../platform/install-context.js";
import { link } from "../run.js";

describe("link --dry-run (real project writers)", () => {
  const tempRoots: string[] = [];
  const originalCwd = process.cwd();

  beforeEach(() => {
    vi.clearAllMocks();
    _resetInstallContext();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    _resetInstallContext();
    for (const root of tempRoots) {
      rmSync(root, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }
    tempRoots.length = 0;
  });

  /**
   * A fixture with enough SSOT for the real installers to have work to do:
   * rules feed the doc merge and the cursor rule export, a skill plus an
   * existing `.claude/skills/` dir arms the symlink refresh, and `git init`
   * arms the .gitignore writer.
   */
  function makeProject(): string {
    const root = mkdtempSync(join(tmpdir(), "oma-link-dryrun-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents", "rules"), { recursive: true });
    mkdirSync(join(root, ".agents", "skills", "oma-frontend"), {
      recursive: true,
    });
    mkdirSync(join(root, ".agents", "workflows"), { recursive: true });
    // Pre-existing vendor skills dir: detectExistingCliSymlinkDirs only
    // considers vendors that already have one.
    mkdirSync(join(root, ".claude", "skills"), { recursive: true });

    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      // antigravity / kimi / grok are selected on purpose: their blocks are the
      // ones that write outside the install root.
      "vendors:\n  - claude\n  - cursor\n  - antigravity\n  - kimi\n  - grok\n",
      "utf-8",
    );
    writeFileSync(
      join(root, ".agents", "rules", "quality.md"),
      "---\ndescription: Quality rules\nalwaysApply: true\n---\n\nBe careful.\n",
      "utf-8",
    );
    writeFileSync(
      join(root, ".agents", "skills", "oma-frontend", "SKILL.md"),
      "---\nname: oma-frontend\n---\n\nFrontend skill.\n",
      "utf-8",
    );
    writeFileSync(
      join(root, ".agents", "workflows", "plan.md"),
      "---\nname: plan\ndescription: Plan workflow\n---\n\nPlan.\n",
      "utf-8",
    );

    execFileSync("git", ["init", "--quiet"], { cwd: root, stdio: "ignore" });

    setInstallContext({ installRoot: root, mode: "project" });
    return root;
  }

  /** Every path under `dir`, sorted. `.git` is skipped — git mutates its own
   * internals and those churn independently of what link does. */
  function snapshot(dir: string, prefix = ""): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      out.push(rel);
      if (entry.isDirectory()) {
        out.push(...snapshot(join(dir, entry.name), rel));
      }
    }
    return out.sort();
  }

  it("touches no HOME-scoped writer", () => {
    const root = makeProject();
    process.chdir(root);

    link({ quiet: true, dryRun: true });

    expect(homeWriters.trust).not.toHaveBeenCalled();
    expect(homeWriters.agyHud).not.toHaveBeenCalled();
    expect(homeWriters.agyMcp).not.toHaveBeenCalled();
    expect(homeWriters.kimiHooks).not.toHaveBeenCalled();
    expect(homeWriters.kimiMcp).not.toHaveBeenCalled();
    expect(homeWriters.grokTelemetry).not.toHaveBeenCalled();
    expect(homeWriters.grokProjectMcp).not.toHaveBeenCalled();
    expect(homeWriters.cursorAttribution).not.toHaveBeenCalled();
  });

  it("adds no file to the project, with the real installers in play", () => {
    const root = makeProject();
    process.chdir(root);
    const before = snapshot(root);

    link({ quiet: true, dryRun: true });

    expect(snapshot(root)).toEqual(before);
  });

  it("leaves .gitignore alone in a real git repo", () => {
    const root = makeProject();
    process.chdir(root);

    link({ quiet: true, dryRun: true });

    expect(snapshot(root)).not.toContain(".gitignore");
  });

  it("creates no CLAUDE.md, .cursor/rules, or skill symlinks", () => {
    const root = makeProject();
    process.chdir(root);

    link({ quiet: true, dryRun: true });

    const after = snapshot(root);
    expect(after).not.toContain("CLAUDE.md");
    expect(after).not.toContain(".cursor/rules");
    expect(after).not.toContain(".claude/skills/oma-frontend");
    expect(after).not.toContain(".claude/agents");
  });

  // Control: proves the assertions above are armed rather than vacuous. If the
  // vendor gating alone kept these writers idle, this would fail too.
  it("control — a real pass does reach those writers and does write", () => {
    const root = makeProject();
    process.chdir(root);
    const before = snapshot(root);

    link({ quiet: true });

    expect(homeWriters.trust).toHaveBeenCalled();
    expect(homeWriters.agyHud).toHaveBeenCalled();
    expect(homeWriters.kimiHooks).toHaveBeenCalled();
    expect(homeWriters.grokTelemetry).toHaveBeenCalled();
    expect(homeWriters.cursorAttribution).toHaveBeenCalled();
    expect(snapshot(root)).not.toEqual(before);
  });
});
