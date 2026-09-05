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
 * Whether a single auth.json entry carries a usable credential. The `type`
 * discriminant decides which field must be present:
 *   - `"api"`:       API-key based auth; valid when `key` is present.
 *   - `"oauth"`:     OAuth token; valid when `access` is present.
 *   - `"wellknown"`: Well-known / ambient credential; always valid when present.
 */
function hasCredential(entry: OpencodeAuthEntry | undefined): boolean {
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

/**
 * Checks whether the user is authenticated for opencode (Sst opencode).
 *
 * opencode stores provider credentials in `~/.local/share/opencode/auth.json`
 * as a map from provider name (`opencode-go`, `openai`, `zai-coding-plan`, …)
 * to a credential entry, and it can run models from any provider the user has
 * logged into. The check therefore has two modes:
 *   - **provider given** — is *this* provider authenticated? Used by
 *     `oma doctor --profile`, where each row's provider comes from the
 *     registered model's `cli_model` prefix.
 *   - **no argument** — is opencode usable at all? True when *any* provider
 *     has a credential. Used by the vendor-level surfaces (`oma doctor`,
 *     `oma auth status`), which have no model row to derive a provider from.
 *     Checking only `opencode-go` there reported a user authenticated solely
 *     with, say, `zai-coding-plan` as logged out (issue #699).
 *
 * Returns `false` when the file is absent, contains malformed JSON, or no
 * matching entry carries a usable credential.
 */
export function isOpencodeAuthenticated(provider?: string): boolean {
  const auth = safeReadJson<Record<string, OpencodeAuthEntry>>(
    join(homedir(), ".local", "share", "opencode", "auth.json"),
  );

  if (!auth || typeof auth !== "object" || Array.isArray(auth)) {
    return false;
  }

  if (provider !== undefined) {
    return hasCredential(auth[provider]);
  }

  return Object.values(auth).some(hasCredential);
}
