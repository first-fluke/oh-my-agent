/**
 * Project root + config consistency between `oma hook run` and the CLI.
 *
 * - A monorepo sub-package with its own install is one root for both
 *   `oma goal:set` (CLI) and the Stop hook (dispatch), so the goal contract
 *   the CLI writes is the state the hook enforces.
 * - Handlers see the dispatcher's config (CUE + local overlay aware), never a
 *   parent / global install's config, and a broken config never disables them.
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cueData = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("../utils/cue.js", () => ({
  evaluateCueFile: vi.fn(() => ({ success: true, data: cueData.value })),
}));

const { runHookDispatch } = await import("../commands/hook/dispatch.js");
const { registerGoal } = await import("../commands/goal/command.js");

let root: string;

function write(path: string, content: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

function dispatch(
  event: string,
  cwd: string,
  payload: Record<string, unknown>,
) {
  return runHookDispatch({
    vendor: "claude",
    nativeEvent: event,
    rawStdin: JSON.stringify({
      session_id: "sid-1",
      hook_event_name: event,
      cwd,
      ...payload,
    }),
    cwd,
    sid: "sid-1",
  });
}

const grep = (cwd: string) =>
  dispatch("PreToolUse", cwd, {
    tool_name: "Grep",
    tool_input: { pattern: "foo" },
  });

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), "oma-hook-root-")));
  vi.stubEnv("OMA_STATE_HOME", join(root, "state-home"));
  vi.stubEnv("OMA_NO_AGENTMEMORY", "1");
  vi.stubEnv("CLAUDE_PROJECT_DIR", "");
  cueData.value = {};
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

describe("monorepo sub-package install", () => {
  it("goal:set and the Stop hook resolve the same project root", async () => {
    const repo = join(root, "repo");
    mkdirSync(join(repo, ".git"), { recursive: true });
    write(join(repo, ".agents", "oma-config.yaml"), "language: en\n");
    const app = join(repo, "apps", "x");
    write(join(app, ".agents", "oma-config.yaml"), "language: en\n");
    const appSrc = join(app, "src");
    mkdirSync(appSrc, { recursive: true });
    // A stray marker-less .agents/ on the way up must not capture the root.
    mkdirSync(join(app, "src", ".agents", "state"), { recursive: true });
    const stateFile = join(app, ".agents", "state", "work-state-sid-1.json");
    write(
      stateFile,
      JSON.stringify({
        workflow: "work",
        sessionId: "sid-1",
        activatedAt: new Date().toISOString(),
        reinforcementCount: 0,
      }),
    );

    vi.spyOn(process, "cwd").mockReturnValue(appSrc);
    const program = new Command().exitOverride();
    registerGoal(program);
    await program.parseAsync(["goal:set", "--description", "ship it"], {
      from: "user",
    });
    expect(JSON.parse(readFileSync(stateFile, "utf-8")).goal).toEqual({
      description: "ship it",
    });

    const { output } = await dispatch("Stop", appSrc, {});
    expect(output).toContain("OMA PERSISTENT MODE: WORK");
    const state = JSON.parse(readFileSync(stateFile, "utf-8"));
    expect(state.reinforcementCount).toBe(1);
    expect(state.goal).toEqual({ description: "ship it" });
    expect(() =>
      readFileSync(join(repo, ".agents", "state", "work-state-sid-1.json")),
    ).toThrow();
  });
});

describe("dispatcher config reaches the handlers", () => {
  let project: string;

  beforeEach(() => {
    project = join(root, "project");
    mkdirSync(join(project, ".git"), { recursive: true });
  });

  it("honors scm and refactor_guard set only in oma-config.local.yaml", async () => {
    write(join(project, ".agents", "oma-config.yaml"), "language: en\n");
    write(
      join(project, ".agents", "oma-config.local.yaml"),
      [
        "scm:",
        "  forbidden_patterns:",
        '    - "*.secret"',
        "refactor_guard:",
        "  enabled: true",
        "  max_lines: 3",
        "",
      ].join("\n"),
    );
    const sub = join(project, "packages", "lib");
    write(join(sub, "big.ts"), "a\nb\nc\nd\ne\n");

    const staged = await dispatch("PreToolUse", sub, {
      tool_name: "Bash",
      tool_input: { command: "git add notes.secret" },
    });
    expect(staged.output).toContain("scm-guard");
    expect(staged.output).toContain('"permissionDecision":"deny"');

    await dispatch("PostToolUse", sub, {
      tool_name: "Edit",
      tool_input: { file_path: "big.ts" },
    });
    const stop = await dispatch("Stop", sub, {});
    expect(stop.output).toContain("refactor-guard");
    expect(stop.output).toContain("packages/lib/big.ts");
  });

  it("honors providers set only in oma-config.cue", async () => {
    write(join(project, ".agents", "oma-config.cue"), "package config\n");
    cueData.value = { providers: { code_intelligence: "gortex" } };
    const primed = await dispatch("UserPromptSubmit", project, {
      prompt: "hello",
    });
    expect(primed.output).toContain("[OMA GORTEX PRIMER]");

    cueData.value = { providers: { code_intelligence: "serena" } };
    expect((await grep(project)).output).toContain("code-intelligence-guard");

    cueData.value = {
      providers: {
        code_intelligence: "serena",
        code_intelligence_guard: "off",
      },
    };
    expect((await grep(project)).output).toBe("");
  });

  it("never applies a parent or global install's config to a project", async () => {
    const home = join(root, "home");
    write(
      join(home, ".agents", "oma-config.yaml"),
      "providers:\n  code_intelligence: serena\n",
    );
    const repo = join(home, "work", "repo");
    mkdirSync(join(repo, ".git"), { recursive: true });

    expect((await grep(repo)).output).toBe("");
  });

  it("keeps the handlers running when the config cannot be loaded", async () => {
    write(join(project, ".agents", "oma-config.yaml"), "language: en\n");
    write(join(project, ".agents", "oma-config.local.yaml"), "language: en\n");
    write(join(project, ".agents", "oma-config.local.cue"), "package config\n");

    const staged = await dispatch("PreToolUse", project, {
      tool_name: "Bash",
      tool_input: { command: "git add .env" },
    });
    expect(staged.output).toContain("scm-guard");
  });
});
