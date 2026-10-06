import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PARALLEL_SUPERVISOR_ARGS } from "../commands/agent/parallel.js";
import { SCHEDULE_COMMANDS } from "../commands/harness/evolution.js";
import { GC_ARGS } from "../platform/serena-daemon-gc-service.js";

const CLI = resolve(import.meta.dirname, "..", "cli.ts");

// Commands oma runs on itself (spawned supervisors, OS timers, harness jobs).
// The colon spellings stopped routing when command paths were standardized,
// and nothing failed until the timer or the spawned process ran. An unknown
// option proves the command resolved without executing its action.
const PROBE = "--oma-route-probe";
const internal: Array<[string, string[]]> = [
  ["serena idle-daemon timer", GC_ARGS.filter((arg) => arg !== "--quiet")],
  ["parallel agent supervisor", [...PARALLEL_SUPERVISOR_ARGS, "manifest"]],
  ["harness evolution schedule", [...SCHEDULE_COMMANDS.add, "workspace"]],
  ["harness evolution unschedule", [...SCHEDULE_COMMANDS.remove, "id"]],
  ["harness evolution inspect", [...SCHEDULE_COMMANDS.inspect, "id"]],
  // Timers registered by 15.x before the canonical spelling.
  ["legacy serena timer", ["serena", "daemon:gc"]],
];

describe("internal oma invocations", () => {
  it.each(internal)("%s resolves to a command", (_label, args) => {
    const result = spawnSync("bun", [CLI, ...args, PROBE], {
      encoding: "utf-8",
      env: { ...process.env, OMA_SKIP_VERSION_CHECK: "1" },
    });

    expect(result.stderr).not.toMatch(/Unknown command|Unexpected argument/);
    expect(result.stderr).toMatch(/unknown option|required option/);
  });
});
