import { execFileSync } from "node:child_process";
import {
  existsSync,
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
 * Regression: Esc on Claude Code's "new MCP servers found in this project"
 * dialog writes every pending `.mcp.json` server — serena included — into
 * `.claude/settings.local.json` `disabledMcpjsonServers`, and the
 * code-intelligence guard then denies native search with Serena gone. link
 * (and so install/update) re-approves only the configured provider.
 * HOME-scoped writers are stubbed so the test never touches the real HOME.
 */

vi.mock("../../../vendors/claude/trust.js", () => ({
  ensureClaudeWorkspaceTrust: vi.fn(() => ({
    changed: false,
    alreadyTrusted: true,
  })),
}));

import {
  _resetInstallContext,
  setInstallContext,
} from "../../../platform/install-context.js";
import { link } from "../run.js";

describe("link re-approves the code-intelligence server for Claude Code", () => {
  let root: string;
  const originalCwd = process.cwd();
  let localSettings: string;

  beforeEach(() => {
    _resetInstallContext();
    root = mkdtempSync(join(tmpdir(), "oma-link-claude-approval-"));
    mkdirSync(join(root, ".agents", "rules"), { recursive: true });
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "vendors:\n  - claude\n",
    );
    execFileSync("git", ["init", "--quiet"], { cwd: root, stdio: "ignore" });
    setInstallContext({ installRoot: root, mode: "project" });
    process.chdir(root);
    localSettings = join(root, ".claude", "settings.local.json");
  });

  afterEach(() => {
    process.chdir(originalCwd);
    _resetInstallContext();
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  function writeLocal(value: unknown): void {
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(localSettings, JSON.stringify(value, null, 2));
  }

  it("moves only serena from the rejected list to the approved list", () => {
    writeLocal({
      permissions: { allow: ["Bash(ls)"] },
      disabledMcpjsonServers: ["context7", "serena"],
    });

    link({ quiet: true });

    expect(JSON.parse(readFileSync(localSettings, "utf-8"))).toEqual({
      permissions: { allow: ["Bash(ls)"] },
      disabledMcpjsonServers: ["context7"],
      enabledMcpjsonServers: ["serena"],
    });
  });

  it("does not create settings.local.json when Claude has not", () => {
    link({ quiet: true });

    expect(existsSync(localSettings)).toBe(false);
  });

  it("leaves an unparseable settings.local.json byte-identical", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mkdirSync(join(root, ".claude"), { recursive: true });
    const broken = '{ "disabledMcpjsonServers": ["serena"]';
    writeFileSync(localSettings, broken);

    link({ quiet: true });

    expect(readFileSync(localSettings, "utf-8")).toBe(broken);
    expect(warn.mock.calls.map((call) => String(call[0])).join("\n")).toContain(
      localSettings,
    );
  });
});
