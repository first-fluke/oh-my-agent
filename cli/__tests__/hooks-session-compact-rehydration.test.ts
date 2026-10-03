/**
 * Post-compaction rehydration — SessionStart(source: "compact") forcing.
 *
 * Compaction keeps the vendor session id, so the session-once dedup in
 * serena-primer and the boundary check in state-boundary would both skip the
 * very turn that just lost their context. `HookInput.source === "compact"`
 * (threaded from the SessionStart payload by adapters.normalizeInput) forces
 * re-injection. These tests drive the real handlers against a temp project.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run as runKeywordDetector } from "../../.agents/hooks/core/keyword-detector.ts";
import { run as runSerenaPrimer } from "../../.agents/hooks/core/serena-primer.ts";
import { run as runStateBoundary } from "../../.agents/hooks/core/state-boundary.ts";
import type { HandlerCtx } from "../../.agents/hooks/core/types.ts";

describe("SessionStart(source: compact) rehydration", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-compact-rehydration-"));
    // git root marker so getProjectDir-independent handlers resolve cleanly.
    mkdirSync(join(projectDir, ".git"), { recursive: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  function ctx(sid: string): HandlerCtx {
    return { vendor: "claude", cwd: projectDir, sid };
  }

  it("serena-primer re-injects on compact despite the session-once claim", async () => {
    mkdirSync(join(projectDir, ".serena"), { recursive: true });
    writeFileSync(join(projectDir, ".serena", "project.yml"), "name: t\n");

    const first = await runSerenaPrimer(
      { kind: "prompt", prompt: "hello", cwd: projectDir },
      ctx("sess-1"),
    );
    expect(first?.type).toBe("context");

    // Same session, ordinary prompt — session-once dedup skips.
    const repeat = await runSerenaPrimer(
      { kind: "prompt", prompt: "hello again", cwd: projectDir },
      ctx("sess-1"),
    );
    expect(repeat).toBeNull();

    // Same session, post-compaction SessionStart — forced re-injection.
    const compacted = await runSerenaPrimer(
      { kind: "prompt", prompt: "", cwd: projectDir, source: "compact" },
      ctx("sess-1"),
    );
    expect(compacted?.type).toBe("context");
  });

  it("state-boundary re-emits the snapshot on compact despite an unchanged sid", async () => {
    // Establish an active OMA session the way the real chain does — the L1
    // session is created when a workflow keyword triggers (probe parity).
    await runKeywordDetector(
      { kind: "prompt", prompt: "work mode", cwd: projectDir },
      ctx("sess-1"),
    );

    const first = await runStateBoundary(
      { kind: "prompt", prompt: "hello", cwd: projectDir },
      ctx("sess-1"),
    );
    expect(first?.type).toBe("context");

    // Same vendor+sid, ordinary prompt — no boundary, no snapshot.
    const repeat = await runStateBoundary(
      { kind: "prompt", prompt: "hello again", cwd: projectDir },
      ctx("sess-1"),
    );
    expect(repeat).toBeNull();

    // Same vendor+sid, post-compaction SessionStart — forced re-emission.
    const compacted = await runStateBoundary(
      { kind: "prompt", prompt: "", cwd: projectDir, source: "compact" },
      ctx("sess-1"),
    );
    if (compacted?.type !== "context") {
      throw new Error("expected a re-emitted state snapshot after compact");
    }
    expect(compacted.additionalContext).toContain("[OMA STATE SNAPSHOT]");
  });
});
