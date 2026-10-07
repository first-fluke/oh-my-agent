import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ root: "", reclaim: vi.fn() }));
vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return { ...actual, tmpdir: () => state.root || actual.tmpdir() };
});
vi.mock("../../utils/fs-utils.js", () => ({
  resolveProjectRoot: () => state.root,
}));
vi.mock("../../io/serena-daemon.js", () => ({
  readRegistry: () => ({}),
  reclaimIdleDaemons: state.reclaim,
}));
vi.mock("../../io/serena-reaper.js", () => ({
  discoverSerenaRoots: () => [],
  selectOrphanedSerenaRoots: () => [],
}));
vi.mock("../../io/serena-reaper-runtime.js", () => ({ runPs: () => "" }));
vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  execFileSync: vi.fn(),
}));

import { cleanup } from "./run.js";

beforeEach(async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  state.root = fs.mkdtempSync(join(actual.tmpdir(), "oma-cleanup-safety-"));
  state.reclaim.mockClear();
  vi.mocked(childProcess.execFileSync).mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(state.root, { recursive: true, force: true });
  state.root = "";
});

describe("cleanup safety", () => {
  it("does not reclaim daemons or modify files in dry-run mode", async () => {
    const file = join(os.tmpdir(), "subagent-stale.pid");
    fs.writeFileSync(file, "12345\n");
    const kill = vi.spyOn(process, "kill").mockImplementation(() => {
      throw Object.assign(new Error("gone"), { code: "ESRCH" });
    });
    await cleanup(true, true, true);
    expect(state.reclaim).not.toHaveBeenCalled();
    expect(kill.mock.calls.every(([, signal]) => signal === 0)).toBe(true);
    expect(fs.existsSync(file)).toBe(true);
  });

  it("preserves live legacy PIDs and parallel PID lists", async () => {
    const file = join(os.tmpdir(), "subagent-another-project.pid");
    fs.writeFileSync(file, "12345\n");
    const log = join(
      os.tmpdir(),
      "subagent-another-project-failover-1.stderr.log",
    );
    fs.writeFileSync(log, "still writing\n");
    const parallel = join(state.root, ".agents/results/parallel-active");
    fs.mkdirSync(parallel, { recursive: true });
    const list = join(parallel, "pids.txt");
    fs.writeFileSync(list, "12345:backend\n");
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);
    await cleanup(false, true, true);
    expect(kill.mock.calls.every(([, signal]) => signal === 0)).toBe(true);
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.existsSync(list)).toBe(true);
    expect(fs.existsSync(log)).toBe(true);
  });

  it.each([false, true])(
    "reaps a verified orphan and protects a reused PID (reused=%s)",
    async (reused) => {
      const pid = 12345;
      const runner = 23456;
      const file = join(os.tmpdir(), "subagent-owned.pid");
      const started = "Mon Oct 5 10:11:12 2026";
      fs.writeFileSync(file, String(pid));
      fs.writeFileSync(
        `${file}.json`,
        JSON.stringify({
          schemaVersion: 1,
          root: fs.realpathSync(state.root),
          runnerPid: runner,
          process: { pid, ppid: runner, started, command: "codex exec task" },
        }),
      );
      let terminated = false;
      vi.mocked(childProcess.execFileSync).mockImplementation(
        () =>
          `${pid} 1 ${terminated && reused ? "Mon Oct 5 10:12:13 2026" : started} codex exec task\n`,
      );
      const kill = vi
        .spyOn(process, "kill")
        .mockImplementation((target, signal) => {
          if (target === runner || (target === pid && terminated && !reused)) {
            throw Object.assign(new Error("gone"), { code: "ESRCH" });
          }
          if (signal === "SIGTERM") terminated = true;
          return true;
        });
      await cleanup(false, true, true);
      expect(kill).toHaveBeenCalledWith(pid, "SIGTERM");
      expect(kill).not.toHaveBeenCalledWith(pid, "SIGKILL");
      expect(fs.existsSync(file)).toBe(reused);
      expect(fs.existsSync(`${file}.json`)).toBe(reused);
    },
  );
});
