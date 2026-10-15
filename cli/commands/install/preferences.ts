import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { isMap, parseDocument } from "yaml";
import { loadUserConfig } from "../../io/runtime-dispatch/config-loader.js";
import { writeVendorsToConfig } from "../../platform/skills-installer.js";
import type { CliVendor } from "../../types/index.js";
import {
  ConfigLayerError,
  LOCAL_CONFIG_NAMES,
  loadConfigLayers,
  type PreferenceEntry,
  planPreferenceWrite,
} from "../../utils/config-layers.js";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
  zh: "中文",
  vi: "Tiếng Việt",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  nl: "Nederlands",
  pl: "Polski",
  pt: "Português",
  ru: "Русский",
  th: "ไทย",
};

/**
 * Languages with a translated README under the repository's `docs/`. The
 * release asset ships `.agents/` only, so this list is offered when the
 * downloaded payload has no `docs/` directory. install.test.ts keeps it in
 * sync with `docs/README.*.md`.
 */
export const README_LANGUAGES = [
  "en",
  "de",
  "es",
  "fr",
  "ja",
  "ko",
  "nl",
  "pl",
  "pt",
  "ru",
  "th",
  "vi",
  "zh",
] as const;

export function scanLanguages(
  repoDir: string,
): { value: string; label: string }[] {
  const docsDir = join(repoDir, "docs");
  let codes: string[];

  if (existsSync(docsDir)) {
    codes = ["en"];
    for (const file of readdirSync(docsDir)) {
      const match = file.match(/^README\.(.+)\.md$/);
      if (match?.[1]) codes.push(match[1]);
    }
  } else {
    codes = [...README_LANGUAGES];
  }

  return codes.map((code) => ({
    value: code,
    label: LANGUAGE_NAMES[code] ?? code,
  }));
}

function hasSharedConfig(targetDir: string): boolean {
  return ["oma-config.cue", "oma-config.yaml"].some((name) =>
    existsSync(join(targetDir, ".agents", name)),
  );
}

/** Saved `language`, from oma-config.cue or oma-config.yaml (CUE-only too). */
export function getExistingLanguage(targetDir: string): string | null {
  if (!hasSharedConfig(targetDir)) return null;
  try {
    // Not loadUserConfig: a legacy preset name must not hide the language.
    const language = loadConfigLayers(targetDir).config.language;
    return typeof language === "string" && /^[A-Za-z-]+$/.test(language)
      ? language
      : null;
  } catch {
    return null;
  }
}

export function getExistingPreset(targetDir: string): string | null {
  if (!hasSharedConfig(targetDir)) return null;
  try {
    return loadUserConfig(targetDir).model_preset ?? null;
  } catch {
    return null;
  }
}

/**
 * Patch oma-config.yaml with selected language, model_preset, and vendors.
 * Uses regex-level replacement to preserve user-edited fields (timezone, etc.).
 *
 * oma-config.cue gets the same regex patch for quoted top-level
 * `language: "..."` / `model_preset: "..."` lines. A key it cannot patch that
 * way (a default, a disjunction, a nested struct, or no line at all) is saved
 * where it takes effect through {@link planPreferenceWrite}, never skipped
 * silently.
 */
export function patchUserConfig(
  installRoot: string,
  language: string,
  modelPreset: string,
  vendors: CliVendor[],
): void {
  const cuePath = join(installRoot, ".agents", "oma-config.cue");
  // Keys written to a shared file, which a local overlay may still override.
  const patched: PreferenceEntry[] = [];
  if (existsSync(cuePath)) {
    const original = readFileSync(cuePath, "utf-8");
    let content = original;
    const unpatched: PreferenceEntry[] = [];
    for (const [key, value] of [
      ["language", language],
      ["model_preset", modelPreset],
    ] as const) {
      const line = new RegExp(
        `^([\\t ]*${key}:[\\t ]*)"[^"]*"([\\t ]*(?:\\/\\/[^\\n]*)?)$`,
        "m",
      );
      if (line.test(content))
        content = content.replace(
          line,
          (_, head, tail) => `${head}"${value}"${tail}`,
        );
      else unpatched.push([[key], value]);
    }
    if (content !== original) writeFileSync(cuePath, content);
    if (unpatched.length) savePreferences(installRoot, unpatched);
    for (const [key, value] of [
      ["language", language],
      ["model_preset", modelPreset],
    ] as const)
      if (!unpatched.some(([keys]) => keys[0] === key))
        patched.push([[key], value]);
  }

  const userPrefsPath = join(installRoot, ".agents", "oma-config.yaml");
  if (existsSync(userPrefsPath)) {
    let prefs = readFileSync(userPrefsPath, "utf-8");

    // Update language field
    prefs = prefs.replace(/^language:\s*.+$/m, `language: ${language}`);

    // Update or insert model_preset field
    if (/^model_preset:/m.test(prefs)) {
      prefs = prefs.replace(
        /^model_preset:\s*.+$/m,
        `model_preset: ${modelPreset}`,
      );
    } else {
      // Insert model_preset after language line (preserve user fields)
      prefs = prefs.replace(
        /^(language:\s*.+)$/m,
        `$1\nmodel_preset: ${modelPreset}`,
      );
    }

    writeFileSync(userPrefsPath, prefs);
    // Beside oma-config.cue the CUE patch above decides where each key went.
    if (!existsSync(cuePath))
      patched.push([["language"], language], [["model_preset"], modelPreset]);
  }
  reconcileLocalOverlay(installRoot, patched);
  // Handles oma-config.yaml and CUE projects (local overlay) alike.
  writeVendorsToConfig(installRoot, vendors);
}

/**
 * The local overlay outranks oma-config.cue and oma-config.yaml, so a
 * `language` / `model_preset` it still sets would hide the choice just written
 * to the shared file. A YAML overlay is updated in place (comments and other
 * keys kept); an oma-config.local.cue cannot be patched, so a warning names it.
 */
function reconcileLocalOverlay(root: string, entries: PreferenceEntry[]): void {
  if (!entries.length) return;
  const [localCueName, localYamlName] = LOCAL_CONFIG_NAMES;
  const localCue = join(root, ".agents", localCueName);
  const localYaml = join(root, ".agents", localYamlName);
  if (existsSync(localCue)) {
    const text = readFileSync(localCue, "utf-8");
    const stale = entries.filter(([keys]) =>
      new RegExp(`^[\\t ]*${keys[0]}[\\t ]*:`, "m").test(text),
    );
    if (stale.length)
      p.log.warn(
        `${localCue} sets ${stale.map(([keys]) => keys[0]).join(", ")}, which outranks the shared config: set ${stale.map(([keys, value]) => `${keys[0]}: "${String(value)}"`).join(", ")} there for the choice to take effect.`,
      );
    return;
  }
  if (!existsSync(localYaml)) return;
  const doc = parseDocument(readFileSync(localYaml, "utf-8"));
  // An invalid overlay is reported by every config read; leave it alone.
  if (doc.errors.length || !isMap(doc.contents)) return;
  const stale = entries.filter(
    ([keys, value]) => doc.hasIn(keys) && doc.getIn(keys) !== value,
  );
  if (!stale.length) return;
  for (const [keys, value] of stale) doc.setIn(keys, value);
  writeFileSync(localYaml, doc.toString());
  p.log.info(
    `${localYaml} (local, gitignored) also set ${stale.map(([keys]) => keys.join(".")).join(", ")}, which outranks the shared config; updated it so the choice takes effect.`,
  );
}

/** Write top-level scalar preferences where they take effect, and say where. */
function savePreferences(root: string, entries: PreferenceEntry[]): void {
  let plan: ReturnType<typeof planPreferenceWrite>;
  try {
    plan = planPreferenceWrite(root, entries);
  } catch (error) {
    // An oma-config.local.cue overlay cannot be patched: say so, keep installing.
    if (!(error instanceof ConfigLayerError)) throw error;
    p.log.warn(`Not saved: ${error.message}`);
    return;
  }
  if (plan.warning) p.log.warn(plan.warning);
  if (!plan.entries.length) return;
  const doc = parseDocument(
    existsSync(plan.path) ? readFileSync(plan.path, "utf-8") : "",
  );
  if (doc.errors.length || (doc.contents != null && !isMap(doc.contents)))
    throw new Error(`Invalid configuration in ${plan.path}`);
  for (const [keys, value] of plan.entries) doc.setIn(keys, value);
  writeFileSync(plan.path, doc.toString());
  p.log.info(
    plan.notice ??
      `Saved ${plan.entries.map(([keys]) => keys.join(".")).join(", ")} to ${plan.path}.`,
  );
}
