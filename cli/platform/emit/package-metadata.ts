import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Root `package.json` fields an emitted package manifest inherits. */
export interface PackageMetadata {
  version?: string;
  description?: string;
  author?: unknown;
  license?: string;
  homepage?: string;
  repository?: unknown;
}

/** Read the workspace root manifest; `{}` when the repo has none. */
export function readPackageMetadata(repoRoot: string): PackageMetadata {
  const sourceManifest = join(repoRoot, "package.json");
  return existsSync(sourceManifest)
    ? (JSON.parse(readFileSync(sourceManifest, "utf-8")) as PackageMetadata)
    : {};
}

/**
 * Manifest fields shared by every emitted host package: the release version
 * (release-please bumps it alongside the root), license, homepage and
 * repository. `author` is carried over when the root declares one.
 */
export function inheritedManifestFields(
  metadata: PackageMetadata,
  fallbackDescription: string,
): Record<string, unknown> {
  return {
    version: metadata.version ?? "0.0.0",
    description: metadata.description ?? fallbackDescription,
    ...(metadata.author ? { author: metadata.author } : {}),
    license: metadata.license ?? "MIT",
    ...(metadata.homepage ? { homepage: metadata.homepage } : {}),
    ...(metadata.repository ? { repository: metadata.repository } : {}),
  };
}
