import { vi } from "vitest";

/** No filesystem ledger in tests whose entire filesystem is mocked. */
export class FixtureSessionExecution {
  readonly signal = new AbortController().signal;
  readonly deadline = undefined;
  readonly stateFile = "/fixture/execution.jsonl";
  assertActive(): void {}
  stop(): void {}
  dispose(): void {}
  onStop(): () => void {
    return () => {};
  }
  recordResources(): void {}
  childEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    return { ...base };
  }
  async wait<T>(promise: Promise<T>): Promise<T> {
    return promise;
  }
}

export function ownedProcessFixture() {
  const stopped = {
    stopped: true,
    survivingPids: [],
    survivingResources: [],
    limitations: [],
  };
  return {
    ownedProcessSpawnOptions: () => ({
      detached: process.platform !== "win32",
      windowsHide: true,
    }),
    stopOwnedProcess: vi.fn(async () => ({ ...stopped })),
    stopUnidentifiedOwnedChild: vi.fn(async () => ({ ...stopped })),
    ownedProcessHasLiveMembers: vi.fn(() => false),
  };
}

export function subagentProcessFixture() {
  return {
    forgetSubagentProcess: vi.fn(),
    recordSubagentProcess: vi.fn(
      (_file: string, pid: number, root: string, metadata = {}) => ({
        schemaVersion: 1,
        root,
        runnerPid: process.pid,
        process: {
          pid,
          ppid: process.pid,
          started: "fixture",
          command: "fixture worker",
        },
        processGroupId: process.platform !== "win32" ? pid : undefined,
        ...metadata,
      }),
    ),
  };
}
