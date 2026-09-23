import { readFile } from "node:fs/promises";
import path from "node:path";
import color from "picocolors";
import { collectAssetRecord, writeManifest } from "./manifest.js";
import { VideoCompositor } from "./providers/compositor.js";
import {
  ManifestSchema,
  parseVideoSchema,
  RenderSpecSchema,
  type VideoManifest,
} from "./types.js";

/**
 * `oma video render <runDir>` — render the run's agent-authored Hyperframes
 * composition (`<runDir>/hyperframes/`) from render-spec.json, or the MPT branch.
 * The same run dir (spec + authored HTML + toolchain version in package.json)
 * reproduces the same output. Failures exit 1 with the diagnostics — never a
 * silent placeholder outside OMA_VIDEO_MOCK=1.
 */
export async function runVideoRender({
  runDir,
  opts,
}: {
  runDir: string;
  opts: Record<string, unknown>;
}): Promise<number> {
  const resolvedDir = path.resolve(runDir);
  const renderSpecPath = path.join(resolvedDir, "render-spec.json");
  const raw = await readFile(renderSpecPath, "utf8");
  const spec = parseVideoSchema(
    "render-spec.json",
    RenderSpecSchema,
    JSON.parse(raw),
  );
  const formatMode = (opts.format as string | undefined) ?? "text";

  const compositor = new VideoCompositor(spec.compositor);
  const previousCwd = process.cwd();
  let artifactPath: string;
  let durationSec: number;
  let warnings: string[] = [];
  let manifest: VideoManifest | undefined;
  try {
    try {
      manifest = parseVideoSchema(
        "manifest.json",
        ManifestSchema,
        JSON.parse(
          await readFile(path.join(resolvedDir, "manifest.json"), "utf8"),
        ),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    process.chdir(resolvedDir);
    const artifact = await compositor.render(spec);
    artifactPath = path.join(resolvedDir, artifact.path);
    durationSec = artifact.durationSec;
    warnings = artifact.warnings ?? [];
    if (manifest) {
      const asset = await collectAssetRecord(
        resolvedDir,
        artifact.path,
        spec.seed,
      );
      manifest.providers.compositor = spec.compositor;
      manifest.outputs = {
        video: artifact.path,
        durationSec,
        sha256: asset.sha256,
      };
      manifest.assets = [
        ...manifest.assets.filter((entry) => entry.path !== asset.path),
        asset,
      ];
      manifest.warnings = manifest.warnings.filter(
        (warning) => !warning.includes("composition pending"),
      );
      manifest.warnings.push(...warnings);
      manifest.exitCode = 0;
      await writeManifest(resolvedDir, manifest);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (manifest) {
      const priorVideo = manifest.outputs.video;
      manifest.outputs = {};
      manifest.assets = manifest.assets.filter(
        (asset) => asset.path !== priorVideo,
      );
      manifest.exitCode = 1;
      manifest.warnings.push(`compositor ${spec.compositor}: ${message}`);
      await writeManifest(resolvedDir, manifest);
    }
    if (formatMode === "json") {
      console.log(
        JSON.stringify({
          exitCode: 1,
          runDir: resolvedDir,
          renderSpecPath,
          error: message,
        }),
      );
    } else {
      console.error(color.red(`oma video render failed: ${message}`));
    }
    return 1;
  } finally {
    process.chdir(previousCwd);
  }

  if (formatMode === "json") {
    console.log(
      JSON.stringify({
        exitCode: 0,
        runDir: resolvedDir,
        renderSpecPath,
        output: artifactPath,
        durationSec,
        warnings,
      }),
    );
  } else {
    console.error(color.green(`oma video render complete: ${artifactPath}`));
    for (const warning of warnings) {
      console.error(color.yellow(`  warning: ${warning}`));
    }
  }
  return 0;
}
