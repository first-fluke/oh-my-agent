import { describe, expect, it } from "vitest";
import {
  applyClaudeMcp,
  type ClaudeMcpServer,
  needsClaudeMcpUpdate,
  RECOMMENDED_CLAUDE_MCP,
} from "./mcp.js";

// A serena entry that already satisfies the transport/context/dashboard
// checks, so `needsClaudeMcpUpdate` returns false absent any SSOT drift.
const HEALTHY_SERENA = { ...RECOMMENDED_CLAUDE_MCP.serena };

const SSOT_SERVERS: Record<string, ClaudeMcpServer> = {
  "chrome-devtools": {
    command: "npx",
    args: ["-y", "chrome-devtools-mcp@latest", "--no-usage-statistics"],
  },
  context7: {
    command: "npx",
    args: ["-y", "@upstash/context7-mcp@latest"],
  },
  // serena in the SSOT carries the antigravity/claude-code template args; it
  // must be ignored here since serena is managed via RECOMMENDED_CLAUDE_MCP.
  serena: {
    command: "serena",
    args: ["start-mcp-server", "--context", "ide"],
  },
};

describe("needsClaudeMcpUpdate — SSOT drift", () => {
  it("requires an update when an SSOT server is missing from .mcp.json", () => {
    const existing = { mcpServers: { serena: HEALTHY_SERENA } };
    // Without SSOT context the file looks healthy...
    expect(needsClaudeMcpUpdate(existing)).toBe(false);
    // ...but with a SSOT that has gained chrome-devtools/context7 it is stale.
    expect(needsClaudeMcpUpdate(existing, SSOT_SERVERS)).toBe(true);
  });

  it("does not require an update when all SSOT servers are already present", () => {
    const existing = {
      mcpServers: {
        serena: HEALTHY_SERENA,
        "chrome-devtools": SSOT_SERVERS["chrome-devtools"],
        context7: SSOT_SERVERS.context7,
      },
    };
    expect(needsClaudeMcpUpdate(existing, SSOT_SERVERS)).toBe(false);
  });

  it("ignores the SSOT serena entry when deciding drift", () => {
    // serena present + all non-serena SSOT servers present → no update, even
    // though the SSOT serena args differ from the local claude-code ones.
    const existing = {
      mcpServers: {
        serena: HEALTHY_SERENA,
        "chrome-devtools": SSOT_SERVERS["chrome-devtools"],
        context7: SSOT_SERVERS.context7,
      },
    };
    expect(needsClaudeMcpUpdate(existing, SSOT_SERVERS)).toBe(false);
  });
});

describe("applyClaudeMcp — SSOT back-fill", () => {
  it("repairs a pinned local bridge without dropping server customizations", () => {
    const serena = {
      command: "oma",
      args: ["bridge", "http://127.0.0.1:12389/mcp", "--context", "oma"],
      env: { OMA_BRIDGE_TEST: "preserved" },
      timeout: 120,
    };
    const other = { command: "my-other-mcp", args: ["--flag"] };
    const existing = { mcpServers: { serena, other } };

    expect(needsClaudeMcpUpdate(existing)).toBe(true);
    const next = applyClaudeMcp(existing);
    expect(next.mcpServers?.serena).toEqual({
      ...serena,
      args: ["bridge", "--context", "oma"],
    });
    expect(next.mcpServers?.other).toEqual(other);
    expect(needsClaudeMcpUpdate(next)).toBe(false);
  });

  it("does not request a rewrite for an explicit remote bridge", () => {
    expect(
      needsClaudeMcpUpdate({
        mcpServers: {
          serena: {
            command: "oma",
            args: [
              "bridge",
              "https://serena.example.com/mcp",
              "--context",
              "oma",
            ],
          },
        },
      }),
    ).toBe(false);
  });

  it("seeds all SSOT servers into an empty config", () => {
    const next = applyClaudeMcp({}, SSOT_SERVERS);
    expect(Object.keys(next.mcpServers ?? {}).sort()).toEqual([
      "chrome-devtools",
      "context7",
      "serena",
    ]);
    // serena is the claude-code recommended entry, not the SSOT template one.
    expect(next.mcpServers?.serena).toEqual(RECOMMENDED_CLAUDE_MCP.serena);
  });

  it("back-fills a server missing from an existing .mcp.json", () => {
    const existing = { mcpServers: { serena: HEALTHY_SERENA } };
    const next = applyClaudeMcp(existing, SSOT_SERVERS);
    expect(next.mcpServers?.["chrome-devtools"]).toEqual(
      SSOT_SERVERS["chrome-devtools"],
    );
    expect(next.mcpServers?.context7).toEqual(SSOT_SERVERS.context7);
  });

  it("preserves user customizations of an existing server", () => {
    const customChrome: ClaudeMcpServer = {
      command: "npx",
      args: ["-y", "chrome-devtools-mcp@latest", "--headless"],
    };
    const existing = {
      mcpServers: { serena: HEALTHY_SERENA, "chrome-devtools": customChrome },
    };
    const next = applyClaudeMcp(existing, SSOT_SERVERS);
    // The user's chrome-devtools definition is untouched...
    expect(next.mcpServers?.["chrome-devtools"]).toEqual(customChrome);
    // ...and context7 (still missing) is added.
    expect(next.mcpServers?.context7).toEqual(SSOT_SERVERS.context7);
  });

  it("always resets serena to the claude-code recommended value", () => {
    const existing = {
      mcpServers: {
        serena: { command: "serena", args: ["start-mcp-server"] },
      },
    };
    const next = applyClaudeMcp(existing, SSOT_SERVERS);
    expect(next.mcpServers?.serena).toEqual(RECOMMENDED_CLAUDE_MCP.serena);
  });

  it("remains a serena-only merge when no SSOT servers are provided", () => {
    const existing = {
      mcpServers: {
        serena: { command: "serena", args: ["start-mcp-server"] },
        custom: { command: "foo" },
      },
    };
    const next = applyClaudeMcp(existing);
    expect(Object.keys(next.mcpServers ?? {}).sort()).toEqual([
      "custom",
      "serena",
    ]);
    expect(next.mcpServers?.serena).toEqual(RECOMMENDED_CLAUDE_MCP.serena);
  });
});
