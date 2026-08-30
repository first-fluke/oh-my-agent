import { readFile } from "node:fs/promises";
import path from "node:path";
import color from "picocolors";
import { loadVideoConfig } from "./config.js";
import { prepareRemotionRun } from "./internal/remotion-workspace.js";
import { parseVideoSchema, RenderSpecSchema } from "./types.js";

/**
 * `oma video compose <runDir>` — scaffold (or refresh) the run's Remotion
 * project on the always-latest toolchain + remotion-dev/skills, and print what
 * the agent needs to author the composition. Idempotent; never overwrites an
 * authored src/Root.tsx.
 */
export async function runVideoCompose({
  runDir,
  opts,
}: {
  runDir: string;
  opts: Record<string, unknown>;
}): Promise<number> {
  const resolvedDir = path.resolve(runDir);
  const renderSpecPath = path.join(resolvedDir, "render-spec.json");
  const spec = parseVideoSchema(
    "render-spec.json",
    RenderSpecSchema,
    JSON.parse(await readFile(renderSpecPath, "utf8")),
  );
  if (spec.compositor !== "remotion") {
    console.error(
      color.yellow(
        `render-spec compositor is "${spec.compositor}" — nothing to compose`,
      ),
    );
    return 0;
  }
  const config = await loadVideoConfig();
  const prepared = await prepareRemotionRun({
    runDir: resolvedDir,
    spec,
    checkIntervalMin: config.remotion.checkIntervalMin,
    force: opts.refresh === true,
    offline: opts.offline === true,
  });
  const out = {
    runDir: resolvedDir,
    renderSpecPath,
    composition: spec.composition,
    projectDir: prepared.project.projectDir,
    rootTsx: prepared.project.rootTsx,
    stub: prepared.project.stub,
    authoringGuide: prepared.project.authoringGuide,
    remotion: {
      version: prepared.toolchain.version,
      react: prepared.toolchain.reactVersion,
      dir: prepared.toolchain.dir,
      status: prepared.toolchain.status,
      note: prepared.toolchain.note,
      browserReady: prepared.toolchain.browserReady,
      fontReady: prepared.toolchain.fontReady,
    },
    skills: prepared.skills
      ? {
          ref: prepared.skills.ref,
          status: prepared.skills.status,
          note: prepared.skills.note,
          root: prepared.skills.root,
          files: prepared.skills.skills,
        }
      : null,
    next: prepared.project.stub
      ? `author ${prepared.project.rootTsx} per ${prepared.project.authoringGuide}, then \`oma video render ${resolvedDir}\``
      : `composition present — \`oma video render ${resolvedDir}\``,
  };
  if ((opts.format as string | undefined) === "json") {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(color.bold(`oma video compose — ${spec.composition}`));
    console.log(`  project:   ${out.projectDir}`);
    console.log(
      `  remotion:  ${out.remotion.version} (${out.remotion.status}${out.remotion.note ? `, ${out.remotion.note}` : ""})`,
    );
    console.log(
      `  skills:    ${out.skills ? `${out.skills.ref} (${Object.keys(out.skills.files).length} skills)` : color.yellow("unavailable")}`,
    );
    console.log(`  guide:     ${out.authoringGuide}`);
    console.log(`  next:      ${out.next}`);
  }
  return 0;
}
