import { isOpencodeFamilyAuthenticated } from "../opencode/auth.js";

/**
 * Checks whether the user is authenticated for Kilo Code CLI (`kilo`).
 *
 * Kilo is an opencode fork and keeps opencode's credential store format in
 * `~/.local/share/kilo/auth.json` (`kilo auth list` prints that path): a
 * map from provider name (`kilo`, `openai`, `anthropic`, …) to an
 * `api` / `oauth` / `wellknown` entry. Same two modes as opencode:
 *   - **provider given** — is *this* provider authenticated (doctor --profile)?
 *   - **no argument** — does *any* provider carry a credential?
 *
 * Kilo's own gateway also serves free models anonymously, so `false` means
 * "no stored credential", not "kilo cannot run".
 */
export function isKiloAuthenticated(provider?: string): boolean {
  return isOpencodeFamilyAuthenticated("kilo", provider);
}
