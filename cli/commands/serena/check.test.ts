import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  _setOmaStateDirForTests,
  attachClient,
  daemonKey,
  detachClient,
  ensureSerenaDaemon,
  readRegistry,
  resolveProjectRoot,
} from "../../io/serena-daemon.js";
import { prepareSerenaRuntime } from "../../io/serena-managed-runtime.js";
import { checkDart } from "./check.js";

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  spawn: vi.fn(),
}));
vi.mock("../../io/serena-config.js", () => ({
  validateSerenaConfigs: vi.fn(),
}));
vi.mock("../../utils/config.js", () => ({
  serenaTransportMode: () => "bridge",
}));
vi.mock("../../io/serena-managed-runtime.js", () => ({
  prepareSerenaRuntime: vi.fn(),
}));
vi.mock("../../io/serena-daemon.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../io/serena-daemon.js")>();
  return {
    ...actual,
    resolveProjectRoot: vi.fn(),
    ensureSerenaDaemon: vi.fn(actual.ensureSerenaDaemon),
  };
});

let root: string;
let sdk: string;
let child: ChildProcess;
const spawnDaemon = vi.fn();
const stopDaemon = vi.fn();

beforeEach(async () => {
  root = realpathSync(mkdtempSync(join(tmpdir(), "oma-dart-check-")));
  sdk = join(root, "dart");
  writeFileSync(sdk, "SDK fixture");
  _setOmaStateDirForTests(join(root, "state"));
  vi.mocked(resolveProjectRoot).mockReturnValue(root);
  vi.mocked(prepareSerenaRuntime).mockReturnValue({
    sdk,
    runtimeRevision: "v2",
    adapter: { status: "ready", python: "/python" },
  });
  const actual = await vi.importActual<
    typeof import("../../io/serena-daemon.js")
  >("../../io/serena-daemon.js");
  const listening = new Set<number>();
  spawnDaemon.mockImplementation((port: number) => {
    listening.add(port);
    return process.pid;
  });
  vi.mocked(ensureSerenaDaemon).mockImplementation((opts) =>
    actual.ensureSerenaDaemon({
      ...opts,
      spawnDaemon,
      stopDaemon,
      probe: async (port) => listening.has(port),
      listDaemons: () => [],
    }),
  );
  await ensureSerenaDaemon({ root, context: "oma", runtimeRevision: "v1" });
  const key = daemonKey(root, "oma");
  attachClient(key, process.ppid);
  detachClient(key);

  child = Object.assign(new EventEmitter(), {
    kill: vi.fn(),
  }) as unknown as ChildProcess;
  vi.mocked(spawn).mockReturnValue(child);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  _setOmaStateDirForTests(null);
  rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

it.each([
  [0, 0],
  [1, 1],
  [2, 2],
  [null, 2],
])(
  "runs diagnostics through an active stale daemon and preserves exit %s as %s",
  async (code, expected) => {
    const result = checkDart({ project: ".", timeout: "1", staged: true });
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledTimes(1));
    expect(spawn).toHaveBeenCalledWith(
      "/python",
      expect.arrayContaining([
        "--root",
        root,
        "--project",
        ".",
        "--dart-sdk",
        sdk,
        "--staged",
      ]),
      { cwd: root, stdio: "inherit" },
    );
    expect(readRegistry()[daemonKey(root, "oma")]?.clients).toEqual([
      process.ppid,
      process.pid,
    ]);
    child.emit("exit", code);
    expect(await result).toBe(expected);
    const record = readRegistry()[daemonKey(root, "oma")];
    expect(record?.clients).toEqual([process.ppid]);
    expect(record?.runtimeRevision).toBe("v1");
    expect(spawnDaemon).toHaveBeenCalledTimes(1);
    expect(stopDaemon).not.toHaveBeenCalled();
  },
);

it("returns incomplete and detaches only the check client if diagnostics cannot launch", async () => {
  const result = checkDart({ project: ".", timeout: "1" });
  await vi.waitFor(() => expect(spawn).toHaveBeenCalledTimes(1));
  child.emit("error", new Error("Python unavailable"));
  expect(await result).toBe(2);
  expect(readRegistry()[daemonKey(root, "oma")]?.clients).toEqual([
    process.ppid,
  ]);
  expect(stopDaemon).not.toHaveBeenCalled();
});
