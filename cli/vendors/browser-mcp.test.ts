import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncBrowserMcp } from "./browser-mcp.js";

const aside = vi.hoisted(() => vi.fn(() => "aside"));
vi.mock("./aside.js", () => ({ resolveAsideCommand: aside }));

let root: string;
beforeEach(() => {
  aside.mockReset().mockReturnValue("aside");
  root = mkdtempSync(join(tmpdir(), "oma-browser-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});
function write(path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}
function read(path: string): {
  mcpServers: Record<string, { command?: string; args?: string[] }>;
  mcp_servers: Record<string, { command?: string; args?: string[] }>;
} {
  const raw = readFileSync(join(root, path), "utf-8");
  return (path.endsWith("toml") ? parse(raw) : JSON.parse(raw)) as ReturnType<
    typeof read
  >;
}

describe("browser MCP reconciliation", () => {
  it("installs all three selections into JSON and TOML vendor configs", () => {
    const vendors = [
      "claude",
      "codex",
      "cursor",
      "qwen",
      "grok",
      "kiro",
      "kimi",
      "antigravity",
    ];
    syncBrowserMcp(root, ["aside", "chrome", "firefox"], vendors);
    for (const path of [
      ".agents/mcp.json",
      ".agents/mcp_config.json",
      ".mcp.json",
      ".cursor/mcp.json",
      ".qwen/settings.json",
      ".kiro/settings/mcp.json",
      ".kimi-code/mcp.json",
      ".codex/config.toml",
      ".grok/config.toml",
    ]) {
      const data = read(path);
      const servers = data.mcpServers ?? data.mcp_servers;
      expect(servers.aside).toMatchObject({ command: "aside", args: ["mcp"] });
      expect(servers["chrome-devtools"]?.args).toContain(
        "chrome-devtools-mcp@latest",
      );
      expect(servers["firefox-devtools"]?.args).toContain(
        "@mozilla/firefox-devtools-mcp@latest",
      );
    }
    expect(
      syncBrowserMcp(root, ["aside", "chrome", "firefox"], vendors),
    ).toEqual([]);
  });

  it("removes deselected browsers, preserves custom servers and respects vendor scope", () => {
    const original = JSON.stringify({
      other: true,
      mcpServers: {
        aside: { command: "custom-aside", args: ["mcp"] },
        "chrome-devtools": { command: "chrome" },
        custom: { url: "https://example.com/mcp" },
      },
    });
    write(".cursor/mcp.json", original);
    write(".mcp.json", original);
    syncBrowserMcp(root, ["aside"], ["cursor"]);
    expect(read(".cursor/mcp.json")).toEqual({
      other: true,
      mcpServers: {
        aside: { command: "custom-aside", args: ["mcp"] },
        custom: { url: "https://example.com/mcp" },
      },
    });
    expect(readFileSync(join(root, ".mcp.json"), "utf-8")).toBe(original);
    syncBrowserMcp(root, [], ["cursor"]);
    expect(read(".cursor/mcp.json").mcpServers).toEqual({
      custom: { url: "https://example.com/mcp" },
    });
  });

  it("targets the global Antigravity config when requested", () => {
    syncBrowserMcp(root, ["aside"], ["antigravity"], {
      global: true,
      home: root,
    });
    expect(
      read(".gemini/antigravity-cli/mcp_config.json").mcpServers.aside?.command,
    ).toBe("aside");
  });

  it("previews without writes and refuses malformed configs before any writes", () => {
    expect(
      syncBrowserMcp(root, ["aside"], ["codex"], { dryRun: true }),
    ).toHaveLength(2);
    write(".agents/mcp.json", '{"mcpServers":{}}');
    write(".codex/config.toml", "[broken");
    expect(() => syncBrowserMcp(root, ["aside"], ["codex"])).toThrow();
    expect(read(".agents/mcp.json")).toEqual({ mcpServers: {} });
  });
});

it("repairs default Aside launchers outside PATH without replacing custom options", () => {
  aside.mockReturnValue("/test/local/bin/aside");
  write(
    ".mcp.json",
    JSON.stringify({
      mcpServers: {
        aside: { command: "aside", args: ["mcp"], env: { KEEP: "yes" } },
      },
    }),
  );
  write(
    "opencode.jsonc",
    JSON.stringify({
      mcp: {
        aside: { type: "local", command: ["aside", "mcp"], enabled: false },
      },
    }),
  );
  syncBrowserMcp(root, ["aside"], ["claude", "opencode"]);
  expect(read(".mcp.json").mcpServers.aside).toEqual({
    command: "/test/local/bin/aside",
    args: ["mcp"],
    env: { KEEP: "yes" },
  });
  expect(
    JSON.parse(readFileSync(join(root, "opencode.jsonc"), "utf-8")).mcp.aside,
  ).toEqual({
    type: "local",
    command: ["/test/local/bin/aside", "mcp"],
    enabled: false,
  });
  write(
    ".mcp.json",
    JSON.stringify({
      mcpServers: {
        aside: { command: "/custom/aside", args: ["mcp", "--custom"] },
      },
    }),
  );
  syncBrowserMcp(root, ["aside"], ["claude"]);
  expect(read(".mcp.json").mcpServers.aside?.command).toBe("/custom/aside");
});
