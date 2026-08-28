import { describe, expect, it } from "vitest";
import {
  hasSerenaNoMemories,
  hasStaleSerenaTransport,
  omaSerenaContext,
  serenaDaemonMcpArgs,
  serenaMcpEntry,
  serenaStartMcpArgs,
  withSerenaContext,
  withSerenaNoMemories,
  withSerenaProjectFromCwd,
} from "./serena.js";

describe("serenaStartMcpArgs", () => {
  it("uses --project-from-cwd (not --project .)", () => {
    const args = serenaStartMcpArgs("claude-code");
    expect(args).toContain("--project-from-cwd");
    expect(args).not.toContain("--project");
    expect(args).toEqual([
      "start-mcp-server",
      "--context",
      "oma",
      "--project-from-cwd",
      "--add-mode",
      "no-memories",
      "--open-web-dashboard",
      "false",
    ]);
  });
});

describe("serenaDaemonMcpArgs", () => {
  it("disables memory tools for shared HTTP daemons", () => {
    expect(serenaDaemonMcpArgs("ide", "/project", 8765)).toEqual([
      "start-mcp-server",
      "--transport",
      "streamable-http",
      "--host",
      "127.0.0.1",
      "--port",
      "8765",
      "--project",
      "/project",
      "--context",
      "oma",
      "--add-mode",
      "no-memories",
      "--open-web-dashboard",
      "false",
    ]);
  });
});

describe("omaSerenaContext", () => {
  it("maps every OMA-managed client to one shared context", () => {
    expect(omaSerenaContext("codex")).toBe("oma");
    expect(omaSerenaContext("ide")).toBe("oma");
    expect(omaSerenaContext("claude-code")).toBe("oma");
    expect(omaSerenaContext("antigravity")).toBe("oma");
  });

  it("migrates legacy OMA contexts and preserves unknown custom contexts", () => {
    expect(omaSerenaContext("oma")).toBe("oma");
    expect(omaSerenaContext("oma-codex")).toBe("oma");
    expect(omaSerenaContext("oma-ide")).toBe("oma");
    expect(omaSerenaContext("my-team-context")).toBe("my-team-context");
  });
});

describe("withSerenaNoMemories", () => {
  it("adds the built-in mode once to direct Serena entries", () => {
    const entry = {
      command: "serena",
      args: ["start-mcp-server", "--context", "ide"],
    };
    const migrated = withSerenaNoMemories(entry);

    expect(migrated.args.slice(-2)).toEqual(["--add-mode", "no-memories"]);
    expect(hasSerenaNoMemories(migrated)).toBe(true);
    expect(withSerenaNoMemories(migrated)).toBe(migrated);
  });

  it("marks direct entries without the mode as stale", () => {
    const stale = {
      command: "serena",
      args: ["start-mcp-server", "--context", "ide"],
    };
    expect(hasStaleSerenaTransport(stale, "stdio")).toBe(true);
    expect(
      hasStaleSerenaTransport(
        withSerenaContext(withSerenaNoMemories(stale), "ide"),
        "stdio",
      ),
    ).toBe(false);
  });

  it("does not append Serena-only flags to bridge entries", () => {
    const entry = {
      command: "oma",
      args: ["bridge", "--context", "ide"],
    };
    expect(withSerenaNoMemories(entry)).toBe(entry);
  });
});

describe("withSerenaProjectFromCwd", () => {
  it("replaces --project <value> with --project-from-cwd (mutually exclusive)", () => {
    const out = withSerenaProjectFromCwd({
      command: "serena",
      args: ["start-mcp-server", "--context", "ide", "--project", "."],
    });
    expect(out.args).toEqual([
      "start-mcp-server",
      "--context",
      "ide",
      "--project-from-cwd",
    ]);
    // Never leaves both flags — serena raises UsageError if both are present.
    expect(out.args).not.toContain("--project");
  });

  it("appends --project-from-cwd when no project flag is present", () => {
    const out = withSerenaProjectFromCwd({
      command: "serena",
      args: ["start-mcp-server", "--context", "codex"],
    });
    expect(out.args).toEqual([
      "start-mcp-server",
      "--context",
      "codex",
      "--project-from-cwd",
    ]);
  });

  it("is idempotent when --project-from-cwd is already set", () => {
    const server = {
      command: "serena",
      args: ["start-mcp-server", "--project-from-cwd"],
    };
    expect(withSerenaProjectFromCwd(server)).toBe(server);
  });

  it("does not drop a following flag when --project has no value", () => {
    const out = withSerenaProjectFromCwd({
      command: "serena",
      args: ["start-mcp-server", "--project", "--open-web-dashboard", "false"],
    });
    expect(out.args).toEqual([
      "start-mcp-server",
      "--project-from-cwd",
      "--open-web-dashboard",
      "false",
    ]);
  });

  it("leaves non-serena entries untouched", () => {
    const server = { command: "uvx", args: ["--project", "."] };
    expect(withSerenaProjectFromCwd(server)).toBe(server);
  });
});

describe("withSerenaContext", () => {
  it("rewrites an existing --context value", () => {
    const out = withSerenaContext(
      {
        command: "serena",
        args: ["start-mcp-server", "--context", "claude-code"],
      },
      "antigravity",
    );
    expect(out.args).toEqual(["start-mcp-server", "--context", "oma"]);
  });

  it("appends --context when absent", () => {
    const out = withSerenaContext(
      { command: "serena", args: ["start-mcp-server"] },
      "antigravity",
    );
    expect(out.args).toEqual(["start-mcp-server", "--context", "oma"]);
  });

  it("is idempotent when the context already matches", () => {
    const server = {
      command: "serena",
      args: ["start-mcp-server", "--context", "oma"],
    };
    const out = withSerenaContext(server, "antigravity");
    expect(out).toBe(server);
  });

  it("leaves non-serena entries untouched", () => {
    const server = { command: "uvx", args: ["--context", "claude-code"] };
    const out = withSerenaContext(server, "antigravity");
    expect(out).toBe(server);
    expect(out.args).toEqual(["--context", "claude-code"]);
  });

  it("no-ops when args is not an array", () => {
    const server = { command: "serena" };
    expect(withSerenaContext(server, "antigravity")).toBe(server);
  });
});

describe("syncDevToolsMcp", () => {
  it("syncs chrome and firefox MCP servers into mcp.json", async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } =
      await import("node:fs");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const { syncDevToolsMcp, RECOMMENDED_FIREFOX_DEVTOOLS_MCP } = await import(
      "./serena.js"
    );

    const tmp = mkdtempSync(join(tmpdir(), "oma-devtools-test-"));
    try {
      const agentsDir = join(tmp, ".agents");
      mkdirSync(agentsDir, { recursive: true });
      const mcpFile = join(agentsDir, "mcp.json");
      writeFileSync(mcpFile, JSON.stringify({ mcpServers: {} }));

      syncDevToolsMcp(tmp, ["chrome", "firefox"]);

      const parsed = JSON.parse(readFileSync(mcpFile, "utf-8"));
      expect(parsed.mcpServers["chrome-devtools"]).toBeDefined();
      expect(parsed.mcpServers["firefox-devtools"]).toEqual(
        RECOMMENDED_FIREFOX_DEVTOOLS_MCP,
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("serenaMcpEntry — machine portability", () => {
  it("bridge entries invoke the bare oma binary, never an absolute path", () => {
    // Regression for 11.0.0, which baked process.execPath + the script path
    // into the entry. Claude's .mcp.json is a committed file, so that put
    // /Users/<name>/... into version control and broke every other checkout.
    const entry = serenaMcpEntry("claude-code", "bridge");
    expect(entry.command).toBe("oma");
    expect(entry.args).toEqual(["bridge", "--context", "oma"]);
  });

  it("stdio entries keep the bare serena binary", () => {
    const entry = serenaMcpEntry("ide", "stdio");
    expect(entry.command).toBe("serena");
  });
});

describe("hasStaleSerenaTransport — absolute-path bridge repair", () => {
  it("flags a 11.0.0 absolute-path bridge entry for rewrite", () => {
    const contaminated = {
      command:
        "/Users/someone/.local/share/mise/installs/node/24.17.0/bin/node",
      args: ["/Users/someone/.local/bin/oma", "bridge", "--context", "ide"],
    };
    expect(hasStaleSerenaTransport(contaminated, "bridge")).toBe(true);
  });

  it("accepts a bare-oma bridge entry in bridge mode", () => {
    expect(
      hasStaleSerenaTransport(serenaMcpEntry("ide", "bridge"), "bridge"),
    ).toBe(false);
  });

  it("flags a legacy built-in context even when no-memories is present", () => {
    expect(
      hasStaleSerenaTransport(
        {
          command: "serena",
          args: [
            "start-mcp-server",
            "--context",
            "codex",
            "--add-mode",
            "no-memories",
          ],
        },
        "stdio",
      ),
    ).toBe(true);
  });

  it("flags the superseded vendor-specific OMA contexts", () => {
    expect(
      hasStaleSerenaTransport(
        { command: "oma", args: ["bridge", "--context", "oma-codex"] },
        "bridge",
      ),
    ).toBe(true);
  });
});
