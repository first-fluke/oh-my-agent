import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { discoverSkillDirs } from "./emit/agent-skills.js";
import {
  GROK_BOT_LOCK,
  GROK_BOT_MANIFEST,
  installGrokBotSkills,
  uninstallGrokBotSkills,
} from "./grok-bot-skills.js";

const roots: string[] = [];

function put(root: string, file: string, content: string): void {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function fixture(): { source: string; workflowsDir: string } {
  const root = mkdtempSync(join(tmpdir(), "oma-grok-bot-test-"));
  roots.push(root);
  const source = join(root, "source");
  const workflowsDir = join(root, "agent-data", "workflows");
  for (const name of ["oma-first", "oma-second"]) {
    put(
      source,
      `.agents/skills/${name}/SKILL.md`,
      `---\nname: ${name}\ndescription: Use ${name} for its task.\n---\nRead [Policy](../_shared/core/policy.md).\nRead [Guide](resources/guide.md).\n`,
    );
    put(source, `.agents/skills/${name}/resources/guide.md`, "# Guide\n");
  }
  put(
    source,
    ".agents/skills/_shared/core/policy.md",
    "# Policy\nRead [Contract](../runtime/contract.md).\n",
  );
  put(source, ".agents/skills/_shared/runtime/contract.md", "# Contract\n");
  return { source, workflowsDir };
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("Grok Bot portable skills lifecycle", () => {
  it("installs standalone skills with transitive shared references and leaves source unchanged", () => {
    const { source, workflowsDir } = fixture();
    const sourcePath = join(source, ".agents/skills/oma-first/SKILL.md");
    const original = readFileSync(sourcePath, "utf8");
    const result = installGrokBotSkills(source, { workflowsDir });
    expect(result.installed).toEqual(["oma-first", "oma-second"]);
    expect(readFileSync(sourcePath, "utf8")).toBe(original);
    rmSync(source, { recursive: true });
    expect(
      readFileSync(join(workflowsDir, "oma-first/SKILL.md"), "utf8"),
    ).toContain("[Policy](references/_shared/core/policy.md)");
    expect(
      readFileSync(
        join(workflowsDir, "oma-first/references/_shared/runtime/contract.md"),
        "utf8",
      ),
    ).toBe("# Contract\n");
    expect(existsSync(join(workflowsDir, "oma-first/resources/guide.md"))).toBe(
      true,
    );
    expect(existsSync(join(workflowsDir, ".grok"))).toBe(false);
    expect(existsSync(join(workflowsDir, GROK_BOT_LOCK))).toBe(false);
  });

  it("reinstalls idempotently, removes stale owned resources and preserves user files", () => {
    const { source, workflowsDir } = fixture();
    installGrokBotSkills(source, { workflowsDir });
    put(workflowsDir, "oma-first/user-notes.txt", "keep me");
    put(workflowsDir, "other-skill/SKILL.md", "third party");
    rmSync(join(source, ".agents/skills/oma-first/resources/guide.md"));
    put(source, ".agents/skills/oma-first/resources/new.md", "new");
    installGrokBotSkills(source, { workflowsDir });
    const manifest = readFileSync(
      join(workflowsDir, GROK_BOT_MANIFEST),
      "utf8",
    );
    installGrokBotSkills(source, { workflowsDir });
    expect(readFileSync(join(workflowsDir, GROK_BOT_MANIFEST), "utf8")).toBe(
      manifest,
    );
    expect(existsSync(join(workflowsDir, "oma-first/resources/guide.md"))).toBe(
      false,
    );
    expect(
      readFileSync(join(workflowsDir, "oma-first/resources/new.md"), "utf8"),
    ).toBe("new");
    expect(
      readFileSync(join(workflowsDir, "oma-first/user-notes.txt"), "utf8"),
    ).toBe("keep me");
    expect(
      readFileSync(join(workflowsDir, "other-skill/SKILL.md"), "utf8"),
    ).toBe("third party");
  });

  it("replaces the managed selection when a preset narrows it", () => {
    const { source, workflowsDir } = fixture();
    installGrokBotSkills(source, { workflowsDir });
    const result = installGrokBotSkills(source, {
      workflowsDir,
      skills: ["oma-second"],
    });
    expect(result.installed).toEqual(["oma-second"]);
    expect(result.removed.length).toBeGreaterThan(0);
    expect(result.removed.every((file) => file.startsWith("oma-first/"))).toBe(
      true,
    );
    expect(existsSync(join(workflowsDir, "oma-first"))).toBe(false);
  });

  it("preflights collisions and local edits before any skill is changed", () => {
    const { source, workflowsDir } = fixture();
    put(workflowsDir, "oma-second/SKILL.md", "my existing skill");
    expect(() => installGrokBotSkills(source, { workflowsDir })).toThrow(
      "not OMA-owned",
    );
    expect(existsSync(join(workflowsDir, "oma-first"))).toBe(false);
    expect(existsSync(join(workflowsDir, GROK_BOT_MANIFEST))).toBe(false);
    rmSync(join(workflowsDir, "oma-second"), { recursive: true });
    installGrokBotSkills(source, { workflowsDir });
    const manifest = readFileSync(
      join(workflowsDir, GROK_BOT_MANIFEST),
      "utf8",
    );
    put(workflowsDir, "oma-second/resources/guide.md", "my edited guide");
    put(
      source,
      ".agents/skills/oma-first/resources/guide.md",
      "release update",
    );
    expect(() => installGrokBotSkills(source, { workflowsDir })).toThrow(
      "Preserving locally changed",
    );
    expect(
      readFileSync(join(workflowsDir, "oma-first/resources/guide.md"), "utf8"),
    ).toBe("# Guide\n");
    expect(readFileSync(join(workflowsDir, GROK_BOT_MANIFEST), "utf8")).toBe(
      manifest,
    );
  });

  it("refuses an unowned new file even inside a managed skill", () => {
    const { source, workflowsDir } = fixture();
    installGrokBotSkills(source, { workflowsDir });
    put(workflowsDir, "oma-first/resources/new.md", "user file");
    put(source, ".agents/skills/oma-first/resources/new.md", "upstream file");
    expect(() => installGrokBotSkills(source, { workflowsDir })).toThrow(
      "unowned Grok Bot file",
    );
    expect(
      readFileSync(join(workflowsDir, "oma-first/resources/new.md"), "utf8"),
    ).toBe("user file");
  });

  it("previews removal, preserves edits and additions, and can finish cleanup later", () => {
    const { source, workflowsDir } = fixture();
    installGrokBotSkills(source, { workflowsDir });
    const original = readFileSync(
      join(workflowsDir, "oma-first/resources/guide.md"),
      "utf8",
    );
    put(workflowsDir, "oma-first/resources/guide.md", "edited");
    put(workflowsDir, "oma-first/user-notes.txt", "keep");
    put(workflowsDir, "third-party/SKILL.md", "external");
    symlinkSync(
      join(workflowsDir, "third-party"),
      join(workflowsDir, "oma-first/user-link"),
      "dir",
    );
    const preview = uninstallGrokBotSkills({ workflowsDir, dryRun: true });
    expect(preview.removed).toContain("oma-second/SKILL.md");
    expect(preview.removed).not.toContain("oma-first/resources/guide.md");
    expect(existsSync(join(workflowsDir, "oma-first/SKILL.md"))).toBe(true);
    const result = uninstallGrokBotSkills({ workflowsDir });
    expect(result).toEqual(preview);
    expect(result.preserved).toEqual([
      "oma-first/resources/guide.md",
      "oma-first/user-link",
      "oma-first/user-notes.txt",
    ]);
    expect(existsSync(join(workflowsDir, "oma-first/SKILL.md"))).toBe(false);
    expect(existsSync(join(workflowsDir, "oma-second"))).toBe(false);
    expect(
      readFileSync(join(workflowsDir, "third-party/SKILL.md"), "utf8"),
    ).toBe("external");
    put(workflowsDir, "oma-first/resources/guide.md", original);
    expect(uninstallGrokBotSkills({ workflowsDir }).removed).toEqual([
      "oma-first/resources/guide.md",
    ]);
    expect(existsSync(join(workflowsDir, GROK_BOT_MANIFEST))).toBe(false);
    expect(
      readFileSync(join(workflowsDir, "oma-first/user-notes.txt"), "utf8"),
    ).toBe("keep");
    expect(uninstallGrokBotSkills({ workflowsDir }).removed).toEqual([]);
  });

  it("rejects symlinked owned paths and malicious manifests before deletion", () => {
    const { source, workflowsDir } = fixture();
    installGrokBotSkills(source, { workflowsDir });
    const external = join(dirname(workflowsDir), "external");
    put(external, "guide.md", "outside");
    rmSync(join(workflowsDir, "oma-second/resources"), { recursive: true });
    symlinkSync(external, join(workflowsDir, "oma-second/resources"), "dir");
    expect(() => uninstallGrokBotSkills({ workflowsDir })).toThrow("symlink");
    expect(() => installGrokBotSkills(source, { workflowsDir })).toThrow(
      "symlink",
    );
    expect(existsSync(join(workflowsDir, "oma-first/SKILL.md"))).toBe(true);
    expect(readFileSync(join(external, "guide.md"), "utf8")).toBe("outside");
    put(
      workflowsDir,
      GROK_BOT_MANIFEST,
      JSON.stringify({
        schemaVersion: 1,
        skills: ["oma-first"],
        files: { "oma-first/../../external/guide.md": "a".repeat(64) },
      }),
    );
    expect(() => uninstallGrokBotSkills({ workflowsDir })).toThrow(
      "Invalid Grok Bot ownership",
    );
    expect(readFileSync(join(external, "guide.md"), "utf8")).toBe("outside");
  });

  it("validates the whole source selection before touching the library", () => {
    const { source, workflowsDir } = fixture();
    expect(() =>
      installGrokBotSkills(source, { workflowsDir, skills: ["../escape"] }),
    ).toThrow("unknown");
    put(
      source,
      ".agents/skills/oma-second/SKILL.md",
      "---\nname: wrong-name\ndescription: invalid\n---\n",
    );
    expect(() => installGrokBotSkills(source, { workflowsDir })).toThrow(
      "Invalid Grok Bot skills",
    );
    expect(existsSync(workflowsDir)).toBe(false);
  });

  it("serializes install and uninstall against the same library lock", () => {
    const { source, workflowsDir } = fixture();
    installGrokBotSkills(source, { workflowsDir });
    const lock = JSON.stringify({ pid: process.pid, token: "other-writer" });
    put(workflowsDir, GROK_BOT_LOCK, lock);
    const manifest = readFileSync(
      join(workflowsDir, GROK_BOT_MANIFEST),
      "utf8",
    );
    expect(() => installGrokBotSkills(source, { workflowsDir })).toThrow(
      "library is locked",
    );
    expect(() => uninstallGrokBotSkills({ workflowsDir })).toThrow(
      "library is locked",
    );
    expect(
      uninstallGrokBotSkills({ workflowsDir, dryRun: true }).removed,
    ).toContain("oma-first/SKILL.md");
    expect(readFileSync(join(workflowsDir, GROK_BOT_MANIFEST), "utf8")).toBe(
      manifest,
    );
    expect(readFileSync(join(workflowsDir, GROK_BOT_LOCK), "utf8")).toBe(lock);
    rmSync(join(workflowsDir, GROK_BOT_LOCK));
    uninstallGrokBotSkills({ workflowsDir });
    expect(existsSync(join(workflowsDir, GROK_BOT_LOCK))).toBe(false);
  });

  it("installs and removes the actual OMA payload without project vendor configuration", () => {
    const { workflowsDir } = fixture();
    const source = resolve(import.meta.dirname, "../..");
    const result = installGrokBotSkills(source, { workflowsDir });
    expect(result.installed).toEqual(discoverSkillDirs(source));
    expect(result.installed.length).toBeGreaterThan(30);
    expect(
      existsSync(
        join(
          workflowsDir,
          "oma-backend/references/_shared/core/code-intelligence.md",
        ),
      ),
    ).toBe(true);
    expect(existsSync(join(workflowsDir, "oma-orchestration/resources"))).toBe(
      true,
    );
    const architecture = readFileSync(
      join(workflowsDir, "oma-architecture/SKILL.md"),
      "utf8",
    );
    expect(architecture).toContain(
      "references/_shared/conditional/diagram-engine.md",
    );
    expect(
      existsSync(
        join(
          workflowsDir,
          "oma-architecture/references/_shared/conditional/diagram-engine.md",
        ),
      ),
    ).toBe(true);
    const academic = readFileSync(
      join(workflowsDir, "oma-academic-writing/SKILL.md"),
      "utf8",
    );
    expect(academic).not.toContain(
      "_shared/core/{context-loading,quality-principles}.md",
    );
    expect(
      uninstallGrokBotSkills({ workflowsDir }).removed.length,
    ).toBeGreaterThan(result.installed.length);
    expect(existsSync(join(workflowsDir, GROK_BOT_MANIFEST))).toBe(false);
  });
});
