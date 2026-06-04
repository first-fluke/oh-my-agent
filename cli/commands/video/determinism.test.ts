import { readFileSync, rmSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadVideoConfig } from "./config.js";
import { VideoOrchestrator } from "./orchestrator.js";
import { defaultVideoRegistry } from "./registry.js";

// OMA_VIDEO_MOCK=1 determinism harness (design 013 §7 Tier-1, plan task 21).
// Two independent runs of the same brief/seed must produce a byte-identical
// script.json and render-spec.json — the deterministic compute boundary.
describe("OMA_VIDEO_MOCK determinism", () => {
  const dirs: string[] = [];
  const originalMock = process.env.OMA_VIDEO_MOCK;

  beforeEach(() => {
    process.env.OMA_VIDEO_MOCK = "1";
    delete process.env.PEXELS_API_KEY;
    delete process.env.RUNNINGHUB_API_KEY;
  });

  afterEach(() => {
    for (const dir of dirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
    if (originalMock === undefined) delete process.env.OMA_VIDEO_MOCK;
    else process.env.OMA_VIDEO_MOCK = originalMock;
  });

  async function run(
    brief: string,
    seed: string,
  ): Promise<{
    script: string;
    renderSpec: string;
  }> {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "oma-video-det-"));
    dirs.push(tmp);
    const config = await loadVideoConfig(tmp);
    const orchestrator = new VideoOrchestrator(
      config,
      defaultVideoRegistry(config, { cwd: tmp }),
    );
    const result = await orchestrator.generate({
      brief,
      opts: { dryRun: true, seed, format: "json" },
      cwd: tmp,
    });
    expect(result.exitCode).toBe(0);
    const runDir = result.runDir ?? "";
    return {
      script: readFileSync(path.join(runDir, "script.json"), "utf8"),
      renderSpec: readFileSync(path.join(runDir, "render-spec.json"), "utf8"),
    };
  }

  it("produces byte-identical render-spec.json on replay", async () => {
    const first = await run("deterministic shorts replay", "99");
    const second = await run("deterministic shorts replay", "99");
    expect(second.renderSpec).toBe(first.renderSpec);
    expect(second.script).toBe(first.script);
  });

  it("differs when the seed changes (seed is embedded)", async () => {
    const a = await run("deterministic shorts replay", "1");
    const b = await run("deterministic shorts replay", "2");
    expect(b.renderSpec).not.toBe(a.renderSpec);
  });
});
