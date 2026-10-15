import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { parse as parseYaml } from "yaml";
import { backupPathFromRoot } from "../../io/backup.js";
import { isRecord } from "../../utils/type-guards.js";

/**
 * Before 85a9cd34 (`fix(config): keep CUE-only projects on a single config
 * file`), `oma update` copied the release's `.agents/oma-config.cue` into
 * projects that only kept `oma-config.yaml`. CUE outranks YAML in the loader,
 * so that untouched template silently replaced the user's YAML settings with
 * the template's (language "en", timezone "Asia/Seoul", ...).
 *
 * A stray copy is recognised only when it still matches one of the shipped
 * templates below; a CUE file the user edited is never touched.
 *
 * SHA-256 of {@link normalizeSharedConfigText} over every version of
 * `.agents/oma-config.cue` a pre-85a9cd34 update could have copied
 * (`git log -p -- .agents/oma-config.cue`): b3e38e9d, 0a8695e5, ce686590,
 * d2affaed, b5a5598a. The list is closed: later templates ship only with the
 * fixed update, so a current template beside YAML (this source repository, or
 * a `--force` reset of both files) is deliberately not matched.
 */
export const SHIPPED_CUE_TEMPLATE_HASHES: ReadonlySet<string> = new Set([
  "da54f3d10cda452a1eba259225383e122d916d85bfca895c0c5c4326c601cc30", // b3e38e9d
  "f93b07b474540e66e4052b203edd138392b0e80e0477e0c2bfc94f1b5b72d97e", // 0a8695e5
  "f578d072eece93dbe417ebe3a2f29f8bc4c799db5578d322e9bb7e9ae63e1aa6", // ce686590
  "b94ef83dc404abba0ba9d4461deb9497ea3aa9f772d01abfd2cb8387e3d338e3", // d2affaed
  "d31ca742a460220f202c2669db2c0ccaccbf53f52e203c71d0ddec247ca5cee1", // b5a5598a
]);

/**
 * The same templates with the `language` and `model_preset` values masked.
 * `oma install` rewrites both values in oma-config.cue and oma-config.yaml at
 * once, so a stray copy that a later reinstall patched still counts as a
 * template — but only while those values equal the YAML's, so removing the CUE
 * cannot change them.
 */
export const SHIPPED_CUE_TEMPLATE_MASKED_HASHES: ReadonlySet<string> = new Set([
  "8831e21e56f9574f746b63f969525375d28be27c4ce9a7861f1b6f7524168193", // b3e38e9d
  "e6cdf44fc1e85e4672726dddb62f497eea2a6af098c75ff705bcb9334c24f60f", // 0a8695e5
  "f2ba6bc9f2e1c3915e331372c52b03a82134fcd8e410aac8c402deba3d82f9c3", // ce686590
  "5d48165fa6b05568c526fa5c7870c603d4aef0df1c80b605e84138b453ccd829", // d2affaed
  "33fb7d02885a2a58ae0d940df0d06becb6efc994f70eac918563bec11b2754da", // b5a5598a
]);

const INSTALLER_PATCHED_KEYS = ["language", "model_preset"] as const;

/** Byte-level noise that does not change meaning: BOM, CRLF, trailing blanks. */
export function normalizeSharedConfigText(text: string): string {
  return `${text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "")}\n`;
}

function installerValuePattern(key: string): RegExp {
  // Same shape `patchUserConfig` rewrites: the first quoted assignment.
  return new RegExp(
    `^([\\t ]*${key}:[\\t ]*)"([^"]*)"([\\t ]*(?:\\/\\/[^\\n]*)?)$`,
    "m",
  );
}

/** Values `oma install` patches into the CUE file, or null when absent. */
function readInstallerValues(text: string): Record<string, string | null> {
  return Object.fromEntries(
    INSTALLER_PATCHED_KEYS.map((key) => [
      key,
      installerValuePattern(key).exec(text)?.[2] ?? null,
    ]),
  );
}

export function maskInstallerValues(text: string): string {
  let masked = text;
  for (const key of INSTALLER_PATCHED_KEYS)
    masked = masked.replace(installerValuePattern(key), '$1"<masked>"$3');
  return masked;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function readYamlRecord(path: string): Record<string, unknown> | null {
  try {
    const value: unknown = parseYaml(readFileSync(path, "utf-8"));
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Whether `cueText` is an unmodified shipped template, given the YAML config
 * that sits beside it (needed for the installer-patched variant).
 */
export function isShippedCueTemplate(
  cueText: string,
  yamlConfig: Record<string, unknown> | null,
): boolean {
  const normalized = normalizeSharedConfigText(cueText);
  if (SHIPPED_CUE_TEMPLATE_HASHES.has(sha256(normalized))) return true;
  if (!yamlConfig) return false;
  const values = readInstallerValues(normalized);
  const agreesWithYaml = INSTALLER_PATCHED_KEYS.every(
    (key) => values[key] !== null && yamlConfig[key] === values[key],
  );
  return (
    agreesWithYaml &&
    SHIPPED_CUE_TEMPLATE_MASKED_HASHES.has(
      sha256(maskInstallerValues(normalized)),
    )
  );
}

export interface StrayCueRemoval {
  /** The removed `.agents/oma-config.cue`. */
  removed: string;
  /** Where the removed file was copied first. */
  backup: string;
}

/**
 * Remove an `.agents/oma-config.cue` that an older `oma update` copied next to
 * the user's `oma-config.yaml`. Acts only when both files exist and the CUE is
 * still a shipped template; the file is backed up under `.agents/backup/`
 * before removal. Returns null when nothing was changed.
 */
export function removeStrayCueTemplate(
  cwd: string,
  now: Date = new Date(),
): StrayCueRemoval | null {
  const cuePath = join(cwd, ".agents", "oma-config.cue");
  const yamlPath = join(cwd, ".agents", "oma-config.yaml");
  if (!existsSync(cuePath) || !existsSync(yamlPath)) return null;

  let cueText: string;
  try {
    cueText = readFileSync(cuePath, "utf-8");
  } catch {
    return null;
  }
  if (!isShippedCueTemplate(cueText, readYamlRecord(yamlPath))) return null;

  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const backup = backupPathFromRoot(
    cwd,
    "stray-shared-config",
    stamp,
    "oma-config.cue",
  );
  mkdirSync(dirname(backup), { recursive: true });
  copyFileSync(cuePath, backup);
  rmSync(cuePath, { force: true });
  return { removed: cuePath, backup };
}

/** One-paragraph update note for a {@link removeStrayCueTemplate} result. */
export function formatStrayCueRemoval(
  cwd: string,
  removal: StrayCueRemoval,
): string {
  return [
    `Removed ${relative(cwd, removal.removed)}: an unmodified template that an older \`oma update\` copied next to oma-config.yaml.`,
    "It outranked oma-config.yaml, so its defaults (language, timezone, ...) replaced your settings; oma-config.yaml applies again.",
    `Backup: ${relative(cwd, removal.backup)}`,
  ].join("\n");
}
