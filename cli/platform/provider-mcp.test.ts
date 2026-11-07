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
import { browserMcpDocument } from "../vendors/browser-mcp-document.js";
import { browserMcpTargets } from "../vendors/browser-mcp-targets.js";
import { syncProviderMcp } from "./provider-mcp.js";
import { mergeRulesIndexForVendor } from "./rules.js";

let root: string;
let home: string;
function select(value: string) {
  writeFileSync(
    join(root, ".agents/oma-config.yaml"),
    `language: en\nmodel_preset: codex\nproviders:\n  code_intelligence: ${value}\n`,
  );
}
function write(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value));
}
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-provider-mcp-"));
  home = join(root, "home");
  mkdirSync(home);
  mkdirSync(join(root, ".agents"));
  vi.stubEnv("HERMES_HOME", join(home, ".hermes"));
  vi.stubEnv("XDG_CONFIG_HOME", join(home, ".config"));
  vi.stubEnv("CODEX_HOME", join(home, ".codex"));
  vi.stubEnv("KIMI_CODE_HOME", join(home, ".kimi-code"));
  vi.stubEnv("PI_CODING_AGENT_DIR", join(home, ".pi/agent"));
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

describe("native provider MCP projection", () => {
  it("removes inherited Serena for project Gortex and restores its backup", () => {
    const path = join(home, ".cursor/mcp.json");
    const original = {
      mcpServers: {
        serena: { command: "custom-serena" },
        other: { command: "keep" },
      },
    };
    write(path, original);
    select("gortex");
    syncProviderMcp(root, ["cursor"], { home });
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      mcpServers: { other: { command: "keep" } },
    });
    expect(syncProviderMcp(root, ["cursor"], { home })).toEqual([]);
    select("serena");
    syncProviderMcp(root, ["cursor"], { home });
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(original);
  });
  const vendors = [
    "claude",
    "cursor",
    "codex",
    "qwen",
    "grok",
    "kiro",
    "kimi",
    "antigravity",
    "commandcode",
    "copilot",
    "opencode",
    "kilo",
    "pi",
    "hermes",
    "zcode",
  ];
  it.each([false, true])(
    "selects Gortex across every native format (global=%s)",
    (global) => {
      select("gortex");
      const ssot = {
        mcpServers: {
          serena: { command: "serena" },
          context7: { url: "https://mcp.context7.com/mcp" },
        },
      };
      write(join(root, ".agents/mcp.json"), ssot);
      const original = readFileSync(join(root, ".agents/mcp.json"), "utf8");
      syncProviderMcp(root, vendors, { home, global });
      for (const target of browserMcpTargets(root, vendors, { home, global })) {
        if (target.path === join(root, ".agents/mcp.json") || target.removeOnly)
          continue;
        const doc = browserMcpDocument(target);
        expect(doc.get([...target.keys, "serena"])).toBeUndefined();
        const gortex = doc.get([...target.keys, "gortex"]) as {
          command: unknown;
          args?: string[];
        };
        expect(gortex.command).toEqual(
          target.entry === "opencode"
            ? ["gortex", "mcp", "--tools", "compact"]
            : "gortex",
        );
        if (target.entry !== "opencode") {
          expect(gortex.args).toEqual(["mcp", "--tools", "compact"]);
        }
      }
      expect(readFileSync(join(root, ".agents/mcp.json"), "utf8")).toBe(
        original,
      );
      expect(syncProviderMcp(root, vendors, { home, global })).toEqual([]);
    },
  );
  it("restores custom Serena and preexisting Gortex after switching back", () => {
    const serena = {
      command: "custom-serena",
      args: ["--custom"],
      env: { PRIVATE_OPTION: "kept" },
    };
    const gortex = { command: "custom-gortex" };
    const other = { command: "unrelated" };
    write(join(root, ".mcp.json"), { mcpServers: { serena, gortex, other } });
    select("gortex");
    syncProviderMcp(root, ["claude"], { home });
    // Emulate the existing link reconciler adding its default again.
    write(join(root, ".mcp.json"), {
      mcpServers: { serena: { command: "serena" }, gortex, other },
    });
    syncProviderMcp(root, ["claude"], { home });
    select("serena");
    syncProviderMcp(root, ["claude"], { home });
    expect(JSON.parse(readFileSync(join(root, ".mcp.json"), "utf8"))).toEqual({
      mcpServers: { serena, gortex, other },
    });
  });
  it("removes OMA-added Gortex when the provider configuration is removed", () => {
    select("gortex");
    syncProviderMcp(root, ["codex"], { home });
    writeFileSync(join(root, ".agents/oma-config.yaml"), "language: en\n");
    syncProviderMcp(root, ["codex"], { home });
    const target = browserMcpTargets(root, ["codex"], { home })[1];
    if (!target) throw new Error("Missing Codex target");
    const doc = browserMcpDocument(target);
    expect(doc.get([...target.keys, "gortex"])).toBeUndefined();
    expect(doc.get([...target.keys, "serena"])).toBeDefined();
  });
  it("defers restoration until after the legacy writer phase", () => {
    const serena = { command: "custom-serena" };
    write(join(root, ".mcp.json"), { mcpServers: { serena } });
    select("gortex");
    syncProviderMcp(root, ["claude"], { home });
    select("serena");
    expect(syncProviderMcp(root, ["claude"], { home, prepare: true })).toEqual(
      [],
    );
    write(join(root, ".mcp.json"), {
      mcpServers: { serena: { command: "default" } },
    });
    syncProviderMcp(root, ["claude"], { home });
    expect(
      JSON.parse(readFileSync(join(root, ".mcp.json"), "utf8")).mcpServers
        .serena,
    ).toEqual(serena);
  });
  it.each([false, true])(
    "registers the Pi adapter without browser MCP (global=%s)",
    (global) => {
      select("gortex");
      syncProviderMcp(root, ["pi"], { home, global });
      const path = global
        ? join(home, ".pi/agent/settings.json")
        : join(root, ".pi/settings.json");
      expect(JSON.parse(readFileSync(path, "utf8")).packages).toEqual([
        "npm:pi-mcp-adapter",
      ]);
    },
  );
  it("dry-run writes neither configs nor backups", () => {
    select("gortex");
    expect(
      syncProviderMcp(root, ["codex"], { home, dryRun: true }).length,
    ).toBeGreaterThan(0);
    expect(existsSync(join(root, ".codex/config.toml"))).toBe(false);
    expect(existsSync(join(root, ".agents/state"))).toBe(false);
  });
  it("malformed native config fails before any other target is changed", () => {
    select("gortex");
    write(join(root, ".mcp.json"), {
      mcpServers: { serena: { command: "custom" } },
    });
    const original = readFileSync(join(root, ".mcp.json"), "utf8");
    mkdirSync(join(root, ".codex"));
    writeFileSync(join(root, ".codex/config.toml"), "[invalid");
    expect(() =>
      syncProviderMcp(root, ["claude", "codex"], { home }),
    ).toThrow();
    expect(readFileSync(join(root, ".mcp.json"), "utf8")).toBe(original);
    expect(existsSync(join(root, ".agents/state"))).toBe(false);
  });
  // File symlinks need admin or Developer Mode on Windows.
  it.skipIf(process.platform === "win32")(
    "replaces legacy native symlinks without writing the SSOT target",
    () => {
      select("gortex");
      write(join(root, ".agents/mcp.json"), {
        mcpServers: { serena: { command: "serena" } },
      });
      const original = readFileSync(join(root, ".agents/mcp.json"), "utf8");
      symlinkSync(join(root, ".agents/mcp.json"), join(root, ".mcp.json"));
      syncProviderMcp(root, ["claude"], { home });
      expect(readFileSync(join(root, ".agents/mcp.json"), "utf8")).toBe(
        original,
      );
      expect(
        JSON.parse(readFileSync(join(root, ".mcp.json"), "utf8")).mcpServers
          .gortex,
      ).toBeDefined();
    },
  );
  it("projects provider routing into generated instructions and restores defaults", () => {
    select("gortex");
    mergeRulesIndexForVendor(root, "codex");
    const instructions = readFileSync(join(root, "AGENTS.md"), "utf8");
    expect(instructions).toContain("Gortex is the selected");
    expect(instructions).toContain("overrides Serena-specific routing");
    expect(instructions).not.toContain("Serena MCP is required");
    select("serena");
    mergeRulesIndexForVendor(root, "codex");
    expect(readFileSync(join(root, "AGENTS.md"), "utf8")).toContain(
      "Serena MCP is required",
    );
  });
});
