import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { antigravityMcpConfigPath, applyAntigravityMcpConfig } from "./mcp.js";

const tmpRoots: string[] = [];

function makeTmp(prefix = "oma-agy-mcp-"): string {
  const t = mkdtempSync(join(tmpdir(), prefix));
  tmpRoots.push(t);
  return t;
}

function writeSsotMcp(root: string, servers: Record<string, unknown>): string {
  const dir = join(root, ".agents");
  mkdirSync(dir, { recursive: true });
  const p = join(dir, "mcp.json");
  writeFileSync(p, `${JSON.stringify({ mcpServers: servers }, null, 2)}\n`);
  return p;
}

function expectPath(value: string | null): string {
  if (value === null) throw new Error("expected path");
  return value;
}

afterEach(() => {
  for (const r of tmpRoots) rmSync(r, { recursive: true, force: true });
  tmpRoots.length = 0;
});

describe("antigravityMcpConfigPath", () => {
  it("project mode returns <installRoot>/.agents/mcp_config.json", () => {
    expect(antigravityMcpConfigPath("/tmp/proj", "project")).toBe(
      "/tmp/proj/.agents/mcp_config.json",
    );
  });

  it("global mode returns ~/.gemini/antigravity-cli/mcp_config.json regardless of installRoot", () => {
    expect(antigravityMcpConfigPath("/tmp/proj", "global")).toBe(
      join(homedir(), ".gemini", "antigravity-cli", "mcp_config.json"),
    );
  });
});

describe("applyAntigravityMcpConfig", () => {
  beforeEach(() => {
    tmpRoots.length = 0;
  });

  it("returns null when SSOT mcp.json is missing", () => {
    const root = makeTmp();
    expect(applyAntigravityMcpConfig(root, "project")).toBeNull();
  });

  it("returns null when SSOT mcp.json has no mcpServers key", () => {
    const root = makeTmp();
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(join(root, ".agents", "mcp.json"), "{}");
    expect(applyAntigravityMcpConfig(root, "project")).toBeNull();
  });

  it("writes a stdio server to project mcp_config.json with dashboard opening disabled and the antigravity context", () => {
    const root = makeTmp();
    writeSsotMcp(root, {
      serena: {
        command: "serena",
        args: ["start-mcp-server", "--context", "ide"],
        env: { LOG: "info" },
      },
    });

    const out = applyAntigravityMcpConfig(root, "project");
    expect(out).toBe(join(root, ".agents", "mcp_config.json"));

    const written = JSON.parse(readFileSync(expectPath(out), "utf-8"));
    expect(written.mcpServers.serena.command).toBe("serena");
    expect(written.mcpServers.serena.args).toEqual([
      "start-mcp-server",
      "--context",
      "antigravity",
      "--open-web-dashboard",
      "false",
    ]);
    expect(written.mcpServers.serena.env).toEqual({ LOG: "info" });
  });

  // Regression (issue #578): the SSOT .agents/mcp.json is Claude Code's
  // template (--context claude-code). The Antigravity-derived mcp_config.json
  // must re-stamp serena's context to `antigravity` so the Claude value does
  // not leak — previously transformForAgy copied the args verbatim, which made
  // `agy` launch serena under --context claude-code.
  it("re-stamps serena --context claude-code to antigravity (no Claude context leak)", () => {
    const root = makeTmp();
    writeSsotMcp(root, {
      serena: {
        command: "serena",
        args: [
          "start-mcp-server",
          "--context",
          "claude-code",
          "--project",
          ".",
          "--open-web-dashboard",
          "false",
        ],
        env: { SERENA_LOG_LEVEL: "info" },
      },
    });

    const out = applyAntigravityMcpConfig(root, "project");
    const written = JSON.parse(readFileSync(expectPath(out), "utf-8"));

    const args: string[] = written.mcpServers.serena.args;
    expect(args[args.indexOf("--context") + 1]).toBe("antigravity");
    expect(args).not.toContain("claude-code");
  });

  it("inserts --context antigravity when the SSOT serena entry omits it", () => {
    const root = makeTmp();
    writeSsotMcp(root, {
      serena: { command: "serena", args: ["start-mcp-server"] },
    });

    const out = applyAntigravityMcpConfig(root, "project");
    const written = JSON.parse(readFileSync(expectPath(out), "utf-8"));
    const args: string[] = written.mcpServers.serena.args;
    expect(args).toContain("--context");
    expect(args[args.indexOf("--context") + 1]).toBe("antigravity");
  });

  it("renames remote MCP `url` to `serverUrl` (Antigravity field rename)", () => {
    const root = makeTmp();
    writeSsotMcp(root, {
      remote: { url: "https://mcp.example.com/sse" },
    });

    const out = applyAntigravityMcpConfig(root, "project");
    const written = JSON.parse(readFileSync(expectPath(out), "utf-8"));
    expect(written.mcpServers.remote.serverUrl).toBe(
      "https://mcp.example.com/sse",
    );
    expect(written.mcpServers.remote.url).toBeUndefined();
  });

  it("preserves explicit serverUrl (no double-rename)", () => {
    const root = makeTmp();
    writeSsotMcp(root, {
      remote: { serverUrl: "https://x.example/mcp" },
    });

    const out = applyAntigravityMcpConfig(root, "project");
    const written = JSON.parse(readFileSync(expectPath(out), "utf-8"));
    expect(written.mcpServers.remote.serverUrl).toBe("https://x.example/mcp");
  });

  it("merges with existing user-added servers in target file", () => {
    const root = makeTmp();
    writeSsotMcp(root, { serena: { command: "serena" } });

    // Pre-seed agy mcp_config.json with a user server
    const target = join(root, ".agents", "mcp_config.json");
    writeFileSync(
      target,
      `${JSON.stringify(
        {
          mcpServers: {
            "my-user-server": { command: "node", args: ["my-server.js"] },
          },
        },
        null,
        2,
      )}\n`,
    );

    applyAntigravityMcpConfig(root, "project");

    const written = JSON.parse(readFileSync(target, "utf-8"));
    // Both servers present
    expect(written.mcpServers.serena).toBeDefined();
    expect(written.mcpServers["my-user-server"]).toBeDefined();
    expect(written.mcpServers["my-user-server"].command).toBe("node");
  });

  it("creates parent directory if absent (mkdirSync recursive)", () => {
    const root = makeTmp();
    writeSsotMcp(root, { serena: { command: "serena" } });
    // .agents/ exists (from writeSsotMcp), so this is a no-op coverage check
    // — the real value is in global mode where ~/.gemini/antigravity-cli/
    // may not exist. We can't write to real HOME in tests, but the project
    // path covers the mkdirSync code path.

    const out = applyAntigravityMcpConfig(root, "project");
    expect(existsSync(expectPath(out))).toBe(true);
  });

  it("skips idempotent runs without creating backups", () => {
    const root = makeTmp();
    writeSsotMcp(root, { serena: { command: "serena", args: ["x"] } });

    const out1 = applyAntigravityMcpConfig(root, "project");
    const target = expectPath(out1);
    const content1 = readFileSync(target, "utf-8");

    const out2 = applyAntigravityMcpConfig(root, "project");
    const content2 = readFileSync(target, "utf-8");
    const backups = readdirSync(join(root, ".agents")).filter((entry) =>
      entry.startsWith(".mcp_config.json.backup-"),
    );

    expect(out2).toBeNull();
    expect(content2).toBe(content1);
    expect(backups).toEqual([]);
  });
});
