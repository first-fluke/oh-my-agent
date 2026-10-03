import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { persistCodexEffortToToml } from "../io/runtime-dispatch/codex-effort.js";
import { registerOpencodePlugin } from "../platform/opencode-plugin-composer.js";
import { applyCursorMcpConfig } from "../platform/skills-installer/cursor-mcp.js";
import {
  applyGrokProjectMcp,
  needsGrokProjectMcpUpdate,
} from "./grok/settings.js";
import { installKimiMcp } from "./kimi/mcp.js";
import {
  applyKiroOmaHooksAgent,
  applyKiroProjectMcp,
} from "./kiro/settings.js";

/**
 * Every writer that merges into a user/vendor-owned config must leave a file
 * it cannot parse byte-identical — never rewrite it from `{}`.
 */
describe("config writers leave unparseable files untouched", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-unparseable-"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  function seed(rel: string, content: string): () => string {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return () => readFileSync(path, "utf-8");
  }

  it("kiro .kiro/settings/cli.json", () => {
    const broken = '{ "mcpServers": { "mine": ';
    const read = seed(".kiro/settings/cli.json", broken);
    applyKiroProjectMcp(root);
    applyKiroOmaHooksAgent(root);
    expect(read()).toBe(broken);
  });

  it("grok .grok/config.toml", () => {
    const broken = "[mcp_servers.mine\ncommand = 'x'\n";
    const read = seed(".grok/config.toml", broken);
    expect(needsGrokProjectMcpUpdate(root)).toBe(false);
    applyGrokProjectMcp(root);
    expect(read()).toBe(broken);
  });

  it("cursor .cursor/mcp.json", () => {
    seed(".agents/mcp.json", '{ "mcpServers": {} }');
    const broken = '{ "mcpServers": { "mine": { "command": ';
    const read = seed(".cursor/mcp.json", broken);
    applyCursorMcpConfig(root);
    expect(read()).toBe(broken);
  });

  it("opencode .opencode/opencode.json (and JSONC still merges)", () => {
    const broken = '{ "plugin": [';
    const read = seed(".opencode/opencode.json", broken);
    registerOpencodePlugin(root);
    expect(read()).toBe(broken);

    rmSync(join(root, ".opencode", "opencode.json"));
    const readJsonc = seed(
      ".opencode/opencode.jsonc",
      '{\n  // mine\n  "$schema": "https://opencode.ai/config.json",\n  "theme": "x",\n}\n',
    );
    registerOpencodePlugin(root);
    const after = JSON.parse(readJsonc());
    expect(after.theme).toBe("x");
    expect(after.plugin).toContain("./plugins/oma/oma.ts");
  });

  it("codex .codex/config.toml (effort persistence)", () => {
    const broken = 'model = "gpt-5"\n[mcp_servers.x\n';
    const read = seed(".codex/config.toml", broken);
    persistCodexEffortToToml(root, "high");
    expect(read()).toBe(broken);
  });

  it("kimi .kimi-code/mcp.json (project mode)", () => {
    const broken = '{ "mcpServers": { "mine": ';
    const read = seed(".kimi-code/mcp.json", broken);
    const result = installKimiMcp(root);
    expect(result.installed).toBe(false);
    expect(read()).toBe(broken);
  });
});
