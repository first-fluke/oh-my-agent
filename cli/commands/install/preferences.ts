import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadUserConfig } from "../../io/runtime-dispatch/config-loader.js";
import { writeVendorsToConfig } from "../../platform/skills-installer.js";
import type { CliVendor } from "../../types/index.js";

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

export function getExistingLanguage(targetDir: string): string | null {
  const prefsPath = join(targetDir, ".agents", "oma-config.yaml");
  if (!existsSync(prefsPath)) return null;

  try {
    const prefs = readFileSync(prefsPath, "utf-8");
    const match = prefs.match(/^language:\s*([A-Za-z-]+)/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function getExistingPreset(targetDir: string): string | null {
  if (
    !["oma-config.cue", "oma-config.yaml"].some((name) =>
      existsSync(join(targetDir, ".agents", name)),
    )
  )
    return null;
  try {
    return loadUserConfig(targetDir).model_preset ?? null;
  } catch {
    return null;
  }
}

/**
 * Patch oma-config.yaml with selected language, model_preset, and vendors.
 * Uses regex-level replacement to preserve user-edited fields (timezone, etc.).
 */
export function patchUserConfig(
  installRoot: string,
  language: string,
  modelPreset: string,
  vendors: CliVendor[],
): void {
  const cuePath = join(installRoot, ".agents", "oma-config.cue");
  if (existsSync(cuePath)) {
    let content = readFileSync(cuePath, "utf-8");
    content = content.replace(
      /^([\t ]*language:[\t ]*)"[^"]*"([\t ]*(?:\/\/[^\n]*)?)$/m,
      `$1"${language}"$2`,
    );
    content = content.replace(
      /^([\t ]*model_preset:[\t ]*)"[^"]*"([\t ]*(?:\/\/[^\n]*)?)$/m,
      `$1"${modelPreset}"$2`,
    );
    writeFileSync(cuePath, content);
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
    writeVendorsToConfig(installRoot, vendors);
  }
}
