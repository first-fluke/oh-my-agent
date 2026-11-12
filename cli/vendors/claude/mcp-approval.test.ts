import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  approveClaudeMcpServer,
  isClaudeMcpServerRejected,
} from "./mcp-approval.js";

describe("approveClaudeMcpServer", () => {
  it("moves a server rejected through the dialog to the approved list", () => {
    // What Esc on "3 new MCP servers found in this project" records.
    const settings: Record<string, unknown> = {
      permissions: { allow: ["Bash(ls)"] },
      disabledMcpjsonServers: ["context7", "serena", "aside"],
    };

    expect(approveClaudeMcpServer(settings, "serena")).toEqual({
      changed: true,
      wasRejected: true,
    });
    expect(settings).toEqual({
      permissions: { allow: ["Bash(ls)"] },
      disabledMcpjsonServers: ["context7", "aside"],
      enabledMcpjsonServers: ["serena"],
    });
  });

  it("drops an emptied rejection list and keeps existing approvals", () => {
    const settings: Record<string, unknown> = {
      enabledMcpjsonServers: ["context7"],
      disabledMcpjsonServers: ["serena"],
    };

    approveClaudeMcpServer(settings, "serena");

    expect(settings).toEqual({ enabledMcpjsonServers: ["context7", "serena"] });
  });

  it("reads the bare-string list form Claude Code coerces", () => {
    const settings: Record<string, unknown> = {
      disabledMcpjsonServers: "serena",
    };

    expect(approveClaudeMcpServer(settings, "serena").wasRejected).toBe(true);
    expect(settings).toEqual({ enabledMcpjsonServers: ["serena"] });
  });

  it("pre-approves a pending server so the dialog cannot reject it", () => {
    const settings: Record<string, unknown> = {};

    expect(approveClaudeMcpServer(settings, "gortex")).toEqual({
      changed: true,
      wasRejected: false,
    });
    expect(settings).toEqual({ enabledMcpjsonServers: ["gortex"] });
  });

  it("does not add an approval enableAllProjectMcpServers already grants", () => {
    const settings: Record<string, unknown> = {
      enableAllProjectMcpServers: true,
      disabledMcpjsonServers: ["serena"],
    };

    expect(approveClaudeMcpServer(settings, "serena").changed).toBe(true);
    expect(settings).toEqual({ enableAllProjectMcpServers: true });
  });

  it("is a no-op once the server is approved", () => {
    const settings: Record<string, unknown> = {
      enabledMcpjsonServers: ["serena"],
      disabledMcpjsonServers: ["context7"],
    };

    expect(approveClaudeMcpServer(settings, "serena")).toEqual({
      changed: false,
      wasRejected: false,
    });
    expect(settings).toEqual({
      enabledMcpjsonServers: ["serena"],
      disabledMcpjsonServers: ["context7"],
    });
  });
});

describe("isClaudeMcpServerRejected", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-claude-approval-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function writeLocal(content: string): void {
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(join(root, ".claude", "settings.local.json"), content);
  }

  it("reports a rejection recorded in settings.local.json", () => {
    writeLocal(JSON.stringify({ disabledMcpjsonServers: ["serena"] }));
    expect(isClaudeMcpServerRejected(root, "serena")).toBe(true);
    expect(isClaudeMcpServerRejected(root, "gortex")).toBe(false);
  });

  it("is false without a local settings file or with an unparseable one", () => {
    expect(isClaudeMcpServerRejected(root, "serena")).toBe(false);
    writeLocal('{ "disabledMcpjsonServers": ["serena"]');
    expect(isClaudeMcpServerRejected(root, "serena")).toBe(false);
  });
});
