import * as fs from "node:fs";
import { join } from "node:path";

/** How a `stack/` directory seeded from a shipped variant got there. */
export type SeededStackSource = "preset" | "migrated";

const SCHEMA_HINT = /^#\s*yaml-language-server:/;
const SOURCE_LINE = /^source:/;

/**
 * The `stack.yaml` for a `stack/` directory seeded from a shipped variant.
 *
 * The variant's own manifest is the contract `oma verify agent <type>` reads
 * (`framework`, `orm`, and the `verify:` commands and raw-SQL patterns), so it
 * is kept whole. Only two lines change: `source` records how the stack got
 * here, and the editor schema hint is dropped because it points into
 * `variants/`, which an installed project does not keep.
 *
 * A variant that ships no manifest gets the minimal one.
 */
export function seededStackManifest(
  variantDir: string,
  language: string,
  source: SeededStackSource,
): string {
  const manifestPath = join(variantDir, "stack.yaml");
  if (!fs.existsSync(manifestPath)) {
    return `language: ${language}\nsource: ${source}\n`;
  }
  const lines = fs
    .readFileSync(manifestPath, "utf-8")
    .trimEnd()
    .split("\n")
    .filter((line) => !SCHEMA_HINT.test(line));
  const sourceIndex = lines.findIndex((line) => SOURCE_LINE.test(line));
  if (sourceIndex >= 0) lines[sourceIndex] = `source: ${source}`;
  else lines.push(`source: ${source}`);
  return `${lines.join("\n")}\n`;
}

/**
 * The language of a manifest that is nothing but the `language` + `source:
 * preset` pair an older installer wrote in place of the variant's manifest,
 * or null for anything else (a real manifest, a customized one, other sources).
 *
 * Such a stub has no `verify:` block, so `oma verify agent` skips every check.
 * The language doubles as the variant directory name it was seeded from; it is
 * restricted to a plain slug because it is used to build a path.
 */
export function barePresetStubLanguage(manifest: string): string | null {
  const lines = manifest
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  if (lines.length !== 2) return null;
  const language = lines
    .find((line) => line.startsWith("language:"))
    ?.slice("language:".length)
    .trim();
  const isPreset = lines.some((line) => /^source:\s*preset$/.test(line));
  if (!isPreset || !language || !/^[a-z0-9][a-z0-9-]*$/.test(language)) {
    return null;
  }
  return language;
}
