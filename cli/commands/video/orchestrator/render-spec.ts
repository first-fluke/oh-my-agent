import type { z } from "zod";
import { slugify } from "../naming.js";
import {
  type AudioRef,
  type CaptionStyleSchema,
  type Captions,
  type CompositorNameSchema,
  type RenderSpec,
  type Script,
  type Timing,
  VIDEO_SCHEMA_VERSION,
  type VideoModeSchema,
  type VisualAsset,
  type VisualModeSchema,
} from "../types.js";

export function visualProviderOrder(
  visual: z.infer<typeof VisualModeSchema>,
  mode: z.infer<typeof VideoModeSchema>,
  defaultOrder: string[],
): string[] {
  if (visual === "generate") return ["oma-image"];
  if (visual === "stock") return ["pexels", "oma-image"];
  if (visual === "aigc") return ["pixelle", "oma-image"];
  if (visual === "slide") return ["oma-slide", "oma-image"];
  if (mode === "explainer") return ["oma-slide", "oma-image", ...defaultOrder];
  return defaultOrder;
}

export function buildRenderSpec(args: {
  script: Script;
  timing: Timing;
  audio: AudioRef;
  captions?: Captions;
  visualAssets: VisualAsset[];
  compositor: z.infer<typeof CompositorNameSchema>;
  seed: number;
  captionStyle: z.infer<typeof CaptionStyleSchema>;
  /** Run-dir-relative live-capture footage to use as the video background. */
  footageBackground?: string;
}): RenderSpec {
  const fps = 30;
  const dimensions = dimensionsForAspect(args.script.aspect);
  let cursor = 0;
  const scenes = args.script.scenes.map((scene) => {
    const durationInFrames = Math.max(1, Math.round(scene.durationSec * fps));
    const visual = args.visualAssets.find(
      (asset) => asset.sceneId === scene.id,
    );
    const entry = {
      id: scene.id,
      fromFrame: cursor,
      durationInFrames,
      visual: {
        type: visual?.type ?? "placeholder",
        src: visual?.path ?? "",
        kenBurns: (visual?.type ?? "image") === "image",
      },
      onScreenText: scene.onScreenText,
      transitionOut: scene.transition,
    };
    cursor += durationInFrames;
    return entry;
  });
  return {
    schemaVersion: VIDEO_SCHEMA_VERSION,
    compositor: args.compositor,
    composition: compositionForMode(args.script.mode),
    slug: slugify(args.script.title),
    fps,
    dimensions,
    durationInFrames: cursor,
    audio: {
      narration: args.audio.path ? args.audio.path : undefined,
      // TODO(oma-deferred): music — `audio.music` must be a run-dir-relative
      // audio FILE for the compositor (`staticFile(...)`), but no music asset
      // source exists yet (no bundled loops, no provider). Writing the mode
      // string ("upbeat"/"calm") here produced a dangling file ref that could
      // fail the real Remotion render, so the field stays unset until an
      // asset source is wired; the requested mode is still recorded in
      // script.json. Mix at -18 dB default when implemented.
      music: undefined,
      musicGainDb: undefined,
    },
    scenes,
    captions: {
      file: args.captions?.path,
      style: args.captionStyle,
      fontFamily: "Pretendard",
      maxWidthPct: args.script.aspect === "9:16" ? 86 : 72,
      safeArea:
        args.script.aspect === "9:16"
          ? { topPct: 8, bottomPct: 18, leftPct: 7, rightPct: 7 }
          : { topPct: 6, bottomPct: 10, leftPct: 6, rightPct: 6 },
    },
    background: args.footageBackground
      ? { type: "video", src: args.footageBackground }
      : { type: "color", src: "#0f1117" },
    seed: args.seed,
  };
}

export function dimensionsForAspect(aspect: Script["aspect"]): {
  width: number;
  height: number;
} {
  if (aspect === "9:16") return { width: 1080, height: 1920 };
  if (aspect === "1:1") return { width: 1080, height: 1080 };
  return { width: 1920, height: 1080 };
}

function compositionForMode(mode: Script["mode"]): string {
  if (mode === "shorts") return "Shorts";
  if (mode === "demo") return "Demo";
  return "Explainer";
}
