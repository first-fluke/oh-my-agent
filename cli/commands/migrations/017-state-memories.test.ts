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
import { migrateStateMemories } from "./017-state-memories.js";

describe("migrateStateMemories (017)", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  function makeRoot(): string {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-017-"));
    tempRoots.push(root);
    return root;
  }

  it("moves coordination artifacts and leaves Serena knowledge in place", () => {
    const root = makeRoot();
    const legacy = join(root, ".serena", "memories");
    mkdirSync(join(legacy, "decisions"), { recursive: true });

    // Coordination artifacts — must move. Results are handled by 032.
    writeFileSync(join(legacy, "result-backend.md"), "## Status: completed\n");
    writeFileSync(join(legacy, "progress-qa.md"), "turn 1\n");
    writeFileSync(join(legacy, "task-board.md"), "# Task Board\n");
    writeFileSync(join(legacy, "orchestrator-session.md"), "## ID: s1\n");
    writeFileSync(join(legacy, "session-cost-s1.md"), "---\n");
    writeFileSync(join(legacy, "findings-s1.md"), "---\n");
    // Serena knowledge — must stay.
    writeFileSync(join(legacy, "code_style.md"), "# Style\n");
    writeFileSync(join(legacy, "project_purpose.md"), "# Purpose\n");
    writeFileSync(join(legacy, "decisions", "result-fake.md"), "# nested\n");

    const actions = migrateStateMemories.up(root);
    expect(actions).toHaveLength(5);

    const canonical = join(root, ".agents", "state", "memories");
    for (const moved of [
      "progress-qa.md",
      "task-board.md",
      "orchestrator-session.md",
      "session-cost-s1.md",
      "findings-s1.md",
    ]) {
      expect(existsSync(join(canonical, moved))).toBe(true);
      expect(existsSync(join(legacy, moved))).toBe(false);
    }
    expect(existsSync(join(legacy, "code_style.md"))).toBe(true);
    expect(existsSync(join(legacy, "project_purpose.md"))).toBe(true);
    expect(existsSync(join(legacy, "result-backend.md"))).toBe(true);
    // Curated subdirectories are never traversed.
    expect(existsSync(join(legacy, "decisions", "result-fake.md"))).toBe(true);
  });

  it("keeps an existing canonical copy instead of overwriting it", () => {
    const root = makeRoot();
    const legacy = join(root, ".serena", "memories");
    const canonical = join(root, ".agents", "state", "memories");
    mkdirSync(legacy, { recursive: true });
    mkdirSync(canonical, { recursive: true });
    writeFileSync(join(legacy, "progress-backend.md"), "old\n");
    writeFileSync(join(canonical, "progress-backend.md"), "new\n");

    const actions = migrateStateMemories.up(root);

    expect(actions).toEqual([]);
    expect(readFileSync(join(canonical, "progress-backend.md"), "utf-8")).toBe(
      "new\n",
    );
    expect(existsSync(join(legacy, "progress-backend.md"))).toBe(true);
  });

  it("retargets the default Serena memoryConfig in .agents/mcp.json", () => {
    const root = makeRoot();
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "mcp.json"),
      JSON.stringify(
        {
          mcpServers: { serena: { command: "serena" } },
          memoryConfig: {
            provider: "serena",
            basePath: ".serena/memories",
            tools: { read: "read_memory", write: "write_memory" },
          },
        },
        null,
        2,
      ),
    );

    const actions = migrateStateMemories.up(root);

    expect(actions).toContain(
      ".agents/mcp.json memoryConfig → file provider at .agents/state/memories",
    );
    const updated = JSON.parse(
      readFileSync(join(root, ".agents", "mcp.json"), "utf-8"),
    ) as {
      mcpServers: Record<string, unknown>;
      memoryConfig: { provider: string; basePath: string };
    };
    expect(updated.memoryConfig.provider).toBe("file");
    expect(updated.memoryConfig.basePath).toBe(".agents/state/memories");
    // Unrelated config is preserved.
    expect(updated.mcpServers.serena).toEqual({ command: "serena" });
  });

  it("leaves a customized memoryConfig basePath alone", () => {
    const root = makeRoot();
    mkdirSync(join(root, ".agents"), { recursive: true });
    const custom = JSON.stringify({
      memoryConfig: { basePath: ".custom/mem" },
    });
    writeFileSync(join(root, ".agents", "mcp.json"), custom);

    expect(migrateStateMemories.up(root)).toEqual([]);
    expect(readFileSync(join(root, ".agents", "mcp.json"), "utf-8")).toBe(
      custom,
    );
  });

  it("is a no-op without a legacy dir or matching files", () => {
    const emptyRoot = makeRoot();
    expect(migrateStateMemories.up(emptyRoot)).toEqual([]);

    const knowledgeOnly = makeRoot();
    mkdirSync(join(knowledgeOnly, ".serena", "memories"), { recursive: true });
    writeFileSync(
      join(knowledgeOnly, ".serena", "memories", "code_style.md"),
      "# Style\n",
    );
    expect(migrateStateMemories.up(knowledgeOnly)).toEqual([]);
    expect(
      existsSync(join(knowledgeOnly, ".agents", "state", "memories")),
    ).toBe(false);
  });
});
