import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { migrateUnifiedSerenaContext } from "./025-unify-serena-context.js";
import { migrateRemoveMcpToolGroups } from "./035-remove-mcp-tool-groups.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
  tempRoots.length = 0;
});

function projectWithMcpConfig(body: string): { root: string; path: string } {
  const root = mkdtempSync(join(tmpdir(), "oma-migrate-035-"));
  tempRoots.push(root);
  mkdirSync(join(root, ".agents"), { recursive: true });
  const path = join(root, ".agents", "mcp.json");
  writeFileSync(path, body);
  return { root, path };
}

describe("migrateRemoveMcpToolGroups (035)", () => {
  it("drops toolGroups, keeps every other key, and is then a no-op", () => {
    const { root, path } = projectWithMcpConfig(
      JSON.stringify({
        mcpServers: { serena: { command: "serena", args: [] } },
        memoryConfig: { provider: "file" },
        toolGroups: { "code-edit": ["rename_symbol"], mine: ["custom_tool"] },
      }),
    );

    expect(migrateRemoveMcpToolGroups.up(root)).toEqual([
      ".agents/mcp.json (removed unused toolGroups)",
    ]);
    expect(JSON.parse(readFileSync(path, "utf-8"))).toEqual({
      mcpServers: { serena: { command: "serena", args: [] } },
      memoryConfig: { provider: "file" },
    });
    expect(migrateRemoveMcpToolGroups.up(root)).toEqual([]);
  });

  it("leaves a config without toolGroups byte-for-byte", () => {
    const body = '{"mcpServers":{}}';
    const { root, path } = projectWithMcpConfig(body);

    expect(migrateRemoveMcpToolGroups.up(root)).toEqual([]);
    expect(readFileSync(path, "utf-8")).toBe(body);
  });

  it("leaves a malformed config untouched", () => {
    const { root, path } = projectWithMcpConfig("{ not json");

    expect(migrateRemoveMcpToolGroups.up(root)).toEqual([]);
    expect(readFileSync(path, "utf-8")).toBe("{ not json");
  });

  it("does nothing when the config is absent", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-035-"));
    tempRoots.push(root);

    expect(migrateRemoveMcpToolGroups.up(root)).toEqual([]);
  });

  // Migration 025 refreshes toolGroups only when the key exists, so it must
  // not bring the key back on the next update.
  it("stays removed when the Serena catalog migration runs again", () => {
    const { root, path } = projectWithMcpConfig(
      readFileSync(join(repoRoot, ".agents", "mcp.json"), "utf-8"),
    );
    migrateRemoveMcpToolGroups.up(root);

    migrateUnifiedSerenaContext.up(root, { vendors: [] });

    expect(JSON.parse(readFileSync(path, "utf-8")).toolGroups).toBeUndefined();
  });

  it("is not shipped in the config template", () => {
    const template = JSON.parse(
      readFileSync(join(repoRoot, ".agents", "mcp.json"), "utf-8"),
    );

    expect(template.toolGroups).toBeUndefined();
  });
});
