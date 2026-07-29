// cli/platform/model-registry/user-models.ts
// User models.yaml loader — testable internal.

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
 *
 * This is the oma-config.yaml counterpart to loadUserModels(), which reads the
 * separate .agents/config/models.yaml file. Both are user-registered model
 * sources; call sites that resolve a slug's CLI need this one to see models
 * declared inline alongside `custom_presets:`.
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
 * Load and validate user-provided model entries from .agents/config/models.yaml.
 * Returns only valid, non-api_only entries as a Map.
 * Malformed YAML → logs error, returns empty Map.
 * Invalid entry → logs error, skips that entry.
 * api_only entry → logs warning, skips that entry.
 *
 * This is exported for unit-testing purposes.
 */
export function loadUserModels(cwd?: string): Map<string, ModelSpec> {
  const result = new Map<string, ModelSpec>();
  const searchDir = cwd ?? process.cwd();

  const filePath = findFileUp(
    searchDir,
    path.join(".agents", "config", "models.yaml"),
  );
  if (!filePath) return result;

  let raw: unknown;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    raw = parseYaml(content);
  } catch (err) {
    console.error(
      `[model-registry] Failed to parse .agents/config/models.yaml: ${err instanceof Error ? err.message : String(err)}`,
    );
    return result;
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    console.error(
      "[model-registry] .agents/config/models.yaml: root must be an object with a 'models' key.",
    );
    return result;
  }

  const rootObj = raw as Record<string, unknown>;
  if (
    !("models" in rootObj) ||
    typeof rootObj.models !== "object" ||
    rootObj.models === null ||
    Array.isArray(rootObj.models)
  ) {
    // No models key — treat as empty (not an error, e.g. empty file with comments)
    return result;
  }

  const models = rootObj.models as Record<string, unknown>;

  for (const [slug, entry] of Object.entries(models)) {
    const parsed = ModelSpecSchema.safeParse(entry);
    if (!parsed.success) {
      console.error(
        `[model-registry] User entry "${slug}" failed validation — skipping. Errors: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      );
      continue;
    }

    const spec = parsed.data as ModelSpec;

    if (spec.supports.api_only) {
      console.warn(
        `[model-registry] User entry "${slug}": api_only=true is not supported in CLI-only mode — skipping.`,
      );
      continue;
    }

    result.set(slug, spec);
  }

  return result;
}
