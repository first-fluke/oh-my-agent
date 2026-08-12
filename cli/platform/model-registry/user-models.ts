// cli/platform/model-registry/user-models.ts
// Inline user model loader — testable internal.
//
// `.agents/oma-config.yaml`'s `models:` block is the only user-model source.
// `.agents/config/models.yaml` is no longer read: `oma uninstall` removes
// `.agents/config/` wholesale, so slugs kept there were never durable.
// Migration 022 folds any surviving file into oma-config (design 024).

import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { ModelSpecSchema } from "./schema.js";
import type { ModelSpec } from "./types.js";

/**
 * Walk up the directory tree from startDir looking for relativePath.
 * Returns the absolute file path if found, or null.
 */
function findFileUp(startDir: string, relativePath: string): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  while (current !== root) {
    const candidate = path.join(current, relativePath);
    if (fs.existsSync(candidate)) return candidate;
    current = path.dirname(current);
  }
  return null;
}

/**
 * Read the inline `models:` block from .agents/oma-config.yaml, walking up from
 * `cwd`. Returns the raw record without validating entries — callers pass it to
 * `getModelSpec(slug, userModels)`, which validates the single slug it needs via
 * ModelSpecSchema and warns on failure. Returns undefined when the file is
 * missing, unreadable, malformed, or has no `models:` key.
 */
export function loadInlineUserModels(
  cwd?: string,
): Record<string, unknown> | undefined {
  const searchDir = cwd ?? process.cwd();
  const filePath = findFileUp(
    searchDir,
    path.join(".agents", "oma-config.yaml"),
  );
  if (!filePath) return undefined;

  let raw: unknown;
  try {
    raw = parseYaml(fs.readFileSync(filePath, "utf-8"));
  } catch {
    // Malformed YAML — the config loader reports this elsewhere; stay silent
    // here so a probe/doctor read does not double-warn.
    return undefined;
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const models = (raw as Record<string, unknown>).models;
  if (!models || typeof models !== "object" || Array.isArray(models)) {
    return undefined;
  }
  return models as Record<string, unknown>;
}

/**
 * Validated counterpart to {@link loadInlineUserModels} — the `models:` block of
 * `.agents/oma-config.yaml` as ModelSpecs, ready to merge into the registry.
 *
 * Entries that fail validation are dropped silently. The same block is also read
 * raw by vendor resolution and `oma model probe`, which need far less than a
 * full ModelSpec — an abbreviated entry there is legitimate, and logging a
 * validation error for it every time the registry loads would be noise.
 */
export function loadInlineUserModelSpecs(cwd?: string): Map<string, ModelSpec> {
  const models = loadInlineUserModels(cwd);
  if (!models) return new Map();

  const result = new Map<string, ModelSpec>();
  for (const [slug, entry] of Object.entries(models)) {
    const parsed = ModelSpecSchema.safeParse(entry);
    if (!parsed.success) continue;

    const spec = parsed.data as ModelSpec;
    // api_only entries cannot run under a CLI at all.
    if (spec.supports.api_only) continue;

    result.set(slug, spec);
  }
  return result;
}
