import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emitEvent } from "../state/events.js";

const CLI = resolve(import.meta.dirname, "..", "cli.ts");
// Comfortably past the 64 KiB pipe buffer.
const EVENTS = 400;

describe("piped --json output", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-piped-json-"));
    mkdirSync(join(projectDir, ".agents", "state"), { recursive: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("is complete when it exceeds the pipe buffer", () => {
    for (let index = 0; index < EVENTS; index++) {
      emitEvent(projectDir, "oma-piped", {
        kind: "workflow.phase",
        payload: { phase: `phase-${index}`, note: "x".repeat(300) },
      });
    }

    const result = spawnSync(
      "bun",
      [CLI, "state", "get", "oma-piped", "--json"],
      {
        cwd: projectDir,
        env: process.env,
        encoding: "utf-8",
        maxBuffer: 32 * 1024 * 1024,
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(64 * 1024);
    expect(JSON.parse(result.stdout).events).toHaveLength(EVENTS);
  });
});
