import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run as runKeywordDetector } from "../../.agents/hooks/core/keyword-detector.ts";
import { run as runStateBoundary } from "../../.agents/hooks/core/state-boundary.ts";
import type { HandlerCtx } from "../../.agents/hooks/core/types.ts";

const REL = join(".grok", "rules", "oma-state.md");

describe("grok-context", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-grok-ctx-"));
    mkdirSync(join(dir, ".git"), { recursive: true });
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("tracks a Grok session boundary without creating a rules-file mirror", async () => {
    const ctx: HandlerCtx = { vendor: "grok", cwd: dir, sid: "grok-1" };

    await runKeywordDetector({ kind: "prompt", prompt: "work", cwd: dir }, ctx);
    const boundary = await runStateBoundary(
      { kind: "prompt", prompt: "continue", cwd: dir },
      ctx,
    );

    expect(boundary).toMatchObject({ type: "context" });
    expect(
      existsSync(join(dir, ".agents", "state", "sessions", "_index.json")),
    ).toBe(true);
    expect(existsSync(join(dir, REL))).toBe(false);
  });
});
