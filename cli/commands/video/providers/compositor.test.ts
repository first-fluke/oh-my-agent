import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { binaryAvailable } from "../internal/exec.js";
import {
  runProjectDir,
  STUB_MARKER,
} from "../internal/hyperframes-workspace.js";
import { getMptProjectStatus } from "../internal/mpt-project.js";
import type { RenderSpec } from "../types.js";
import { requirePlayableVideoDuration, VideoCompositor } from "./compositor.js";

const SPEC: RenderSpec = {
  schemaVersion: "1.0",
  compositor: "hyperframes",
  composition: "Shorts",
  fps: 30,
  dimensions: { width: 1080, height: 1920 },
  durationInFrames: 30,
  audio: {},
  scenes: [
    {
      id: "scene-01",
      fromFrame: 0,
      durationInFrames: 30,
      visual: { type: "placeholder", src: "#0f1117", kenBurns: false },
      onScreenText: ["oma-video"],
    },
  ],
  captions: {
    style: "tiktok",
    fontFamily: "Pretendard",
    maxWidthPct: 86,
    safeArea: { topPct: 8, bottomPct: 18, leftPct: 7, rightPct: 7 },
  },
  background: { type: "color", src: "#0f1117" },
  seed: 1,
};

describe("VideoCompositor", () => {
  let tmp: string;
  let previousCwd: string;
  const originalMock = process.env.OMA_VIDEO_MOCK;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-compositor-"));
    previousCwd = process.cwd();
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(tmp, { recursive: true, force: true });
    if (originalMock === undefined) delete process.env.OMA_VIDEO_MOCK;
    else process.env.OMA_VIDEO_MOCK = originalMock;
  });

  it("writes the deterministic placeholder in mock mode (fallback path)", async () => {
    process.env.OMA_VIDEO_MOCK = "1";
    const artifact = await new VideoCompositor("hyperframes").render(SPEC);
    expect(artifact.path).toBe("shorts.mp4");
    expect(artifact.pathTaken).toBe("fallback");
    expect(artifact.durationSec).toBeCloseTo(1, 5);
    const body = readFileSync(path.join(tmp, "shorts.mp4"), "utf8");
    expect(body).toContain("oma-video placeholder render");
    expect(body).toContain("composition=Shorts");
  });

  it("names the output <mode>-<slug>.mp4 when the spec carries a slug", async () => {
    process.env.OMA_VIDEO_MOCK = "1";
    const artifact = await new VideoCompositor("hyperframes").render({
      ...SPEC,
      slug: "jeju-coffee",
    });
    expect(artifact.path).toBe("shorts-jeju-coffee.mp4");
    const body = readFileSync(path.join(tmp, "shorts-jeju-coffee.mp4"), "utf8");
    expect(body).toContain("oma-video placeholder render");
  });

  it("is reproducible from the same spec in mock mode", async () => {
    process.env.OMA_VIDEO_MOCK = "1";
    const a = await new VideoCompositor("hyperframes").render(SPEC);
    const first = readFileSync(path.join(tmp, a.path), "utf8");
    const b = await new VideoCompositor("hyperframes").render(SPEC);
    const second = readFileSync(path.join(tmp, b.path), "utf8");
    expect(second).toBe(first);
  });

  it("uses the placeholder for the mpt compositor in mock mode (fallback path)", async () => {
    process.env.OMA_VIDEO_MOCK = "1";
    const artifact = await new VideoCompositor("mpt").render(SPEC);
    expect(artifact.pathTaken).toBe("fallback");
    const body = readFileSync(path.join(tmp, artifact.path), "utf8");
    expect(body).toContain("oma-video placeholder render");
  });

  it("rejects a text placeholder during real video validation", async () => {
    const placeholder = path.join(tmp, "not-a-video.mp4");
    writeFileSync(placeholder, "oma-video placeholder render\n", "utf8");
    await expect(requirePlayableVideoDuration(placeholder)).rejects.toThrow(
      /not a playable video/,
    );
  });

  it("fails without creating a placeholder when the mpt checkout is absent", async () => {
    delete process.env.OMA_VIDEO_MOCK;
    const original = process.env.OMA_VIDEO_MPT_DIR;
    process.env.OMA_VIDEO_MPT_DIR = "/nonexistent/mpt/checkout";
    try {
      writeFileSync(
        path.join(tmp, "render-spec.json"),
        JSON.stringify({ ...SPEC, compositor: "mpt" }),
        "utf8",
      );
      await expect(
        new VideoCompositor("mpt").render({
          ...SPEC,
          compositor: "mpt",
        }),
      ).rejects.toThrow(/mpt checkout/);
      expect(existsSync(path.join(tmp, "shorts.mp4"))).toBe(false);
    } finally {
      if (original === undefined) delete process.env.OMA_VIDEO_MPT_DIR;
      else process.env.OMA_VIDEO_MPT_DIR = original;
    }
  });

  // Real branch, no composition: outside mock mode the compositor must NOT
  // paper over a missing/stub composition with a placeholder — it throws with
  // the remediation so the agent authors index.html and re-renders.
  it("throws (no placeholder) when the run has no authored composition", async () => {
    delete process.env.OMA_VIDEO_MOCK;
    writeFileSync(
      path.join(tmp, "render-spec.json"),
      JSON.stringify(SPEC),
      "utf8",
    );
    const ffmpeg = await binaryAvailable("ffmpeg", ["-version"]);
    await expect(
      new VideoCompositor("hyperframes").render(SPEC),
    ).rejects.toThrow(ffmpeg.ok ? /oma video compose/ : /ffmpeg not found/);
    if (!ffmpeg.ok) return;
    // Scaffold present but index.html is still the stub → still an error, named.
    const project = runProjectDir(tmp);
    mkdirSync(project, { recursive: true });
    writeFileSync(path.join(project, "index.html"), `// ${STUB_MARKER}\n`);
    await expect(
      new VideoCompositor("hyperframes").render(SPEC),
    ).rejects.toThrow(/composition not authored/);
  });

  // Real-render coverage for MPT (opt-in, OMA_VIDEO_MPT_E2E=1): exercises the
  // full MPT real branch end-to-end against the cloned + installed checkout.
  // Skipped by default (and in CI) so the parallel suite stays fast — the MPT
  // pipeline downloads/synthesizes materials and runs moviepy/ffmpeg. The live
  // render is verified out-of-band by `oma video generate --compositor mpt`.
  //
  // This is opt-in because it needs a cloned, installed MPT checkout. A failed
  // setup/render is an error with diagnostics; placeholders are mock-only.
  const mptE2e = process.env.OMA_VIDEO_MPT_E2E === "1" ? it : it.skip;
  mptE2e(
    "exercises the real mpt branch end-to-end when toolchain + checkout are present",
    async () => {
      delete process.env.OMA_VIDEO_MOCK;
      const ffmpeg = (await binaryAvailable("ffmpeg", ["-version"])).ok;
      const project = getMptProjectStatus();
      const mptSpec: RenderSpec = { ...SPEC, compositor: "mpt" };
      // The MPT driver reads narration from the run dir's script.json; provide a
      // minimal one so the real branch has a non-empty script.
      writeFileSync(
        path.join(tmp, "script.json"),
        JSON.stringify({
          scenes: [
            { narration: "Ocean waves at dusk." },
            { narration: "A calm horizon meets the sea." },
          ],
        }),
        "utf8",
      );
      writeFileSync(
        path.join(tmp, "render-spec.json"),
        JSON.stringify(mptSpec),
        "utf8",
      );
      const artifact = await new VideoCompositor("mpt").render(mptSpec);

      if (!(ffmpeg && project.installed)) return;

      const outPath = path.join(tmp, artifact.path);
      expect(artifact.pathTaken).toBe("real");
      expect(statSync(outPath).size).toBeGreaterThan(1000);
      const head = readFileSync(outPath).subarray(4, 8).toString("ascii");
      expect(head).toBe("ftyp"); // ISO Media / MP4 box signature
      expect(artifact.durationSec).toBeGreaterThan(0);
    },
    600_000,
  );
});
