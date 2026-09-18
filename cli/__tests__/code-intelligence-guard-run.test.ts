/**
 * Pure in-process tests for the code-intelligence-guard handler's `run()` —
 * no subprocess spawn. The guard denies native code search (Grep / Glob tools
 * and recursive shell search) while a code-intelligence provider is
 * configured, and fails open everywhere else.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BYPASS_TOKEN,
  detectNativeSearchCommand,
  run,
} from "../../.agents/hooks/core/code-intelligence-guard.ts";

let projectDir: string;

function writeConfig(yaml: string, file = "oma-config.yaml"): void {
  mkdirSync(join(projectDir, ".agents"), { recursive: true });
  writeFileSync(join(projectDir, ".agents", file), yaml);
}

function runTool(toolName: string, toolInput: Record<string, unknown> = {}) {
  return run(
    { kind: "pre_tool", toolName, toolInput, cwd: projectDir },
    { vendor: "claude", cwd: projectDir },
  );
}

function runShell(command: string, toolName = "Bash") {
  return runTool(toolName, { command });
}

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), "oma-ci-guard-"));
});

afterEach(() => {
  rmSync(projectDir, { recursive: true, force: true });
});

describe("detectNativeSearchCommand — shell command classification", () => {
  it.each([
    ["rg foo cli", "rg"],
    ["rg -n 'foo bar' .", "rg"],
    ["ag pattern src", "ag"],
    ["fd -e ts hook", "fd"],
    ["grep -r foo .", "grep"],
    ["grep -rn foo cli", "grep"],
    ["grep -Rin foo cli", "grep"],
    ["grep --recursive foo .", "grep"],
    ["egrep -r 'a|b' src", "egrep"],
    ["find . -name '*.ts'", "find"],
    ["find cli -type d -iname '*hook*'", "find"],
    ["find . -path '*/hooks/*'", "find"],
    ["git grep -n foo", "git grep"],
    ["cd /repo && rg foo", "rg"],
    ["ls; grep -r foo src", "grep"],
    ["FOO=1 rg foo", "rg"],
    ["/usr/bin/grep -r foo .", "grep"],
    ["sudo rg foo", "rg"],
    ["env -i rg foo", "rg"],
  ])("flags %s", (command, expected) => {
    expect(detectNativeSearchCommand(command)).toBe(expected);
  });

  it.each([
    "cat file.ts",
    "ls -la src",
    "grep foo file.ts",
    "grep -n foo file.ts",
    "cat log.txt | grep ERROR",
    "ps aux | grep node",
    "git status | grep modified",
    "find . -type d",
    "find . -maxdepth 1 -type f",
    "git diff",
    "git log --grep=fix",
    "bun run test",
    "echo rg",
    "npm install ripgrep",
  ])("passes %s", (command) => {
    expect(detectNativeSearchCommand(command)).toBeNull();
  });
});

describe("code-intelligence-guard run() — serena configured", () => {
  beforeEach(() => {
    writeConfig("providers:\n  code_intelligence: serena\n");
  });

  it("denies the native Grep tool and points at search_for_pattern", async () => {
    const result = await runTool("Grep", { pattern: "foo" });
    expect(result?.type).toBe("block");
    const reason = (result as { reason: string }).reason;
    expect(reason).toContain("search_for_pattern");
    expect(reason).toContain("Serena");
    expect(reason).toContain(BYPASS_TOKEN);
  });

  it("denies the native Glob tool and points at find_file", async () => {
    const result = await runTool("Glob", { pattern: "**/*.ts" });
    expect(result?.type).toBe("block");
    expect((result as { reason: string }).reason).toContain("find_file");
  });

  it("denies recursive shell search across shell tool names", async () => {
    for (const tool of ["Bash", "run_shell_command", "Shell", "execute_bash"]) {
      const result = await runShell("rg foo cli", tool);
      expect(result?.type, tool).toBe("block");
      expect((result as { reason: string }).reason).toContain("`rg`");
    }
  });

  it("allows the shell escape hatch", async () => {
    expect(await runShell(`${BYPASS_TOKEN} rg foo cli`)).toBeNull();
  });

  it("allows non-search shell commands and non-recursive grep", async () => {
    expect(await runShell("cat cli/cli.ts")).toBeNull();
    expect(await runShell("git status | grep modified")).toBeNull();
    expect(await runShell("grep -n foo cli/cli.ts")).toBeNull();
  });

  it("ignores tools outside the search / shell set", async () => {
    expect(await runTool("Read", { file_path: "/x" })).toBeNull();
    expect(await runTool("Edit", { file_path: "/x" })).toBeNull();
    expect(await runTool("mcp__serena__find_file", {})).toBeNull();
  });

  it("ignores non pre_tool events", async () => {
    expect(
      await run(
        { kind: "prompt", prompt: "rg foo", cwd: projectDir },
        { vendor: "claude", cwd: projectDir },
      ),
    ).toBeNull();
  });
});

describe("code-intelligence-guard run() — gating", () => {
  it("fails open when no provider is configured", async () => {
    expect(await runTool("Grep", { pattern: "foo" })).toBeNull();
    expect(await runShell("rg foo")).toBeNull();
  });

  it("detects serena via .serena/project.yml", async () => {
    mkdirSync(join(projectDir, ".serena"), { recursive: true });
    writeFileSync(join(projectDir, ".serena", "project.yml"), "name: t\n");
    expect((await runTool("Grep", { pattern: "foo" }))?.type).toBe("block");
  });

  it("names Gortex when it is the provider", async () => {
    writeConfig("providers:\n  code_intelligence: gortex\n");
    const result = await runTool("Grep", { pattern: "foo" });
    expect(result?.type).toBe("block");
    expect((result as { reason: string }).reason).toContain("Gortex");
  });

  it("is disabled by providers.code_intelligence_guard: off", async () => {
    writeConfig(
      "providers:\n  code_intelligence: serena\n  code_intelligence_guard: off\n",
    );
    expect(await runTool("Grep", { pattern: "foo" })).toBeNull();
    expect(await runShell("rg foo")).toBeNull();
  });

  it("lets oma-config.local.yaml turn the guard off", async () => {
    writeConfig("providers:\n  code_intelligence: serena\n");
    writeConfig(
      "providers:\n  code_intelligence_guard: off\n",
      "oma-config.local.yaml",
    );
    expect(await runTool("Grep", { pattern: "foo" })).toBeNull();
  });
});
