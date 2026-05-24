import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyCursorMcpConfig } from "./skills-installer.js";

describe("applyCursorMcpConfig", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots) {
      rmSync(root, { recursive: true, force: true });
    }
    roots.length = 0;
  });

  function projectRoot(): string {
    const root = mkdtempSync(join(tmpdir(), "oma-cursor-mcp-"));
    roots.push(root);
    return root;
  }

  it("creates .cursor/mcp.json with serena --context=ide and preserves other servers", () => {
    const root = projectRoot();
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "mcp.json"),
      `${JSON.stringify(
        {
          mcpServers: {
            "chrome-devtools": { command: "npx", args: ["-y", "x"] },
            serena: {
              command: "serena",
              args: [
                "start-mcp-server",
                "--context",
                "claude-code",
                "--project",
                ".",
              ],
            },
          },
          memoryConfig: { provider: "serena" },
          toolGroups: { memory: ["read_memory"] },
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    applyCursorMcpConfig(root);

    const cursorMcp = join(root, ".cursor", "mcp.json");
    expect(lstatSync(cursorMcp).isSymbolicLink()).toBe(false);

    const parsed = JSON.parse(readFileSync(cursorMcp, "utf-8"));
    expect(parsed.mcpServers["chrome-devtools"]).toEqual({
      command: "npx",
      args: ["-y", "x"],
    });
    expect(parsed.mcpServers.serena).toEqual({
      command: "serena",
      args: ["start-mcp-server", "--context", "ide", "--project", "."],
      env: { SERENA_LOG_LEVEL: "info" },
    });
    expect(parsed.memoryConfig).toBeUndefined();
    expect(parsed.toolGroups).toBeUndefined();
  });

  it("no-ops when .agents/mcp.json is missing", () => {
    const root = projectRoot();
    mkdirSync(join(root, ".cursor"), { recursive: true });

    applyCursorMcpConfig(root);

    expect(() => lstatSync(join(root, ".cursor", "mcp.json"))).toThrow();
  });

  it("replaces a legacy symlink with a regular file", () => {
    const root = projectRoot();
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "mcp.json"),
      `${JSON.stringify({ mcpServers: { serena: { command: "x" } } })}\n`,
      "utf-8",
    );
    mkdirSync(join(root, ".cursor"), { recursive: true });
    symlinkSync(
      join("..", ".agents", "mcp.json"),
      join(root, ".cursor", "mcp.json"),
      "file",
    );
    expect(lstatSync(join(root, ".cursor", "mcp.json")).isSymbolicLink()).toBe(
      true,
    );

    applyCursorMcpConfig(root);

    expect(lstatSync(join(root, ".cursor", "mcp.json")).isSymbolicLink()).toBe(
      false,
    );
    const parsed = JSON.parse(
      readFileSync(join(root, ".cursor", "mcp.json"), "utf-8"),
    );
    expect(parsed.mcpServers.serena.args).toContain("ide");
  });
});
