/**
 * Tests for schedule/command.ts (CLI glue)
 *
 * Drives the registered commander commands with mocked manifest/port/runner
 * modules and asserts the wiring:
 * - schedule:add  -> port.upsert(["oma","schedule:run",id]) + addJob(correct shape)
 * - schedule:add --once -> recurring=false
 * - schedule:remove -> port.remove(label) + removeJob(id)
 * - schedule:list --json -> drift state (synced / missing-in-os / orphan-in-os)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock sibling modules (must be hoisted before the import under test)
// ---------------------------------------------------------------------------

const manifestMock = vi.hoisted(() => ({
  addJob: vi.fn(),
  deriveProjectLabel: vi.fn(() => "proj"),
  generateJobId: vi.fn(() => "sch_testid01234"),
  getEnvFilePath: vi.fn((id: string) => `/fake/schedule/env/${id}`),
  getJobById: vi.fn(),
  readManifest: vi.fn(),
  removeJob: vi.fn(() => true),
  validateCronExpression: vi.fn(),
}));

// cron-nl is NOT mocked — we test integration with the real parser

const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  chmodSync: vi.fn(),
  rmSync: vi.fn(),
}));

const upsertSpy = vi.hoisted(() => vi.fn());
const removeSpy = vi.hoisted(() => vi.fn());
const listLabelsSpy = vi.hoisted(() => vi.fn(async () => [] as string[]));
const runScheduledJobSpy = vi.hoisted(() => vi.fn());

vi.mock("node:fs", () => ({ default: fsMock, ...fsMock }));
vi.mock("./manifest.js", () => manifestMock);
vi.mock("./port.js", () => ({
  selectAdapter: vi.fn(async () => ({
    upsert: upsertSpy,
    remove: removeSpy,
    listLabels: listLabelsSpy,
    isAvailable: async () => true,
  })),
}));
vi.mock("./runner.js", () => ({ runScheduledJob: runScheduledJobSpy }));

import { Command } from "commander";
import { registerSchedule } from "./command.js";

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride(); // throw instead of process.exit on parse errors
  registerSchedule(program);
  return program;
}

async function run(...argv: string[]): Promise<void> {
  await buildProgram().parseAsync(["node", "oma", ...argv]);
}

beforeEach(() => {
  vi.clearAllMocks();
  listLabelsSpy.mockResolvedValue([]);
  process.exitCode = 0;
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

describe("schedule:add", () => {
  it("registers OS job with ['oma','schedule:run',id] and writes manifest", async () => {
    await run(
      "schedule:add",
      "qa-reviewer",
      "review the diff",
      "--cron",
      "0 9 * * *",
    );

    expect(manifestMock.validateCronExpression).toHaveBeenCalledWith(
      "0 9 * * *",
    );
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const spec = upsertSpy.mock.calls[0]?.[0];
    expect(spec?.command).toEqual([
      "oma",
      "schedule",
      "run",
      "sch_testid01234",
    ]);
    expect(spec?.label).toBe("dev.oma.sch_testid01234");

    expect(manifestMock.addJob).toHaveBeenCalledTimes(1);
    const job = manifestMock.addJob.mock.calls[0]?.[0];
    expect(job).toMatchObject({
      id: "sch_testid01234",
      cron: "0 9 * * *",
      agentId: "qa-reviewer",
      prompt: "review the diff",
      promptPath: null,
      projectLabel: "proj",
      recurring: true,
    });
  });

  it("registers OS job before writing manifest (fail-safe ordering)", async () => {
    const order: string[] = [];
    upsertSpy.mockImplementation(async () => {
      order.push("upsert");
    });
    manifestMock.addJob.mockImplementation(() => {
      order.push("addJob");
    });

    await run("schedule:add", "a", "p", "--cron", "* * * * *");

    expect(order).toEqual(["upsert", "addJob"]);
  });

  it("--once marks the job non-recurring", async () => {
    await run("schedule:add", "a", "p", "--cron", "0 0 * * *", "--once");
    expect(manifestMock.addJob.mock.calls[0]?.[0]?.recurring).toBe(false);
  });

  it("-m sets the vendor override", async () => {
    await run("schedule:add", "a", "p", "--cron", "0 0 * * *", "-m", "codex");
    expect(manifestMock.addJob.mock.calls[0]?.[0]?.vendor).toBe("codex");
  });

  it("rejects an unknown --model vendor", async () => {
    await run("schedule:add", "a", "p", "--cron", "0 0 * * *", "-m", "foobar");
    expect(process.exitCode).toBe(1);
    expect(manifestMock.addJob).not.toHaveBeenCalled();
  });

  it("rejects a negative --max-age-days", async () => {
    await run(
      "schedule:add",
      "a",
      "p",
      "--cron",
      "0 0 * * *",
      "--max-age-days",
      "-3",
    );
    expect(process.exitCode).toBe(1);
    expect(manifestMock.addJob).not.toHaveBeenCalled();
  });
});

describe("schedule:remove", () => {
  it("removes from OS scheduler and manifest", async () => {
    manifestMock.getJobById.mockReturnValue({
      id: "sch_x",
      osJobLabel: "dev.oma.sch_x",
    });

    await run("schedule:remove", "sch_x");

    expect(removeSpy).toHaveBeenCalledWith("dev.oma.sch_x");
    expect(manifestMock.removeJob).toHaveBeenCalledWith("sch_x");
  });

  it("errors when the job is not in the manifest", async () => {
    manifestMock.getJobById.mockReturnValue(undefined);
    await run("schedule:remove", "missing");
    expect(process.exitCode).toBe(1);
    expect(removeSpy).not.toHaveBeenCalled();
    expect(manifestMock.removeJob).not.toHaveBeenCalled();
  });
});

describe("schedule:list --json", () => {
  const job = {
    id: "sch_a",
    cron: "0 9 * * *",
    agentId: "qa",
    vendor: null,
    projectLabel: "proj",
    workspace: "/ws",
    recurring: true,
    lastFiredAt: null,
    osBackend: "launchd",
    osJobLabel: "dev.oma.sch_a",
  };

  it("marks a job present in OS as synced", async () => {
    manifestMock.readManifest.mockReturnValue({ version: 1, jobs: [job] });
    listLabelsSpy.mockResolvedValue(["dev.oma.sch_a"]);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run("schedule:list", "--json");

    const out = JSON.parse(logSpy.mock.calls.map((c) => c[0]).join("\n"));
    expect(out.jobs[0].drift).toBe("synced");
    expect(out.orphanOsLabels).toEqual([]);
  });

  it("marks a manifest job absent from OS as missing-in-os", async () => {
    manifestMock.readManifest.mockReturnValue({ version: 1, jobs: [job] });
    listLabelsSpy.mockResolvedValue([]);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run("schedule:list", "--json");

    const out = JSON.parse(logSpy.mock.calls.map((c) => c[0]).join("\n"));
    expect(out.jobs[0].drift).toBe("missing-in-os");
  });

  it("reports OS labels absent from the manifest as orphans", async () => {
    manifestMock.readManifest.mockReturnValue({ version: 1, jobs: [] });
    listLabelsSpy.mockResolvedValue(["dev.oma.orphan"]);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run("schedule:list", "--json");

    const out = JSON.parse(logSpy.mock.calls.map((c) => c[0]).join("\n"));
    expect(out.orphanOsLabels).toEqual(["dev.oma.orphan"]);
  });
});

describe("schedule:run", () => {
  it("delegates to runScheduledJob with the id", async () => {
    await run("schedule:run", "sch_z");
    expect(runScheduledJobSpy).toHaveBeenCalledWith("sch_z");
  });
});

describe("schedule:add --every", () => {
  it('--every "5m" produces cron */5 * * * * into addJob', async () => {
    await run(
      "schedule:add",
      "qa-reviewer",
      "review the diff",
      "--every",
      "5m",
    );

    expect(manifestMock.addJob).toHaveBeenCalledTimes(1);
    const job = manifestMock.addJob.mock.calls[0]?.[0];
    expect(job?.cron).toBe("*/5 * * * *");
    // validateCronExpression should NOT be called when --every is used
    expect(manifestMock.validateCronExpression).not.toHaveBeenCalled();
  });

  it('--every "every 2 hours" produces cron 0 */2 * * * into addJob', async () => {
    await run("schedule:add", "agent", "prompt", "--every", "every 2 hours");

    const job = manifestMock.addJob.mock.calls[0]?.[0];
    expect(job?.cron).toBe("0 */2 * * *");
  });

  it("--cron and --every together causes an error", async () => {
    await run("schedule:add", "a", "p", "--cron", "0 9 * * *", "--every", "5m");
    expect(process.exitCode).toBe(1);
    expect(manifestMock.addJob).not.toHaveBeenCalled();
  });

  it("neither --cron nor --every causes an error", async () => {
    await run("schedule:add", "a", "p");
    expect(process.exitCode).toBe(1);
    expect(manifestMock.addJob).not.toHaveBeenCalled();
  });

  it("--every with a rounding case prints the rounding note", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    // 7m is not a clean divisor of 60 — will be rounded
    await run("schedule:add", "a", "p", "--every", "7m");

    // The rounding note should have been logged
    const calls = logSpy.mock.calls.map((c) => String(c[0]));
    const hasNote = calls.some(
      (msg) => msg.startsWith("Note:") && msg.includes("7"),
    );
    expect(hasNote).toBe(true);
    // Job should still be registered with the rounded cron
    expect(manifestMock.addJob).toHaveBeenCalledTimes(1);
  });
});

describe("schedule:add --env", () => {
  afterEach(() => {
    process.env.SCHED_TEST_FOO = undefined;
    delete process.env.SCHED_TEST_FOO;
  });

  it("captures ONLY named, set env vars to a 0600 file and sets capturedEnvRef", async () => {
    process.env.SCHED_TEST_FOO = "foo-value";

    await run(
      "schedule:add",
      "agent",
      "prompt",
      "--cron",
      "0 9 * * *",
      "--env",
      "SCHED_TEST_FOO,SCHED_TEST_UNSET",
    );

    // env file written with mode 0600, containing ONLY the set var
    expect(fsMock.writeFileSync).toHaveBeenCalledTimes(1);
    const [, content, opts] = fsMock.writeFileSync.mock.calls[0] as [
      string,
      string,
      { mode: number },
    ];
    expect(opts.mode).toBe(0o600);
    const parsed = JSON.parse(content);
    expect(parsed).toEqual({ SCHED_TEST_FOO: "foo-value" });
    expect(parsed).not.toHaveProperty("SCHED_TEST_UNSET");

    // job carries the relative capturedEnvRef
    const job = manifestMock.addJob.mock.calls[0]?.[0];
    expect(job?.capturedEnvRef).toBe("env/sch_testid01234");
  });

  it("does not write an env file when no named var is set", async () => {
    await run(
      "schedule:add",
      "agent",
      "prompt",
      "--cron",
      "0 9 * * *",
      "--env",
      "SCHED_TEST_UNSET",
    );

    expect(fsMock.writeFileSync).not.toHaveBeenCalled();
    const job = manifestMock.addJob.mock.calls[0]?.[0];
    expect(job?.capturedEnvRef).toBeNull();
  });
});
