import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: `oma link` (and therefore install/update) used to treat a user
 * config it could not parse as `{}` and write the merge result back — one
 * trailing comma in `.claude/settings.json` erased the user's permissions,
 * env, and MCP servers. Project-scoped writers run for real here; only the
 * HOME-scoped writers are stubbed so the test never touches the real HOME.
 */

vi.mock("../../../vendors/claude/trust.js", () => ({
  ensureClaudeWorkspaceTrust: vi.fn(() => ({
    changed: false,
    alreadyTrusted: true,
  })),
}));
vi.mock("../../../vendors/qwen/user-settings.js", () => ({
  hasUserQwenModelProviders: vi.fn(() => false),
}));

import {
  _resetInstallContext,
  setInstallContext,
} from "../../../platform/install-context.js";
import { link } from "../run.js";

describe("link never rewrites a user config it cannot parse", () => {
  let root: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    _resetInstallContext();
    root = mkdtempSync(join(tmpdir(), "oma-link-unparseable-"));
    mkdirSync(join(root, ".agents", "rules"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "vendors:\n  - claude\n  - qwen\n  - codex\n",
    );
    execFileSync("git", ["init", "--quiet"], { cwd: root, stdio: "ignore" });
    setInstallContext({ installRoot: root, mode: "project" });
    process.chdir(root);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    _resetInstallContext();
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  function write(rel: string, content: string): string {
    const path = join(root, rel);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, content);
    return path;
  }

  it("keeps every user key when settings.json only has a trailing comma", () => {
    const settings = write(
      ".claude/settings.json",
      `{
  "permissions": { "allow": ["Bash(npm test)", "mcp__github__*"] },
  "env": { "MY_TEAM_VAR": "1" },
  "attribution": { "commit": "", "pr": "" },
}
`,
    );

    link({ quiet: true });

    const after = JSON.parse(readFileSync(settings, "utf-8"));
    expect(after.permissions.allow).toEqual(
      expect.arrayContaining(["Bash(npm test)", "mcp__github__*"]),
    );
    expect(after.env.MY_TEAM_VAR).toBe("1");
    // An explicit opt-out survives the recommended-settings merge.
    expect(after.attribution).toEqual({ commit: "", pr: "" });
  });

  it("leaves truly broken .mcp.json, qwen settings, and codex config byte-identical", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const files = {
      mcp: write(".mcp.json", '{ "mcpServers": { "github": { "command": '),
      qwen: write(".qwen/settings.json", '{ "theme": "dark", "mcpServers": '),
      codex: write(".codex/config.toml", 'model = "gpt-5"\n[mcp_servers.x\n'),
    };
    const before = Object.fromEntries(
      Object.entries(files).map(([k, p]) => [k, readFileSync(p, "utf-8")]),
    );

    link({ quiet: true });

    for (const [key, path] of Object.entries(files)) {
      expect(readFileSync(path, "utf-8")).toBe(before[key]);
    }
    const warnings = warn.mock.calls.map((call) => String(call[0])).join("\n");
    expect(warnings).toContain(files.mcp);
    expect(warnings).toContain(files.qwen);
    expect(warnings).toContain(files.codex);
  });
});
