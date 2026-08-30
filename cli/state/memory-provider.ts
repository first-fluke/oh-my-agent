import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { http } from "../io/http.js";
import type {
  AgentMemoryProviderOptions,
  MemoryProvider,
  MemoryProviderStatus,
  MemoryRecallResult,
  MemoryRememberPayload,
} from "../types/memory.js";

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

// Reachability keys off the /agentmemory/health body, because recent
// AgentMemory releases stopped sending the `x-agentmemory-version` header and
// only expose the version inside the JSON body.
function inspectHealthBody(data: unknown): {
  isAgentMemory: boolean;
  version?: string;
} {
  if (!data || typeof data !== "object") return { isAgentMemory: false };
  const body = data as {
    service?: unknown;
    status?: unknown;
    version?: unknown;
  };
  const isAgentMemory =
    body.service === "agentmemory" ||
    body.status === "healthy" ||
    body.status === "ok";
  const version = typeof body.version === "string" ? body.version : undefined;
  return { isAgentMemory, version };
}

export function parseMemoryRecallResults(
  data: unknown,
  limit: number,
): MemoryRecallResult[] {
  if (!data || typeof data !== "object") return [];
  const raw = (data as { results?: unknown }).results;
  if (!Array.isArray(raw)) return [];

  const results: MemoryRecallResult[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as {
      score?: unknown;
      observation?: {
        narrative?: unknown;
        facts?: unknown;
        title?: unknown;
        type?: unknown;
      };
    };
    const observation = entry.observation ?? {};
    const narrative =
      typeof observation.narrative === "string"
        ? observation.narrative.trim()
        : "";
    const facts = Array.isArray(observation.facts)
      ? observation.facts
          .filter((fact): fact is string => typeof fact === "string")
          .join("; ")
          .trim()
      : "";
    const title =
      typeof observation.title === "string" ? observation.title.trim() : "";
    const text = narrative || facts || title;
    if (!text) continue;
    results.push({
      text,
      score: typeof entry.score === "number" ? entry.score : 0,
      source:
        typeof observation.type === "string" ? observation.type : undefined,
    });
    if (results.length >= limit) break;
  }
  return results;
}

export function resolveAgentMemoryEndpoint(options: {
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
}): string | null {
  const env = options.env ?? process.env;
  if (env.OMA_NO_AGENTMEMORY === "1") return null;
  if (env.AGENTMEMORY_URL) return env.AGENTMEMORY_URL;

  const endpointPath = join(
    options.homeDir ?? homedir(),
    ".agentmemory",
    "endpoint.json",
  );
  if (!existsSync(endpointPath)) return null;

  try {
    const cfg = JSON.parse(readFileSync(endpointPath, "utf-8")) as {
      port?: number;
      url?: string;
      socket?: string;
    };
    if (typeof cfg.port === "number") return `http://127.0.0.1:${cfg.port}`;
    if (typeof cfg.url === "string" && cfg.url.trim()) return cfg.url;
    return null;
  } catch {
    return null;
  }
}

export function createNoneMemoryProvider(): MemoryProvider {
  return {
    name: "none",
    async status() {
      return {
        provider: "none",
        reachable: false,
        reason: "disabled",
      };
    },
    async observe() {
      return false;
    },
    async remember() {
      return false;
    },
    async recall() {
      return [];
    },
  };
}

export function createAgentMemoryProvider(
  options: AgentMemoryProviderOptions = {},
): MemoryProvider {
  const env = options.env ?? process.env;
  let cachedStatus: MemoryProviderStatus | null = null;

  async function status(): Promise<MemoryProviderStatus> {
    if (cachedStatus) return cachedStatus;
    if (env.OMA_NO_AGENTMEMORY === "1") {
      cachedStatus = {
        provider: "agentmemory",
        reachable: false,
        reason: "disabled by OMA_NO_AGENTMEMORY",
      };
      return cachedStatus;
    }

    const endpoint = resolveAgentMemoryEndpoint({
      env,
      homeDir: options.homeDir,
    });
    if (!endpoint) {
      cachedStatus = {
        provider: "agentmemory",
        reachable: false,
        reason: "endpoint not configured",
      };
      return cachedStatus;
    }

    try {
      const response = await http.get(`${endpoint}/agentmemory/health`, {
        timeout: options.healthTimeoutMs ?? 500,
        validateStatus: () => true,
      });
      const health = inspectHealthBody(response.data);
      const version =
        headerValue(response.headers["x-agentmemory-version"]) ??
        health.version;
      if (response.status < 200 || response.status >= 300) {
        cachedStatus = {
          provider: "agentmemory",
          endpoint,
          reachable: false,
          version,
          reason: `health returned ${response.status}`,
        };
        return cachedStatus;
      }
      // Capability-based acceptance: a 2xx health response from the
      // explicitly configured endpoint is treated as reachable. Version
      // pinning proved brittle (AgentMemory's published line already jumped
      // from 0.11/0.12 design targets to 0.9.x service builds), so an
      // unrecognized payload only downgrades to a warning, never a reject.
      cachedStatus = {
        provider: "agentmemory",
        endpoint,
        reachable: true,
        version,
        ...(health.isAgentMemory
          ? {}
          : {
              reason: `unrecognized health payload (version ${version ?? "unknown"}) — proceeding`,
            }),
      };
      return cachedStatus;
    } catch (error) {
      cachedStatus = {
        provider: "agentmemory",
        endpoint,
        reachable: false,
        reason: error instanceof Error ? error.message : String(error),
      };
      return cachedStatus;
    }
  }

  return {
    name: "agentmemory",
    status,
    async observe(payload) {
      const current = await status();
      if (!current.reachable || !current.endpoint) return false;
      try {
        // AgentMemory's /observe expects a hook-event envelope
        // (hookType, sessionId, project, cwd, timestamp) carrying the content.
        const cwd = process.cwd();
        const response = await http.post(
          `${current.endpoint}/agentmemory/observe`,
          {
            hookType: payload.source,
            sessionId: payload.sessionId,
            project: basename(cwd),
            cwd,
            timestamp: new Date().toISOString(),
            content: payload.content,
          },
          {
            headers: { "content-type": "application/json" },
            timeout: options.observeTimeoutMs ?? 500,
            validateStatus: () => true,
          },
        );
        return response.status >= 200 && response.status < 300;
      } catch {
        return false;
      }
    },
    async remember(payload: MemoryRememberPayload) {
      const current = await status();
      if (!current.reachable || !current.endpoint) return false;
      try {
        // `/remember` stores a durable, enrichable fact (type `decision`/`fact`)
        // that `/search` can recall with a meaningful relevance score — unlike
        // `/observe`, which keeps raw event envelopes that never enrich.
        const response = await http.post(
          `${current.endpoint}/agentmemory/remember`,
          {
            sessionId: payload.sessionId,
            content: payload.content,
            importance: payload.importance ?? 5,
          },
          {
            headers: { "content-type": "application/json" },
            timeout: options.rememberTimeoutMs ?? 500,
            validateStatus: () => true,
          },
        );
        return response.status >= 200 && response.status < 300;
      } catch {
        return false;
      }
    },
    async recall(payload) {
      const query = payload.query.trim();
      if (!query) return [];
      const current = await status();
      if (!current.reachable || !current.endpoint) return [];
      const limit = Math.max(1, Math.min(payload.limit ?? 8, 50));
      try {
        const response = await http.post(
          `${current.endpoint}/agentmemory/search`,
          { query, limit },
          {
            headers: { "content-type": "application/json" },
            timeout: options.recallTimeoutMs ?? 2000,
            validateStatus: () => true,
          },
        );
        if (response.status < 200 || response.status >= 300) return [];
        return parseMemoryRecallResults(response.data, limit);
      } catch {
        return [];
      }
    },
  };
}
