import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Escape all regex metacharacters in a string so it can be safely embedded
 * in a `new RegExp(...)` constructor without treating any character as a
 * special pattern token. Prevents regex-injection when variant-supplied
 * `key` or `section` values contain parentheses, dots, brackets, etc.
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Ensure feature flags are enabled in a TOML config file.
 * Creates file if missing, appends section if not present.
 *
 * `key` and `section` originate from variant JSON (potentially attacker-
 * controlled via .agents/hooks/variants/<vendor>.json). Both values are
 * escaped with escapeRegExp() before being embedded in RegExp constructors so
 * malformed values cannot cause DoS (catastrophic backtracking, invalid regex)
 * or corrupt the file via `$`-bearing replacement strings.
 */
export function ensureFeatureFlags(
  configPath: string,
  section: string,
  flags: Record<string, boolean>,
): void {
  mkdirSync(dirname(configPath), { recursive: true });

  let content = "";
  if (existsSync(configPath)) {
    content = readFileSync(configPath, "utf-8");
  }

  const safeSection = escapeRegExp(section);

  for (const [key, value] of Object.entries(flags)) {
    const safeKey = escapeRegExp(key);
    const enabledRe = new RegExp(`${safeKey}\\s*=\\s*${value}`, "i");
    if (enabledRe.test(content)) continue;

    const disabledRe = new RegExp(`${safeKey}\\s*=\\s*${!value}`, "i");
    // Use a function replacer so attacker-controlled `key` cannot be
    // interpreted as a replacement pattern (e.g. `$&`, `$1`).
    const replacement = `${key} = ${value}`;
    if (disabledRe.test(content)) {
      content = content.replace(disabledRe, () => replacement);
      writeFileSync(configPath, content);
      continue;
    }

    const sectionRe = new RegExp(`\\[${safeSection}\\]`, "i");
    if (sectionRe.test(content)) {
      content = content.replace(
        new RegExp(`(\\[${safeSection}\\][^[]*)`, "i"),
        (match) => `${match}${replacement}\n`,
      );
      writeFileSync(configPath, content);
    } else {
      content = `${content.trimEnd()}\n\n[${section}]\n${replacement}\n`;
      writeFileSync(configPath, content);
    }
  }
}
