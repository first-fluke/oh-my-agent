import { readFile } from "node:fs/promises";
import path from "node:path";
import color from "picocolors";
import { RemotionLikeCompositor } from "./providers/compositor.js";
import { parseVideoSchema, RenderSpecSchema } from "./types.js";

/**
 * `oma video render <runDir>` — re-render from render-spec.json (design §4.2).
 * The render-spec is the deterministic boundary, so this reproduces the same
 * output from the same spec. Live Remotion/MPT execution is F3-owned; the
 * compositor here keeps a deterministic boundary (real branch deferred).
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
