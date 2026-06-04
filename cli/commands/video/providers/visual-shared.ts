// Shared helpers for visual providers: the deterministic placeholder asset that
// every visual fallback resolves to, and asset-copy-into-runDir utilities.
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VisualOpts } from "../providers.js";
import type { Scene, VisualAsset } from "../types.js";

const VISUALS_DIR = "visuals";

/**
 * Write a deterministic placeholder asset for a scene. Pure function of the
 * scene id + provider id + seed (no clock, no randomness), so the bytes are
 * identical on replay. Returned path is run-dir-relative.
 */
export async function writePlaceholder(
  scene: Scene,
  opts: Pick<VisualOpts, "runDir" | "seed">,
  providerId: string,
): Promise<VisualAsset> {
  await mkdir(path.join(opts.runDir, VISUALS_DIR), { recursive: true });
  const rel = path.join(VISUALS_DIR, `${scene.id}-placeholder.svg`);
  await writeFile(
    path.join(opts.runDir, rel),
    placeholderSvg(scene, opts.seed),
    "utf8",
  );
  return {
    sceneId: scene.id,
    path: rel,
    type: "placeholder",
    providerId,
    pathTaken: "fallback",
  };
}

/**
 * Copy an externally produced asset into runDir/visuals (design Tier-1 blind
 * review: all external assets are localized into the run dir, never URL refs).
 * Returns the run-dir-relative path.
 */
export async function ingestVisual(
  scene: Scene,
  runDir: string,
  sourcePath: string,
  type: VisualAsset["type"],
  providerId: string,
): Promise<VisualAsset> {
  await mkdir(path.join(runDir, VISUALS_DIR), { recursive: true });
  const ext = path.extname(sourcePath) || ".png";
  const rel = path.join(VISUALS_DIR, `${scene.id}-${providerId}${ext}`);
  await copyFile(sourcePath, path.join(runDir, rel));
  return {
    sceneId: scene.id,
    path: rel,
    type,
    providerId,
    pathTaken: "real",
  };
}

function placeholderSvg(scene: Scene, seed: number): string {
  // A fixed, deterministic SVG card. Remotion can render SVG/raster alike; the
  // exact bytes here are what the determinism harness pins.
  const label = scene.onScreenText[0] ?? scene.id;
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1088" height="1920" viewBox="0 0 1088 1920">',
    '<rect width="1088" height="1920" fill="#0f1117"/>',
    `<text x="544" y="960" fill="#e6e8ee" font-family="sans-serif" font-size="64" text-anchor="middle">${escapeXml(label)}</text>`,
    `<text x="544" y="1040" fill="#5b6170" font-family="sans-serif" font-size="28" text-anchor="middle">seed ${seed}</text>`,
    "</svg>",
    "",
  ].join("\n");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
