import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import { parse as parseToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml } from "yaml";
import { ALL_CLI_VENDORS } from "../platform/skills-installer.js";
import { syncBrowserMcp } from "./browser-mcp.js";

let temp: string;
let root: string;
let home: string;
beforeEach(() => {
  temp = mkdtempSync(join(tmpdir(), "oma-all-browser-mcp-"));
  root = join(temp, "project");
  home = join(temp, "home");
  mkdirSync(root);
  mkdirSync(home);
  for (const key of [
    "HERMES_HOME",
    "PI_CODING_AGENT_DIR",
    "KIMI_CODE_HOME",
    "XDG_CONFIG_HOME",
    "CODEX_HOME",
  ])
    vi.stubEnv(key, "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(temp, { recursive: true, force: true });
});

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
function read(path: string): Record<string, unknown> {
  const content = readFileSync(path, "utf-8");
  return path.endsWith(".yaml")
    ? parseYaml(content)
    : path.endsWith(".toml")
      ? parseToml(content)
      : parseJsonc(content);
}
function at(
  data: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  let result: unknown = data;
  for (const key of keys) result = (result as Record<string, unknown>)[key];
  return result as Record<string, unknown>;
}

// Independent native-format fixtures, including global-only Hermes and Pi's runtime package.
const cases = [
  {
    vendor: "claude",
    project: ".mcp.json",
    global: ".claude.json",
    keys: ["mcpServers"],
  },
  {
    vendor: "codex",
    project: ".codex/config.toml",
    global: ".codex/config.toml",
    keys: ["mcp_servers"],
  },
  {
    vendor: "cursor",
    project: ".cursor/mcp.json",
    global: ".cursor/mcp.json",
    keys: ["mcpServers"],
  },
  {
    vendor: "qwen",
    project: ".qwen/settings.json",
    global: ".qwen/settings.json",
    keys: ["mcpServers"],
  },
  {
    vendor: "grok",
    project: ".grok/config.toml",
    global: ".grok/config.toml",
    keys: ["mcp_servers"],
  },
  {
    vendor: "kiro",
    project: ".kiro/settings/mcp.json",
    global: ".kiro/settings/mcp.json",
    keys: ["mcpServers"],
  },
  {
    vendor: "kimi",
    project: ".kimi-code/mcp.json",
    global: ".kimi-code/mcp.json",
    keys: ["mcpServers"],
  },
  {
    vendor: "antigravity",
    project: ".agents/mcp_config.json",
    global: ".gemini/antigravity-cli/mcp_config.json",
    keys: ["mcpServers"],
  },
  {
    vendor: "commandcode",
    project: ".mcp.json",
    global: ".commandcode/mcp.json",
    keys: ["mcpServers"],
  },
  {
    vendor: "copilot",
    project: ".github/mcp.json",
    global: ".copilot/mcp-config.json",
    keys: ["mcpServers"],
  },
  {
    vendor: "opencode",
    project: "opencode.jsonc",
    global: ".config/opencode/opencode.jsonc",
    keys: ["mcp"],
  },
  {
    vendor: "pi",
    project: ".pi/mcp.json",
    global: ".pi/agent/mcp.json",
    keys: ["mcpServers"],
  },
  {
    vendor: "hermes",
    project: ".hermes/config.yaml",
    global: ".hermes/config.yaml",
    keys: ["mcp_servers"],
  },
  {
    vendor: "zcode",
    project: ".zcode/config.json",
    global: ".zcode/cli/config.json",
    keys: ["mcp", "servers"],
  },
];

it("covers every installable OMA vendor", () => {
  expect(cases.map((c) => c.vendor).sort()).toEqual(
    [...ALL_CLI_VENDORS].sort(),
  );
});

describe.each([false, true])("native browser config (global=%s)", (global) => {
  it.each(cases)(
    "$vendor receives all selections and removes deselected servers",
    (test) => {
      const installRoot = global ? home : root;
      const base = global || test.vendor === "hermes" ? home : root;
      const path = join(base, global ? test.global : test.project);
      syncBrowserMcp(
        installRoot,
        ["aside", "chrome", "firefox"],
        [test.vendor],
        { global, home },
      );
      const servers = at(read(path), test.keys);
      expect(Object.keys(servers).sort()).toEqual([
        "aside",
        "chrome-devtools",
        "firefox-devtools",
      ]);
      expect(servers.aside).toEqual(
        test.vendor === "opencode"
          ? { type: "local", command: ["aside", "mcp"], enabled: true }
          : test.vendor === "copilot"
            ? { type: "local", command: "aside", args: ["mcp"], tools: ["*"] }
            : test.vendor === "cursor"
              ? { type: "stdio", command: "aside", args: ["mcp"] }
              : { command: "aside", args: ["mcp"] },
      );
      expect(
        syncBrowserMcp(
          installRoot,
          ["aside", "chrome", "firefox"],
          [test.vendor],
          { global, home },
        ),
      ).toEqual([]);
      syncBrowserMcp(installRoot, ["firefox"], [test.vendor], { global, home });
      expect(Object.keys(at(read(path), test.keys))).toEqual([
        "firefox-devtools",
      ]);
      syncBrowserMcp(installRoot, [], [test.vendor], { global, home });
      expect(at(read(path), test.keys)).toEqual({});
    },
  );
});

it("preserves OpenCode JSONC comments, trailing commas, strings, and all active config layers", () => {
  const config = `{
  // User plugin and model settings must survive.
  "model": "literal,} // not a comment",
  "plugin": ["my-plugin",],
  "mcp": { "custom": { "type": "remote", "url": "https://example.com/mcp" }, },
}`;
  for (const path of ["opencode.jsonc", ".opencode/opencode.jsonc"])
    write(join(root, path), config);
  syncBrowserMcp(root, ["aside"], ["opencode"], { home });
  for (const path of ["opencode.jsonc", ".opencode/opencode.jsonc"]) {
    expect(readFileSync(join(root, path), "utf-8")).toContain("// User plugin");
    expect(read(join(root, path))).toMatchObject({
      model: "literal,} // not a comment",
      plugin: ["my-plugin"],
      mcp: {
        custom: { url: "https://example.com/mcp" },
        aside: { command: ["aside", "mcp"] },
      },
    });
  }
});

it("preserves Hermes YAML comments and settings while honoring HERMES_HOME", () => {
  const path = join(temp, "hermes-profile", "config.yaml");
  vi.stubEnv("HERMES_HOME", dirname(path));
  write(
    path,
    "# Hermes profile\nmodel: custom\nmcp_servers:\n  custom: {url: 'https://example.com/mcp'} # keep\n",
  );
  syncBrowserMcp(root, ["aside"], ["hermes"], { home });
  expect(read(path)).toMatchObject({
    model: "custom",
    mcp_servers: {
      custom: { url: "https://example.com/mcp" },
      aside: { command: "aside" },
    },
  });
  expect(readFileSync(path, "utf-8")).toContain("# keep");
  expect(existsSync(join(root, ".hermes"))).toBe(false);
});

it("registers Pi's auto-installed MCP adapter without duplicating a pinned package", () => {
  const settings = join(root, ".pi", "settings.json");
  write(
    settings,
    JSON.stringify({ packages: ["npm:another-extension"], theme: "light" }),
  );
  syncBrowserMcp(root, ["aside"], ["pi"], { home });
  expect(read(settings)).toEqual({
    packages: ["npm:another-extension", "npm:pi-mcp-adapter"],
    theme: "light",
  });
  write(
    settings,
    JSON.stringify({
      packages: [{ source: "npm:pi-mcp-adapter@2.27.0", skills: [] }],
    }),
  );
  expect(syncBrowserMcp(root, ["aside"], ["pi"], { home })).toEqual([]);
  syncBrowserMcp(root, [], ["pi"], { home });
  expect(read(settings).packages).toEqual([
    { source: "npm:pi-mcp-adapter@2.27.0", skills: [] },
  ]);
});

it("uses Pi and OpenCode global directories independently of OMA_HOME", () => {
  vi.stubEnv("PI_CODING_AGENT_DIR", join(temp, "pi-profile"));
  vi.stubEnv("XDG_CONFIG_HOME", join(temp, "xdg"));
  syncBrowserMcp(
    root,
    ["aside"],
    ["pi", "opencode", "commandcode", "copilot", "zcode"],
    { global: true, home },
  );
  expect(read(join(temp, "pi-profile", "settings.json")).packages).toContain(
    "npm:pi-mcp-adapter",
  );
  expect(read(join(temp, "xdg", "opencode", "opencode.jsonc"))).toHaveProperty(
    "mcp.aside.command",
    ["aside", "mcp"],
  );
  expect(existsSync(join(root, ".pi"))).toBe(false);
  for (const path of [
    ".commandcode/mcp.json",
    ".copilot/mcp-config.json",
    ".zcode/cli/config.json",
  ])
    expect(existsSync(join(home, path))).toBe(true);
});

it("validates every config and Pi settings before writing anything", () => {
  const path = join(root, ".pi/settings.json");
  write(path, '{"packages": "invalid"}');
  expect(() =>
    syncBrowserMcp(root, ["aside"], ["pi", "hermes"], { home }),
  ).toThrow("Expected packages");
  expect(existsSync(join(home, ".hermes/config.yaml"))).toBe(false);
  expect(existsSync(join(root, ".agents/mcp.json"))).toBe(false);
});

it("previews all vendors without filesystem mutations and rejects unknown vendors", () => {
  const changes = syncBrowserMcp(root, ["aside"], ALL_CLI_VENDORS, {
    home,
    dryRun: true,
  });
  expect(changes.length).toBeGreaterThanOrEqual(ALL_CLI_VENDORS.length);
  for (const path of changes) expect(existsSync(path)).toBe(false);
  expect(() => syncBrowserMcp(root, ["aside"], ["unknown"], { home })).toThrow(
    "Unsupported browser MCP vendor",
  );
});

it("moves Kiro browser entries out of cli.json into its native MCP file", () => {
  write(
    join(root, ".kiro/settings/cli.json"),
    JSON.stringify({
      theme: "dark",
      mcpServers: {
        aside: { command: "aside", args: ["mcp"] },
        custom: { command: "custom" },
      },
    }),
  );
  syncBrowserMcp(root, ["aside"], ["kiro"], { home });
  expect(read(join(root, ".kiro/settings/mcp.json"))).toHaveProperty(
    "mcpServers.aside.command",
    "aside",
  );
  expect(read(join(root, ".kiro/settings/cli.json"))).toEqual({
    theme: "dark",
    mcpServers: { custom: { command: "custom" } },
  });
});

it("writes native global configs outside a separate OMA installation root", () => {
  vi.stubEnv("CODEX_HOME", join(temp, "codex-profile"));
  syncBrowserMcp(
    root,
    ["aside"],
    ["claude", "codex", "cursor", "qwen", "grok", "kiro"],
    { global: true, home },
  );
  for (const path of [
    ".claude.json",
    ".cursor/mcp.json",
    ".qwen/settings.json",
    ".grok/config.toml",
    ".kiro/settings/mcp.json",
  ])
    expect(existsSync(join(home, path))).toBe(true);
  expect(read(join(temp, "codex-profile", "config.toml"))).toHaveProperty(
    "mcp_servers.aside.command",
    "aside",
  );
  expect(existsSync(join(root, ".codex/config.toml"))).toBe(false);
});
