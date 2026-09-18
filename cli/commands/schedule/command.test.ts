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
  updateJob: vi.fn(),
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
const readCommandSpy = vi.hoisted(() =>
  vi.fn(async (_label: string) => null as string[] | null),
);
const runScheduledJobSpy = vi.hoisted(() => vi.fn());

vi.mock("node:fs", () => ({ default: fsMock, ...fsMock }));
vi.mock("./manifest.js", () => manifestMock);
vi.mock("./port.js", async (importOriginal) => ({
  // Keep the pure helpers (expectedScheduleCommand / isStaleScheduleCommand);
  // only the adapter selection is faked.
  ...(await importOriginal<typeof import("./port.js")>()),
  selectAdapter: vi.fn(async () => ({
    upsert: upsertSpy,
    remove: removeSpy,
    listLabels: listLabelsSpy,
    readCommand: readCommandSpy,
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
  readCommandSpy.mockResolvedValue(null);
  process.exitCode = 0;
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
  delete process.env.SCHED_TEST_FOO;
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

describe("schedule:builtin-evolution-add", () => {
  it("updates the existing project job and repairs its OS registration", async () => {
    manifestMock.readManifest.mockReturnValue({
      jobs: [
        {
          id: "sch_evolution",
          builtin: "harness-evolution",
          workspace: process.cwd(),
          osJobLabel: "dev.oma.sch_evolution",
        },
      ],
    });
    await run(
      "schedule:builtin-evolution-add",
      process.cwd(),
      "--cron",
      "15 4 * * *",
    );
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sch_evolution",
        cron: "15 4 * * *",
        command: ["oma", "schedule", "run", "sch_evolution"],
      }),
    );
    expect(manifestMock.updateJob).toHaveBeenCalledWith(
      "sch_evolution",
      expect.objectContaining({ cron: "15 4 * * *" }),
    );
    expect(manifestMock.addJob).not.toHaveBeenCalled();
  });

  it("registers the running source entrypoint for an OS job", async () => {
    manifestMock.readManifest.mockReturnValue({ jobs: [] });
    const prior = process.argv[1];
    process.argv[1] = "/tmp/cli.ts";
    try {
      await run(
        "schedule:builtin-evolution-add",
        process.cwd(),
        "--cron",
        "0 3 * * *",
      );
    } finally {
      if (prior === undefined) delete process.argv[1];
      else process.argv[1] = prior;
    }
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        command: [
          process.execPath,
          "/tmp/cli.ts",
          "schedule",
          "run",
          "sch_testid01234",
        ],
      }),
    );
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

  it("marks a registration with a pre-rename command as stale", async () => {
    manifestMock.readManifest.mockReturnValue({ version: 1, jobs: [job] });
    listLabelsSpy.mockResolvedValue(["dev.oma.sch_a"]);
    readCommandSpy.mockResolvedValue(["/abs/oma", "schedule:run", "sch_a"]);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run("schedule:list", "--json");

    const out = JSON.parse(logSpy.mock.calls.map((c) => c[0]).join("\n"));
    expect(out.jobs[0].drift).toBe("stale");
  });

  it("keeps a registration with the current command synced regardless of binary path", async () => {
    manifestMock.readManifest.mockReturnValue({ version: 1, jobs: [job] });
    listLabelsSpy.mockResolvedValue(["dev.oma.sch_a"]);
    readCommandSpy.mockResolvedValue([
      "/other/machine/oma",
      "schedule",
      "run",
      "sch_a",
    ]);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run("schedule:list", "--json");

    const out = JSON.parse(logSpy.mock.calls.map((c) => c[0]).join("\n"));
    expect(out.jobs[0].drift).toBe("synced");
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

  it("refuses a rounded interval before registering jobs or capturing secrets", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    process.env.SCHED_TEST_FOO = "secret";
    await run(
      "schedule:add",
      "a",
      "p",
      "--every",
      "7m",
      "--env",
      "SCHED_TEST_FOO",
    );

    const calls = logSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((msg) => msg.includes("Requested every 7m"))).toBe(true);
    expect(process.exitCode).toBe(1);
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(manifestMock.addJob).not.toHaveBeenCalled();
    expect(fsMock.writeFileSync).not.toHaveBeenCalled();
  });

  it("previews a rounded interval without OS, manifest, or secret side effects", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    process.env.SCHED_TEST_FOO = "secret";
    await run(
      "schedule:add",
      "a",
      "p",
      "--every",
      "7m",
      "--env",
      "SCHED_TEST_FOO",
      "--dry-run",
    );

    expect(process.exitCode).toBe(0);
    expect(logSpy.mock.calls.map((c) => String(c[0])).join("\n")).toContain(
      "Preview: requested interval resolves to */6 * * * *",
    );
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(manifestMock.addJob).not.toHaveBeenCalled();
    expect(fsMock.writeFileSync).not.toHaveBeenCalled();
  });

  it("registers a rounded interval only after explicit acceptance", async () => {
    await run("schedule:add", "a", "p", "--every", "7m", "--accept-rounded");

    expect(process.exitCode).toBe(0);
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(manifestMock.addJob.mock.calls[0]?.[0]?.cron).toBe("*/6 * * * *");
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

describe("schedule:sync", () => {
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

  it("rewrites a stale registration with the canonical command", async () => {
    manifestMock.readManifest.mockReturnValue({ version: 1, jobs: [job] });
    listLabelsSpy.mockResolvedValue(["dev.oma.sch_a"]);
    readCommandSpy.mockResolvedValue(["/abs/oma", "schedule:run", "sch_a"]);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await run("schedule:sync");

    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy.mock.calls[0]?.[0]).toMatchObject({
      id: "sch_a",
      label: "dev.oma.sch_a",
      command: ["oma", "schedule", "run", "sch_a"],
    });
    const logged = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("resynced (stale command): sch_a");
    expect(logged).toContain("0 synced, 1 resynced, 0 pruned");
  });

  it("leaves an up-to-date registration alone", async () => {
    manifestMock.readManifest.mockReturnValue({ version: 1, jobs: [job] });
    listLabelsSpy.mockResolvedValue(["dev.oma.sch_a"]);
    readCommandSpy.mockResolvedValue(["/abs/oma", "schedule", "run", "sch_a"]);

    await run("schedule:sync");

    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("does not touch the OS scheduler when the manifest is empty", async () => {
    manifestMock.readManifest.mockReturnValue({ version: 1, jobs: [] });

    await run("schedule:sync");

    expect(listLabelsSpy).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});
