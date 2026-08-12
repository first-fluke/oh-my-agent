/**
 * Append template keys missing from the user's oma-config.yaml.
 *
 * `oma update` preserves the user's config byte-for-byte; this pass runs
 * afterwards and appends only top-level keys that the shipped template
 * defines but the user file lacks. Keys the user already has — modified or
 * not — are never touched, so the existing content stays byte-identical.
 */
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export interface ConfigMergeResult {
  content: string;
  addedKeys: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const UPDATE_HEADER =
  "Added by oma update — new config keys (template defaults; edit freely)";

/**
 * @param headerComment Comment introducing the appended block. Migrations pass
 * their own so the file records which change put the keys there.
 */
export function appendMissingConfigKeys(
  userRaw: string,
  templateRaw: string,
  headerComment: string = UPDATE_HEADER,
): ConfigMergeResult {
  const noop: ConfigMergeResult = { content: userRaw, addedKeys: [] };

  let user: Record<string, unknown>;
  let template: Record<string, unknown>;
  try {
    const parsedTemplate = parseYaml(templateRaw);
    if (!isPlainObject(parsedTemplate)) return noop;
    template = parsedTemplate;

    const parsedUser = parseYaml(userRaw);
    if (parsedUser === null || parsedUser === undefined) {
      user = {};
    } else if (isPlainObject(parsedUser)) {
      user = parsedUser;
    } else {
      return noop;
    }
  } catch {
    // Malformed YAML on either side — leave the user's file untouched
    return noop;
  }

  const missing: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(template)) {
    if (!(key in user)) missing[key] = value;
  }
  const addedKeys = Object.keys(missing);
  if (addedKeys.length === 0) return noop;

  const base =
    userRaw.length === 0 || userRaw.endsWith("\n") ? userRaw : `${userRaw}\n`;
  const block = `\n# ${headerComment}\n${stringifyYaml(missing)}`;
  return { content: base + block, addedKeys };
}
