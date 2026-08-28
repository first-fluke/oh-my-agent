import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { migrateSerenaNoMemories } from "./024-serena-no-memories.js";

const roots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-migrate-024-"));
  roots.push(root);
  return root;
}

function directSerena() {
  return {
    command: "serena",
    args: ["start-mcp-server", "--context", "ide", "--project-from-cwd"],
  };
}

afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe("migrateSerenaNoMemories (024)", () => {
  it("adds Serena's no-memories mode to direct JSON configs", () => {
    const root = makeRoot();
    const path = join(root, ".agents", "mcp.json");
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      path,
      `${JSON.stringify(
        {
          mcpServers: { serena: directSerena() },
          toolGroups: {
            memory: ["read_memory"],
            code: ["find_symbol"],
            project: ["activate_project", "onboarding"],
          },
        },
        null,
        2,
      )}\n`,
    );

    expect(migrateSerenaNoMemories.up(root)).toEqual([
      ".agents/mcp.json (serena memory tools disabled)",
    ]);
    const migrated = JSON.parse(readFileSync(path, "utf-8"));
    const args = migrated.mcpServers.serena.args as string[];
    expect(args).toContain("--add-mode");
    expect(args).toContain("no-memories");
    expect(args).toContain("oma-ide");
    expect(migrated.toolGroups.memory).toBeUndefined();
    expect(migrated.toolGroups.code).toEqual(["find_symbol"]);
    expect(migrated.toolGroups.project).toEqual(["activate_project"]);
  });

  it("updates direct TOML configs and is idempotent", () => {
    const root = makeRoot();
    const path = join(root, ".codex", "config.toml");
    mkdirSync(join(root, ".codex"), { recursive: true });
    writeFileSync(
      path,
      [
        "[mcp_servers.serena]",
        'command = "serena"',
        'args = ["start-mcp-server", "--context", "codex", "--project-from-cwd"]',
        "",
      ].join("\n"),
    );

    const first = migrateSerenaNoMemories.up(root, { vendors: ["codex"] });
    const afterFirst = readFileSync(path, "utf-8");
    const second = migrateSerenaNoMemories.up(root, { vendors: ["codex"] });

    expect(first).toEqual([
      ".codex/config.toml (serena memory tools disabled)",
    ]);
    expect(afterFirst).toContain("no-memories");
    expect(afterFirst).toContain("oma-codex");
    expect(second).toHaveLength(0);
    expect(readFileSync(path, "utf-8")).toBe(afterFirst);
  });

  it("moves bridge entries to OMA's hard-exclusion context", () => {
    const root = makeRoot();
    const path = join(root, ".agents", "mcp.json");
    mkdirSync(join(root, ".agents"), { recursive: true });
    const config = {
      mcpServers: {
        serena: { command: "oma", args: ["bridge", "--context", "ide"] },
      },
    };
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);

    expect(migrateSerenaNoMemories.up(root)).toEqual([
      ".agents/mcp.json (serena memory tools disabled)",
    ]);
    expect(
      JSON.parse(readFileSync(path, "utf-8")).mcpServers.serena.args,
    ).toEqual(["bridge", "--context", "oma-ide"]);
  });

  it("hard-excludes memory tools in Serena's project config", () => {
    const root = makeRoot();
    const path = join(root, ".serena", "project.yml");
    mkdirSync(join(root, ".serena"), { recursive: true });
    writeFileSync(
      path,
      'languages:\n- typescript\nexcluded_tools: []\nproject_name: "test"\n',
    );

    expect(migrateSerenaNoMemories.up(root, { vendors: [] })).toEqual([
      ".serena/project.yml (serena memory tools hard-excluded)",
    ]);
    const migrated = readFileSync(path, "utf-8");
    expect(migrated).toContain("- write_memory");
    expect(migrated).toContain("- onboarding");
  });
});
