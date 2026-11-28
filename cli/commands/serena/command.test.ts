import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerSerenaCommands } from "./command.js";

const reclaimIdleDaemons = vi.hoisted(() => vi.fn(() => []));
const runSerenaDaemonGcWatch = vi.hoisted(() => vi.fn(async () => 1));

vi.mock("../../io/serena-daemon.js", () => ({
  daemonPidsWithLiveClients: vi.fn(() => new Set()),
  pruneRegistry: vi.fn(() => []),
  reclaimIdleDaemons,
  runSerenaDaemonGcWatch,
}));

describe("serena daemon:gc", () => {
  beforeEach(() => {
    reclaimIdleDaemons.mockClear();
    runSerenaDaemonGcWatch.mockClear();
  });

  it("runs daemon cleanup without the optional LSP reaper config", async () => {
    const program = new Command();
    registerSerenaCommands(program);

    await program.parseAsync(["node", "oma", "serena", "daemon:gc", "--quiet"]);

    expect(reclaimIdleDaemons).toHaveBeenCalledOnce();
    expect(runSerenaDaemonGcWatch).not.toHaveBeenCalled();
  });

  it("runs the background watcher loop when --watch is supplied", async () => {
    const program = new Command();
    registerSerenaCommands(program);

    await program.parseAsync([
      "node",
      "oma",
      "serena",
      "daemon:gc",
      "--quiet",
      "--watch",
      "--interval-ms",
      "500",
    ]);

    expect(runSerenaDaemonGcWatch).toHaveBeenCalledWith({ intervalMs: 500 });
    expect(reclaimIdleDaemons).not.toHaveBeenCalled();
  });
});
