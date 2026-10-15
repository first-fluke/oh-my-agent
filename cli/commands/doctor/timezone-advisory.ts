import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { loadConfigLayers } from "../../utils/config-layers.js";
import { isRecord } from "../../utils/type-guards.js";

/**
 * The timezone the oh-my-agent maintainers work in. Shipped templates before
 * 2a8826d3 (`fix(install): stop shipping maintainer defaults to every
 * install`) pinned it, so it can sit in a user's shared config without the
 * user ever choosing it.
 */
export const LEGACY_TEMPLATE_TIMEZONE = "Asia/Seoul";

export interface TimezoneAdvisory {
  /** Shared config file that sets the timezone. */
  file: string;
  configured: string;
  system: string;
  message: string;
}

/** `timezone` set directly in one shared or local config file, if any. */
function fileTimezone(file: string): string | undefined {
  if (!existsSync(file)) return undefined;
  let text: string;
  try {
    text = readFileSync(file, "utf-8");
  } catch {
    return undefined;
  }
  if (file.endsWith(".cue")) {
    // Schema lines (`timezone?: string`) are not values; only a concrete
    // string assignment is.
    return /^[\t ]*timezone:[\t ]*"([^"]*)"/m.exec(text)?.[1];
  }
  try {
    const value: unknown = parseYaml(text);
    return isRecord(value) && typeof value.timezone === "string"
      ? value.timezone
      : undefined;
  } catch {
    return undefined;
  }
}

function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Warn when the resolved timezone is the old template default: it is
 * Asia/Seoul, the project's shared oma-config (not a local or global layer)
 * sets it, and the host runs in a different zone. A value the user chose
 * cannot be told apart from the leftover, so this only advises; nothing is
 * edited. Setting the timezone in oma-config.local.* silences it.
 */
export function collectTimezoneAdvisory(
  root: string,
  options: { system?: string; env?: NodeJS.ProcessEnv } = {},
): TimezoneAdvisory | null {
  let layers: ReturnType<typeof loadConfigLayers>;
  try {
    layers = loadConfigLayers(root, options.env ?? process.env);
  } catch {
    return null;
  }
  const configured = layers.config.timezone;
  if (configured !== LEGACY_TEMPLATE_TIMEZONE) return null;

  const { shared, local } = layers.sources;
  if (!shared) return null;
  if (local && fileTimezone(local) !== undefined) return null;
  // CUE outranks YAML, but YAML still fills keys the CUE omits. When the CUE
  // could not be evaluated, the loader fell back to YAML alone.
  const dir = dirname(shared);
  const candidates = shared.endsWith(".cue")
    ? ["oma-config.cue", "oma-config.yaml"]
    : ["oma-config.yaml"];
  const file = candidates
    .map((name) => join(dir, name))
    .find((path) => fileTimezone(path) !== undefined);
  if (!file || fileTimezone(file) !== LEGACY_TEMPLATE_TIMEZONE) return null;

  const system = options.system ?? systemTimeZone();
  if (system === LEGACY_TEMPLATE_TIMEZONE) return null;

  const name = basename(file);
  return {
    file,
    configured,
    system,
    message:
      `timezone: ${configured} in ${name} differs from the system timezone (${system}). ` +
      `Older oh-my-agent templates shipped ${configured} as a default, so it may not be your choice. ` +
      `Delete the timezone line in ${name} to follow the system timezone. ` +
      "If you want it, set it in your local config (oma-config.local.yaml or .local.cue) to silence this warning.",
  };
}
