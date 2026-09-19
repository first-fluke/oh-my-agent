import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RECOMMENDED_ASIDE_MCP,
  RECOMMENDED_CHROME_DEVTOOLS_MCP,
  RECOMMENDED_FIREFOX_DEVTOOLS_MCP,
} from "../../vendors/serena.js";
import { migrateLegacyGeminiMcp } from "./030-legacy-gemini-mcp.js";

let root: string;
vi.mock("node:os", async (original) => ({
  ...(await original<typeof import("node:os")>()),
  homedir: () => join(root, "home"),
}));

const direct = {
  command: "serena",
  args: [
    "start-mcp-server",
    "--context",
    "ide",
    "--project",
    ".",
    "--open-web-dashboard",
    "false",
  ],
  env: { SERENA_LOG_LEVEL: "info" },
};
const custom = { command: "custom-server", args: ["serve"] };

function write(value: unknown, base = root): string {
  const path = join(base, ".gemini", "settings.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2));
  return path;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-mig030-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("legacy Gemini MCP cleanup", () => {
  it("removes OMA launchers and browsers while preserving other settings", () => {
    const hooks = { BeforeAgent: [{ hooks: [{ command: "user-hook" }] }] };
    const path = write({
      hooks,
      general: { theme: "dark" },
      mcpServers: {
        serena: direct,
        "chrome-devtools": RECOMMENDED_CHROME_DEVTOOLS_MCP,
        aside: RECOMMENDED_ASIDE_MCP,
        "firefox-devtools": RECOMMENDED_FIREFOX_DEVTOOLS_MCP,
        custom,
      },
    });
    expect(
      migrateLegacyGeminiMcp.up(root, { vendors: ["antigravity"] }),
    ).toHaveLength(1);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      hooks,
      general: { theme: "dark" },
      mcpServers: { custom },
    });
    const after = readFileSync(path, "utf8");
    expect(migrateLegacyGeminiMcp.up(root)).toEqual([]);
    expect(readFileSync(path, "utf8")).toBe(after);
    expect(migrateLegacyGeminiMcp.requiresReconcile).toBe(false);
  });

  it.each([
    { command: "oma", args: ["bridge", "--context", "oma"], env: direct.env },
    {
      command: "uvx",
      args: [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena",
        ...direct.args,
      ],
      env: direct.env,
    },
  ])("removes the legacy launcher $command", (serena) => {
    const path = write({ mcpServers: { serena } });
    expect(migrateLegacyGeminiMcp.up(root)).toHaveLength(1);
    expect(JSON.parse(readFileSync(path, "utf8")).mcpServers).toEqual({});
  });

  it("preserves custom commands, arguments, environments and server options", () => {
    const path = write({
      mcpServers: {
        serena: { ...direct, args: [...direct.args, "--custom"] },
        aside: { ...RECOMMENDED_ASIDE_MCP, command: "/custom/aside" },
        "chrome-devtools": {
          ...RECOMMENDED_CHROME_DEVTOOLS_MCP,
          env: { CUSTOM: "yes" },
        },
        "firefox-devtools": {
          ...RECOMMENDED_FIREFOX_DEVTOOLS_MCP,
          disabled: true,
        },
      },
    });
    const before = readFileSync(path, "utf8");
    expect(migrateLegacyGeminiMcp.up(root)).toEqual([]);
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("respects vendor selection and leaves HOME settings alone", () => {
    const path = write({ mcpServers: { serena: direct } });
    const before = readFileSync(path, "utf8");
    for (const vendors of [[], ["codex"]] as const) {
      expect(migrateLegacyGeminiMcp.up(root, { vendors })).toEqual([]);
    }
    expect(readFileSync(path, "utf8")).toBe(before);
    const home = join(root, "home");
    const global = write({ mcpServers: { serena: direct } }, home);
    expect(migrateLegacyGeminiMcp.up(home)).toEqual([]);
    expect(readFileSync(global, "utf8")).toBe(before);
  });

  it("does not follow settings symlinks into another config", () => {
    const foreign = write(
      { mcpServers: { serena: direct } },
      join(root, "other"),
    );
    const before = readFileSync(foreign, "utf8");
    mkdirSync(join(root, ".gemini"));
    symlinkSync(foreign, join(root, ".gemini", "settings.json"));
    expect(migrateLegacyGeminiMcp.up(root)).toEqual([]);
    expect(readFileSync(foreign, "utf8")).toBe(before);
  });

  it("leaves absent and malformed settings untouched", () => {
    expect(migrateLegacyGeminiMcp.up(root)).toEqual([]);
    expect(existsSync(join(root, ".gemini"))).toBe(false);
    const path = write({});
    writeFileSync(path, "{broken");
    expect(migrateLegacyGeminiMcp.up(root)).toEqual([]);
    expect(readFileSync(path, "utf8")).toBe("{broken");
  });
});
