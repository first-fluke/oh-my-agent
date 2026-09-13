import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isDirectOmaSerenaLauncher,
  migrateProjectSerenaBridge,
} from "./029-project-serena-bridge.js";

let root = "";

function write(rel: string, content: string): void {
  const path = join(root, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content, "utf-8");
}

function readJson(rel: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(root, rel), "utf-8"));
}

const DIRECT_CODEX = `[features]
goals = true

[mcp_servers.serena]
command = "serena"
args = [ "start-mcp-server", "--context", "codex", "--project", ".", "--open-web-dashboard", "false" ]
startup_timeout_sec = 90

[mcp_servers.serena.env]
SERENA_LOG_LEVEL = "info"

[mcp_servers.chrome-devtools]
command = "npx"
args = [ "-y", "chrome-devtools-mcp@latest" ]
`;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-mig029-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("migration 029 — per-project Serena launchers move to the shared bridge", () => {
  it("rewrites codex, qwen, cursor and opencode entries in their native shapes", () => {
    write(".codex/config.toml", DIRECT_CODEX);
    write(
      ".qwen/settings.json",
      JSON.stringify({
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
          context7: { type: "http", url: "https://mcp.context7.com/mcp" },
        },
      }),
    );
    write(
      ".cursor/mcp.json",
      JSON.stringify({
        mcpServers: {
          serena: {
            type: "stdio",
            command: "serena",
            args: [
              "start-mcp-server",
              "--context",
              "ide",
              "--project-from-cwd",
            ],
            env: { SERENA_LOG_LEVEL: "debug" },
          },
        },
      }),
    );
    write(
      ".opencode/opencode.jsonc",
      JSON.stringify({
        mcp: {
          serena: {
            type: "local",
            command: ["serena", "start-mcp-server", "--context", "ide"],
            enabled: true,
          },
        },
      }),
    );

    const actions = migrateProjectSerenaBridge.up(root);

    expect(actions).toEqual([
      ".cursor/mcp.json (per-session Serena → shared bridge)",
      ".codex/config.toml (per-session Serena → shared bridge)",
      ".qwen/settings.json (per-session Serena → shared bridge)",
      ".opencode/opencode.jsonc (per-session Serena → shared bridge)",
    ]);

    const codex = parseToml(
      readFileSync(join(root, ".codex/config.toml"), "utf-8"),
    ) as {
      features: unknown;
      mcp_servers: Record<string, Record<string, unknown>>;
    };
    expect(codex.mcp_servers.serena).toEqual({
      command: "oma",
      args: ["bridge", "--context", "oma"],
      startup_timeout_sec: 90,
      env: { SERENA_LOG_LEVEL: "info" },
    });
    expect(codex.features).toEqual({ goals: true });
    expect(codex.mcp_servers["chrome-devtools"]?.command).toBe("npx");

    const qwen = readJson(".qwen/settings.json").mcpServers as Record<
      string,
      unknown
    >;
    expect(qwen.serena).toEqual({
      command: "oma",
      args: ["bridge", "--context", "oma"],
      env: { SERENA_LOG_LEVEL: "info" },
    });
    expect(qwen.context7).toEqual({
      type: "http",
      url: "https://mcp.context7.com/mcp",
    });

    const cursor = readJson(".cursor/mcp.json").mcpServers as Record<
      string,
      unknown
    >;
    expect(cursor.serena).toEqual({
      type: "stdio",
      command: "oma",
      args: ["bridge", "--context", "oma"],
      env: { SERENA_LOG_LEVEL: "info" },
    });

    const opencode = readJson(".opencode/opencode.jsonc").mcp as Record<
      string,
      unknown
    >;
    expect(opencode.serena).toEqual({
      type: "local",
      command: ["oma", "bridge", "--context", "oma"],
      enabled: true,
    });
  });

  it("is idempotent and leaves bridge entries, foreign launchers and missing files alone", () => {
    write(".codex/config.toml", DIRECT_CODEX);
    write(
      ".mcp.json",
      JSON.stringify({
        mcpServers: {
          serena: { command: "oma", args: ["bridge", "--context", "oma"] },
        },
      }),
    );
    write(
      ".github/mcp.json",
      JSON.stringify({
        mcpServers: {
          serena: {
            type: "local",
            command: "/opt/custom/serena-wrapper",
            args: ["--listen", "9000"],
            tools: ["*"],
          },
        },
      }),
    );
    const claudeBefore = readFileSync(join(root, ".mcp.json"), "utf-8");
    const copilotBefore = readFileSync(join(root, ".github/mcp.json"), "utf-8");

    expect(migrateProjectSerenaBridge.up(root)).toEqual([
      ".codex/config.toml (per-session Serena → shared bridge)",
    ]);
    expect(migrateProjectSerenaBridge.up(root)).toEqual([]);
    expect(readFileSync(join(root, ".mcp.json"), "utf-8")).toBe(claudeBefore);
    expect(readFileSync(join(root, ".github/mcp.json"), "utf-8")).toBe(
      copilotBefore,
    );
  });

  it("respects serena.mode: stdio and the vendor selection", () => {
    write(".codex/config.toml", DIRECT_CODEX);
    write(".agents/oma-config.yaml", "serena:\n  mode: stdio\n");
    expect(migrateProjectSerenaBridge.up(root)).toEqual([]);

    rmSync(join(root, ".agents"), { recursive: true, force: true });
    expect(
      migrateProjectSerenaBridge.up(root, { vendors: ["claude"] }),
    ).toEqual([]);
    expect(migrateProjectSerenaBridge.up(root, { vendors: ["codex"] })).toEqual(
      [".codex/config.toml (per-session Serena → shared bridge)"],
    );
  });

  it("recognises only oma's own direct launcher shapes", () => {
    expect(
      isDirectOmaSerenaLauncher({
        command: "serena",
        args: ["start-mcp-server", "--context", "codex"],
      }),
    ).toBe(true);
    expect(
      isDirectOmaSerenaLauncher({
        command: "serena",
        args: [
          "start-mcp-server",
          "--transport",
          "streamable-http",
          "--port",
          "1",
        ],
      }),
    ).toBe(false);
    expect(
      isDirectOmaSerenaLauncher({
        command: "oma",
        args: ["bridge", "--context", "oma"],
      }),
    ).toBe(false);
    expect(
      isDirectOmaSerenaLauncher({ command: "serena", args: ["--version"] }),
    ).toBe(false);
    expect(
      isDirectOmaSerenaLauncher({ command: ["serena", "start-mcp-server"] }),
    ).toBe(true);
    expect(isDirectOmaSerenaLauncher("serena")).toBe(false);
  });
});
