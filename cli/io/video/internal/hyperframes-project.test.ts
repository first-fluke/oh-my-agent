import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RenderSpecSchema } from "../types.js";
import { scaffoldRunProject, stageRenderSpec } from "./hyperframes-project.js";
import {
  ensureLatestToolchain,
  type Toolchain,
  toolchainDir,
  toolchainRoot,
} from "./hyperframes-workspace.js";

const spec = RenderSpecSchema.parse(
  JSON.parse(
    readFileSync(
      new URL(
        "../../../commands/video/__fixtures__/render-spec.valid.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ),
);

describe("HyperFrames project", () => {
  let root: string;
  let runDir: string;
  let toolchain: Toolchain;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-hyperframes-"));
    runDir = join(root, "run with spaces");
    mkdirSync(runDir);
    const dir = join(root, "toolchain");
    mkdirSync(join(dir, "node_modules", "gsap", "dist"), { recursive: true });
    writeFileSync(
      join(dir, "node_modules", "gsap", "dist", "gsap.min.js"),
      "// local GSAP",
    );
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        dependencies: { hyperframes: "0.8.62", gsap: "3.14.2" },
      }),
    );
    toolchain = {
      dir,
      version: "0.8.62",
      status: "current",
      browserReady: true,
      fontReady: false,
    };
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("stages image, capture, narration, music and captions without changing the asset bus", () => {
    const input = structuredClone(spec);
    for (const name of [
      "scene.svg",
      "capture.mp4",
      "narration.wav",
      "music.wav",
      "captions.srt",
    ])
      writeFileSync(join(runDir, name), name);
    const scene = input.scenes[0];
    if (!scene) throw new Error("fixture scene missing");
    scene.visual = {
      type: "image",
      src: "scene.svg",
      kenBurns: false,
    };
    input.background = { type: "video", src: "capture.mp4" };
    input.audio = {
      narration: "narration.wav",
      music: "music.wav",
      musicGainDb: -18,
    };
    input.captions.file = "captions.srt";
    const original = structuredClone(input);
    const staged = stageRenderSpec(runDir, input);
    expect(input).toEqual(original);
    expect(staged.scenes[0]?.visual.src).toBe("assets/scene.svg");
    expect(staged.background.src).toBe("assets/capture.mp4");
    expect(staged.audio).toEqual({
      narration: "assets/narration.wav",
      music: "assets/music.wav",
      musicGainDb: -18,
    });
    expect(staged.captions.file).toBe("assets/captions.srt");
    expect(
      readFileSync(join(runDir, "hyperframes/assets/music.wav"), "utf8"),
    ).toBe("music.wav");
    expect(
      readFileSync(join(runDir, "hyperframes/render-spec.js"), "utf8"),
    ).toContain("window.OMA_VIDEO_SPEC");
  });

  it("rejects remote, absolute, traversal and symlink assets outside the run", () => {
    const outside = join(root, "private.wav");
    writeFileSync(outside, "private");
    symlinkSync(outside, join(runDir, "linked.wav"));
    for (const narration of [
      outside,
      "../private.wav",
      "linked.wav",
      "https://example.com/a.wav",
    ]) {
      const input = {
        ...spec,
        scenes: [],
        audio: { narration },
        captions: { ...spec.captions, file: undefined },
      };
      expect(() => stageRenderSpec(runDir, input)).toThrow(
        /run-relative|escapes run/,
      );
    }
  });

  it("preserves authored HTML when refreshing the toolchain and contract", () => {
    const input = {
      ...spec,
      audio: {},
      scenes: [],
      captions: { ...spec.captions, file: undefined },
    };
    const first = scaffoldRunProject({ runDir, spec: input, toolchain });
    expect(first.stub).toBe(true);
    const authored = "<!doctype html><p>한글 자막</p>";
    writeFileSync(first.entryHtml, authored);
    const next = scaffoldRunProject({ runDir, spec: input, toolchain });
    expect(next.stub).toBe(false);
    expect(readFileSync(next.entryHtml, "utf8")).toBe(authored);
    expect(readFileSync(next.authoringGuide, "utf8")).toContain(
      "data-composition-id",
    );
  });

  it("does not download an unavailable toolchain in offline mode", async () => {
    const fetchLatest = async () => {
      throw new Error("network used");
    };
    expect(
      await ensureLatestToolchain({
        home: root,
        offline: true,
        checkIntervalMin: 60,
        fetchLatest,
      }),
    ).toBeUndefined();
  });

  it("uses a complete cached version without a network check inside the refresh interval", async () => {
    const dir = toolchainDir("0.8.62", root);
    mkdirSync(join(dir, "node_modules/hyperframes/bin"), { recursive: true });
    mkdirSync(join(dir, "node_modules/gsap/dist"), { recursive: true });
    mkdirSync(join(dir, "fonts"), { recursive: true });
    writeFileSync(
      join(dir, "node_modules/hyperframes/bin/hyperframes.mjs"),
      "// CLI",
    );
    writeFileSync(join(dir, "node_modules/gsap/dist/gsap.min.js"), "// GSAP");
    writeFileSync(join(dir, "fonts/PretendardVariable.woff2"), "font");
    writeFileSync(join(dir, "chrome"), "browser");
    writeFileSync(
      join(dir, "browser.json"),
      JSON.stringify({ path: join(dir, "chrome") }),
    );
    writeFileSync(
      join(toolchainRoot(root), "state.json"),
      JSON.stringify({ version: "0.8.62", lastCheck: "2026-09-23T00:00:00Z" }),
    );
    const fetchLatest = vi.fn();
    const run = vi.fn();
    const result = await ensureLatestToolchain({
      home: root,
      checkIntervalMin: 60,
      now: () => new Date("2026-09-23T00:30:00Z"),
      fetchLatest,
      run,
    });
    expect(result).toMatchObject({
      version: "0.8.62",
      status: "current",
      browserReady: true,
      fontReady: true,
    });
    expect(fetchLatest).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    const stale = await ensureLatestToolchain({
      home: root,
      checkIntervalMin: 0,
      fetchLatest: async () => {
        throw new Error("offline");
      },
      run,
    });
    expect(stale).toMatchObject({ version: "0.8.62", status: "stale" });
    expect(run).not.toHaveBeenCalled();
  });
});
