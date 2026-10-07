import * as childProcess from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  forgetSubagentProcess,
  isOwnedOrphan,
  recordSubagentProcess,
} from "./subagent-process.js";

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  execFileSync: vi.fn(),
}));

let root: string;
const pid = 12345;
const snapshot = (
  parent: number,
  started = "Mon Oct 5 10:11:12 2026",
  command = "codex exec task",
) => `${pid} ${parent} ${started} ${command}\n`;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-process-ownership-"));
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

describe("subagent process ownership", () => {
  it("only identifies the same orphan after its supervisor exits", () => {
    const file = join(root, "subagent.pid");
    const ps = vi
      .mocked(childProcess.execFileSync)
      .mockReturnValue(snapshot(process.pid));
    recordSubagentProcess(file, pid, root);
    expect(JSON.parse(readFileSync(`${file}.json`, "utf8")).runnerPid).toBe(
      process.pid,
    );
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);
    ps.mockReturnValue(snapshot(1));
    expect(isOwnedOrphan(file, pid, root)).toBe(false);
    kill.mockImplementation(() => {
      throw Object.assign(new Error("gone"), { code: "ESRCH" });
    });
    expect(isOwnedOrphan(file, pid, root)).toBe(true);
    expect(isOwnedOrphan(file, pid, join(root, "other-project"))).toBe(false);
    ps.mockReturnValue(snapshot(1, "Mon Oct 5 10:12:13 2026"));
    expect(isOwnedOrphan(file, pid, root)).toBe(false);
    ps.mockReturnValue(snapshot(1, undefined, "unrelated process"));
    expect(isOwnedOrphan(file, pid, root)).toBe(false);
    ps.mockReturnValue(snapshot(99999));
    expect(isOwnedOrphan(file, pid, root)).toBe(false);
    forgetSubagentProcess(file);
    expect(isOwnedOrphan(file, pid, root)).toBe(false);
  });

  it("preserves invalid, unrecorded and permission-protected processes", () => {
    const file = join(root, "subagent.pid");
    const ps = vi
      .mocked(childProcess.execFileSync)
      .mockReturnValue(snapshot(process.pid));
    recordSubagentProcess(file, pid, root);
    ps.mockReturnValue(snapshot(1));
    const kill = vi.spyOn(process, "kill").mockImplementation(() => {
      throw Object.assign(new Error("denied"), { code: "EPERM" });
    });
    expect(isOwnedOrphan(file, pid, root)).toBe(false);
    expect(isOwnedOrphan(file, 0, root)).toBe(false);
    expect(isOwnedOrphan(file, -1, root)).toBe(false);
    writeFileSync(`${file}.json`, "{broken");
    expect(isOwnedOrphan(file, pid, root)).toBe(false);
    expect(kill.mock.calls.every(([, signal]) => signal === 0)).toBe(true);
  });
});
