/**
 * Direct-dispatch path of the refactor-guard enforcer — kiro's Stop hook
 * output is not processed by the host (aws/amazon-q lineage), so on the first
 * block of each offending file the enforcer spawns a detached
 * `oma agent spawn refactor-engineer` instead of relying on the (ignored)
 * block reason. child_process is mocked; no real process is spawned.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.hoisted(() =>
  vi.fn(() => ({ on: vi.fn(), unref: vi.fn() })),
);
vi.mock("node:child_process", () => ({ spawn: spawnMock }));

const { run } = await import("../../.agents/hooks/core/refactor-guard.ts");

let projectDir: string;

beforeEach(() => {
  spawnMock.mockClear();
  projectDir = mkdtempSync(join(tmpdir(), "oma-refactor-dispatch-"));
  mkdirSync(join(projectDir, ".agents"), { recursive: true });
  writeFileSync(
    join(projectDir, ".agents", "oma-config.yaml"),
    "refactor_guard:\n  enabled: true\n  max_lines: 500\n",
  );
  mkdirSync(join(projectDir, "src"), { recursive: true });
  writeFileSync(
    join(projectDir, "src", "big.ts"),
    Array(600).fill("const x = 1;").join("\n"),
  );
});

afterEach(() => {
  rmSync(projectDir, { recursive: true, force: true });
});

function record(vendor: "kiro" | "claude") {
  return run(
    {
      kind: "post_tool",
      toolName: "fs_write",
      toolInput: { path: join(projectDir, "src", "big.ts") },
      cwd: projectDir,
    },
    { vendor, cwd: projectDir, sid: "sid-1" },
  );
}

function stop(vendor: "kiro" | "claude") {
  return run(
    { kind: "stop", cwd: projectDir },
    { vendor, cwd: projectDir, sid: "sid-1" },
  );
}

describe("refactor-guard direct dispatch (non-blocking-stop vendors)", () => {
  it("spawns a detached oma agent spawn on kiro's first stop block only", async () => {
    await record("kiro");
    expect((await stop("kiro"))?.type).toBe("block");
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [cmd, args, opts] = spawnMock.mock.calls[0] as unknown as [
      string,
      string[],
      Record<string, unknown>,
    ];
    expect(cmd).toBe("oma");
    expect(args.slice(0, 2)).toEqual(["agent", "spawn"]);
    expect(args[2]).toBe("refactor-engineer");
    expect(args).toContain("sid-1");
    expect(opts.detached).toBe(true);

    // Second block of the same file must NOT re-spawn.
    expect((await stop("kiro"))?.type).toBe("block");
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("does not direct-dispatch for vendors with a blocking stop", async () => {
    await record("claude");
    expect((await stop("claude"))?.type).toBe("block");
    expect(spawnMock).not.toHaveBeenCalled();
  });
});
