import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateMcpProcessCost } from "./019-mcp-process-cost.js";

let cwd: string;

function writeJson(relPath: string, value: unknown): void {
  const full = join(cwd, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, `${JSON.stringify(value, null, 2)}\n`);
}

interface McpFile {
  mcpServers?: Record<string, Record<string, unknown> | undefined>;
}

function readJson(relPath: string): McpFile {
  return JSON.parse(readFileSync(join(cwd, relPath), "utf-8"));
}

const LOCAL_CONTEXT7 = {
  command: "npx",
  args: ["-y", "@upstash/context7-mcp@latest"],
};

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "oma-mig019-"));
});

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
});

describe("migrateMcpProcessCost — context7", () => {
  it("rewrites the npx entry to the hosted server", () => {
    writeJson(".mcp.json", { mcpServers: { context7: LOCAL_CONTEXT7 } });

    const actions = migrateMcpProcessCost.up(cwd);

    expect(actions).toHaveLength(1);
    expect(readJson(".mcp.json")).toEqual({
      mcpServers: {
        context7: { type: "http", url: "https://mcp.context7.com/mcp" },
      },
    });
  });

  it("uses Antigravity's serverUrl field for mcp_config.json", () => {
    writeJson(".agents/mcp_config.json", {
      mcpServers: { context7: LOCAL_CONTEXT7 },
    });

    migrateMcpProcessCost.up(cwd);

    expect(readJson(".agents/mcp_config.json")).toEqual({
      mcpServers: {
        context7: { serverUrl: "https://mcp.context7.com/mcp" },
      },
    });
  });

  it("carries an API key from env over to a header", () => {
    writeJson(".mcp.json", {
      mcpServers: {
        context7: { ...LOCAL_CONTEXT7, env: { CONTEXT7_API_KEY: "ctx7sk-x" } },
      },
    });

    migrateMcpProcessCost.up(cwd);

    expect(readJson(".mcp.json")).toEqual({
      mcpServers: {
        context7: {
          type: "http",
          url: "https://mcp.context7.com/mcp",
          headers: { CONTEXT7_API_KEY: "ctx7sk-x" },
        },
      },
    });
  });

  it("carries an inline --api-key argument over to a header", () => {
    writeJson(".mcp.json", {
      mcpServers: {
        context7: {
          command: "npx",
          args: ["-y", "@upstash/context7-mcp@latest", "--api-key", "ctx7sk-y"],
        },
      },
    });

    migrateMcpProcessCost.up(cwd);

    expect(readJson(".mcp.json").mcpServers?.context7?.headers).toEqual({
      CONTEXT7_API_KEY: "ctx7sk-y",
    });
  });

  it("preserves other servers", () => {
    writeJson(".mcp.json", {
      mcpServers: {
        context7: LOCAL_CONTEXT7,
        serena: { command: "serena", args: ["start-mcp-server"] },
      },
    });

    migrateMcpProcessCost.up(cwd);

    expect(readJson(".mcp.json").mcpServers?.serena).toEqual({
      command: "serena",
      args: ["start-mcp-server"],
    });
  });

  it("is idempotent", () => {
    writeJson(".mcp.json", { mcpServers: { context7: LOCAL_CONTEXT7 } });

    migrateMcpProcessCost.up(cwd);
    const after = migrateMcpProcessCost.up(cwd);

    expect(after).toEqual([]);
  });

  it("leaves a user's own context7 entry alone", () => {
    writeJson(".mcp.json", {
      mcpServers: { context7: { command: "my-context7-fork" } },
    });

    expect(migrateMcpProcessCost.up(cwd)).toEqual([]);
  });

  it("skips unreadable json rather than throwing", () => {
    mkdirSync(join(cwd, ".agents"), { recursive: true });
    writeFileSync(join(cwd, ".agents", "mcp.json"), "{ not json");

    expect(() => migrateMcpProcessCost.up(cwd)).not.toThrow();
  });
});

describe("migrateMcpProcessCost — serena project.yml repair", () => {
  function writeProjectYml(content: string): void {
    mkdirSync(join(cwd, ".serena"), { recursive: true });
    writeFileSync(join(cwd, ".serena", "project.yml"), content);
  }

  function readProjectYml(): string {
    return readFileSync(join(cwd, ".serena", "project.yml"), "utf-8");
  }

  it("restores the legacy key a newer serena dropped", () => {
    // Without `languages:`, serena 1.6.1 dies with KeyError before starting.
    writeProjectYml(
      'project_name: "t"\nlanguage_servers:\n- typescript\n- bash\n',
    );

    const actions = migrateMcpProcessCost.up(cwd);

    expect(actions).toHaveLength(1);
    const result = readProjectYml();
    expect(result).toContain("languages:\n- typescript\n- bash\n");
    expect(result).toContain("language_servers:\n- typescript\n- bash\n");
  });

  it("does not change which language servers run", () => {
    writeProjectYml("language_servers:\n- typescript\n- dart\n");

    migrateMcpProcessCost.up(cwd);

    expect(readProjectYml()).toContain(
      "language_servers:\n- typescript\n- dart\n",
    );
  });

  it("leaves a file that already has the legacy key alone", () => {
    writeProjectYml("languages:\n- typescript\n");
    expect(migrateMcpProcessCost.up(cwd)).toEqual([]);
  });

  it("is idempotent", () => {
    writeProjectYml("language_servers:\n- typescript\n");

    migrateMcpProcessCost.up(cwd);
    expect(migrateMcpProcessCost.up(cwd)).toEqual([]);
  });

  it("leaves malformed yaml alone", () => {
    writeProjectYml("language_servers:\n  - [unclosed\n");
    expect(migrateMcpProcessCost.up(cwd)).toEqual([]);
  });
});
