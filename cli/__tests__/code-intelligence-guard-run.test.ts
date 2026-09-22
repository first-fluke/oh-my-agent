/**
 * Pure in-process tests for the code-intelligence-guard handler's `run()` —
 * no subprocess spawn. The guard denies native code search (Grep / Glob tools
 * and recursive shell search) while a code-intelligence provider is
 * configured, and fails open everywhere else.
 */

import * as childProcess from "node:child_process";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BYPASS_TOKEN,
  detectNativeSearchCommand,
  run,
} from "../../.agents/hooks/core/code-intelligence-guard.ts";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, execFileSync: vi.fn(actual.execFileSync) };
});
const originalChildProcess =
  await vi.importActual<typeof import("node:child_process")>(
    "node:child_process",
  );

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
  vi.mocked(childProcess.execFileSync)
    .mockReset()
    .mockImplementation(originalChildProcess.execFileSync);
  projectDir = mkdtempSync(join(tmpdir(), "oma-ci-guard-"));
  vi.stubEnv("SERENA_HOME", join(projectDir, "serena-home"));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
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

describe("code-intelligence-guard run() — excluded search scope", () => {
  beforeEach(() => {
    writeConfig("providers:\n  code_intelligence: serena\n");
    mkdirSync(join(projectDir, ".serena"));
    writeFileSync(
      join(projectDir, ".serena/project.yml"),
      "ignore_all_files_in_gitignore: true\nignored_paths:\n  - third-party/\n  - '**/custom-env/**'\n",
    );
    execFileSync("git", ["init", "-q", projectDir]);
    writeFileSync(join(projectDir, ".gitignore"), "node_modules/\n.venv/\n");
    for (const path of [
      "node_modules/pkg",
      ".venv/lib",
      "third-party/ours",
      "third-party/external",
      "packages/custom-env",
    ]) {
      mkdirSync(join(projectDir, path), { recursive: true });
    }
  });

  it.each([
    "rg foo node_modules/pkg",
    "rg -n 'foo|bar' .venv/lib",
    "rg --glob '*.ts' foo third-party",
    "rg -e foo -e bar third-party node_modules",
    "rg --files node_modules",
    "grep -Rin foo .venv",
    "find third-party -name '*.ts'",
    "fd -e py foo packages/custom-env",
    "rg foo node_modules | head -20",
    "rg foo node_modules && rg bar third-party",
  ])("allows searches confined to excluded roots: %s", async (command) => {
    expect(await runShell(command)).toBeNull();
  });

  it.each(["Grep", "Glob"])("allows %s with an excluded path", async (tool) => {
    expect(
      await runTool(tool, { path: "third-party", pattern: "foo" }),
    ).toBeNull();
    expect(
      await runTool(tool, {
        path: join(projectDir, "node_modules/pkg"),
        pattern: "foo",
      }),
    ).toBeNull();
  });

  it("allows an anchored Glob pattern below an excluded root", async () => {
    expect(
      await runTool("Glob", { pattern: "node_modules/**/*.ts" }),
    ).toBeNull();
  });

  it.each([
    "rg node_modules src",
    "rg foo node_modules src",
    "rg foo node_modules && rg bar src",
    "rg foo src | grep node_modules",
    "rg -g node_modules foo src",
    "rg -e node_modules src",
    "rg -f node_modules/patterns src",
    "rg foo node_modules/../src",
    "rg foo node_modules-other",
    "rg foo uv",
    "rg foo",
    "rg --files",
    "grep -rE foo src node_modules",
    "fd -f foo src node_modules",
    "cd src && rg foo ../node_modules",
    "find . -path '*/node_modules/*'",
  ])("keeps project searches guarded: %s", async (command) => {
    expect((await runShell(command))?.type).toBe("block");
  });

  it("does not treat a content pattern as a search path", async () => {
    expect((await runTool("Grep", { pattern: "node_modules/foo" }))?.type).toBe(
      "block",
    );
    expect(
      (await runTool("Glob", { pattern: "**/node_modules/*.ts" }))?.type,
    ).toBe("block");
    expect(
      (
        await runTool("Glob", {
          path: "node_modules",
          pattern: "../src/**/*.ts",
        })
      )?.type,
    ).toBe("block");
  });

  it("uses provider configuration, not dependency directory names", async () => {
    writeFileSync(join(projectDir, ".gitignore"), "");
    expect((await runShell("rg foo node_modules"))?.type).toBe("block");
    expect((await runShell("rg foo .venv"))?.type).toBe("block");
  });

  it("recognizes a virtualenv's own gitignore instead of its directory name", async () => {
    writeFileSync(join(projectDir, ".gitignore"), "");
    mkdirSync(join(projectDir, "python-env"));
    writeFileSync(
      join(projectDir, "python-env/.gitignore"),
      "# Created by uv\n*\n",
    );
    expect(await runShell("rg --hidden --no-ignore foo python-env")).toBeNull();
    writeFileSync(join(projectDir, "python-env/.gitignore"), "*\n!ours.py\n");
    expect((await runShell("rg foo python-env"))?.type).toBe("block");
  });

  it.each(["false", "False", "*unknown"])(
    "does not assume gitignore support for %s",
    async (setting) => {
      writeFileSync(
        join(projectDir, ".serena/project.yml"),
        `ignore_all_files_in_gitignore: ${setting}\n`,
      );
      expect((await runShell("rg foo node_modules"))?.type).toBe("block");
    },
  );

  it("reads global Serena exclusions without hardcoding environment names", async () => {
    mkdirSync(join(projectDir, "serena-home"));
    writeFileSync(
      join(projectDir, "serena-home/serena_config.yml"),
      'ignored_paths: ["downloaded-sdk"]\n',
    );
    expect(await runShell("rg foo downloaded-sdk")).toBeNull();
  });

  it("keeps unsupported or negated provider rules on the explicit fallback", async () => {
    writeFileSync(
      join(projectDir, ".serena/project.yml"),
      'ignored_paths: ["third-party/", "!third-party/ours/"]\n',
    );
    expect((await runShell("rg foo third-party"))?.type).toBe("block");
    writeFileSync(
      join(projectDir, ".serena/project.yml"),
      "ignored_paths: *shared\n",
    );
    expect((await runShell("rg foo third-party"))?.type).toBe("block");
    expect(await runShell(`${BYPASS_TOKEN} rg foo third-party`)).toBeNull();
  });

  it("does not ignore gitignore re-inclusions after explicit Serena exclusions", async () => {
    writeFileSync(join(projectDir, ".gitignore"), "!third-party/ours/\n");
    expect((await runShell("rg foo third-party"))?.type).toBe("block");
    expect((await runShell("rg foo third-party/ours"))?.type).toBe("block");
  });

  it("honors gitignore re-inclusions", async () => {
    writeFileSync(
      join(projectDir, ".gitignore"),
      "third-party/*\n!third-party/ours/\n",
    );
    writeFileSync(
      join(projectDir, ".serena/project.yml"),
      "ignored_paths: []\n",
    );
    expect((await runShell("rg foo third-party/ours"))?.type).toBe("block");
    expect((await runShell("rg foo third-party"))?.type).toBe("block");
    expect(await runShell("rg foo third-party/external")).toBeNull();
  });

  it("allows explicit paths outside the provider project, including uv caches", async () => {
    expect(
      await runShell("rg foo /external/.cache/uv/archive-v0/pkg"),
    ).toBeNull();
    expect(
      await runTool("Grep", { pattern: "foo", path: "/external/packages" }),
    ).toBeNull();
  });
});

describe("code-intelligence-guard run() — Gortex exclusions", () => {
  beforeEach(() => {
    writeConfig("providers:\n  code_intelligence: gortex\n");
    mkdirSync(join(projectDir, "third-party/ours"), { recursive: true });
    vi.mocked(childProcess.execFileSync).mockReturnValue(
      "[builtin  ] node_modules/\n[global   ] downloaded-sdk/\n[repo:demo] third-party/\n[workspace] **/custom-env/**\n",
    );
  });

  it("uses the provider's read-only layered exclusion listing", async () => {
    expect(await runShell("rg foo third-party")).toBeNull();
    expect(childProcess.execFileSync).toHaveBeenCalledWith(
      "gortex",
      ["config", "exclude", "list"],
      expect.objectContaining({ cwd: projectDir, timeout: 500 }),
    );
    expect((await runShell("rg foo third-party src"))?.type).toBe("block");
  });

  it("does not grant exemptions when exclusions cannot be read", async () => {
    vi.mocked(childProcess.execFileSync).mockImplementation(() => {
      throw new Error("unavailable");
    });
    expect((await runShell("rg foo third-party"))?.type).toBe("block");
    expect(await runShell(`${BYPASS_TOKEN} rg foo third-party`)).toBeNull();
  });

  it.each(["[workspace] !third-party/ours/\n", "unknown output\n"])(
    "does not guess when listing contains %s",
    async (extra) => {
      vi.mocked(childProcess.execFileSync).mockReturnValue(
        `[builtin] third-party/\n${extra}`,
      );
      expect((await runShell("rg foo third-party"))?.type).toBe("block");
    },
  );

  it("honors Gortex include overrides omitted from the CLI listing", async () => {
    writeFileSync(
      join(projectDir, ".gortex.yaml"),
      "include:\n  - third-party/ours\n",
    );
    expect((await runShell("rg foo third-party"))?.type).toBe("block");
  });

  it.each([".gortexignore", ".ignore", ".rgignore"])(
    "honors re-inclusion in %s",
    async (name) => {
      writeFileSync(join(projectDir, name), "!third-party/ours/\n");
      expect((await runShell("rg foo third-party"))?.type).toBe("block");
    },
  );
});
