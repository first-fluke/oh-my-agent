import type { z } from "zod";
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
    fps,
    dimensions,
    durationInFrames: cursor,
    audio: {
      narration: args.audio.path ? args.audio.path : undefined,
      music: args.script.music === "none" ? undefined : args.script.music,
      musicGainDb: args.script.music === "none" ? undefined : -16,
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
