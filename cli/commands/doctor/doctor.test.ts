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

const ptyState = vi.hoisted(() => {
  type PtyProc = {
    pid: number;
    onData: ReturnType<typeof vi.fn>;
    onExit: ReturnType<typeof vi.fn>;
    kill: ReturnType<typeof vi.fn>;
    _emitData: (data: string) => void;
    _emitExit: (exitCode: number | null) => void;
  };

  const lastPtyProcs: PtyProc[] = [];
  const createPtyProc = (): PtyProc => {
    let dataHandler: ((data: string) => void) | undefined;
    let exitHandler: ((event: { exitCode: number | null }) => void) | undefined;
    return {
      pid: 12345,
      onData: vi.fn((handler: (data: string) => void) => {
        dataHandler = handler;
      }),
      onExit: vi.fn((handler: (event: { exitCode: number | null }) => void) => {
        exitHandler = handler;
      }),
      kill: vi.fn(),
      _emitData: (data: string) => dataHandler?.(data),
      _emitExit: (exitCode: number | null) => exitHandler?.({ exitCode }),
    };
  };

  return {
    lastPtyProcs,
    ptySpawnFn: vi.fn(() => {
      const proc = createPtyProc();
      lastPtyProcs.push(proc);
      return proc;
    }),
  };
});

vi.mock("node:child_process", () => ({
  spawn: spawnState.spawnFn,
  execFileSync: vi.fn(),
}));

vi.mock("node-pty", () => ({
  spawn: ptyState.ptySpawnFn,
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
import { existsSync, readFileSync } from "node:fs";
import { collectDoctorReport } from "./doctor.js";

// Settle all pending procs synchronously
function settleProcs(exitCode: number, stdoutData?: string): void {
  for (const proc of spawnState.lastProcs) {
    if (stdoutData) {
      proc.stdout.emit("data", Buffer.from(stdoutData));
    }
    proc._emit("close", exitCode);
  }
  for (const proc of ptyState.lastPtyProcs) {
    if (stdoutData) proc._emitData(stdoutData);
    proc._emitExit(exitCode);
  }
}

function errorProcs(): void {
  for (const proc of spawnState.lastProcs) {
    proc._emit("error", new Error("ENOENT: not found"));
  }
  for (const proc of ptyState.lastPtyProcs) {
    proc._emitExit(1);
  }
}

describe("checkCLI via collectDoctorReport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    spawnState.lastProcs.length = 0;
    ptyState.lastPtyProcs.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("quick-exit with code 0 returns installed: true with trimmed version", async () => {
    const reportPromise = collectDoctorReport();

    // Let the Promise constructors run so spawn() is called for all CLIs
    await vi.advanceTimersByTimeAsync(0);
    expect(spawnState.lastProcs).toHaveLength(5);
    expect(ptyState.lastPtyProcs).toHaveLength(1);

    settleProcs(0, "1.2.3\n");
    await vi.advanceTimersByTimeAsync(0);

    const report = await reportPromise;

    expect(report.clis).toHaveLength(6);
    for (const cli of report.clis) {
      expect(cli.installed).toBe(true);
      expect(cli.version).toBe("1.2.3");
    }
  });

  it("non-zero exit code returns installed: false", async () => {
    const reportPromise = collectDoctorReport();

    await vi.advanceTimersByTimeAsync(0);
    expect(spawnState.lastProcs).toHaveLength(5);
    expect(ptyState.lastPtyProcs).toHaveLength(1);

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
    expect(ptyState.lastPtyProcs).toHaveLength(1);

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
    expect(ptyState.lastPtyProcs).toHaveLength(1);

    // Advance past the 5000ms probe timeout + 200ms SIGKILL grace
    await vi.advanceTimersByTimeAsync(5200);

    const report = await reportPromise;

    // Behavioral assertion: all probes timed out → not installed
    for (const cli of report.clis) {
      expect(cli.installed).toBe(false);
    }

    // At least one kill signal was sent on each proc (SIGTERM at minimum)
    for (const proc of spawnState.lastProcs) {
      expect(proc.kill).toHaveBeenCalled();
    }
    for (const proc of ptyState.lastPtyProcs) {
      expect(proc.kill).toHaveBeenCalled();
    }
  }, 10_000);
});

async function settleInstalledClis(
  installedCommands: string[],
  version = "1.2.3",
): Promise<void> {
  for (let i = 0; i < spawnState.lastProcs.length; i++) {
    const proc = spawnState.lastProcs[i];
    if (!proc) continue;
    const call = spawnState.spawnFn.mock.calls[i] as
      | [string, ...unknown[]]
      | undefined;
    const cmd = call?.[0];
    if (cmd && installedCommands.includes(cmd)) {
      proc.stdout.emit("data", Buffer.from(`${version}\n`));
      proc._emit("close", 0);
    } else {
      proc._emit("close", 1);
    }
  }
  const agyInstalled =
    installedCommands.includes("agy") ||
    installedCommands.includes("antigravity");
  for (const proc of ptyState.lastPtyProcs) {
    if (agyInstalled) {
      proc._emitData(`${version}\n`);
      proc._emitExit(0);
    } else {
      proc._emitExit(1);
    }
  }
  await vi.advanceTimersByTimeAsync(0);
}

describe("vendor doc OMA block checks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    spawnState.lastProcs.length = 0;
    ptyState.lastPtyProcs.length = 0;
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue("");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires AGENTS.md when codex is installed and counts missing OMA block as issue", async () => {
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith("AGENTS.md"),
    );
    vi.mocked(readFileSync).mockImplementation((p) =>
      String(p).endsWith("AGENTS.md") ? "# user notes\n" : "",
    );

    const reportPromise = collectDoctorReport();
    await vi.advanceTimersByTimeAsync(0);
    await settleInstalledClis(["codex"]);

    const report = await reportPromise;
    const agents = report.vendorDocs.find((d) => d.fileName === "AGENTS.md");

    expect(agents).toEqual({
      fileName: "AGENTS.md",
      required: true,
      hasOmaBlock: false,
    });
    expect(report.totalIssues).toBeGreaterThanOrEqual(1);
  });

  it("requires GEMINI.md when gemini is installed", async () => {
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith("GEMINI.md"),
    );
    vi.mocked(readFileSync).mockImplementation((p) =>
      String(p).endsWith("GEMINI.md")
        ? "<!-- OMA:START -->\n<!-- OMA:END -->\n"
        : "",
    );

    const reportPromise = collectDoctorReport();
    await vi.advanceTimersByTimeAsync(0);
    await settleInstalledClis(["gemini"]);

    const report = await reportPromise;
    const gemini = report.vendorDocs.find((d) => d.fileName === "GEMINI.md");

    expect(gemini).toEqual({
      fileName: "GEMINI.md",
      required: true,
      hasOmaBlock: true,
    });
  });

  it("does not require AGENTS.md when only claude is installed", async () => {
    const reportPromise = collectDoctorReport();
    await vi.advanceTimersByTimeAsync(0);
    await settleInstalledClis(["claude"]);

    const report = await reportPromise;
    const agents = report.vendorDocs.find((d) => d.fileName === "AGENTS.md");

    expect(agents?.required).toBe(false);
  });
});
