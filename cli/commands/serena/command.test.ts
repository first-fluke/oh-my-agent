import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerSerenaCommands } from "./command.js";

const reclaimIdleDaemons = vi.hoisted(() => vi.fn(() => []));

vi.mock("../../io/serena-daemon.js", () => ({
  daemonPidsWithLiveClients: vi.fn(() => new Set()),
  pruneRegistry: vi.fn(() => []),
  reclaimIdleDaemons,
}));

describe("serena daemon:gc", () => {
  beforeEach(() => {
    reclaimIdleDaemons.mockClear();
  });

  it("runs daemon cleanup without the optional LSP reaper config", async () => {
    const program = new Command();
    registerSerenaCommands(program);

    await program.parseAsync(["node", "oma", "serena", "daemon:gc", "--quiet"]);

    expect(reclaimIdleDaemons).toHaveBeenCalledOnce();
  });
});
