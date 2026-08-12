/**
 * Skill override sections in `.agents/oma-config.yaml`.
 *
 * Seven skills used to ship a user-editable config inside their own skill
 * directory. `.agents/skills/` is replaced wholesale on every `oma update`, so
 * those edits did not survive; `.agents/oma-config.yaml` is the one file
 * install/update/uninstall treat as user-owned. Design: docs/plans/designs/
 * 024-unify-skill-configs.md.
 *
 * Sections are sparse: a user writes only the keys they changed, and an absent
 * key means "use the code default". Shipped defaults deliberately stay in code
 * (or in the shipped skill YAML for agent-read skills) so upstream tuning keeps
 * reaching existing installs.
 *
 * Precedence (§5 of the design):
 *
 *   built-in defaults < oma-config section < env < flags
 *
 * The legacy skill configs are not a tier: the CLI does not read them at all.
 * Migration 022 is the sole compatibility path — it moves a user's diverged keys
 * into oma-config, and the diff helpers below (`sparseDiff`, `omitPaths`) exist
 * for it rather than for any reader.
 */
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { findFileUpwards } from "../../utils/fs-utils.js";

/** Top-level oma-config keys that hold a skill's user overrides. */
export type SkillSectionName =
  | "video"
  | "image"
  | "voice"
  | "hwp"
  | "pdf"
  | "scholar";

export const OMA_CONFIG_RELATIVE_PATH = path.join(".agents", "oma-config.yaml");

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse `.agents/oma-config.yaml`, walking up from `cwd` so a project nested
 * under a global install still resolves. Returns undefined when the file is
 * missing, unreadable, or malformed — a broken root config must degrade to the
 * shipped defaults, never throw.
 */
export function readRootOmaConfig(
  cwd: string,
): Record<string, unknown> | undefined {
  const filePath = findFileUpwards(cwd, OMA_CONFIG_RELATIVE_PATH);
  if (!filePath) return undefined;
  try {
    const parsed = parseYaml(fs.readFileSync(filePath, "utf-8"));
    return isPlainObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Read one skill's override section out of an already-parsed root config.
 * Split from {@link loadSkillSection} so a caller that also needs a sibling key
 * (`language:`, say) pays for a single file read.
 */
export function skillSectionFrom(
  root: Record<string, unknown> | undefined,
  section: SkillSectionName,
): Record<string, unknown> | undefined {
  const value = root?.[section];
  return isPlainObject(value) ? value : undefined;
}

/** Read one skill's override section from `.agents/oma-config.yaml`. */
export function loadSkillSection(
  cwd: string,
  section: SkillSectionName,
): Record<string, unknown> | undefined {
  return skillSectionFrom(readRootOmaConfig(cwd), section);
}

// ---------------------------------------------------------------------------
// Sparse diff — "which leaves did the user actually change?"
// ---------------------------------------------------------------------------

function leavesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length && a.every((item, i) => leavesEqual(item, b[i]))
    );
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) if (!leavesEqual(a[key], b[key])) return false;
    return true;
  }
  return false;
}

/**
 * Leaves of `actual` that differ from `defaults`, as a sparse nested object.
 * Used by migration 022 to decide which legacy keys are the user's own.
 *
 * Keys absent from `actual` are omitted rather than treated as changes: the
 * whole point of a sparse section is that "absent" means "default". A key
 * present in `actual` but absent from `defaults` is a divergence and is kept.
 */
export function sparseDiff(
  actual: Record<string, unknown>,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const base = defaults[key];
    if (isPlainObject(value) && isPlainObject(base)) {
      const nested = sparseDiff(value, base);
      if (Object.keys(nested).length > 0) out[key] = nested;
    } else if (!leavesEqual(value, base)) {
      out[key] = value;
    }
  }
  return out;
}

/** Recursively merge `patch` onto `base`, returning a new object. */
export function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const current = out[key];
    out[key] =
      isPlainObject(value) && isPlainObject(current)
        ? deepMerge(current, value)
        : value;
  }
  return out;
}

/** Drop `paths` (dot-separated) from a sparse object, pruning empty parents. */
export function omitPaths(
  source: Record<string, unknown>,
  paths: readonly string[],
): Record<string, unknown> {
  const out = structuredClone(source);
  for (const dotted of paths) {
    const segments = dotted.split(".");
    const chain: Array<Record<string, unknown>> = [out];
    let cursor: Record<string, unknown> | undefined = out;
    for (const segment of segments.slice(0, -1)) {
      const next: unknown = cursor?.[segment];
      if (!isPlainObject(next)) {
        cursor = undefined;
        break;
      }
      chain.push(next);
      cursor = next;
    }
    if (!cursor) continue;
    delete cursor[segments[segments.length - 1] as string];
    // Prune parents left empty by the delete.
    for (let i = chain.length - 1; i > 0; i--) {
      const node = chain[i] as Record<string, unknown>;
      if (Object.keys(node).length > 0) break;
      delete (chain[i - 1] as Record<string, unknown>)[
        segments[i - 1] as string
      ];
    }
  }
  return out;
}
