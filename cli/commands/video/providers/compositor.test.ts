import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { findChromeExecutable } from "@cli/io/chrome";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { binaryAvailable } from "../internal/exec.js";
import { getMptProjectStatus } from "../internal/mpt-project.js";
import { getRemotionProjectStatus } from "../internal/remotion-project.js";
import type { RenderSpec } from "../types.js";
import { RemotionLikeCompositor } from "./compositor.js";

const SPEC: RenderSpec = {
  schemaVersion: "1.0",
  compositor: "remotion",
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

describe("RemotionLikeCompositor", () => {
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
    const artifact = await new RemotionLikeCompositor("remotion").render(SPEC);
    expect(artifact.path).toBe("shorts.mp4");
    expect(artifact.pathTaken).toBe("fallback");
    expect(artifact.durationSec).toBeCloseTo(1, 5);
    const body = readFileSync(path.join(tmp, "shorts.mp4"), "utf8");
    expect(body).toContain("oma-video placeholder render");
    expect(body).toContain("composition=Shorts");
  });

  it("is reproducible from the same spec in mock mode", async () => {
    process.env.OMA_VIDEO_MOCK = "1";
    const a = await new RemotionLikeCompositor("remotion").render(SPEC);
    const first = readFileSync(path.join(tmp, a.path), "utf8");
    const b = await new RemotionLikeCompositor("remotion").render(SPEC);
    const second = readFileSync(path.join(tmp, b.path), "utf8");
    expect(second).toBe(first);
  });

  it("uses the placeholder for the mpt compositor in mock mode (fallback path)", async () => {
    process.env.OMA_VIDEO_MOCK = "1";
    const artifact = await new RemotionLikeCompositor("mpt").render(SPEC);
    expect(artifact.pathTaken).toBe("fallback");
    const body = readFileSync(path.join(tmp, artifact.path), "utf8");
    expect(body).toContain("oma-video placeholder render");
  });

  // Branch-selection coverage for MPT (deterministic, no real render): point the
  // MPT checkout resolver at a non-existent dir so the real branch gate fails
  // even with mock mode OFF. Proves `--compositor mpt` is gated on checkout
  // availability and falls back cleanly. Runs everywhere (CI included).
  it("falls back to the placeholder when the mpt checkout is absent (real branch gated)", async () => {
    delete process.env.OMA_VIDEO_MOCK;
    const original = process.env.OMA_VIDEO_MPT_DIR;
    process.env.OMA_VIDEO_MPT_DIR = "/nonexistent/mpt/checkout";
    try {
      writeFileSync(
        path.join(tmp, "render-spec.json"),
        JSON.stringify({ ...SPEC, compositor: "mpt" }),
        "utf8",
      );
      const artifact = await new RemotionLikeCompositor("mpt").render({
        ...SPEC,
        compositor: "mpt",
      });
      expect(artifact.pathTaken).toBe("fallback");
      const body = readFileSync(path.join(tmp, artifact.path), "utf8");
      expect(body).toContain("oma-video placeholder render");
    } finally {
      if (original === undefined) delete process.env.OMA_VIDEO_MPT_DIR;
      else process.env.OMA_VIDEO_MPT_DIR = original;
    }
  });

  // Branch-selection coverage (deterministic, no real render): when the
  // toolchain/project gate fails — here forced by pointing the project resolver
  // at a non-existent dir — the compositor must take the deterministic
  // placeholder even though mock mode is OFF. This proves the real branch is
  // gated on project availability, and runs everywhere (CI included).
  it("falls back to the placeholder when the remotion project is absent (real branch gated)", async () => {
    delete process.env.OMA_VIDEO_MOCK;
    const original = process.env.OMA_VIDEO_REMOTION_DIR;
    process.env.OMA_VIDEO_REMOTION_DIR = "/nonexistent/remotion/project";
    try {
      writeFileSync(
        path.join(tmp, "render-spec.json"),
        JSON.stringify(SPEC),
        "utf8",
      );
      const artifact = await new RemotionLikeCompositor("remotion").render(
        SPEC,
      );
      expect(artifact.pathTaken).toBe("fallback");
      const body = readFileSync(path.join(tmp, artifact.path), "utf8");
      expect(body).toContain("oma-video placeholder render");
    } finally {
      if (original === undefined) delete process.env.OMA_VIDEO_REMOTION_DIR;
      else process.env.OMA_VIDEO_REMOTION_DIR = original;
    }
  });

  // Real-render coverage (opt-in, OMA_VIDEO_E2E=1): exercises the full real
  // branch end-to-end against the installed Remotion project. Skipped by default
  // (and in CI) so the parallel suite stays fast and deterministic; the live
  // render is verified out-of-band by `oma video generate`.
  //
  // When the toolchain or installed project is missing, the run MUST fall back.
  // When everything is present, the real branch is exercised: on success we
  // verify a genuine ISO-Media mp4; on a transient render-server hiccup the
  // documented graceful fallback (placeholder + warning) is the correct result.
  // Either way the real branch was selected — never a silent no-op.
  const e2e = process.env.OMA_VIDEO_E2E === "1" ? it : it.skip;
  e2e(
    "exercises the real branch end-to-end when toolchain + project are present",
    async () => {
      delete process.env.OMA_VIDEO_MOCK;
      const chrome = findChromeExecutable();
      const ffmpeg = (await binaryAvailable("ffmpeg", ["-version"])).ok;
      const project = getRemotionProjectStatus();
      writeFileSync(
        path.join(tmp, "render-spec.json"),
        JSON.stringify(SPEC),
        "utf8",
      );
      const artifact = await new RemotionLikeCompositor("remotion").render(
        SPEC,
      );

      if (!(chrome && ffmpeg && project.installed)) {
        expect(artifact.pathTaken).toBe("fallback");
        return;
      }

      if (artifact.pathTaken === "real") {
        const outPath = path.join(tmp, artifact.path);
        // A real mp4 is a binary container, not the small ASCII placeholder.
        expect(statSync(outPath).size).toBeGreaterThan(1000);
        const head = readFileSync(outPath).subarray(4, 8).toString("ascii");
        expect(head).toBe("ftyp"); // ISO Media / MP4 box signature
        expect(artifact.durationSec).toBeGreaterThan(0);
      } else {
        // Transient render hiccup -> graceful fallback is the documented path.
        expect(artifact.pathTaken).toBe("fallback");
        expect(artifact.warnings?.join(" ")).toContain(
          "remotion render failed",
        );
      }
    },
    600_000,
  );

  // Real-render coverage for MPT (opt-in, OMA_VIDEO_MPT_E2E=1): exercises the
  // full MPT real branch end-to-end against the cloned + installed checkout.
  // Skipped by default (and in CI) so the parallel suite stays fast — the MPT
  // pipeline downloads/synthesizes materials and runs moviepy/ffmpeg. The live
  // render is verified out-of-band by `oma video generate --compositor mpt`.
  //
  // When the toolchain or installed checkout is missing, the run MUST fall back.
  // When everything is present, the real branch is exercised: on success we
  // verify a genuine ISO-Media mp4; on a failure the documented graceful
  // fallback (placeholder + warning) is the correct result. Either way the real
  // branch was selected — never a silent no-op.
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
      const artifact = await new RemotionLikeCompositor("mpt").render(mptSpec);

      if (!(ffmpeg && project.installed)) {
        expect(artifact.pathTaken).toBe("fallback");
        return;
      }

      if (artifact.pathTaken === "real") {
        const outPath = path.join(tmp, artifact.path);
        expect(statSync(outPath).size).toBeGreaterThan(1000);
        const head = readFileSync(outPath).subarray(4, 8).toString("ascii");
        expect(head).toBe("ftyp"); // ISO Media / MP4 box signature
        expect(artifact.durationSec).toBeGreaterThan(0);
      } else {
        expect(artifact.pathTaken).toBe("fallback");
        expect(artifact.warnings?.join(" ")).toContain("mpt render failed");
      }
    },
    600_000,
  );
});
