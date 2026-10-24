import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ownedProcessHasLiveMembers,
  ownedProcessSpawnOptions,
  stopOwnedProcess,
  stopUnidentifiedOwnedChild,
} from "./owned-process.js";
import {
  forgetSubagentProcess,
  recordSubagentProcess,
  type SubagentProcessRecord,
} from "./subagent-process.js";

let root: string;
const children: ChildProcess[] = [];
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-owned-process-"));
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  for (const child of children.splice(0)) {
    try {
      if (child.pid) process.kill(-child.pid, "SIGKILL");
    } catch {}
    if (child.exitCode === null && child.signalCode === null)
      await once(child, "exit");
  }
  rmSync(root, { recursive: true, force: true });
});

async function waitForFile(file: string): Promise<void> {
  // Process startup can be delayed on a busy host; cancellation waits below
  // retain their independent, short bounds.
  const until = Date.now() + 5000;
  while (!existsSync(file) && Date.now() < until)
    await new Promise((resolve) => setTimeout(resolve, 20));
  expect(existsSync(file)).toBe(true);
}

async function startTree(exitOnTerm = false): Promise<{
  child: ChildProcess;
  record: SubagentProcessRecord;
  grandchild: number;
  file: string;
}> {
  const ready = join(root, "grandchild.pid");
  const code = `const secret='manifest-secret-token'; const {spawn}=require('node:child_process');
    process.on('SIGTERM',()=>{${exitOnTerm ? "process.exit(0)" : ""}});
    spawn(process.execPath,['-e',${JSON.stringify(`process.on('SIGTERM',()=>{}); require('node:fs').writeFileSync(${JSON.stringify(ready)}, String(process.pid)); setInterval(()=>{},1000);`)}],{stdio:'ignore'});
    setInterval(()=>{},1000);`;
  const child = spawn(process.execPath, ["-e", code], {
    stdio: "ignore",
    ...ownedProcessSpawnOptions(),
  });
  children.push(child);
  await once(child, "spawn");
  await waitForFile(ready);
  const file = join(root, "agent.pid");
  if (!child.pid) throw new Error("Fake worker did not start");
  writeFileSync(file, String(child.pid));
  for (const suffix of ["json", "resources.json"]) {
    writeFileSync(`${file}.${suffix}`, "old metadata");
    chmodSync(`${file}.${suffix}`, 0o666);
  }
  const record = recordSubagentProcess(file, child.pid, root, {
    isolatedProcessGroup: true,
    runId: "run-test",
    sessionId: "session-test",
    generatedPaths: [ready],
    externalResources: [{ provider: "docker", id: "explicit-container-id" }],
  });
  expect(record?.processGroupId).toBe(child.pid);
  if (!record) throw new Error("Fake worker identity unavailable");
  return {
    child,
    record,
    grandchild: Number(readFileSync(ready, "utf8")),
    file,
  };
}

describe.skipIf(process.platform === "win32")(
  "owned process cancellation",
  () => {
    it("kills a child and grandchild that ignore TERM while retaining resource evidence", async () => {
      const { record, grandchild, file } = await startTree();
      const stopped = await stopOwnedProcess(record, {
        graceMs: 150,
        killWaitMs: 1000,
      });
      expect(stopped.stopped).toBe(true);
      expect(stopped.survivingPids).toEqual([]);
      expect(stopped.survivingResources).toEqual([
        "docker:explicit-container-id",
      ]);
      expect(ownedProcessHasLiveMembers(record)).toBe(false);
      expect(existsSync(file)).toBe(true);
      const saved = JSON.parse(readFileSync(`${file}.json`, "utf8"));
      expect(statSync(`${file}.json`).mode & 0o777).toBe(0o600);
      expect(saved.generatedPaths).toEqual([join(root, "grandchild.pid")]);
      expect(readFileSync(saved.generatedPaths[0], "utf8")).toBe(
        String(grandchild),
      );
      forgetSubagentProcess(file);
      expect(existsSync(`${file}.json`)).toBe(false);
      const manifest = readFileSync(`${file}.resources.json`, "utf8");
      expect(saved.process.command).toContain("manifest-secret-token");
      expect(manifest).not.toContain("manifest-secret-token");
      expect(JSON.parse(manifest).process).not.toHaveProperty("command");
      expect(statSync(`${file}.resources.json`).mode & 0o777).toBe(0o600);
      expect(
        JSON.parse(readFileSync(`${file}.resources.json`, "utf8"))
          .externalResources,
      ).toEqual([{ provider: "docker", id: "explicit-container-id" }]);
    });

    it("stops the owned group after its recorded leader exits", async () => {
      const { child, record } = await startTree(true);
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
      expect(ownedProcessHasLiveMembers(record)).toBe(true);
      const stopped = await stopOwnedProcess(record, {
        graceMs: 50,
        killWaitMs: 1000,
      });
      expect(stopped.stopped).toBe(true);
      expect(ownedProcessHasLiveMembers(record)).toBe(false);
    });

    it("preserves a process when the recorded start identity was replaced", async () => {
      const { record } = await startTree();
      const changed = {
        ...record,
        process: { ...record.process, started: "a different process" },
      };
      const stopped = await stopOwnedProcess(changed, {
        graceMs: 0,
        killWaitMs: 0,
      });
      expect(stopped.stopped).toBe(false);
      expect(stopped.survivingPids).toContain(record.process.pid);
      expect(ownedProcessHasLiveMembers(record)).toBe(true);
      expect(stopped.limitations.join(" ")).toContain("identity changed");
    });

    it("stops a resistant captured child when ps is missing and retains tree uncertainty", async () => {
      const ready = join(root, "direct-ready");
      const child = spawn(
        process.execPath,
        [
          "-e",
          `process.on('SIGTERM',()=>{}); require('node:fs').writeFileSync(${JSON.stringify(ready)},'ready'); setInterval(()=>{},1000);`,
        ],
        { stdio: "ignore", ...ownedProcessSpawnOptions() },
      );
      children.push(child);
      await once(child, "spawn");
      await waitForFile(ready);
      if (!child.pid) throw new Error("Fake worker did not start");
      vi.stubEnv("PATH", join(root, "missing-ps-directory"));
      const file = join(root, "unidentified.pid");
      writeFileSync(file, String(child.pid));
      expect(recordSubagentProcess(file, child.pid, root)).toBeUndefined();
      const kill = vi.spyOn(child, "kill");
      const stopped = await stopUnidentifiedOwnedChild(child, {
        graceMs: 100,
        killWaitMs: 1000,
      });
      expect(kill).toHaveBeenCalledWith("SIGTERM");
      expect(kill).toHaveBeenCalledWith("SIGKILL");
      expect(child.signalCode).toBe("SIGKILL");
      expect(stopped.stopped).toBe(false);
      expect(stopped.survivingPids).toEqual([]);
      expect(stopped.survivingResources).toEqual([`process-tree:${child.pid}`]);
      expect(existsSync(file)).toBe(true);
      expect(existsSync(ready)).toBe(true);
    });

    it.each([false, true])(
      "stops verified owned work when the group census fails (after TERM=%s)",
      async (allowFirst) => {
        const { record, file } = await startTree();
        const fakePs = join(root, "ps");
        writeFileSync(
          fakePs,
          `#!/bin/sh
if [ "$1" = "-A" ]; then
  if [ "\${OMA_TEST_PS_ALLOW_FIRST:-}" = "1" ] && [ ! -f "$OMA_TEST_PS_MARKER" ]; then
    /usr/bin/touch "$OMA_TEST_PS_MARKER"
  else
    printf 'secret-census-token' >&2
    exit 42
  fi
fi
exec /bin/ps "$@"
`,
          { mode: 0o700 },
        );
        const originalPath = process.env.PATH;
        vi.stubEnv("PATH", `${root}:${originalPath ?? ""}`);
        vi.stubEnv("OMA_TEST_PS_MARKER", join(root, "ps-seen"));
        vi.stubEnv("OMA_TEST_PS_ALLOW_FIRST", allowFirst ? "1" : "0");
        const kill = vi.spyOn(process, "kill");
        const stopped = await stopOwnedProcess(record, {
          graceMs: 50,
          killWaitMs: 100,
        });
        expect(kill).toHaveBeenCalledWith(-record.process.pid, "SIGTERM");
        expect(kill, stopped.limitations.join(" ")).toHaveBeenCalledWith(
          -record.process.pid,
          "SIGKILL",
        );
        expect(stopped.stopped).toBe(false);
        expect(stopped.survivingResources).toContain(
          `process-group:${record.process.pid}`,
        );
        expect(stopped.limitations.join(" ")).toContain("status=42");
        expect(stopped.limitations.join(" ")).not.toContain(
          "secret-census-token",
        );
        expect(existsSync(`${file}.json`)).toBe(true);
        vi.stubEnv("PATH", originalPath);
        expect(ownedProcessHasLiveMembers(record)).toBe(false);
      },
    );
  },
);

it("keeps Windows tree ownership unverified after its recorded root exits", () => {
  const platform = Object.getOwnPropertyDescriptor(process, "platform");
  if (!platform) throw new Error("Missing platform descriptor");
  try {
    Object.defineProperty(process, "platform", { ...platform, value: "win32" });
    const kill = vi.spyOn(process, "kill").mockImplementation(() => {
      throw Object.assign(new Error("root gone"), { code: "ESRCH" });
    });
    const record: SubagentProcessRecord = {
      schemaVersion: 1,
      root,
      runnerPid: process.pid,
      process: {
        pid: 12345,
        ppid: process.pid,
        started: "fixture",
        command: "worker",
      },
    };
    expect(ownedProcessHasLiveMembers(record)).toBeUndefined();
    kill.mockReturnValue(true);
    expect(ownedProcessHasLiveMembers(record)).toBe(true);
  } finally {
    Object.defineProperty(process, "platform", platform);
  }
});
