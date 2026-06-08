import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Provider API-key env vars pi can use without an OAuth login. pi is a
 * multi-provider proxy (BYOK), so any one of these is sufficient for a
 * non-interactive/headless run against that provider.
 */
const PI_PROVIDER_ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "DEEPSEEK_API_KEY",
  "XAI_API_KEY",
  "MISTRAL_API_KEY",
  "AZURE_OPENAI_API_KEY",
] as const;

/**
 * Resolve pi's agent directory. pi honors `PI_CODING_AGENT_DIR` as an override;
 * otherwise it defaults to `~/.pi/agent`.
 */
function piAgentDir(env: NodeJS.ProcessEnv): string {
  const override = env.PI_CODING_AGENT_DIR?.trim();
  if (override) {
    return override;
  }
  return join(homedir(), ".pi", "agent");
}

/**
 * Checks whether the user is authenticated for pi (Earendil pi-coding-agent).
 *
 * pi stores OAuth/API credentials in `~/.pi/agent/auth.json` (mode 0600), with
 * the directory overridable via `PI_CODING_AGENT_DIR`. Because pi is a
 * multi-provider proxy, a provider API key in the environment is also a valid
 * non-interactive credential path and takes precedence (common for CI).
 */
export function isPiAuthenticated(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  // Any provider API key is sufficient for a headless pi run.
  if (PI_PROVIDER_ENV_KEYS.some((key) => env[key]?.trim())) {
    return true;
  }

  const authPath = join(piAgentDir(env), "auth.json");
  if (!existsSync(authPath)) {
    return false;
  }

  try {
    const data = JSON.parse(readFileSync(authPath, "utf-8"));

    // auth.json is an object keyed by provider/issuer; entries carry a literal
    // key, a `$VAR` reference, or a `!command` to execute. Any non-empty entry
    // counts as a configured credential.
    if (typeof data !== "object" || data === null) {
      return false;
    }

    return Object.values(data).some((entry) => {
      if (typeof entry === "string") {
        return entry.length > 0;
      }
      if (entry && typeof entry === "object") {
        return Object.keys(entry).length > 0;
      }
      return false;
    });
  } catch {
    return false;
  }
}
