import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureCodeFingerprint } from "../../../.agents/hooks/core/code-fingerprint.js";
import {
  emitEvent,
  setActiveSession,
  updateIndex,
} from "../../state/events.js";
import { createCommandSurface } from "../../utils/command-surface.js";
import { registerGoal } from "./command.js";

describe("goal status --check-fresh", () => {
  let projectDir: string;
  let previousExitCode: typeof process.exitCode;
  let output: string[];

  const git = (...args: string[]): string =>
    execFileSync("git", args, { cwd: projectDir, encoding: "utf-8" }).trim();

  async function recordPass(
    payload: Record<string, unknown> = {},
    sid = "oma-goal",
  ) {
    return emitEvent(projectDir, sid, {
      kind: "gate.passed",
      payload: {
        workflow: "work",
        gate: "test",
        summary: "passed",
        ...(await captureCodeFingerprint(projectDir)),
        ...payload,
      },
    });
  }

  async function status(...args: string[]) {
    const program = new Command().exitOverride();
    registerGoal(program);
    const surface = createCommandSurface(program);
    await program.parseAsync(
      surface.normalize(["goal", "status", "--check-fresh", ...args]),
      { from: "user" },
    );
    return output.join("\n");
  }

  beforeEach(() => {
    previousExitCode = process.exitCode;
    process.exitCode = 0;
    projectDir = mkdtempSync(join(tmpdir(), "oma-goal-status-"));
    mkdirSync(join(projectDir, ".agents", "state"), { recursive: true });
    writeFileSync(join(projectDir, ".gitignore"), ".agents/\n");
    writeFileSync(join(projectDir, "source.ts"), "export const value = 1;\n");
    git("init", "--quiet");
    git("config", "user.email", "goal-test@example.com");
    git("config", "user.name", "Goal test");
    git("add", ".");
    git("commit", "--quiet", "-m", "initial");
    setActiveSession(projectDir, "main", "oma-goal");
    vi.spyOn(process, "cwd").mockReturnValue(projectDir);
    output = [];
    vi.spyOn(console, "log").mockImplementation((...values) => {
      output.push(values.join(" "));
    });
    vi.spyOn(console, "error").mockImplementation((...values) => {
      output.push(values.join(" "));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = previousExitCode;
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("reports a matching pass as fresh through the spaced command", async () => {
    await recordPass();
    expect(await status()).toBe("fresh");
    expect(process.exitCode).toBe(0);
  });

  it("reports a later commit as stale", async () => {
    await recordPass();
    writeFileSync(join(projectDir, "source.ts"), "export const value = 2;\n");
    git("add", "source.ts");
    git("commit", "--quiet", "-m", "change");
    expect(await status()).toBe("stale (head moved)");
    expect(process.exitCode).toBe(1);
  });

  it("reports later edits to an already dirty tree as stale", async () => {
    writeFileSync(join(projectDir, "source.ts"), "export const value = 2;\n");
    await recordPass();
    writeFileSync(join(projectDir, "source.ts"), "export const value = 3;\n");
    expect(await status()).toBe("stale (tree changed)");
    expect(process.exitCode).toBe(1);
  });

  it("uses only the latest pass even if an older one matches", async () => {
    await recordPass();
    writeFileSync(join(projectDir, "source.ts"), "export const value = 2;\n");
    await recordPass();
    git("checkout", "--", "source.ts");
    expect(await status()).toBe("stale (tree changed)");
    expect(process.exitCode).toBe(1);
  });

  it("does not reuse an earlier fingerprint when the latest pass is legacy", async () => {
    await recordPass();
    await emitEvent(projectDir, "oma-goal", {
      kind: "gate.passed",
      payload: { workflow: "work", gate: "test", summary: "legacy pass" },
    });
    expect(await status()).toContain("unverified");
    expect(process.exitCode).toBe(1);
  });

  it("reports missing passes as unverified", async () => {
    expect(await status()).toContain("unverified");
    expect(process.exitCode).toBe(1);
  });

  it("does not call a non-git pass fresh", async () => {
    rmSync(join(projectDir, ".git"), { recursive: true });
    await recordPass();
    expect(await status()).toContain("unverified");
    expect(process.exitCode).toBe(1);
  });

  it("can inspect an inactive session explicitly", async () => {
    await recordPass({}, "oma-completed");
    expect(await status("--session-id", "oma-completed")).toBe("fresh");
    expect(process.exitCode).toBe(0);
  });

  it("finds the completed session after Stop clears the active pointer", async () => {
    await recordPass();
    await emitEvent(projectDir, "oma-goal", {
      kind: "session.ended",
      payload: { status: "completed" },
    });
    updateIndex(projectDir, (index) => {
      index.active = {};
    });
    expect(await status()).toBe("fresh");
    expect(process.exitCode).toBe(0);
  });

  it("does not select an older verified session when the newest has no pass", async () => {
    await emitEvent(projectDir, "oma-goal", {
      kind: "session.created",
      ts: "2026-01-01T00:00:00.000Z",
    });
    await recordPass();
    await emitEvent(projectDir, "oma-newer", {
      kind: "session.created",
      ts: "2026-01-02T00:00:00.000Z",
    });
    updateIndex(projectDir, (index) => {
      index.active = {};
    });
    expect(JSON.parse(await status("--json"))).toMatchObject({
      sid: "oma-newer",
      status: "unverified",
    });
    expect(process.exitCode).toBe(1);
  });

  it("resolves a selected persistent workflow to its OMA session", async () => {
    writeFileSync(
      join(projectDir, ".agents", "state", "work-state-vendor-1.json"),
      JSON.stringify({
        workflow: "work",
        sessionId: "vendor-1",
        omaSid: "oma-work",
      }),
    );
    await recordPass({}, "oma-work");
    expect(await status("--workflow", "work", "--session-id", "vendor-1")).toBe(
      "fresh",
    );
    expect(process.exitCode).toBe(0);
  });

  it("does not substitute an active session for a selected legacy state", async () => {
    writeFileSync(
      join(projectDir, ".agents", "state", "work-state-vendor-1.json"),
      JSON.stringify({ workflow: "work", sessionId: "vendor-1" }),
    );
    await recordPass();
    expect(await status("--session-id", "vendor-1")).toContain("unverified");
    expect(process.exitCode).toBe(1);
  });

  it("returns machine-readable freshness and the selected receipt", async () => {
    const event = await recordPass();
    const result = JSON.parse(await status("--json"));
    expect(result).toMatchObject({
      sid: "oma-goal",
      status: "fresh",
      eventId: event.eventId,
      gate: "test",
    });
    expect(process.exitCode).toBe(0);
  });
});
