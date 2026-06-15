import { homedir } from "node:os";
import { join } from "node:path";
import { safeReadJson } from "../../utils/safe-json.js";

/**
 * Shape of a single provider entry inside opencode's auth.json.
 * opencode stores credentials keyed by provider name; each entry has a `type`
 * discriminant and optional credential fields depending on that type.
 */
interface OpencodeAuthEntry {
  type: string;
  key?: string;
  access?: string;
  [key: string]: unknown;
}

/**
 * Checks whether the user is authenticated for opencode (Sst opencode).
 *
 * opencode stores provider credentials in `~/.local/share/opencode/auth.json`
 * as a map from provider name to an entry object with a `type` discriminant:
 *   - `"api"`:       API-key based auth; valid when `key` is present.
 *   - `"oauth"`:     OAuth token; valid when `access` is present.
 *   - `"wellknown"`: Well-known / ambient credential; always valid when present.
 *
 * Returns `false` when the file is absent, contains malformed JSON, or the
 * requested provider key does not exist or has an unrecognised type.
 */
export function isOpencodeAuthenticated(provider = "opencode-go"): boolean {
  const auth = safeReadJson<Record<string, OpencodeAuthEntry>>(
    join(homedir(), ".local", "share", "opencode", "auth.json"),
  );

  if (!auth || typeof auth !== "object") {
    return false;
  }

  const entry = auth[provider];
  if (!entry || typeof entry !== "object") {
    return false;
  }

  switch (entry.type) {
    case "api":
      return typeof entry.key === "string" && entry.key.length > 0;
    case "oauth":
      return typeof entry.access === "string" && entry.access.length > 0;
    case "wellknown":
      return true;
    default:
      return false;
  }
}
