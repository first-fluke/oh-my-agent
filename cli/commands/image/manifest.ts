import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { Manifest, ManifestRun } from "./types.js";

export interface WriteManifestArgs {
  outDir: string;
  runId: { timestamp: string; shortid: string };
  prompt: string;
  includePrompt: boolean;
  options: { size: string; quality: string; count: number };
  costEstimate: number;
  runs: ManifestRun[];
  startedAt: number;
}

export async function writeManifest(args: WriteManifestArgs): Promise<string> {
  const manifest: Manifest = {
    schema_version: 1,
    timestamp: isoWithOffset(new Date(args.startedAt)),
    options: args.options,
    cost_estimate_usd: Number(args.costEstimate.toFixed(4)),
    runs: args.runs,
  };
  if (args.includePrompt) {
    manifest.prompt = args.prompt;
  } else {
    manifest.prompt_sha256 = createHash("sha256")
      .update(args.prompt)
      .digest("hex");
  }

  const manifestPath = path.join(args.outDir, "manifest.json");
  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  return manifestPath;
}

export function isoWithOffset(d: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${offset}`
  );
}
