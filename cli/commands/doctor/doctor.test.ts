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
    execFileSyncFn: vi.fn(),
    lastProcs,
    spawnFn: vi.fn(() => {
      const proc = createMockProc();
      lastProcs.push(proc);
      return proc;
    }),
  };
});

vi.mock("node:child_process", () => ({
  execFileSync: spawnState.execFileSyncFn,
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
  isKiroAuthenticated: vi.fn(() => false),
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
import { existsSync, readdirSync, readFileSync } from "node:fs";
import {
  collectDoctorReport,
  computeEvalCoverage,
  serializeReportAsJson,
} from "./doctor.js";

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
    spawnState.execFileSyncFn.mockReturnValue("");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("quick-exit with code 0 returns installed: true with trimmed version", async () => {
    const reportPromise = collectDoctorReport();

    // Let the Promise constructors run so spawn() is called for all CLIs
    await vi.advanceTimersByTimeAsync(0);
    expect(spawnState.lastProcs).toHaveLength(7);

    settleProcs(0, "1.2.3\n");
    await vi.advanceTimersByTimeAsync(0);

    const report = await reportPromise;

    expect(report.clis).toHaveLength(7);
    for (const cli of report.clis) {
      expect(cli.installed).toBe(true);
      expect(cli.version).toBe("1.2.3");
    }
  });

  it("non-zero exit code returns installed: false", async () => {
    const reportPromise = collectDoctorReport();

    await vi.advanceTimersByTimeAsync(0);
    expect(spawnState.lastProcs).toHaveLength(7);

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
    expect(spawnState.lastProcs).toHaveLength(7);

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
    expect(spawnState.lastProcs).toHaveLength(7);

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
  await vi.advanceTimersByTimeAsync(0);
}

describe("vendor doc OMA block checks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    spawnState.lastProcs.length = 0;
    vi.clearAllMocks();
    spawnState.execFileSyncFn.mockReturnValue("");
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

describe("AgentMemory doctor checks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    spawnState.lastProcs.length = 0;
    vi.clearAllMocks();
    spawnState.execFileSyncFn.mockReturnValue("");
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue("");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports retry queue totals without draining the queue", async () => {
    const retryLines = [
      JSON.stringify({
        sid: "oma-test",
        kind: "decision.made",
        eventId: "evt-1",
        ts: "2026-05-29T00:00:00.000Z",
      }),
      "{bad json",
    ].join("\n");

    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith("observe.jsonl"),
    );
    vi.mocked(readFileSync).mockImplementation((p) =>
      String(p).endsWith("observe.jsonl") ? retryLines : "",
    );

    const reportPromise = collectDoctorReport();
    await vi.advanceTimersByTimeAsync(0);
    await settleInstalledClis([]);

    const report = await reportPromise;

    expect(report.agentMemory.retryQueue).toMatchObject({
      total: 2,
      invalid: 1,
    });
    expect(report.agentMemory.status).toMatchObject({
      provider: "agentmemory",
      reachable: false,
      reason: "endpoint not configured",
    });
    expect(report.agentMemory.issues).toContain(
      "2 queued AgentMemory observe retries",
    );
    expect(report.agentMemory.issues).toContain(
      "1 invalid AgentMemory retry rows",
    );
  });

  it("reports missing AgentMemory binary when a service file is installed", async () => {
    vi.mocked(existsSync).mockImplementation(
      (p) =>
        String(p).endsWith("dev.oma.agentmemory.plist") ||
        String(p).endsWith("oma-agentmemory.service"),
    );

    const reportPromise = collectDoctorReport();
    await vi.advanceTimersByTimeAsync(0);
    await settleInstalledClis([]);

    const report = await reportPromise;

    expect(report.agentMemory.service).toMatchObject({
      supported: true,
      installed: true,
    });
    expect(report.agentMemory.binary).toMatchObject({
      command: "agentmemory",
      available: false,
    });
    expect(report.agentMemory.issues).toContain(
      "AgentMemory binary not found: agentmemory",
    );
  });
});

describe("self-healing doctor check", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    spawnState.lastProcs.length = 0;
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue("");
    spawnState.execFileSyncFn.mockImplementation((_command, args) => {
      const gitArgs = args as string[];
      if (gitArgs.includes("--is-inside-work-tree")) return "true\n";
      if (gitArgs.includes("HEAD")) return "abc123\n";
      if (gitArgs.includes("status")) return "";
      return "";
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds an optional self-healing gate result and counts a blocked gate as one issue", async () => {
    const reportPromise = collectDoctorReport({ healCheckAgent: "debug" });
    await vi.advanceTimersByTimeAsync(0);
    await settleInstalledClis([]);

    const report = await reportPromise;

    expect(report.selfHealing).toMatchObject({
      ok: false,
      reasons: ["no-git-tracked-changes", "missing-skill-output-metadata"],
      skill: {
        agentType: "debug",
        hasStructuredOutputs: false,
      },
    });
    expect(report.totalIssues).toBe(
      report.missingCLIs.length +
        report.missingSkills.length +
        report.agentMemory.issues.length +
        1,
    );
  });
});

describe("state and hook doctor checks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    spawnState.lastProcs.length = 0;
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue("");
    vi.mocked(readdirSync).mockReturnValue([]);
    spawnState.execFileSyncFn.mockImplementation((_command, args) => {
      const gitArgs = args as string[];
      if (gitArgs.includes("rev-parse")) return "";
      if (gitArgs.includes("check-ignore")) {
        throw new Error("not ignored");
      }
      return "";
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports gitignore, corrupt meta, invalid event lines, and missing active state", async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      const path = String(p);
      return (
        path.endsWith(".agents/state") ||
        path.endsWith(".agents/state/sessions") ||
        path.endsWith(".agents/state/sessions/_index.json") ||
        path.endsWith(".agents/state/sessions/sid-1") ||
        path.endsWith(".agents/state/sessions/sid-1/meta.json") ||
        path.endsWith(".agents/state/sessions/sid-1/events.jsonl")
      );
    });
    vi.mocked(readdirSync).mockImplementation((p) => {
      const path = String(p);
      if (path.endsWith(".agents/state/sessions")) {
        return [{ name: "sid-1", isDirectory: () => true }] as never;
      }
      return [] as never;
    });
    vi.mocked(readFileSync).mockImplementation((p) => {
      const path = String(p);
      if (path.endsWith("_index.json")) {
        return JSON.stringify({
          schemaVersion: 1,
          active: { main: "sid-1", tool: "missing-sid" },
        });
      }
      if (path.endsWith("meta.json")) return "{bad json";
      if (path.endsWith("events.jsonl")) {
        return [
          JSON.stringify({
            sid: "sid-1",
            kind: "session.created",
            eventId: "evt-1",
            ts: "2026-06-01T00:00:00.000Z",
          }),
          "{bad json",
        ].join("\n");
      }
      return "";
    });

    const reportPromise = collectDoctorReport();
    await vi.advanceTimersByTimeAsync(0);
    await settleInstalledClis([]);

    const report = await reportPromise;

    expect(report.state.gitignored).toBe(false);
    expect(report.state.index.missingActive).toEqual([
      { category: "tool", sid: "missing-sid" },
    ]);
    expect(report.state.sessions).toEqual([
      { sid: "sid-1", metaOk: false, invalidEventLines: 1 },
    ]);
    expect(report.state.issues).toContain(".agents/state/ is not gitignored");
    expect(report.state.issues).toContain(
      "active state session missing: tool=missing-sid",
    );
    expect(report.state.issues).toContain("state meta is corrupt: sid-1");
    expect(report.state.issues).toContain(
      "state events contain 1 invalid line(s): sid-1",
    );
  });

  it("reports invalid installed prompt hook order", async () => {
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith(".codex/hooks.json"),
    );
    vi.mocked(readFileSync).mockImplementation((p) => {
      if (!String(p).endsWith(".codex/hooks.json")) return "";
      return JSON.stringify({
        hooks: {
          UserPromptSubmit: [
            {
              hooks: [
                { name: "state-boundary" },
                { name: "keyword-detector" },
                { name: "skill-injector" },
              ],
            },
          ],
        },
      });
    });

    const reportPromise = collectDoctorReport();
    await vi.advanceTimersByTimeAsync(0);
    await settleInstalledClis([]);

    const report = await reportPromise;

    expect(report.state.hookOrder).toContainEqual(
      expect.objectContaining({
        vendor: "codex",
        configured: true,
        promptEvent: "UserPromptSubmit",
        order: ["state-boundary", "keyword-detector", "skill-injector"],
        ok: false,
      }),
    );
    expect(report.state.issues).toContain("hook order invalid: codex");
  });

  it("checks antigravity hooks.json named-map order (HOME, best-effort)", async () => {
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith(".gemini/antigravity-cli/hooks.json"),
    );
    vi.mocked(readFileSync).mockImplementation((p) => {
      if (!String(p).endsWith(".gemini/antigravity-cli/hooks.json")) return "";
      return JSON.stringify({
        hooks: {
          "keyword-detector": { event: "PreInvocation" },
          "state-boundary": { event: "PreInvocation" },
          "skill-injector": { event: "PreInvocation" },
        },
      });
    });

    const reportPromise = collectDoctorReport();
    await vi.advanceTimersByTimeAsync(0);
    await settleInstalledClis([]);

    const report = await reportPromise;

    expect(report.state.hookOrder).toContainEqual(
      expect.objectContaining({
        vendor: "antigravity",
        configured: true,
        promptEvent: "PreInvocation",
        order: ["keyword-detector", "state-boundary", "skill-injector"],
        ok: true,
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// computeEvalCoverage unit tests
// ---------------------------------------------------------------------------
//
// These tests use the mocked node:fs from the top-level vi.mock — they drive
// computeEvalCoverage directly with controlled existsSync / readdirSync stubs.

describe("computeEvalCoverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readdirSync).mockReturnValue([]);
  });

  it("returns 0/0 when .agents/eval dir does not exist", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const result = computeEvalCoverage("/fake/cwd", 0);
    expect(result).toEqual({ skillsWithEval: 0, totalSkills: 0 });
  });

  it("returns 0/N when eval root exists but no skill dirs have enough fixtures", () => {
    // evalRoot exists, skill dir "oma-test" has 4 yaml files (< MIN_TASKS=5)
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith(".agents/eval"),
    );
    vi.mocked(readdirSync).mockImplementation((p) => {
      if (String(p).endsWith(".agents/eval")) return ["oma-test"] as never;
      if (String(p).endsWith("oma-test"))
        return [
          "task1.yaml",
          "task2.yaml",
          "task3.yaml",
          "task4.yaml",
        ] as never;
      return [] as never;
    });

    const result = computeEvalCoverage("/fake/cwd", 10);
    expect(result).toEqual({ skillsWithEval: 0, totalSkills: 10 });
  });

  it("counts skills that have >= MIN_TASKS (5) yaml fixtures", () => {
    // 3 skill dirs: "skill-a" has 5 yaml (passes), "skill-b" has 3 (fails),
    // "skill-c" has 5 (passes). Plus "_shared" is underscore-prefixed and skipped.
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith(".agents/eval"),
    );
    vi.mocked(readdirSync).mockImplementation((p) => {
      const path = String(p);
      if (path.endsWith(".agents/eval"))
        return ["_shared", "skill-a", "skill-b", "skill-c"] as never;
      if (path.endsWith("skill-a"))
        return ["t1.yaml", "t2.yaml", "t3.yaml", "t4.yaml", "t5.yaml"] as never;
      if (path.endsWith("skill-b"))
        return ["t1.yaml", "t2.yaml", "t3.yml"] as never;
      if (path.endsWith("skill-c"))
        return [
          "t1.yaml",
          "t2.yaml",
          "t3.yaml",
          "t4.yaml",
          "t5.yaml",
          "t6.yaml",
        ] as never;
      return [] as never;
    });

    const result = computeEvalCoverage("/fake/cwd", 37);
    expect(result).toEqual({ skillsWithEval: 2, totalSkills: 37 });
  });

  it("ignores _rollouts and non-yaml files when counting fixture tasks", () => {
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith(".agents/eval"),
    );
    vi.mocked(readdirSync).mockImplementation((p) => {
      const path = String(p);
      if (path.endsWith(".agents/eval")) return ["skill-x"] as never;
      if (path.endsWith("skill-x"))
        return [
          "_rollouts", // dir — skipped (underscore-prefix)
          "task1.yaml",
          "task2.yaml",
          "task3.yaml",
          "task4.yaml",
          "task5.yaml",
          "README.md", // not yaml — not counted
        ] as never;
      return [] as never;
    });

    const result = computeEvalCoverage("/fake/cwd", 5);
    expect(result).toEqual({ skillsWithEval: 1, totalSkills: 5 });
  });

  it("includes skillEval field in JSON output from serializeReportAsJson", async () => {
    vi.useFakeTimers();
    spawnState.lastProcs.length = 0;
    vi.clearAllMocks();
    spawnState.execFileSyncFn.mockReturnValue("");
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue("");
    vi.mocked(readdirSync).mockReturnValue([]);

    const reportPromise = collectDoctorReport();
    await vi.advanceTimersByTimeAsync(0);
    await settleInstalledClis([]);

    const report = await reportPromise;

    // skillEval is present on report with correct shape
    expect(report.skillEval).toEqual({
      skillsWithEval: 0,
      totalSkills: expect.any(Number),
    });

    // JSON serialization includes skillEval field
    const json = serializeReportAsJson(report);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed.skillEval).toEqual({
      skillsWithEval: 0,
      totalSkills: expect.any(Number),
    });

    vi.useRealTimers();
  });
});
