import color from "picocolors";
import { loadVideoConfig } from "./config.js";
import { VideoOrchestrator } from "./orchestrator.js";
import { defaultVideoRegistry } from "./registry.js";

export interface RunVideoGenerateOptions {
  brief: string;
  opts: Record<string, unknown>;
}

export async function runVideoGenerate({
  brief,
  opts,
}: RunVideoGenerateOptions): Promise<number> {
  const config = await loadVideoConfig();
  const registry = defaultVideoRegistry(config, { cwd: process.cwd() });
  const orchestrator = new VideoOrchestrator(config, registry);
  const result = await orchestrator.generate({ brief, opts });
  const formatMode = (opts.format as string | undefined) ?? "text";

  if (formatMode === "json") {
    console.log(
      JSON.stringify({
        exitCode: result.exitCode,
        runDir: result.runDir,
        manifestPath: result.manifestPath,
        scriptPath: result.scriptPath,
        renderSpecPath: result.renderSpecPath,
        warnings: result.warnings,
        error: result.error,
      }),
    );
  } else if (result.exitCode === 0) {
    console.error(color.green("oma video generate complete"));
    if (result.runDir) console.error(color.cyan(`  run: ${result.runDir}`));
    if (result.manifestPath) {
      console.error(color.cyan(`  manifest: ${result.manifestPath}`));
    }
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        console.error(color.yellow(`  warning: ${warning}`));
      }
    }
  } else {
    console.error(color.red(result.error ?? "oma video generate failed"));
    if (result.manifestPath) {
      console.error(color.cyan(`  manifest: ${result.manifestPath}`));
    }
  }

  return result.exitCode;
}
