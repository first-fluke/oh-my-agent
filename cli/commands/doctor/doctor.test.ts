// Unit tests for checkCLI in doctor.ts — probe timeout + signal escalation
//
// Covers:
//   1. Quick-exit binary with exit code 0: returns installed: true with parsed version
//   2. Non-zero exit: returns installed: false
//   3. Spawn error (command not found): returns installed: false
//   4. Unresponsive binary: at least one kill signal sent, returns installed: false

import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---- hoisted mock state ----
const spawnState = vi.hoisted(() => {
  type FakeProcHandlers = Map<string, Array<(...args: unknown[]) => void>>;

  interface FakeProc {
    stdout: EventEmitter;
    kill: ReturnType<typeof vi.fn>;
    on: (event: string, cb: (...args: unknown[]) => void) => FakeProc;
    _emit: (event: string, ...args: unknown[]) => void;
    _handlers: FakeProcHandlers;
  }

  const createMockProc = (): FakeProc => {
    const handlers: FakeProcHandlers = new Map();
    const stdout = new EventEmitter();
    const proc: FakeProc = {
      stdout,
      kill: vi.fn(),
      _handlers: handlers,
      _emit(event, ...args) {
        for (const cb of handlers.get(event) ?? []) {
          cb(...args);
        }
      },
      on(event, cb) {
        handlers.set(event, [...(handlers.get(event) ?? []), cb]);
        return proc;
      },
    };
    return proc;
  };

  const lastProcs: FakeProc[] = [];

  return {
    createMockProc,
    lastProcs,
    spawnFn: vi.fn(() => {
      const proc = createMockProc();
      lastProcs.push(proc);
      return proc;
    }),
  };
});

vi.mock("node:child_process", () => ({
  spawn: spawnState.spawnFn,
}));

// ---- dependency mocks needed by doctor.ts imports ----
vi.mock("../../io/tarball.js", () => ({
  downloadAndExtract: vi.fn(async () => ({
    dir: "/tmp/mock",
    cleanup: vi.fn(),
  })),
}));

vi.mock("../../platform/skills-installer.js", () => ({
  installShared: vi.fn(),
  installSkill: vi.fn(() => true),
  getAllSkills: vi.fn(() => []),
  INSTALLED_SKILLS_DIR: ".agents/skills",
}));

vi.mock("../../vendors/index.js", () => ({
  isAntigravityAuthenticated: vi.fn(() => false),
  isClaudeAuthenticated: vi.fn(() => false),
  isCodexAuthenticated: vi.fn(() => false),
  isGeminiAuthenticated: vi.fn(() => false),
  isGrokAuthenticated: vi.fn(() => false),
  isQwenAuthenticated: vi.fn(() => false),
}));

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>();
  return {
    ...original,
    existsSync: vi.fn(() => false),
    readdirSync: vi.fn(() => []),
    readFileSync: vi.fn(() => ""),
  };
});

// ---- import module under test AFTER mocks ----
import { collectDoctorReport } from "./doctor.js";

// Settle all pending procs synchronously
function settleProcs(exitCode: number, stdoutData?: string): void {
  for (const proc of spawnState.lastProcs) {
    if (stdoutData) {
      proc.stdout.emit("data", Buffer.from(stdoutData));
    }
    proc._emit("close", exitCode);
  }
}

function errorProcs(): void {
  for (const proc of spawnState.lastProcs) {
    proc._emit("error", new Error("ENOENT: not found"));
  }
}

describe("checkCLI via collectDoctorReport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    spawnState.lastProcs.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("quick-exit with code 0 returns installed: true with trimmed version", async () => {
    const reportPromise = collectDoctorReport();

    // Let the Promise constructors run so spawn() is called for all 4 CLIs
    await vi.advanceTimersByTimeAsync(0);
    expect(spawnState.lastProcs).toHaveLength(5);

    settleProcs(0, "1.2.3\n");
    await vi.advanceTimersByTimeAsync(0);

    const report = await reportPromise;

    expect(report.clis).toHaveLength(5);
    for (const cli of report.clis) {
      expect(cli.installed).toBe(true);
      expect(cli.version).toBe("1.2.3");
    }
  });

  it("non-zero exit code returns installed: false", async () => {
    const reportPromise = collectDoctorReport();

    await vi.advanceTimersByTimeAsync(0);
    expect(spawnState.lastProcs).toHaveLength(5);

    settleProcs(1);
    await vi.advanceTimersByTimeAsync(0);

    const report = await reportPromise;

    for (const cli of report.clis) {
      expect(cli.installed).toBe(false);
    }
  });

  it("spawn error (ENOENT) returns installed: false", async () => {
    const reportPromise = collectDoctorReport();

    await vi.advanceTimersByTimeAsync(0);
    expect(spawnState.lastProcs).toHaveLength(5);

    errorProcs();
    await vi.advanceTimersByTimeAsync(0);

    const report = await reportPromise;

    for (const cli of report.clis) {
      expect(cli.installed).toBe(false);
    }
  });

  it("unresponsive binary: kill signal sent after timeout, returns installed: false", async () => {
    // Never emit close — simulates a hung process
    const reportPromise = collectDoctorReport();

    await vi.advanceTimersByTimeAsync(0);
    expect(spawnState.lastProcs).toHaveLength(5);

    // Advance past the 1500ms probe timeout + 200ms SIGKILL grace
    await vi.advanceTimersByTimeAsync(1700);

    const report = await reportPromise;

    // Behavioral assertion: all probes timed out → not installed
    for (const cli of report.clis) {
      expect(cli.installed).toBe(false);
    }

    // At least one kill signal was sent on each proc (SIGTERM at minimum)
    for (const proc of spawnState.lastProcs) {
      expect(proc.kill).toHaveBeenCalled();
    }
  });
});
