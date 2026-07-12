import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../../utils/frontmatter.js";
import type { SkillEmitResult, SkillValidationResult } from "./types.js";

/** SSOT for all skills. */
export const SKILLS_DIR = ".agents/skills";

/** Optional frontmatter fields recognized by the Agent Skills open spec. */
const OPTIONAL_FIELDS = [
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
] as const;

/** Recommended (not enforced) body length before overflow to references/. */
const RECOMMENDED_MAX_BODY_LINES = 500;

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Validate a skill's frontmatter against the Agent Skills open spec
 * (https://agentskills.io/specification):
 *  - `name`: 1-64 chars, lowercase alnum + hyphens, no leading/trailing/
 *    consecutive hyphens (enforced by the regex shape), MUST match the
 *    directory name.
 *  - `description`: 1-1024 chars, non-empty.
 *  - optional: license, compatibility, metadata, allowed-tools.
 */
export function validateSkillFrontmatter(
  dirName: string,
  frontmatter: Record<string, unknown>,
  bodyLineCount: number,
): SkillValidationResult {
  const errors: SkillValidationResult["errors"] = [];
  const warnings: SkillValidationResult["warnings"] = [];

  const name = frontmatter.name;
  if (typeof name !== "string" || name.length === 0) {
    errors.push({ field: "name", message: "name is required" });
  } else {
    if (name.length > 64) {
      errors.push({
        field: "name",
        message: `name is ${name.length} chars, must be 1-64`,
      });
    }
    if (!NAME_RE.test(name)) {
      errors.push({
        field: "name",
        message:
          "name must be lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens",
      });
    }
    if (name !== dirName) {
      errors.push({
        field: "name",
        message: `name "${name}" must match directory name "${dirName}"`,
      });
    }
  }

  const description = frontmatter.description;
  if (typeof description !== "string" || description.length === 0) {
    errors.push({ field: "description", message: "description is required" });
  } else if (description.length > 1024) {
    errors.push({
      field: "description",
      message: `description is ${description.length} chars, must be 1-1024`,
    });
  }

  const unknownKeys = Object.keys(frontmatter).filter(
    (key) =>
      key !== "name" &&
      key !== "description" &&
      !(OPTIONAL_FIELDS as readonly string[]).includes(key),
  );
  for (const key of unknownKeys) {
    warnings.push({
      field: key,
      message: `unrecognized frontmatter field "${key}" (not in the spec's optional set)`,
    });
  }

  if (bodyLineCount > RECOMMENDED_MAX_BODY_LINES) {
    warnings.push({
      field: "body",
      message: `body is ${bodyLineCount} lines, recommended max is ${RECOMMENDED_MAX_BODY_LINES} (overflow to references/)`,
    });
  }

  return {
    skill: dirName,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export interface TransformedSkill {
  frontmatter: Record<string, unknown>;
  body: string;
  overflow?: string;
}

/**
 * Normalize a skill's frontmatter (stable key order, drop unrecognized
 * fields) and, when the body exceeds the recommended line budget, split the
 * tail into an `overflow` blob destined for `references/overflow.md` with a
 * pointer left in place of the removed lines.
 *
 * This is a mechanical split (line-count based), not heading-aware: it
 * preserves every line of source content but does not attempt to find a
 * "natural" section boundary.
 */
export function transformSkill(
  frontmatter: Record<string, unknown>,
  body: string,
): TransformedSkill {
  const normalized: Record<string, unknown> = {
    name: frontmatter.name,
    // YAML folded (`>`) scalars keep a trailing newline; trim it so the
    // emitted description is a clean single line regardless of how the
    // source SKILL.md authored it.
    description:
      typeof frontmatter.description === "string"
        ? frontmatter.description.trim()
        : frontmatter.description,
  };
  for (const field of OPTIONAL_FIELDS) {
    if (frontmatter[field] !== undefined)
      normalized[field] = frontmatter[field];
  }

  const lines = body.split("\n");
  if (lines.length <= RECOMMENDED_MAX_BODY_LINES) {
    return { frontmatter: normalized, body };
  }

  const head = lines.slice(0, RECOMMENDED_MAX_BODY_LINES).join("\n");
  const tail = lines.slice(RECOMMENDED_MAX_BODY_LINES).join("\n");
  const pointer =
    "\n> **Note:** this file exceeded the Agent Skills spec's recommended " +
    "500-line body and was mechanically split by `oma emit`. The rest of " +
    "the content continues in `references/overflow.md`.\n";

  return {
    frontmatter: normalized,
    body: `${head}${pointer}`,
    overflow: tail,
  };
}

/** Discover skill directories under `.agents/skills/` (excludes `_shared` and dotfiles). */
export function discoverSkillDirs(repoRoot: string): string[] {
  const dir = join(repoRoot, SKILLS_DIR);
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith("_") &&
        !entry.name.startsWith("."),
    )
    .map((entry) => entry.name)
    .sort();
}

/** Recursively copy a directory's contents, skipping `SKILL.md` (handled separately). */
function copySkillAssets(sourceDir: string, destDir: string): void {
  if (!existsSync(sourceDir)) return;
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.name === "SKILL.md") continue;
    const src = join(sourceDir, entry.name);
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(dest, { recursive: true });
      cpSync(src, dest, { recursive: true, force: true });
    } else {
      mkdirSync(destDir, { recursive: true });
      cpSync(src, dest, { force: true });
    }
  }
}

/**
 * Validate and transform every skill under `.agents/skills/` into a
 * conformant Agent Skills folder under `outDir/<skill-name>/`.
 */
export function emitAgentSkills(
  repoRoot: string,
  outDir: string,
): SkillEmitResult[] {
  const dirNames = discoverSkillDirs(repoRoot);
  const results: SkillEmitResult[] = [];

  for (const dirName of dirNames) {
    const skillMdPath = join(repoRoot, SKILLS_DIR, dirName, "SKILL.md");
    if (!existsSync(skillMdPath)) continue;

    const content = readFileSync(skillMdPath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);
    const bodyLineCount = body.trim().split("\n").length;

    const validation = validateSkillFrontmatter(
      dirName,
      frontmatter,
      bodyLineCount,
    );
    const transformed = transformSkill(frontmatter, body);

    const skillOutDir = join(outDir, dirName);
    mkdirSync(skillOutDir, { recursive: true });
    writeFileSync(
      join(skillOutDir, "SKILL.md"),
      serializeFrontmatter(transformed.frontmatter, transformed.body.trim()),
    );

    if (transformed.overflow) {
      const referencesDir = join(skillOutDir, "references");
      mkdirSync(referencesDir, { recursive: true });
      writeFileSync(
        join(referencesDir, "overflow.md"),
        `${transformed.overflow.trim()}\n`,
      );
    }

    copySkillAssets(join(repoRoot, SKILLS_DIR, dirName), skillOutDir);

    results.push({
      skill: dirName,
      outDir: skillOutDir,
      validation,
      overflowed: Boolean(transformed.overflow),
    });
  }

  return results;
}

/** True when `path` exists and is a directory. */
export function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}
