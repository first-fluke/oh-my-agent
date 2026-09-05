import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  testTask,
  writeTestPlan,
} from "../../state/__fixtures__/task-contract.js";
import {
  readAgentRun,
  resultEvidenceValid,
} from "../../state/agent-results.js";

const cli = resolve(import.meta.dirname, "../../cli.ts");
describe("agent result CLI lifecycle", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0))
      rmSync(root, { recursive: true, force: true });
  });

  it("executes graph-selected tests and matches them to declared acceptance checks", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-graph-check-cli-"));
    roots.push(root);
    const command = [
      "bun",
      "run",
      "--cwd",
      "cli",
      "test",
      "acceptance.test.ts",
    ];
    for (const [file, content] of Object.entries({
      ".agents/results/plan-s1.json": JSON.stringify({
        tasks: [
          testTask("T1", {
            required_checks: [
              { id: "graph-acceptance", criteria: ["AC1"], command, cwd: "." },
            ],
          }),
        ],
      }),
      ".agents/skills/fixture/SKILL.md": "Check: `cli/acceptance.test.ts`",
      "cli/package.json": JSON.stringify({ scripts: { test: "bun test" } }),
      "cli/acceptance.test.ts":
        'import {test,expect} from "bun:test"; import {readFileSync} from "node:fs"; test("acceptance",()=>expect(readFileSync("../source.txt","utf8")).toBe("ok"));',
      "source.txt": "ok",
    })) {
      mkdirSync(join(root, file, ".."), { recursive: true });
      writeFileSync(join(root, file), content);
    }
    const call = (...args: string[]) =>
      spawnSync("bun", [cli, ...args], {
        cwd: root,
        encoding: "utf8",
        timeout: 20_000,
      });
    const begun = call(
      "agent:begin",
      "qa-reviewer",
      "T1",
      "s1",
      "--root",
      root,
    );
    expect(begun.status, begun.stderr).toBe(0);
    const { runId } = JSON.parse(begun.stdout);
    const checked = call(
      "agent:verify",
      runId,
      "--root",
      root,
      "--affected",
      ".agents/skills/fixture/SKILL.md",
    );
    expect(checked.status, checked.stderr).toBe(0);
    expect(readAgentRun(root, runId).checks[0]).toMatchObject({
      checkId: "graph-acceptance",
      command,
      exitCode: 0,
    });
    const required = call("agent:verify", runId, "--root", root, "--required");
    expect(required.status, required.stderr).toBe(0);
  }, 60_000);

  it("resumes a pending task through the real CLI dispatch and receipt lifecycle", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-resume-cli-"));
    roots.push(root);
    writeTestPlan(root);
    const fixture = join(root, "vendor-fixture.cjs");
    writeFileSync(
      fixture,
      `
const fs=require("node:fs"), path=require("node:path"), cp=require("node:child_process");
const dir=path.join(process.cwd(),".agents/state/agent-runs");
const run=fs.readdirSync(dir).filter(f=>f.endsWith(".json")&&!f.endsWith(".claim.json")&&f!=="_sequence.json").map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"))).find(r=>r.status==="running");
if(!run) process.exit(2);
const check=cp.spawnSync("bun",[${JSON.stringify(cli)},"agent:verify",run.runId,"--required","--root",process.cwd()],{stdio:"inherit"});
if(check.status!==0) process.exit(3);
fs.writeFileSync(path.join(dir,run.runId+".claim.json"),JSON.stringify({status:"completed",changedFiles:[],unresolved:[],artifacts:[]}));
`,
    );
    writeFileSync(
      join(root, ".agents/oma-config.yaml"),
      JSON.stringify({ default_cli: "qwen", model_preset: "fixture" }),
    );
    const configDir = join(root, ".agents/skills/oma-orchestration/config");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "cli-config.yaml"),
      JSON.stringify({
        vendors: {
          qwen: {
            command: process.execPath,
            subcommand: fixture,
            prompt_flag: "-p",
          },
        },
      }),
    );
    // Keep real model CLIs unreachable even if fixture configuration regresses.
    const bin = join(root, "fixture-bin");
    mkdirSync(bin);
    const bun = spawnSync("which", ["bun"], { encoding: "utf8" }).stdout.trim();
    symlinkSync(bun, join(bin, "bun"));
    const result = spawnSync(
      "bun",
      [cli, "agent:resume", "s1", "--root", root],
      {
        cwd: root,
        encoding: "utf8",
        timeout: 30_000,
        env: { ...process.env, PATH: bin, OMA_RUNTIME_VENDOR: "codex" },
      },
    );
    expect(result.status, result.stderr.slice(-2000)).toBe(0);
    const dry = spawnSync(
      "bun",
      [cli, "agent:resume", "s1", "--root", root, "--dry-run"],
      { cwd: root, encoding: "utf8", timeout: 20_000 },
    );
    expect(dry.status, dry.stderr).toBe(0);
    expect(JSON.parse(dry.stdout).tasks[0]).toMatchObject({
      taskId: "T1",
      status: "reused",
    });
  }, 60_000);

  it("records real checks through Commander and invalidates completion after source edits", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-result-cli-"));
    roots.push(root);
    writeTestPlan(root);
    const call = (...args: string[]) =>
      spawnSync("bun", [cli, ...args], {
        cwd: root,
        encoding: "utf8",
        timeout: 20_000,
      });
    const begin = call(
      "agent:begin",
      "qa-reviewer",
      "T1",
      "s1",
      "--root",
      root,
    );
    expect(begin.status, begin.stderr).toBe(0);
    const { runId } = JSON.parse(begin.stdout);
    const verified = call(
      "agent:verify",
      runId,
      "--root",
      root,
      "--",
      process.execPath,
      "-e",
      "process.exit(0)",
    );
    expect(verified.status, verified.stderr).toBe(0);
    const file = join(root, ".agents/state/claim.json");
    writeFileSync(
      file,
      JSON.stringify({
        status: "completed",
        changedFiles: [],
        unresolved: [],
        artifacts: [],
      }),
    );
    const finished = call("agent:finish", runId, file, "--root", root);
    expect(finished.status, finished.stderr).toBe(0);
    expect(resultEvidenceValid(readAgentRun(root, runId))).toBe(true);
    writeFileSync(join(root, "changed.ts"), "new behavior");
    expect(resultEvidenceValid(readAgentRun(root, runId))).toBe(false);
  }, 60_000);
});
