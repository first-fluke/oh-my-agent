import type { z } from "zod";
import { sha256Hex } from "../../../utils/hash.js";
import { writeJsonFile } from "../manifest.js";
import {
  ManifestSchema,
  parseVideoSchema,
  VIDEO_SCHEMA_VERSION,
  type VideoManifest,
} from "../types.js";
import { maskUrl } from "./capture.js";
import type { RunContext } from "./run-context.js";

export async function writeValidatedJson<T extends z.ZodTypeAny>(
  schemaName: string,
  schema: T,
  filePath: string,
  value: unknown,
): Promise<z.infer<T>> {
  const parsed = parseVideoSchema(schemaName, schema, value);
  await writeJsonFile(filePath, parsed);
  return parsed;
}

export function buildManifest(args: {
  ctx: RunContext;
  brief: string;
  exitCode: number;
  includeBrief: boolean;
}): VideoManifest {
  const totalCost = Object.values(args.ctx.costBreakdown).reduce(
    (acc, value) => acc + value,
    0,
  );
  const manifest = {
    schemaVersion: VIDEO_SCHEMA_VERSION,
    runId: args.ctx.runId.value,
    mode: args.ctx.normalized.mode,
    providers: args.ctx.providers,
    assets: args.ctx.assets,
    outputs: args.ctx.outputs,
    cost: {
      usd: Number(totalCost.toFixed(4)),
      breakdown: args.ctx.costBreakdown,
    },
    warnings: args.ctx.warnings,
    exitCode: args.exitCode,
    // Live capture is nondeterministic; record it + a MASKED URL (never tokens).
    ...(args.ctx.nondeterministic ? { nondeterministic: true } : {}),
    ...(args.ctx.normalized.source === "web" && args.ctx.normalized.url
      ? { captureUrlMasked: maskUrl(args.ctx.normalized.url) }
      : {}),
    ...(args.includeBrief
      ? { prompt: args.brief }
      : { promptSha256: sha256Hex(args.brief) }),
  };
  return parseVideoSchema("manifest.json", ManifestSchema, manifest);
}
