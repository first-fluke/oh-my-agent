import {
  type ChildProcess,
  execFileSync,
  spawn,
  spawnSync,
} from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stopOwnedProcess } from "../../io/owned-process.js";
import {
  readProcessIdentity,
  type SubagentProcessRecord,
} from "../../io/subagent-process.js";
import { writeTestPlan } from "../../state/__fixtures__/task-contract.js";
import { beginAgentRun, readAgentRun } from "../../state/agent-results.js";

const cliRoot = fileURLToPath(new URL("../../", import.meta.url));
const commander = createRequire(import.meta.url).resolve("commander");
// Bypass version-manager launchers so signals target the fixture runner itself.
const bun = execFileSync("bun", ["-p", "process.execPath"], {
  encoding: "utf8",
  timeout: 5000,
}).trim();
const waitUntil = async (condition: () => boolean, timeout = 7000) => {
  const end = Date.now() + timeout;
  while (!condition()) {
    if (Date.now() >= end)
      throw new Error("Fixture did not reach its expected state");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

describe.skipIf(process.platform === "win32")(
  "managed execution cancellation and deadlines",
  () => {
    let root: string;
    let runner: string;
    const runners: ChildProcess[] = [];
    const env = () => ({
      ...process.env,
      OMA_RUNTIME_VENDOR: "codex",
      OMA_EXECUTION_STATE: "",
      OMA_EXECUTION_ID: "",
      OMA_EXECUTION_DEADLINE: "",
      OMA_ORCA_SUBAGENTS: "0",
    });
    beforeEach(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), "oma-stop-lifecycle-"));
      runner = path.join(root, "runner.ts");
      fs.writeFileSync(
        runner,
        `import {Command} from ${JSON.stringify(commander)};
const {registerAgentCommands} = await import(${JSON.stringify(path.join(cliRoot, "commands/agent/command.ts"))});
import {createCommandSurface} from ${JSON.stringify(path.join(cliRoot, "utils/command-surface.ts"))};
const program = new Command(); registerAgentCommands(program);
await program.parseAsync(createCommandSurface(program).normalize(process.argv.slice(2)), {from: "user"});
`,
      );
      const worker = path.join(root, "worker.cjs");
      fs.writeFileSync(
        worker,
        `const fs=require('node:fs'); const {spawn}=require('node:child_process');
process.on('SIGTERM',()=>{});
const child=spawn(process.execPath,['-e', "require('node:fs').writeFileSync('grandchild.pid',String(process.pid));process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{stdio:'ignore'});
fs.appendFileSync('launches.txt','launch\\n');
fs.writeFileSync('started.json',JSON.stringify({pid:process.pid,child:child.pid,deadline:process.env.OMA_EXECUTION_DEADLINE,state:process.env.OMA_EXECUTION_STATE}));
setInterval(()=>{},1000);
`,
      );
      const configDir = path.join(
        root,
        ".agents/skills/oma-orchestration/config",
      );
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, "cli-config.yaml"),
        `vendors:\n  qwen:\n    command: ${JSON.stringify(bun)}\n    subcommand: ${JSON.stringify(worker)}\n    prompt_flag: -p\n  codex:\n    command: ${JSON.stringify(bun)}\n    subcommand: ${JSON.stringify(worker)}\n    prompt_flag: -p\n`,
      );
      fs.writeFileSync(
        path.join(root, ".agents/oma-config.yaml"),
        "language: en\nmodel_preset: auto\n",
      );
    });
    afterEach(async () => {
      // Stop every owned group before deleting fixture files, including a
      // supervisor still booting when an assertion fails.
      const results = path.join(root, ".agents/results");
      if (fs.existsSync(results)) {
        for (const name of fs
          .readdirSync(results)
          .filter((name) => name.startsWith("parallel-"))) {
          const directory = path.join(results, name);
          for (const entry of fs
            .readdirSync(directory)
            .filter((entry) => entry.endsWith(".pid.json"))) {
            await stopOwnedProcess(
              JSON.parse(
                fs.readFileSync(path.join(directory, entry), "utf8"),
              ) as SubagentProcessRecord,
              { graceMs: 100, killWaitMs: 500 },
            );
          }
          const pidFile = path.join(directory, "supervisor.pid");
          if (fs.existsSync(pidFile)) {
            const pid = Number(fs.readFileSync(pidFile, "utf8"));
            const identity = readProcessIdentity(pid);
            if (
              identity &&
              (identity.command.includes(root) ||
                identity.command.includes(fs.realpathSync(root)))
            ) {
              try {
                process.kill(pid, "SIGKILL");
              } catch {}
            }
          }
        }
      }
      for (const runner of runners.splice(0))
        if (runner.exitCode === null) runner.kill("SIGKILL");
      const started = path.join(root, "started.json");
      if (fs.existsSync(started)) {
        const pids = JSON.parse(fs.readFileSync(started, "utf8"));
        for (const pid of [pids.child, pids.pid]) {
          try {
            process.kill(pid, "SIGKILL");
          } catch {}
        }
      }
      const ledgerDir = path.join(root, ".agents/state/executions");
      if (fs.existsSync(ledgerDir)) {
        for (const name of fs
          .readdirSync(ledgerDir)
          .filter((name) => name.endsWith(".jsonl"))) {
          for (const line of fs
            .readFileSync(path.join(ledgerDir, name), "utf8")
            .split("\n")
            .filter(Boolean)) {
            const event = JSON.parse(line) as {
              resources?: Array<{ kind: string; id: string }>;
            };
            for (const resource of event.resources ?? []) {
              if (
                resource.kind !== "path" ||
                path.dirname(resource.id) !== os.tmpdir()
              )
                continue;
              for (const suffix of ["", ".json", ".resources.json"])
                fs.rmSync(`${resource.id}${suffix}`, { force: true });
            }
          }
        }
      }
      fs.rmSync(root, { recursive: true, force: true });
    });
    const launch = (args: string[], extraEnv: NodeJS.ProcessEnv = {}) => {
      const child = spawn(bun, [runner, "agent", ...args], {
        cwd: root,
        env: { ...env(), ...extraEnv },
        stdio: ["ignore", "pipe", "pipe"],
      });
      runners.push(child);
      let output = "";
      child.stdout?.on("data", (chunk) => {
        output += chunk;
      });
      child.stderr?.on("data", (chunk) => {
        output += chunk;
      });
      const exited = new Promise<number | null>((resolve) =>
        child.once("exit", resolve),
      );
      return { child, exited, output: () => output };
    };
    const started = () =>
      JSON.parse(fs.readFileSync(path.join(root, "started.json"), "utf8")) as {
        pid: number;
        child: number;
        deadline: string;
      };
    const expectStoppedTree = (output = "") => {
      for (const pid of [started().pid, started().child]) {
        let state = "";
        try {
          state = execFileSync("ps", ["-p", String(pid), "-o", "stat="], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
          }).trim();
        } catch {}
        let detail = "";
        if (state && !state.startsWith("Z")) {
          try {
            detail = execFileSync(
              "ps",
              ["-p", String(pid), "-o", "pid=,ppid=,pgid=,stat=,command="],
              { encoding: "utf8" },
            );
          } catch {}
        }
        expect(!state || state.startsWith("Z"), `${output}\n${detail}`).toBe(
          true,
        );
      }
    };

    it("times out a TERM-resistant worker tree, preserves artifacts, and blocks retry/failover", async () => {
      const run = launch([
        "spawn",
        "qa-reviewer",
        "Review",
        "deadline-session",
        "--vendor",
        "qwen",
        "--workspace",
        root,
        "--timeout-seconds",
        "2",
        "--fallback-vendors",
        "codex",
      ]);
      expect(await run.exited).toBe(124);
      expectStoppedTree();
      expect(started().deadline).toBeTruthy();
      expect(fs.readFileSync(path.join(root, "launches.txt"), "utf8")).toBe(
        "launch\n",
      );
      const ledger = fs.readFileSync(
        path.join(root, ".agents/state/executions/deadline-session.jsonl"),
        "utf8",
      );
      expect(ledger).toContain('"reason":"timed_out"');
      const retry = spawnSync(
        "bun",
        [
          runner,
          "agent",
          "spawn",
          "qa-reviewer",
          "Retry",
          "deadline-session",
          "--vendor",
          "qwen",
          "--timeout-seconds",
          "60",
        ],
        { cwd: root, env: env(), encoding: "utf8", timeout: 3000 },
      );
      expect(retry.status).toBe(124);
      expect(fs.readFileSync(path.join(root, "launches.txt"), "utf8")).toBe(
        "launch\n",
      );
      const paths = ledger
        .split("\n")
        .filter(Boolean)
        .flatMap(
          (line) =>
            (
              JSON.parse(line) as {
                resources?: Array<{ kind: string; id: string }>;
              }
            ).resources ?? [],
        );
      const pidPath = paths.find(
        (resource) => resource.kind === "path" && resource.id.endsWith(".pid"),
      )?.id;
      expect(pidPath).toBeTruthy();
      expect(fs.existsSync(`${pidPath}.resources.json`)).toBe(true);
      if (fs.existsSync(pidPath ?? "")) {
        // An unavailable final census keeps ownership, even after the fixture's
        // known workers have independently been observed exiting.
        expect(fs.existsSync(`${pidPath}.json`)).toBe(true);
        expect(run.output()).toContain("termination unconfirmed");
      } else expect(fs.existsSync(`${pidPath}.json`)).toBe(false);
    }, 12000);

    it("cancels with SIGTERM before removing ownership and preserves the signal exit code on resume", async () => {
      const run = launch([
        "spawn",
        "qa-reviewer",
        "Review",
        "cancel-session",
        "--vendor",
        "qwen",
        "--workspace",
        root,
      ]);
      try {
        await waitUntil(() => fs.existsSync(path.join(root, "grandchild.pid")));
      } catch (error) {
        throw new Error(`${String(error)}\n${run.output()}`);
      }
      run.child.kill("SIGTERM");
      const exitCode = await run.exited;
      expect(
        exitCode,
        JSON.stringify({
          phase: "cancelled runner exit",
          exitCode,
          signal: run.child.signalCode,
          output: run.output(),
        }),
      ).toBe(143);
      expectStoppedTree(run.output());
      const resume = spawnSync(
        "bun",
        [runner, "agent", "resume", "cancel-session"],
        { cwd: root, env: env(), encoding: "utf8", timeout: 3000 },
      );
      const resumeDetail = JSON.stringify({
        phase: "cancelled resume admission",
        status: resume.status,
        signal: resume.signal,
        errorCode: (resume.error as NodeJS.ErrnoException | undefined)?.code,
        stdout: resume.stdout,
        stderr: resume.stderr,
      });
      expect(resume.status, resumeDetail).toBe(143);
      expect(resume.stderr, resumeDetail).toContain("cancelled");
      expect(fs.readFileSync(path.join(root, "launches.txt"), "utf8")).toBe(
        "launch\n",
      );
      expect(
        fs.readFileSync(
          path.join(os.tmpdir(), "subagent-cancel-session-qa-reviewer.status"),
          "utf8",
        ),
      ).toBe("cancelled\n");
    }, 12000);

    it("carries the original deadline into a detached parallel supervisor", async () => {
      const run = launch([
        "parallel",
        "--inline",
        "qa-reviewer:Review",
        "--vendor",
        "qwen",
        "--session-id",
        "background-session",
        "--no-wait",
        "--timeout-seconds",
        "0.5",
      ]);
      expect([0, 124], run.output()).toContain(await run.exited);
      const results = path.join(root, ".agents/results");
      const runDir = path.join(
        results,
        fs.readdirSync(results).find((name) => name.startsWith("parallel-")) ??
          "missing",
      );
      await waitUntil(
        () => !fs.existsSync(path.join(runDir, "supervisor.pid")),
        7000,
      );
      const ledger = fs.readFileSync(
        path.join(root, ".agents/state/executions/background-session.jsonl"),
        "utf8",
      );
      expect(ledger).toContain('"reason":"timed_out"');
      // Startup consumes the inherited deadline, so a busy machine may reject
      // the task before the worker is admitted.
      if (fs.existsSync(path.join(root, "started.json"))) {
        expectStoppedTree();
        expect(
          fs.readFileSync(path.join(runDir, "qa-reviewer-0.status"), "utf8"),
        ).toBe("timed_out\n");
        expect(fs.existsSync(path.join(runDir, "qa-reviewer-0.log"))).toBe(
          true,
        );
      }
      expect(fs.existsSync(path.join(runDir, "supervisor.log"))).toBe(true);
    }, 12000);

    it("stops verification with the session deadline and never admits a later check", async () => {
      const native = beginAgentRun({
        root,
        workspace: root,
        agentId: "qa",
        taskId: "qa",
        sessionId: "verify-session",
        vendor: "native",
      });
      const worker = path.join(root, "worker.cjs");
      const run = launch([
        "verify",
        native.runId,
        "--timeout-seconds",
        "2",
        "--",
        bun,
        worker,
      ]);
      expect(await run.exited).toBe(124);
      expectStoppedTree();
      expect(readAgentRun(root, native.runId).checks).toHaveLength(1);
      expect(readAgentRun(root, native.runId)).toMatchObject({
        status: "failed",
        exitCode: 124,
        unresolved: expect.arrayContaining(["Execution timed_out"]),
      });
      const again = spawnSync(
        "bun",
        [
          runner,
          "agent",
          "verify",
          native.runId,
          "--",
          process.execPath,
          "-e",
          "require('node:fs').writeFileSync('later-check','ran')",
        ],
        { cwd: root, env: env(), encoding: "utf8", timeout: 3000 },
      );
      expect(again.status).toBe(124);
      expect(fs.existsSync(path.join(root, "later-check"))).toBe(false);
    }, 12000);

    it("stops a review tree at its deadline and preserves its log", async () => {
      const worker = path.join(root, "worker.cjs");
      const executable = path.join(root, "review-worker.cjs");
      fs.writeFileSync(
        executable,
        `#!/bin/sh\nexec '${bun.replaceAll("'", "'\\''")}' '${worker.replaceAll("'", "'\\''")}' "$@"\n`,
        { mode: 0o755 },
      );
      fs.writeFileSync(
        path.join(
          root,
          ".agents/skills/oma-orchestration/config/cli-config.yaml",
        ),
        `vendors:\n  qwen:\n    command: ${JSON.stringify(executable)}\n    prompt_flag: -p\n`,
      );
      const run = launch([
        "review",
        "--vendor",
        "qwen",
        "--workspace",
        root,
        "--session-id",
        "review-session",
        "--timeout-seconds",
        "2",
      ]);
      expect(await run.exited, run.output()).toBe(124);
      expect(fs.existsSync(path.join(root, "started.json")), run.output()).toBe(
        true,
      );
      expectStoppedTree();
      const ledger = fs.readFileSync(
        path.join(root, ".agents/state/executions/review-session.jsonl"),
        "utf8",
      );
      const log = ledger
        .split("\n")
        .filter(Boolean)
        .flatMap(
          (line) =>
            (
              JSON.parse(line) as {
                resources?: Array<{ kind: string; id: string }>;
              }
            ).resources ?? [],
        )
        .find(
          (resource) =>
            resource.kind === "path" && resource.id.endsWith(".log"),
        )?.id;
      expect(log).toBeTruthy();
      expect(fs.existsSync(log ?? "")).toBe(true);
    }, 12000);

    it("cancels an admitted background worker and its resistant descendant", async () => {
      const run = launch([
        "parallel",
        "--inline",
        "qa-reviewer:Review",
        "--vendor",
        "qwen",
        "--session-id",
        "background-cancel",
        "--no-wait",
      ]);
      expect(await run.exited, run.output()).toBe(0);
      await waitUntil(() => fs.existsSync(path.join(root, "grandchild.pid")));
      const results = path.join(root, ".agents/results");
      const runDir = path.join(
        results,
        fs.readdirSync(results).find((name) => name.startsWith("parallel-")) ??
          "missing",
      );
      const pidFile = path.join(runDir, "supervisor.pid");
      const pid = Number(fs.readFileSync(pidFile, "utf8"));
      const identity = readProcessIdentity(pid);
      expect(identity?.command.includes(fs.realpathSync(root))).toBe(true);
      process.kill(pid, "SIGTERM");
      await waitUntil(() => !fs.existsSync(pidFile));
      expectStoppedTree(
        fs.readFileSync(path.join(runDir, "supervisor.log"), "utf8"),
      );
      expect(
        fs.readFileSync(path.join(runDir, "qa-reviewer-0.status"), "utf8"),
      ).toBe("cancelled\n");
    }, 15000);

    it("drains a resumed CLI before killing its separately owned vendor group", async () => {
      writeTestPlan(root);
      fs.writeFileSync(
        path.join(root, ".agents/oma-config.yaml"),
        "language: en\nmodel_preset: fixture\ndefault_cli: qwen\n",
      );
      const run = launch(["resume", "s1", "--project-root", root]);
      try {
        await waitUntil(() => fs.existsSync(path.join(root, "grandchild.pid")));
      } catch (error) {
        throw new Error(`${String(error)}\n${run.output()}`);
      }
      run.child.kill("SIGTERM");
      expect(await run.exited, run.output()).toBe(143);
      expectStoppedTree(run.output());
    }, 18000);
  },
);
