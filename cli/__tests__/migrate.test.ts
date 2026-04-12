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
import { afterEach, describe, expect, it } from "vitest";
import { migrateToAgents as _migrateToAgents } from "../commands/migrations/001-agents-dir.js";
import { migrateSharedLayout as _migrateSharedLayout } from "../commands/migrations/002-shared-layout.js";
import { migrateOmaConfig } from "../commands/migrations/003-oma-config.js";
import { migrateClaudeMdLocal } from "../commands/migrations/004-claude-md-local.js";
import { migrateRenameOmaScm } from "../commands/migrations/005-rename-oma-scm.js";
import { migrateGeminiCliCompat } from "../commands/migrations/006-gemini-cli-compat.js";

const migrateToAgents = (cwd: string) => _migrateToAgents.up(cwd);
const migrateSharedLayout = (cwd: string) => _migrateSharedLayout.up(cwd);

describe("migrateToAgents", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("renames .agent/ to .agents/ when only .agent/ exists", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    const oldDir = join(root, ".agent");
    mkdirSync(join(oldDir, "skills"), { recursive: true });
    writeFileSync(join(oldDir, "skills", "test.md"), "content", "utf-8");

    const actions = migrateToAgents(root);

    expect(actions).toContain(".agent/ → .agents/ (renamed)");
    expect(existsSync(oldDir)).toBe(false);
    expect(existsSync(join(root, ".agents", "skills", "test.md"))).toBe(true);
  });

  it("removes .agent/ after merge when both directories have overlapping items", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    const oldDir = join(root, ".agent");
    const newDir = join(root, ".agents");

    // Create overlapping structure
    mkdirSync(join(oldDir, "skills"), { recursive: true });
    mkdirSync(join(newDir, "skills"), { recursive: true });
    writeFileSync(join(oldDir, "skills", "a.md"), "old", "utf-8");
    writeFileSync(join(newDir, "skills", "a.md"), "new", "utf-8");

    const actions = migrateToAgents(root);

    expect(actions).toContain(".agent/ (removed after merge)");
    expect(existsSync(oldDir)).toBe(false);
    // .agents/ keeps its own version for overlapping items
    expect(readFileSync(join(newDir, "skills", "a.md"), "utf-8")).toBe("new");
  });

  it("merges unique items from .agent/ into .agents/ then removes .agent/", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    const oldDir = join(root, ".agent");
    const newDir = join(root, ".agents");

    mkdirSync(join(oldDir, "config"), { recursive: true });
    mkdirSync(join(newDir, "skills"), { recursive: true });
    writeFileSync(join(oldDir, "config", "custom.yaml"), "custom", "utf-8");
    writeFileSync(join(newDir, "skills", "a.md"), "skill", "utf-8");

    const actions = migrateToAgents(root);

    expect(actions).toContain(".agent/config → .agents/config (merged)");
    expect(actions).toContain(".agent/ (removed after merge)");
    expect(existsSync(oldDir)).toBe(false);
    expect(existsSync(join(newDir, "config", "custom.yaml"))).toBe(true);
    expect(existsSync(join(newDir, "skills", "a.md"))).toBe(true);
  });

  it("does nothing when only .agents/ exists", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents", "skills"), { recursive: true });

    const actions = migrateToAgents(root);

    // No .agent/ → .agents/ migration actions
    const dirMigrationActions = actions.filter(
      (a) => a.includes(".agent/") && !a.includes("skills/"),
    );
    expect(dirMigrationActions).toHaveLength(0);
  });
});

describe("migrateSharedLayout", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("removes legacy files when the new location already exists", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    const oldPath = join(
      root,
      ".agents",
      "skills",
      "_shared",
      "context-loading.md",
    );
    const newPath = join(
      root,
      ".agents",
      "skills",
      "_shared",
      "core",
      "context-loading.md",
    );

    mkdirSync(join(root, ".agents", "skills", "_shared", "core"), {
      recursive: true,
    });
    writeFileSync(oldPath, "same content\n", "utf-8");
    writeFileSync(newPath, "same content\n", "utf-8");

    const actions = migrateSharedLayout(root);

    expect(actions).toContain(
      ".agents/skills/_shared/context-loading.md (removed legacy path)",
    );
    expect(existsSync(oldPath)).toBe(false);
    expect(readFileSync(newPath, "utf-8")).toBe("same content\n");
  });

  it("backs up customized legacy files before removing them (shared layout)", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    const oldPath = join(
      root,
      ".agents",
      "skills",
      "_shared",
      "phase-gates.md",
    );
    const newPath = join(
      root,
      ".agents",
      "workflows",
      "ultrawork",
      "resources",
      "phase-gates.md",
    );
    const backupPath = join(
      root,
      ".agents",
      ".migration-backup",
      "shared-layout-v2",
      "skills",
      "_shared",
      "phase-gates.md",
    );

    mkdirSync(join(root, ".agents", "skills", "_shared"), { recursive: true });
    mkdirSync(join(root, ".agents", "workflows", "ultrawork", "resources"), {
      recursive: true,
    });

    writeFileSync(oldPath, "custom legacy content\n", "utf-8");
    writeFileSync(newPath, "new canonical content\n", "utf-8");

    const actions = migrateSharedLayout(root);

    expect(actions).toContain(
      ".agents/skills/_shared/phase-gates.md → .agents/.migration-backup/shared-layout-v2/skills/_shared/phase-gates.md (backup)",
    );
    expect(existsSync(oldPath)).toBe(false);
    expect(readFileSync(newPath, "utf-8")).toBe("new canonical content\n");
    expect(readFileSync(backupPath, "utf-8")).toBe("custom legacy content\n");
  });
});

describe("migrateOmaConfig (003)", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("migrates legacy user-preferences.yaml to oma-config.yaml", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-003-"));
    tempRoots.push(root);

    const legacyDir = join(root, ".agents", "config");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(
      join(legacyDir, "user-preferences.yaml"),
      "language: ko\n",
      "utf-8",
    );

    const actions = migrateOmaConfig.up(root);

    expect(actions).toContain(
      ".agents/config/user-preferences.yaml → .agents/oma-config.yaml",
    );
    expect(existsSync(join(root, ".agents", "oma-config.yaml"))).toBe(true);
    expect(
      readFileSync(join(root, ".agents", "oma-config.yaml"), "utf-8"),
    ).toBe("language: ko\n");
    expect(existsSync(join(legacyDir, "user-preferences.yaml"))).toBe(false);
  });

  it("overwrites template oma-config.yaml when legacy file also exists", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-003-"));
    tempRoots.push(root);

    // Simulate: cpSync created template oma-config.yaml
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "language: en\n",
      "utf-8",
    );

    // User's actual config at legacy path
    const legacyDir = join(root, ".agents", "config");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(
      join(legacyDir, "user-preferences.yaml"),
      "language: ko\n",
      "utf-8",
    );

    const actions = migrateOmaConfig.up(root);

    expect(actions).toContain(
      ".agents/config/user-preferences.yaml → .agents/oma-config.yaml",
    );
    // User's config takes precedence over template
    expect(
      readFileSync(join(root, ".agents", "oma-config.yaml"), "utf-8"),
    ).toBe("language: ko\n");
    expect(existsSync(join(legacyDir, "user-preferences.yaml"))).toBe(false);
  });

  it("removes empty config/ directory after migration", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-003-"));
    tempRoots.push(root);

    const legacyDir = join(root, ".agents", "config");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(
      join(legacyDir, "user-preferences.yaml"),
      "language: en\n",
      "utf-8",
    );

    const actions = migrateOmaConfig.up(root);

    expect(actions).toContain(".agents/config/ (removed empty dir)");
    expect(existsSync(legacyDir)).toBe(false);
  });

  it("does nothing when only oma-config.yaml exists", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-003-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "language: en\n",
      "utf-8",
    );

    const actions = migrateOmaConfig.up(root);

    expect(actions).toHaveLength(0);
  });

  it("does nothing when neither file exists", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-003-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".agents"), { recursive: true });

    const actions = migrateOmaConfig.up(root);

    expect(actions).toHaveLength(0);
  });

  it("preserves config/ dir when other files remain after migration", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-003-"));
    tempRoots.push(root);

    const legacyDir = join(root, ".agents", "config");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(
      join(legacyDir, "user-preferences.yaml"),
      "language: ko\n",
      "utf-8",
    );
    writeFileSync(join(legacyDir, "other-config.yaml"), "key: val\n", "utf-8");

    const actions = migrateOmaConfig.up(root);

    expect(actions).toContain(
      ".agents/config/user-preferences.yaml → .agents/oma-config.yaml",
    );
    expect(actions).not.toContain(".agents/config/ (removed empty dir)");
    expect(existsSync(legacyDir)).toBe(true);
    expect(existsSync(join(legacyDir, "other-config.yaml"))).toBe(true);
  });

  it("is idempotent — second run is a no-op", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-003-"));
    tempRoots.push(root);

    const legacyDir = join(root, ".agents", "config");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(
      join(legacyDir, "user-preferences.yaml"),
      "language: ko\n",
      "utf-8",
    );

    const first = migrateOmaConfig.up(root);
    expect(first.length).toBeGreaterThan(0);

    const second = migrateOmaConfig.up(root);
    expect(second).toHaveLength(0);

    // Content preserved after both runs
    expect(
      readFileSync(join(root, ".agents", "oma-config.yaml"), "utf-8"),
    ).toBe("language: ko\n");
  });

  it("preserves full user config content when overwriting template", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-003-"));
    tempRoots.push(root);

    const userConfig = [
      "language: ja",
      "date_format: ISO",
      "timezone: Asia/Tokyo",
      "default_cli: claude",
      "vendors:",
      "  - claude",
      "  - gemini",
      "",
    ].join("\n");

    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "language: en\ndefault_cli: gemini\n",
      "utf-8",
    );

    const legacyDir = join(root, ".agents", "config");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(
      join(legacyDir, "user-preferences.yaml"),
      userConfig,
      "utf-8",
    );

    migrateOmaConfig.up(root);

    const result = readFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "utf-8",
    );
    expect(result).toBe(userConfig);
    expect(result).toContain("timezone: Asia/Tokyo");
    expect(result).toContain("default_cli: claude");
  });
});

describe("migrateClaudeMdLocal (004)", () => {
  const tempRoots: string[] = [];
  let originalHome: string | undefined;

  function setup(): string {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-004-"));
    tempRoots.push(root);
    originalHome = process.env.HOME;
    process.env.HOME = root;
    return root;
  }

  afterEach(() => {
    process.env.HOME = originalHome;
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("does nothing when ~/.claude/CLAUDE.md does not exist", () => {
    setup();
    const actions = migrateClaudeMdLocal.up("/unused");
    expect(actions).toHaveLength(0);
  });

  it("does nothing when no OMA block exists", () => {
    const home = setup();
    const claudeDir = join(home, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, "CLAUDE.md"), "# My global notes\n");

    const actions = migrateClaudeMdLocal.up("/unused");
    expect(actions).toHaveLength(0);
    expect(readFileSync(join(claudeDir, "CLAUDE.md"), "utf-8")).toBe(
      "# My global notes\n",
    );
  });

  it("removes OMA block and keeps user content", () => {
    const home = setup();
    const claudeDir = join(home, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      join(claudeDir, "CLAUDE.md"),
      "# My notes\n\n<!-- OMA:START -->\noma stuff\n<!-- OMA:END -->\n\n# More notes\n",
    );

    const actions = migrateClaudeMdLocal.up("/unused");

    expect(actions).toHaveLength(1);
    expect(actions[0]).toContain("OMA block removed");
    const content = readFileSync(join(claudeDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("# My notes");
    expect(content).toContain("# More notes");
    expect(content).not.toContain("OMA:START");
    expect(content).not.toContain("oma stuff");
  });

  it("deletes file when OMA block was only content", () => {
    const home = setup();
    const claudeDir = join(home, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      join(claudeDir, "CLAUDE.md"),
      "<!-- OMA:START -->\noma stuff\n<!-- OMA:END -->",
    );

    const actions = migrateClaudeMdLocal.up("/unused");

    expect(actions).toHaveLength(1);
    expect(actions[0]).toContain("removed");
    expect(existsSync(join(claudeDir, "CLAUDE.md"))).toBe(false);
  });

  it("handles full OMA:START marker with description", () => {
    const home = setup();
    const claudeDir = join(home, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      join(claudeDir, "CLAUDE.md"),
      "# Notes\n<!-- OMA:START — managed by oh-my-agent. Do not edit this block manually. -->\nblock\n<!-- OMA:END -->\n",
    );

    const actions = migrateClaudeMdLocal.up("/unused");

    expect(actions).toHaveLength(1);
    const content = readFileSync(join(claudeDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("# Notes");
    expect(content).not.toContain("OMA:START");
  });
});

describe("migrateRenameOmaScm (005)", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("renames oma-commit skill directory to oma-scm", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-005-"));
    tempRoots.push(root);

    const oldSkillDir = join(root, ".agents", "skills", "oma-commit");
    mkdirSync(oldSkillDir, { recursive: true });
    writeFileSync(join(oldSkillDir, "SKILL.md"), "name: oma-commit\n", "utf-8");

    const actions = migrateRenameOmaScm.up(root);

    expect(actions).toContain("skills/oma-commit → skills/oma-scm");
    expect(existsSync(join(root, ".agents", "skills", "oma-commit"))).toBe(
      false,
    );
    expect(existsSync(join(root, ".agents", "skills", "oma-scm"))).toBe(true);
  });

  it("removes legacy commit workflow even when skill rename is not needed", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-005-"));
    tempRoots.push(root);

    const workflowDir = join(root, ".agents", "workflows");
    mkdirSync(workflowDir, { recursive: true });
    writeFileSync(
      join(workflowDir, "commit.md"),
      "# legacy workflow\n",
      "utf-8",
    );

    const actions = migrateRenameOmaScm.up(root);

    expect(actions).toContain("workflows/commit.md (removed legacy workflow)");
    expect(existsSync(join(workflowDir, "commit.md"))).toBe(false);
  });

  it("removes oma-commit when oma-scm already exists", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-005-"));
    tempRoots.push(root);

    const oldSkillDir = join(root, ".agents", "skills", "oma-commit");
    const newSkillDir = join(root, ".agents", "skills", "oma-scm");
    mkdirSync(oldSkillDir, { recursive: true });
    mkdirSync(newSkillDir, { recursive: true });

    const actions = migrateRenameOmaScm.up(root);

    expect(actions).toContain(
      "skills/oma-commit (removed, replaced by oma-scm)",
    );
    expect(existsSync(oldSkillDir)).toBe(false);
    expect(existsSync(newSkillDir)).toBe(true);
  });
});

describe("migrateGeminiCliCompat (006)", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("sanitizes legacy Gemini MCP keys and normalizes hooks", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-006-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".gemini"), { recursive: true });
    writeFileSync(
      join(root, ".gemini", "settings.json"),
      `${JSON.stringify(
        {
          general: { enableNotifications: true },
          experimental: {},
          mcpServers: {
            serena: {
              command: "uvx",
              args: ["serena"],
              available_tools: ["find_symbol"],
            },
          },
          hooks: {
            BeforeAgent: [
              {
                hooks: [
                  {
                    command:
                      'bun "$GEMINI_PROJECT_DIR/.gemini/hooks/keyword-detector.ts"',
                    timeout: 5,
                  },
                ],
              },
            ],
            BeforeTool: [
              {
                matcher: "Bash",
                hooks: [
                  {
                    command:
                      'bun "$GEMINI_PROJECT_DIR/.gemini/hooks/test-filter.ts"',
                    timeout: 5,
                  },
                ],
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    const actions = migrateGeminiCliCompat.up(root);
    const result = JSON.parse(
      readFileSync(join(root, ".gemini", "settings.json"), "utf-8"),
    );

    expect(actions).toContain(
      ".gemini/settings.json (Gemini CLI compatibility updated)",
    );
    expect(actions).toContain(
      ".gemini/settings.json hooks (Gemini matcher/timeout normalized)",
    );
    expect(result.experimental).toEqual({ enableAgents: true });
    expect(result.mcpServers.serena).toEqual({
      command: "uvx",
      args: ["serena"],
      includeTools: ["find_symbol"],
    });
    expect(result.hooks.BeforeTool[0].matcher).toBe("run_shell_command");
    expect(result.hooks.BeforeTool[0].hooks[0].name).toBe("test-filter");
    expect(result.hooks.BeforeTool[0].hooks[0].timeout).toBe(5000);
    expect(result.hooks.BeforeAgent[0].hooks[0].name).toBe("keyword-detector");
    expect(result.hooks.BeforeAgent[0].hooks[0].timeout).toBe(5000);
  });

  it("is idempotent on the second run", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-006-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".gemini"), { recursive: true });
    writeFileSync(
      join(root, ".gemini", "settings.json"),
      `${JSON.stringify(
        {
          general: { enableNotifications: true },
          experimental: { enableAgents: true },
          mcpServers: {
            serena: {
              command: "uvx",
              args: ["serena"],
              includeTools: ["find_symbol"],
            },
          },
          hooks: {
            BeforeAgent: [
              {
                hooks: [
                  {
                    name: "keyword-detector",
                    command:
                      'bun "$GEMINI_PROJECT_DIR/.gemini/hooks/keyword-detector.ts"',
                    timeout: 5000,
                  },
                ],
              },
            ],
            BeforeTool: [
              {
                matcher: "run_shell_command",
                hooks: [
                  {
                    name: "test-filter",
                    command:
                      'bun "$GEMINI_PROJECT_DIR/.gemini/hooks/test-filter.ts"',
                    timeout: 5000,
                  },
                ],
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    const first = migrateGeminiCliCompat.up(root);
    expect(first).toHaveLength(0);

    const second = migrateGeminiCliCompat.up(root);
    expect(second).toHaveLength(0);
  });
});
