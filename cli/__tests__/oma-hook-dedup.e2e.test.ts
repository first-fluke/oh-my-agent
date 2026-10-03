/**
 * E2E regression for hook duplicate suppression.
 *
 * The old oma-hook.sh preamble skipped ANY run of the same event within 2s,
 * keyed only by event args and a never-set OMA_SESSION_ID. Two parallel tool
 * calls therefore reached `oma hook run` once: `git add .env` fired next to
 * `git add README.md` was allowed because scm-guard never ran for it.
 *
 * These cases drive the generated wrapper → source CLI → real handler chain.
 */

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateOmaHookWrapper } from "../platform/hooks-composer.js";

const REPO_ROOT = join(__dirname, "..", "..");
const SOURCE_CLI = join(REPO_ROOT, "cli", "cli.ts");
const HOOK_ARGS = [
  "--vendor",
  "claude",
  "--event",
  "PreToolUse",
  "--matcher",
  "Bash|Grep|Glob",
];

let root: string;
let project: string;
let projectWrapper: string;
let globalWrapper: string;
let fakeOma: string;

function writeWrapper(dir: string): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "oma-hook.sh");
  writeFileSync(path, generateOmaHookWrapper(), { mode: 0o755 });
  return path;
}

function payload(command: string, toolUseId: string): string {
  return JSON.stringify({
    session_id: "dedup-e2e",
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_use_id: toolUseId,
    tool_input: { command },
    cwd: project,
  });
}

function runWrapper(
  wrapper: string,
  input: string,
  env: NodeJS.ProcessEnv = {},
): Promise<{ status: number | null; stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", [wrapper, ...HOOK_ARGS], {
      cwd: project,
      env: {
        ...process.env,
        OMA_BIN: fakeOma,
        OMA_DEDUP_SOURCE_CLI: SOURCE_CLI,
        OMA_NO_AGENTMEMORY: "1",
        OMA_SKIP_VERSION_CHECK: "1",
        ...env,
      },
    });
    let stdout = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout: stdout.trim() }));
    child.stdin.end(input);
  });
}

const denied = (stdout: string) =>
  stdout.includes('"permissionDecision":"deny"');

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-hook-dedup-e2e-"));
  project = join(root, "project");
  mkdirSync(project);
  projectWrapper = writeWrapper(join(project, ".claude", "hooks"));
  globalWrapper = writeWrapper(join(root, "home", ".claude", "hooks"));
  fakeOma = join(root, "oma");
  writeFileSync(fakeOma, '#!/bin/sh\nexec bun "$OMA_DEDUP_SOURCE_CLI" "$@"\n', {
    mode: 0o755,
  });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe.skipIf(process.platform === "win32")("oma hook dedup (e2e)", () => {
  it("guards every parallel tool call — the second one is not dropped", async () => {
    // Start the benign call first so the old time-window lock would always
    // have swallowed the secret-staging call that follows it.
    const readmeRun = runWrapper(
      projectWrapper,
      payload("git add README.md", "toolu_A"),
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
    const secretRun = runWrapper(
      projectWrapper,
      payload("git add .env", "toolu_B"),
    );
    const [readme, secret] = await Promise.all([readmeRun, secretRun]);
    expect(readme.status).toBe(0);
    expect(secret.status).toBe(0);
    expect(readme.stdout).toBe("");
    expect(denied(secret.stdout)).toBe(true);
  });

  it("dispatches a project + global double registration once", async () => {
    const input = payload("git add .env", "toolu_dup");
    const results = await Promise.all([
      runWrapper(projectWrapper, input),
      runWrapper(globalWrapper, input),
    ]);
    expect(results.map((r) => r.status)).toEqual([0, 0]);
    expect(results.filter((r) => denied(r.stdout))).toHaveLength(1);
    expect(results.filter((r) => r.stdout === "")).toHaveLength(1);
  });

  it("runs a same-wrapper repeat of an identical payload every time", async () => {
    const input = payload("git add .env", "toolu_repeat");
    const first = await runWrapper(projectWrapper, input);
    const second = await runWrapper(projectWrapper, input);
    expect(denied(first.stdout)).toBe(true);
    expect(denied(second.stdout)).toBe(true);
  });

  it("dispatches both deliveries when the claim store is unusable", async () => {
    const blocker = join(root, "blocker");
    writeFileSync(blocker, "not a directory");
    const env = { OMA_HOOK_DEDUP_DIR: join(blocker, "claims") };
    const input = payload("git add .env", "toolu_io");
    const results = await Promise.all([
      runWrapper(projectWrapper, input, env),
      runWrapper(globalWrapper, input, env),
    ]);
    expect(results.map((r) => r.status)).toEqual([0, 0]);
    expect(results.every((r) => denied(r.stdout))).toBe(true);
  });
});
