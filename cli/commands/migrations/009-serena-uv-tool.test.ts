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
import { serenaStartMcpArgs } from "../../vendors/serena.js";
import { migrateSerenaUvTool } from "./009-serena-uv-tool.js";

describe("migrateSerenaUvTool (009)", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("rewrites legacy uvx --from git+ serena entries to direct serena command across vendors", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-009-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".codex"), { recursive: true });
    writeFileSync(
      join(root, ".codex", "config.toml"),
      `[mcp_servers.serena]
command = "uvx"
args = ["--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server", "--context", "codex", "--project", "."]

[mcp_servers.serena.env]
SERENA_LOG_LEVEL = "info"
`,
      "utf-8",
    );

    mkdirSync(join(root, ".qwen"), { recursive: true });
    writeFileSync(
      join(root, ".qwen", "settings.json"),
      `${JSON.stringify(
        {
          mcpServers: {
            serena: {
              command: "uvx",
              args: [
                "--from",
                "git+https://github.com/oraios/serena",
                "serena",
                "start-mcp-server",
                "--context",
                "agent",
                "--project",
                ".",
              ],
              env: { SERENA_LOG_LEVEL: "info" },
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "mcp.json"),
      `${JSON.stringify(
        {
          mcpServers: {
            serena: {
              command: "uvx",
              args: [
                "--from",
                "git+https://github.com/oraios/serena",
                "serena",
                "start-mcp-server",
                "--context",
                "ide",
                "--project",
                ".",
              ],
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    const actions = migrateSerenaUvTool.up(root);

    expect(actions).toContain(
      ".codex/config.toml (Serena uvx → uv tool install)",
    );
    expect(actions).toContain(
      ".qwen/settings.json (Serena uvx → uv tool install)",
    );
    expect(actions).toContain(
      ".agents/mcp.json (Serena uvx → uv tool install)",
    );

    const codexToml = readFileSync(
      join(root, ".codex", "config.toml"),
      "utf-8",
    );
    expect(codexToml).toContain('command = "serena"');
    expect(codexToml).not.toContain("git+https://github.com/oraios/serena");
    expect(codexToml).toContain('"start-mcp-server"');
    expect(codexToml).toContain('"--context"');
    expect(codexToml).toContain('"codex"');

    const qwen = JSON.parse(
      readFileSync(join(root, ".qwen", "settings.json"), "utf-8"),
    );
    expect(qwen.mcpServers.serena.command).toBe("serena");
    expect(qwen.mcpServers.serena.args).toEqual([
      "start-mcp-server",
      "--context",
      "ide",
      "--project",
      ".",
      "--open-web-dashboard",
      "false",
    ]);
    expect(qwen.mcpServers.serena.env).toEqual({ SERENA_LOG_LEVEL: "info" });

    const agents = JSON.parse(
      readFileSync(join(root, ".agents", "mcp.json"), "utf-8"),
    );
    expect(agents.mcpServers.serena.command).toBe("serena");
  });

  it("is idempotent when serena is already on the new form with the correct context", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-009-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".qwen"), { recursive: true });
    writeFileSync(
      join(root, ".qwen", "settings.json"),
      `${JSON.stringify(
        {
          mcpServers: {
            serena: {
              command: "serena",
              args: serenaStartMcpArgs("ide"),
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    const first = migrateSerenaUvTool.up(root);
    expect(first).toHaveLength(0);

    const second = migrateSerenaUvTool.up(root);
    expect(second).toHaveLength(0);
  });

  it("upgrades context when serena is on the new form but uses the old context value", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-009-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".qwen"), { recursive: true });
    writeFileSync(
      join(root, ".qwen", "settings.json"),
      `${JSON.stringify(
        {
          mcpServers: {
            serena: {
              command: "serena",
              args: [
                "start-mcp-server",
                "--context",
                "agent",
                "--project",
                ".",
              ],
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    const actions = migrateSerenaUvTool.up(root);
    expect(actions).toContain(
      ".qwen/settings.json (Serena uvx → uv tool install)",
    );

    const parsed = JSON.parse(
      readFileSync(join(root, ".qwen", "settings.json"), "utf-8"),
    );
    expect(parsed.mcpServers.serena.args).toEqual([
      "start-mcp-server",
      "--context",
      "ide",
      "--project",
      ".",
      "--open-web-dashboard",
      "false",
    ]);
  });

  it("does not touch unrelated uvx commands (e.g. other MCP servers)", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-009-"));
    tempRoots.push(root);

    mkdirSync(join(root, ".qwen"), { recursive: true });
    writeFileSync(
      join(root, ".qwen", "settings.json"),
      `${JSON.stringify(
        {
          mcpServers: {
            other: {
              command: "uvx",
              args: ["--from", "git+https://github.com/foo/bar", "bar"],
            },
            serena: {
              command: "serena",
              args: [
                "start-mcp-server",
                "--context",
                "ide",
                "--open-web-dashboard",
                "false",
              ],
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    const actions = migrateSerenaUvTool.up(root);
    expect(actions).toHaveLength(0);
  });
});
