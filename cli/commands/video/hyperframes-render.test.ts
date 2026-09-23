import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoCompositor } from "./providers/compositor.js";
import { runVideoRender } from "./render.js";
import { RenderSpecSchema } from "./types.js";

const { runCapture, binaryAvailable } = vi.hoisted(() => ({
  runCapture: vi.fn(),
  binaryAvailable: vi.fn(),
}));
vi.mock("./internal/exec.js", () => ({ runCapture, binaryAvailable }));
const base = RenderSpecSchema.parse(
  JSON.parse(
    readFileSync(
      new URL("./__fixtures__/render-spec.valid.json", import.meta.url),
      "utf8",
    ),
  ),
);
const spec = {
  ...base,
  audio: {},
  slug: "test",
  scenes: [],
  captions: { ...base.captions, file: undefined },
};

describe("HyperFrames rendering", () => {
  let dir: string;
  let cwd: string;
  let lintCode: number;
  let renderCode: number;
  let duration: number;
  let output: boolean;
  beforeEach(() => {
    vi.stubEnv("OMA_VIDEO_MOCK", "0");
    vi.spyOn(console, "log").mockImplementation(() => {});
    cwd = process.cwd();
    dir = mkdtempSync(join(tmpdir(), "oma-hf-render-"));
    mkdirSync(join(dir, "hyperframes/node_modules/hyperframes/bin"), {
      recursive: true,
    });
    writeFileSync(
      join(dir, "hyperframes/node_modules/hyperframes/bin/hyperframes.mjs"),
      "// CLI",
    );
    writeFileSync(
      join(dir, "hyperframes/index.html"),
      "<!doctype html><p>authored</p>",
    );
    writeFileSync(join(dir, "render-spec.json"), JSON.stringify(spec));
    process.chdir(dir);
    lintCode = renderCode = 0;
    duration = spec.durationInFrames / spec.fps;
    output = true;
    runCapture.mockReset();
    binaryAvailable.mockResolvedValue({ ok: true, detail: "ready" });
    runCapture.mockImplementation(async (bin: string, args: string[]) => {
      if (bin === "ffprobe")
        return {
          code: 0,
          stderr: "",
          stdout: JSON.stringify({
            streams: [{ codec_type: "video", ...spec.dimensions }],
            format: { duration },
          }),
        };
      if (args.includes("lint"))
        return { code: lintCode, stdout: "lint result", stderr: "" };
      if (args.includes("render")) {
        if (output)
          writeFileSync(
            args[args.indexOf("--output") + 1] ?? "missing-output",
            "encoded output",
          );
        return { code: renderCode, stdout: "render result", stderr: "" };
      }
      throw new Error(`unexpected command ${bin}`);
    });
  });
  afterEach(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("runs lint before strict rendering and records the validated artifact in the manifest", async () => {
    const manifest = JSON.parse(
      readFileSync(
        new URL("./__fixtures__/manifest.valid.json", import.meta.url),
        "utf8",
      ),
    );
    manifest.warnings = [
      "compositor hyperframes: composition pending",
      "voice: estimated",
    ];
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest));
    expect(
      await runVideoRender({ runDir: dir, opts: { format: "json" } }),
    ).toBe(0);
    expect(runCapture.mock.calls[0]?.[1]).toContain("lint");
    expect(runCapture.mock.calls[1]?.[1]).toEqual(
      expect.arrayContaining([
        "render",
        "--strict",
        "--no-best-effort",
        "--fps",
        String(spec.fps),
      ]),
    );
    const updated = JSON.parse(
      readFileSync(join(dir, "manifest.json"), "utf8"),
    );
    expect(updated.outputs.video).toBe("shorts-test.mp4");
    expect(updated.outputs.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(updated.warnings).toEqual(["voice: estimated"]);
    expect(updated.assets.at(-1).path).toBe("shorts-test.mp4");
  });

  it("stops at lint errors without invoking render", async () => {
    lintCode = 1;
    await expect(new VideoCompositor().render(spec)).rejects.toThrow(
      "lint failed",
    );
    expect(runCapture).toHaveBeenCalledTimes(1);
  });

  it("removes partial output on render failure", async () => {
    renderCode = 1;
    await expect(new VideoCompositor().render(spec)).rejects.toThrow(
      "render exit 1",
    );
    expect(existsSync(join(dir, "shorts-test.mp4"))).toBe(false);
  });

  it("clears previously successful manifest output after a failed rerender", async () => {
    const manifest = JSON.parse(
      readFileSync(
        new URL("./__fixtures__/manifest.valid.json", import.meta.url),
        "utf8",
      ),
    );
    manifest.outputs = { video: "shorts-test.mp4", durationSec: 10 };
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest));
    renderCode = 1;
    expect(
      await runVideoRender({ runDir: dir, opts: { format: "json" } }),
    ).toBe(1);
    const failed = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
    expect(failed.exitCode).toBe(1);
    expect(failed.outputs).toEqual({});
    expect(failed.warnings.at(-1)).toContain("render exit 1");
  });

  it("does not accept stale output when a zero-exit renderer produces nothing", async () => {
    writeFileSync(join(dir, "shorts-test.mp4"), "stale");
    output = false;
    await expect(new VideoCompositor().render(spec)).rejects.toThrow(
      "did not produce",
    );
  });

  it("rejects output whose duration differs from the render spec", async () => {
    duration += 5;
    await expect(new VideoCompositor().render(spec)).rejects.toThrow(
      "does not match",
    );
    expect(existsSync(join(dir, "shorts-test.mp4"))).toBe(false);
  });
});
