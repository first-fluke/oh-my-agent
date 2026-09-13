import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse } from "smol-toml";

/**
 * Isolate bootstrap state while keeping native file authentication and config.
 * Credential bytes are never read or copied here. Native token refresh follows
 * the auth reference to the same file the normal CLI uses. Keyring keys depend
 * on canonical CODEX_HOME, so other credential backends cannot use this profile.
 */
export function stageCodexConfigHome(env: NodeJS.ProcessEnv): {
  env: NodeJS.ProcessEnv;
  cleanup: () => void;
} {
  const source = resolve(env.CODEX_HOME || join(homedir(), ".codex"));
  const configPath = join(source, "config.toml");
  const authPath = join(source, "auth.json");
  let store: unknown;
  if (existsSync(configPath)) {
    try {
      store = parse(
        readFileSync(configPath, "utf8"),
      ).cli_auth_credentials_store;
    } catch {
      throw new Error(
        "Protected Codex dispatch requires a valid native config.toml.",
      );
    }
  }
  if (store !== undefined && store !== "file") {
    throw new Error(
      "Protected Codex dispatch currently requires native file credential storage; keyring, auto, and ephemeral storage are unsupported.",
    );
  }
  if (!existsSync(authPath)) {
    throw new Error(
      "Protected Codex dispatch requires an existing native auth.json login; no API-key or vendor fallback is used.",
    );
  }
  const isolatedHome = mkdtempSync(join(tmpdir(), "oma-codex-profile-"));
  const cleanup = () => rmSync(isolatedHome, { recursive: true, force: true });
  try {
    chmodSync(isolatedHome, 0o700);
    if (existsSync(configPath))
      symlinkSync(configPath, join(isolatedHome, "config.toml"));
    symlinkSync(authPath, join(isolatedHome, "auth.json"));
    return { env: { ...env, CODEX_HOME: isolatedHome }, cleanup };
  } catch (error) {
    cleanup();
    throw error;
  }
}
