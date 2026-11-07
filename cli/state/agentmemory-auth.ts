import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// AgentMemory >= 0.9.x always provisions an API secret and rejects REST calls
// without `Authorization: Bearer <secret>` (health included → 401). This
// mirrors AgentMemory's own client-side `resolveClientSecret`:
//   1. AGENTMEMORY_SECRET env (sent to any endpoint — the user chose it)
//   2. AGENTMEMORY_CREDENTIAL_MODE=explicit → stop (no file discovery)
//   3. Loopback endpoints only: AGENTMEMORY_SECRET in the env file
//      (AGENTMEMORY_ENV_FILE or ~/.agentmemory/.env), then the stored secret
//      (~/.agentmemory/secret, then $AGENTMEMORY_DATA_DIR/secret).
// File-discovered secrets are never sent to non-loopback hosts.
// Keep in sync with `.agents/hooks/core/agentmemory-client.ts` (hooks cannot
// import cli/).

const SECRET_KEY = "AGENTMEMORY_SECRET";

export interface AgentMemoryAuthOptions {
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
}

function usable(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  // Unexpanded `${VAR}` placeholders leak in from MCP/hook config templates.
  if (trimmed.startsWith("${") && trimmed.endsWith("}")) return "";
  return trimmed;
}

function unquote(value: string): string {
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.length > 1) {
    const close = value.indexOf(quote, 1);
    if (close !== -1) return value.slice(1, close);
  }
  const hash = value.indexOf(" #");
  return hash === -1 ? value : value.slice(0, hash).trim();
}

function readFileSecret(path: string): string {
  try {
    return usable(readFileSync(path, "utf-8"));
  } catch {
    return "";
  }
}

function readEnvFileSecret(path: string): string {
  let content: string;
  try {
    content = readFileSync(path, "utf-8");
  } catch {
    return "";
  }
  let found = "";
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed
      .slice(0, eq)
      .replace(/^export\s+/, "")
      .trim();
    if (key !== SECRET_KEY) continue;
    found = usable(unquote(trimmed.slice(eq + 1).trim()));
  }
  return found;
}

export function isLoopbackUrl(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  const bare = hostname.replace(/^\[|\]$/g, "");
  return (
    bare === "localhost" || bare === "::1" || /^127(?:\.\d{1,3}){3}$/.test(bare)
  );
}

export function resolveAgentMemorySecret(
  endpoint: string,
  options: AgentMemoryAuthOptions = {},
): string {
  const env = options.env ?? process.env;
  const fromEnv = usable(env[SECRET_KEY]);
  if (fromEnv) return fromEnv;
  if (env.AGENTMEMORY_CREDENTIAL_MODE === "explicit") return "";
  if (!isLoopbackUrl(endpoint)) return "";

  const home = join(options.homeDir ?? homedir(), ".agentmemory");
  const candidates = [
    () => readEnvFileSecret(env.AGENTMEMORY_ENV_FILE || join(home, ".env")),
    () => readFileSecret(join(home, "secret")),
    () =>
      env.AGENTMEMORY_DATA_DIR
        ? readFileSecret(join(env.AGENTMEMORY_DATA_DIR, "secret"))
        : "",
  ];
  for (const candidate of candidates) {
    const secret = candidate();
    if (secret) return secret;
  }
  return "";
}

export function agentMemoryAuthHeaders(
  endpoint: string,
  options: AgentMemoryAuthOptions = {},
): Record<string, string> {
  const secret = resolveAgentMemorySecret(endpoint, options);
  return secret ? { authorization: `Bearer ${secret}` } : {};
}
