/**
 * Real-process coverage for the persistent-mode stop gate: actual `bun run`
 * gate scripts that fork a worker (as test runners do), real process groups,
 * real kills. The mocked unit tests cannot show what matters here — that a
 * slow gate is stopped by the hook itself, deterministically recorded, and
 * leaves no orphaned worker behind.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { run } = await import("../../.agents/hooks/core/persistent-mode.ts");

// The gate forks a long-lived worker that inherits stdout, writes its pid,
// then: `pass` exits 0 at once, `straggler` exits 0 but leaves the worker
// holding the pipe, `hang` never finishes.
const GATE_SCRIPT = `
const { spawn } = require("node:child_process");
const { writeFileSync } = require("node:fs");
const mode = process.argv[2];
if (mode === "pass") { console.log("typecheck ok"); process.exit(0); }
const worker = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "inherit" });
writeFileSync("worker.pid", String(worker.pid));
console.log("gate started (" + mode + ")");
if (mode === "straggler") process.exit(0);
setInterval(() => {}, 1000);
`;

const SID = "gate-sid";

let projectDir: string;
let statePath: string;

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function writeState(gate: string): void {
  writeFileSync(
    statePath,
    JSON.stringify({
      workflow: "ralph",
      sessionId: SID,
      activatedAt: new Date().toISOString(),
      reinforcementCount: 0,
      goal: { completion: { gate } },
    }),
  );
}

function workerPid(): number {
  const pidFile = join(projectDir, "worker.pid");
  return existsSync(pidFile) ? Number(readFileSync(pidFile, "utf-8")) : 0;
}

function stop() {
  return run(
    { kind: "stop", cwd: projectDir },
    { vendor: "claude", cwd: projectDir, sid: SID },
  );
}

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), "oma-gate-"));
  mkdirSync(join(projectDir, ".agents", "state"), { recursive: true });
  statePath = join(projectDir, ".agents", "state", `ralph-state-${SID}.json`);
  writeFileSync(join(projectDir, "gate.cjs"), GATE_SCRIPT);
  writeFileSync(
    join(projectDir, "package.json"),
    JSON.stringify({
      scripts: {
        typecheck: "node gate.cjs pass",
        lint: "node gate.cjs straggler",
        test: "node gate.cjs hang",
      },
    }),
  );
  // bun.lock selects `bun run <gate>`; the gate never reads it.
  writeFileSync(join(projectDir, "bun.lock"), "");
  vi.stubEnv("OMA_STATE_HOME", join(projectDir, ".oma-state"));
});

afterEach(() => {
  const pid = workerPid();
  if (pid && isAlive(pid)) process.kill(pid, "SIGKILL");
  vi.unstubAllEnvs();
  rmSync(projectDir, { recursive: true, force: true });
});

// Process groups and `kill(-pgid)` are POSIX; Windows uses taskkill /T.
describe.skipIf(process.platform === "win32")(
  "persistent-mode stop gate (real processes)",
  () => {
    it("stops a slow gate itself, records the timeout, and leaves no orphaned worker", async () => {
      vi.stubEnv("OMA_GATE_TIMEOUT_MS", "1500");
      writeState("test");

      const started = Date.now();
      const result = await stop();
      const elapsed = Date.now() - started;

      // Bounded by the gate budget — not by a vendor kill much later.
      expect(elapsed).toBeLessThan(6_000);
      expect(result?.type).toBe("block");
      const reason = (result as { reason: string }).reason;
      expect(reason).toContain("timed out after 1.5s");
      expect(reason).toContain("Stop-hook gate budget");
      expect(reason).toContain("gate started (hang)");
      expect(JSON.parse(readFileSync(statePath, "utf-8"))).toMatchObject({
        reinforcementCount: 1,
      });

      const pid = workerPid();
      expect(pid).toBeGreaterThan(0);
      await expect.poll(() => isAlive(pid), { timeout: 3_000 }).toBe(false);
    }, 15_000);

    it("passes on the leader's exit code even when a worker keeps stdout open, then reaps it", async () => {
      writeState("lint");

      const started = Date.now();
      const result = await stop();

      // Settles on the leader's exit — not on the default 25s budget.
      expect(Date.now() - started).toBeLessThan(6_000);
      expect(result).toBeNull();
      expect(existsSync(statePath)).toBe(false);

      const pid = workerPid();
      expect(pid).toBeGreaterThan(0);
      await expect.poll(() => isAlive(pid), { timeout: 3_000 }).toBe(false);
    }, 15_000);

    it("allows the stop when a fast gate passes", async () => {
      writeState("typecheck");

      const result = await stop();

      expect(result).toBeNull();
      expect(existsSync(statePath)).toBe(false);
    }, 15_000);
  },
);
