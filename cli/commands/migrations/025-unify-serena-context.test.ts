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
import { migrateUnifiedSerenaContext } from "./025-unify-serena-context.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe("migrateUnifiedSerenaContext (025)", () => {
  it("moves direct and bridge launchers from vendor contexts to oma", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-025-"));
    roots.push(root);
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "mcp.json"),
      `${JSON.stringify({
        mcpServers: {
          serena: {
            command: "serena",
            args: [
              "start-mcp-server",
              "--context",
              "oma-claude-code",
              "--project-from-cwd",
              "--add-mode",
              "no-memories",
            ],
          },
        },
      })}\n`,
    );

    expect(migrateUnifiedSerenaContext.up(root, { vendors: [] })).toEqual([
      ".agents/mcp.json (serena context unified)",
    ]);
    const migrated = JSON.parse(
      readFileSync(join(root, ".agents", "mcp.json"), "utf-8"),
    );
    expect(migrated.mcpServers.serena.args).toContain("oma");
    expect(migrated.mcpServers.serena.args).not.toContain("oma-claude-code");
    expect(migrated.mcpServers.serena.available_tools).toContain("find_symbol");
    expect(migrated.mcpServers.serena.available_tools).toContain(
      "replace_symbol_body",
    );
    expect(migrated.mcpServers.serena.available_tools).not.toContain(
      "write_memory",
    );
    expect(migrateUnifiedSerenaContext.up(root, { vendors: [] })).toEqual([]);
  });

  it("adds the shared context to managed launchers that omitted it", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-025-"));
    roots.push(root);
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "mcp_config.json"),
      `${JSON.stringify({
        mcpServers: {
          serena: { command: "serena", args: ["start-mcp-server"] },
        },
      })}\n`,
    );

    expect(migrateUnifiedSerenaContext.up(root, { vendors: [] })).toEqual([
      ".agents/mcp_config.json (serena context unified)",
    ]);
    const migrated = JSON.parse(
      readFileSync(join(root, ".agents", "mcp_config.json"), "utf-8"),
    );
    expect(migrated.mcpServers.serena.args).toEqual([
      "start-mcp-server",
      "--context",
      "oma",
    ]);
  });

  it("preserves user-owned custom contexts and their tool catalog", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-025-"));
    roots.push(root);
    mkdirSync(join(root, ".agents"), { recursive: true });
    const path = join(root, ".agents", "mcp.json");
    const config = {
      mcpServers: {
        serena: {
          command: "serena",
          args: ["start-mcp-server", "--context", "my-team-context"],
          available_tools: null,
        },
      },
    };
    writeFileSync(path, `${JSON.stringify(config)}\n`);

    expect(migrateUnifiedSerenaContext.up(root, { vendors: [] })).toEqual([]);
    expect(JSON.parse(readFileSync(path, "utf-8"))).toEqual(config);
  });
});
