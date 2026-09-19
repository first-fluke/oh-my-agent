import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClaudeMdAgentsMigration } from "./031-claude-md-agents.js";

const OMA_BLOCK =
  "<!-- OMA:START — managed by oh-my-agent. Do not edit this block manually. -->\n# oh-my-agent\n\nstuff\n<!-- OMA:END -->";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-mig031-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function claudeMd(): string {
  return join(root, "CLAUDE.md");
}

describe("migrateClaudeMdAgents (031)", () => {
  it("does nothing when CLAUDE.md is missing", () => {
    const detect = vi.fn(() => "2.1.277");
    expect(createClaudeMdAgentsMigration(detect).up(root)).toEqual([]);
    expect(detect).not.toHaveBeenCalled();
  });

  it("does nothing when CLAUDE.md has no OMA block and never probes the CLI", () => {
    writeFileSync(claudeMd(), "# Mine\n");
    const detect = vi.fn(() => "2.1.277");
    expect(createClaudeMdAgentsMigration(detect).up(root)).toEqual([]);
    expect(detect).not.toHaveBeenCalled();
    expect(readFileSync(claudeMd(), "utf-8")).toBe("# Mine\n");
  });

  it("leaves the block alone on Claude Code older than 2.1.277", () => {
    const original = `# Mine\n\n${OMA_BLOCK}\n`;
    writeFileSync(claudeMd(), original);
    const migration = createClaudeMdAgentsMigration(
      () => "2.1.276 (Claude Code)",
    );
    expect(migration.up(root)).toEqual([]);
    expect(readFileSync(claudeMd(), "utf-8")).toBe(original);
  });

  it("leaves the block alone when claude is not installed", () => {
    const original = `${OMA_BLOCK}\n`;
    writeFileSync(claudeMd(), original);
    expect(createClaudeMdAgentsMigration(() => null).up(root)).toEqual([]);
    expect(readFileSync(claudeMd(), "utf-8")).toBe(original);
  });

  it("replaces the OMA block with an @AGENTS.md import and keeps user content", () => {
    writeFileSync(
      claudeMd(),
      `# Mine\n\n${OMA_BLOCK}\n\n## Source Repo: Additional Rules\n\n- keep me\n`,
    );
    const actions = createClaudeMdAgentsMigration(
      () => "2.1.277 (Claude Code)",
    ).up(root);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toContain("@AGENTS.md import");
    expect(readFileSync(claudeMd(), "utf-8")).toBe(
      "# Mine\n\n## Source Repo: Additional Rules\n\n- keep me\n\n@AGENTS.md\n",
    );
  });

  it("does not duplicate an existing @AGENTS.md import", () => {
    writeFileSync(claudeMd(), `@AGENTS.md\n\n${OMA_BLOCK}\n`);
    createClaudeMdAgentsMigration(() => "2.1.277").up(root);
    expect(readFileSync(claudeMd(), "utf-8")).toBe("@AGENTS.md\n");
  });

  it("deletes CLAUDE.md only when the OMA block was its sole content", () => {
    writeFileSync(claudeMd(), `\n${OMA_BLOCK}\n\n`);
    const actions = createClaudeMdAgentsMigration(() => "2.2.0").up(root);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toContain("CLAUDE.md removed");
    expect(existsSync(claudeMd())).toBe(false);
  });

  it("is idempotent", () => {
    writeFileSync(claudeMd(), `# Mine\n\n${OMA_BLOCK}\n`);
    const migration = createClaudeMdAgentsMigration(() => "2.1.277");
    expect(migration.up(root)).toHaveLength(1);
    expect(migration.up(root)).toEqual([]);
  });

  it("respects the vendor gate", () => {
    const original = `${OMA_BLOCK}\n`;
    writeFileSync(claudeMd(), original);
    const migration = createClaudeMdAgentsMigration(() => "2.1.277");
    expect(migration.up(root, { vendors: ["codex"] })).toEqual([]);
    expect(readFileSync(claudeMd(), "utf-8")).toBe(original);
    expect(migration.up(root, { vendors: ["claude"] })).toHaveLength(1);
  });
});
