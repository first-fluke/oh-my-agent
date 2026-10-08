import { createHash } from "node:crypto";
import { getSecret } from "../io/vault.js";
import type { MemoryProvider } from "../types/memory.js";
import { resolveProjectRoot } from "../utils/fs-utils.js";
import { type HonchoConfig, HonchoConfigSchema } from "../utils/providers.js";
import { recallHoncho } from "./honcho-recall.js";
import { memoryEndpointIdentity } from "./memory-delivery-target.js";

type Options = {
  projectDir?: string;
  config: HonchoConfig;
  env?: NodeJS.ProcessEnv;
};

/** Honcho v3: one durable-fact session per project, shared across OMA runs. */
export function createHonchoMemoryProvider(options: Options): MemoryProvider {
  const config = HonchoConfigSchema.parse(options.config);
  const env = options.env ?? process.env;
  const base = (config.base_url ?? "https://api.honcho.dev").replace(
    /\/+$/,
    "",
  );
  const url = new URL(base);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const key = env[config.api_key_env ?? "HONCHO_API_KEY"];
  let vaultKey: Promise<string | null> | undefined;
  const workspace = config.workspace_id;
  const project = config.project_id ?? resolveProjectRoot(options.projectDir);
  const session = `oma-${createHash("sha256").update(project).digest("hex").slice(0, 32)}`;
  const peer = "oma";
  const path = `/v3/workspaces/${encodeURIComponent(workspace ?? "")}`;
  const timeout = config.timeout_ms ?? 5000;
  const limit = config.max_results ?? 8;
  const budget = config.max_tokens ?? 2000;
  const invalid =
    url.username || url.password || url.search || url.hash
      ? "Honcho base_url must not contain credentials, a query, or a fragment"
      : url.protocol !== "https:" && !(url.protocol === "http:" && local)
        ? "Honcho requires HTTPS, or HTTP on loopback for self-hosting"
        : !workspace
          ? "honcho.workspace_id is required"
          : !local && !key && !config.api_key_vault
            ? `Set ${config.api_key_env ?? "HONCHO_API_KEY"}`
            : undefined;

  async function resolveCredential(signal: AbortSignal) {
    if (key || !config.api_key_vault) return key;
    signal.throwIfAborted();
    vaultKey ??= getSecret(config.api_key_vault);
    let rejectAbort: (reason: unknown) => void = () => {};
    const aborted = new Promise<never>((_, reject) => {
      rejectAbort = reject;
    });
    const onAbort = () => rejectAbort(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      return await Promise.race([vaultKey, aborted]);
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  }

  async function request(route: string, signal: AbortSignal, body?: unknown) {
    const credential = await resolveCredential(signal);
    if (config.api_key_vault && !credential) {
      throw new Error("Configured Honcho vault credential is unavailable");
    }
    signal.throwIfAborted();
    const response = await fetch(`${base}${route}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "content-type": "application/json",
        ...(credential ? { Authorization: `Bearer ${credential}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      redirect: "error",
    });
    if (!response.ok) throw new Error(`Honcho HTTP ${response.status}`);
    return response;
  }

  return {
    name: "honcho",
    deliveryIdentity: {
      endpoint: memoryEndpointIdentity(base),
      workspace,
      session,
    },
    observeEvents: false,
    async status() {
      if (invalid)
        return { provider: "honcho", reachable: false, reason: invalid };
      try {
        // The list endpoint checks credentials and workspace access without creating data.
        await request(
          `${path}/sessions/list?size=1`,
          AbortSignal.timeout(timeout),
          {},
        );
        return { provider: "honcho", reachable: true, endpoint: base };
      } catch {
        return {
          provider: "honcho",
          reachable: false,
          endpoint: base,
          reason:
            "Honcho workspace unavailable; check endpoint, credentials, and timeout",
        };
      }
    },
    // Raw transcripts/event envelopes are intentionally unsupported.
    async observe() {
      return false;
    },
    async remember(payload) {
      const content = payload.content.trim();
      if (invalid || !content || content.length > 25000) return false;
      const signal = AbortSignal.timeout(timeout);
      try {
        await request("/v3/workspaces", signal, { id: workspace });
        await request(`${path}/sessions`, signal, {
          id: session,
          peers: { [peer]: {} },
        });
        await request(`${path}/sessions/${session}/messages`, signal, {
          messages: [
            {
              peer_id: peer,
              content,
              metadata: {
                source: "oma-durable-fact",
                source_session: payload.sessionId,
                importance: payload.importance ?? 5,
              },
            },
          ],
        });
        return true;
      } catch {
        return false;
      }
    },
    async recall(payload) {
      if (invalid || !payload.query.trim()) return [];
      const requested = Number.isFinite(payload.limit)
        ? Math.floor(payload.limit ?? limit)
        : limit;
      const count = Math.max(1, Math.min(requested, limit));
      return recallHoncho({
        request,
        path,
        workspace: workspace as string,
        session,
        peer,
        query: payload.query.slice(0, 8000),
        count,
        budget,
        timeout,
        includeRepresentation: config.recall_mode !== "messages",
      });
    },
  };
}
