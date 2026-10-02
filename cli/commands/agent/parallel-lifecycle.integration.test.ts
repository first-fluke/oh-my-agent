import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listAgentRuns } from "../../state/agent-results.js";

const cliRoot = fileURLToPath(new URL("../../", import.meta.url));
const commanderEntry = createRequire(import.meta.url).resolve("commander");

describe("parallel subprocess lifecycle", () => {
  let root: string;
  let runner: string;
  const supervisorPids = new Set<number>();

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "oma-parallel-lifecycle-"));
    runner = path.join(root, "runner.ts");
    fs.writeFileSync(
      runner,
      `import { Command } from ${JSON.stringify(commanderEntry)};\nimport { registerAgentCommands } from ${JSON.stringify(path.join(cliRoot, "commands/agent/command.ts"))};\nconst program = new Command(); registerAgentCommands(program); await program.parseAsync(process.argv);\n`,
    );
    const vendor = path.join(root, "fake-qwen.cjs");
    fs.writeFileSync(
      vendor,
      `const fs = require('node:fs');
if (process.env.FAKE_VENDOR_IGNORE_TERM === '1') process.on('SIGTERM', () => fs.writeFileSync('term-received.txt', 'received'));
fs.appendFileSync('started.txt', 'started\\n');
const finish = () => { fs.appendFileSync('finished.txt', 'finished\\n'); console.log('fake vendor finished'); };
if (process.env.FAKE_VENDOR_RELEASE_FILE) {
  const poll = setInterval(() => { if (fs.existsSync(process.env.FAKE_VENDOR_RELEASE_FILE)) { clearInterval(poll); clearTimeout(safety); finish(); } }, 25);
  const safety = setTimeout(() => { clearInterval(poll); process.exit(2); }, 12_000);
} else setTimeout(finish, Number(process.env.FAKE_VENDOR_DELAY ?? 20));
`,
    );
    const configDir = path.join(
      root,
      ".agents/skills/oma-orchestration/config",
    );
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, "cli-config.yaml"),
      `vendors:\n  qwen:\n    command: ${JSON.stringify(process.execPath)}\n    subcommand: ${JSON.stringify(vendor)}\n    prompt_flag: -p\n`,
    );
    fs.writeFileSync(
      path.join(root, ".agents/oma-config.yaml"),
      "language: en\nmodel_preset: auto\n",
    );
  });

  afterEach(() => {
    for (const pid of supervisorPids) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {}
    }
    supervisorPids.clear();
    fs.rmSync(root, { recursive: true, force: true });
  });

  const invoke = (
    args: string[],
    delay = 20,
    cwd = root,
    extraEnv: NodeJS.ProcessEnv = {},
  ) =>
    spawnSync("bun", [runner, "agent:parallel", ...args], {
      cwd,
      encoding: "utf8",
      timeout: 15_000,
      env: {
        ...process.env,
        OMA_RUNTIME_VENDOR: "codex",
        OMA_STATE_HOME: path.join(root, "state-home"),
        OMA_PROFILE: "0",
        FAKE_VENDOR_DELAY: String(delay),
        ...extraEnv,
      },
    });

  const usageFile = () =>
    path.join(root, ".agents/state/memories/session-cost-budget-test.md");

  const backgroundRunDir = () => {
    const resultsRoot = path.join(root, ".agents/results");
    const name = fs
      .readdirSync(resultsRoot)
      .find((entry) => entry.startsWith("parallel-"));
    if (!name) throw new Error("Parallel result directory was not created");
    return path.join(resultsRoot, name);
  };

  it("blocks parallel vendor execution when the session spawn cap is zero", () => {
    fs.appendFileSync(
      path.join(root, ".agents/oma-config.yaml"),
      "session:\n  quota_cap:\n    spawn_count: 0\n",
    );
    const result = invoke([
      "--inline",
      "--model",
      "qwen",
      "--session",
      "budget-test",
      "backend:Run fixture",
    ]);
    expect(result.stderr).toContain("Quota cap exceeded");
    expect(fs.existsSync(path.join(root, "started.txt"))).toBe(false);
    expect(fs.existsSync(usageFile())).toBe(false);
  });

  it("records one usage event when the parallel vendor exits", () => {
    invoke([
      "--inline",
      "--model",
      "qwen",
      "--session",
      "budget-test",
      "backend:Run fixture",
    ]);
    expect(fs.existsSync(usageFile())).toBe(true);
    const usage = fs.readFileSync(usageFile(), "utf8");
    expect(usage.match(/```json/g)).toHaveLength(1);
    expect(usage).toContain('"vendor":"qwen"');
    expect(usage).toMatch(/"tokens":[1-9]\d*/);
  });

  it("reads and writes the project quota ledger when invoked from a subdirectory", () => {
    const subdir = path.join(root, "workspace");
    fs.mkdirSync(subdir);
    const args = [
      "--inline",
      "--model",
      "qwen",
      "--session",
      "budget-test",
      "backend:Subdirectory fixture",
    ];
    invoke(args, 20, subdir);
    expect(fs.existsSync(usageFile())).toBe(true);
    expect(fs.existsSync(path.join(subdir, ".agents"))).toBe(false);
    fs.appendFileSync(
      path.join(root, ".agents/oma-config.yaml"),
      "session:\n  quota_cap:\n    spawn_count: 1\n",
    );
    const result = invoke(args, 20, subdir);
    expect(result.stderr).toContain("Quota cap exceeded");
    expect(fs.readFileSync(usageFile(), "utf8").match(/```json/g)).toHaveLength(
      1,
    );
    expect(fs.existsSync(path.join(subdir, ".agents"))).toBe(false);
  });

  it("counts active children against the parallel batch spawn cap", () => {
    fs.appendFileSync(
      path.join(root, ".agents/oma-config.yaml"),
      "session:\n  quota_cap:\n    spawn_count: 1\n",
    );
    const result = invoke(
      [
        "--inline",
        "--model",
        "qwen",
        "--session",
        "budget-test",
        "backend:First fixture",
        "backend:Second fixture",
      ],
      200,
    );
    expect(result.stderr).toContain("Quota cap exceeded");
    expect(fs.readFileSync(path.join(root, "started.txt"), "utf8")).toBe(
      "started\n",
    );
    expect(fs.readFileSync(usageFile(), "utf8").match(/```json/g)).toHaveLength(
      1,
    );
    expect(listAgentRuns(root).every((run) => run.status !== "running")).toBe(
      true,
    );
  });

  it("returns before background children exit and still finalizes results and usage", async () => {
    const releaseFile = path.join(root, "release-vendor");
    const result = invoke(
      [
        "--inline",
        "--model",
        "qwen",
        "--session",
        "budget-test",
        "--no-wait",
        "backend:Background fixture",
      ],
      20,
      root,
      { FAKE_VENDOR_RELEASE_FILE: releaseFile },
    );
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(root, "finished.txt"))).toBe(false);
    const runDir = backgroundRunDir();
    const supervisorPidFile = path.join(runDir, "supervisor.pid");
    const supervisorPid = Number(fs.readFileSync(supervisorPidFile, "utf8"));
    supervisorPids.add(supervisorPid);
    await expect
      .poll(() => fs.existsSync(path.join(root, "started.txt")), {
        timeout: 5000,
        interval: 50,
      })
      .toBe(true);
    expect(listAgentRuns(root)[0]?.status).toBe("running");
    expect(fs.existsSync(path.join(root, "finished.txt"))).toBe(false);
    fs.writeFileSync(releaseFile, "release");
    await expect
      .poll(
        () =>
          fs.existsSync(usageFile()) &&
          listAgentRuns(root).length === 1 &&
          listAgentRuns(root)[0]?.status !== "running" &&
          !fs.existsSync(path.join(runDir, "pids.txt")) &&
          !fs.existsSync(supervisorPidFile),
        { timeout: 10_000, interval: 50 },
      )
      .toBe(true);
    supervisorPids.delete(supervisorPid);
    expect(fs.readFileSync(usageFile(), "utf8").match(/```json/g)).toHaveLength(
      1,
    );
    expect(fs.readFileSync(path.join(root, "finished.txt"), "utf8")).toBe(
      "finished\n",
    );
    expect(
      fs.readFileSync(path.join(runDir, "backend-0.log"), "utf8"),
    ).toContain("fake vendor finished");
  });

  it.skipIf(process.platform === "win32")(
    "finalizes background children when their supervisor is stopped",
    async () => {
      const result = invoke(
        [
          "--inline",
          "--model",
          "qwen",
          "--session",
          "budget-test",
          "--no-wait",
          "backend:Interrupted fixture",
        ],
        10_000,
      );
      expect(result.status).toBe(0);
      const runDir = backgroundRunDir();
      const pidFile = path.join(runDir, "supervisor.pid");
      const pid = Number(fs.readFileSync(pidFile, "utf8"));
      supervisorPids.add(pid);
      await expect
        .poll(() => fs.existsSync(path.join(root, "started.txt")), {
          timeout: 5000,
          interval: 50,
        })
        .toBe(true);
      process.kill(pid, "SIGTERM");
      await expect
        .poll(
          () =>
            fs.existsSync(usageFile()) &&
            listAgentRuns(root)[0]?.status === "failed" &&
            !fs.existsSync(pidFile) &&
            !fs.existsSync(path.join(runDir, "pids.txt")),
          { timeout: 5000, interval: 50 },
        )
        .toBe(true);
      supervisorPids.delete(pid);
      expect(fs.existsSync(path.join(root, "finished.txt"))).toBe(false);
    },
  );

  it.skipIf(process.platform === "win32")(
    "finalizes foreground cancellation and kills a child that ignores SIGTERM",
    async () => {
      const child = spawn(
        "bun",
        [
          runner,
          "agent:parallel",
          "--inline",
          "--model",
          "qwen",
          "--session",
          "budget-test",
          "backend:Uncooperative fixture",
        ],
        {
          cwd: root,
          stdio: "ignore",
          env: {
            ...process.env,
            OMA_RUNTIME_VENDOR: "codex",
            OMA_STATE_HOME: path.join(root, "state-home"),
            OMA_PROFILE: "0",
            FAKE_VENDOR_RELEASE_FILE: path.join(root, "unreleased-vendor"),
            FAKE_VENDOR_IGNORE_TERM: "1",
          },
        },
      );
      if (!child.pid) throw new Error("Foreground CLI could not start");
      const pid = child.pid;
      supervisorPids.add(pid);
      const exit = new Promise<number | null>((resolve, reject) => {
        child.once("exit", resolve);
        child.once("error", reject);
      });
      await expect
        .poll(() => fs.existsSync(path.join(root, "started.txt")), {
          timeout: 5000,
          interval: 50,
        })
        .toBe(true);
      process.kill(pid, "SIGTERM");
      await expect
        .poll(
          () =>
            fs.existsSync(usageFile()) &&
            listAgentRuns(root)[0]?.status === "failed" &&
            !fs.existsSync(path.join(backgroundRunDir(), "pids.txt")),
          { timeout: 5000, interval: 50 },
        )
        .toBe(true);
      expect(await exit).toBe(143);
      supervisorPids.delete(pid);
      expect(fs.existsSync(path.join(root, "term-received.txt"))).toBe(true);
      expect(fs.existsSync(path.join(root, "finished.txt"))).toBe(false);
      expect(
        fs.readFileSync(usageFile(), "utf8").match(/```json/g),
      ).toHaveLength(1);
    },
  );
});
