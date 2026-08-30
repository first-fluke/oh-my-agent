import { readFile } from "node:fs/promises";
import path from "node:path";
import color from "picocolors";
import { RemotionLikeCompositor } from "./providers/compositor.js";
import { parseVideoSchema, RenderSpecSchema } from "./types.js";

/**
 * `oma video render <runDir>` — render the run's agent-authored Remotion
 * composition (`<runDir>/remotion/`) from render-spec.json, or the MPT branch.
 * The same run dir (spec + authored src + toolchain version in package.json)
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

  const compositor = new RemotionLikeCompositor(spec.compositor);
  const previousCwd = process.cwd();
  let artifactPath: string;
  let durationSec: number;
  let warnings: string[] = [];
  try {
    process.chdir(resolvedDir);
    const artifact = await compositor.render(spec);
    artifactPath = path.join(resolvedDir, artifact.path);
    durationSec = artifact.durationSec;
    warnings = artifact.warnings ?? [];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
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
