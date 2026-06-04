import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "../../utils/hash.js";
import {
  ManifestSchema,
  parseVideoSchema,
  type VideoManifest,
} from "./types.js";

export async function writeJsonFile<T>(
  filePath: string,
  value: T,
): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeManifest(
  runDir: string,
  manifest: VideoManifest,
): Promise<string> {
  const validated = parseVideoSchema("manifest.json", ManifestSchema, manifest);
  const manifestPath = path.join(runDir, "manifest.json");
  await writeJsonFile(manifestPath, validated);
  return manifestPath;
}

export async function collectAssetRecord(
  runDir: string,
  assetPath: string,
  seed?: number,
): Promise<VideoManifest["assets"][number]> {
  const absolute = path.resolve(runDir, assetPath);
  const [bytes, content] = await Promise.all([
    stat(absolute),
    readFile(absolute),
  ]);
  return {
    path: path.relative(runDir, absolute),
    sha256: sha256Hex(content),
    bytes: bytes.size,
    ...(seed === undefined ? {} : { seed }),
  };
}
