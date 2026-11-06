import { z } from "zod";
import type {
  SearchProviderContext,
  SearchProviderDefinition,
} from "../types/search-provider.js";
import { loadKeenableConfig } from "../utils/providers.js";

const PUBLIC_URL = "https://api.keenable.ai/v1/search/public";
const KEYED_URL = "https://api.keenable.ai/v1/search";
const MAX_EXCERPT_CHARS = 1000;

const ResponseSchema = z.object({
  results: z
    .array(
      z
        .object({
          url: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          snippet: z.string().optional(),
        })
        .passthrough(),
    )
    .optional(),
});

/** The key is optional: without one, Keenable's free public endpoint is used. */
async function credential(
  context: SearchProviderContext,
): Promise<string | undefined> {
  const config = loadKeenableConfig(context.projectDir);
  try {
    const key = await context.resolveCredential({
      env: config.api_key_env ?? "KEENABLE_API_KEY",
      vault: config.api_key_vault ?? "keenable-search",
    });
    if (key && !/[\r\n\0]/.test(key)) return key.trim() || undefined;
    return undefined;
  } catch {
    // Keychain diagnostics may contain sensitive data; fall back to keyless.
    return undefined;
  }
}

export function createKeenableSearchProvider(
  fetcher: typeof fetch = (...args) => fetch(...args),
): SearchProviderDefinition {
  return {
    id: "keenable",
    label: "Keenable Search",
    capabilities: ["web"],
    transport: "api",
    authentication: { mode: "optional", env: "KEENABLE_API_KEY" },
    adapter: {
      async status() {
        // Works without credentials, so it is always available; never probes.
        return { available: true, reachability: "not-probed" };
      },
      async execute(request, context) {
        if (request.capability !== "web")
          throw new Error("Keenable supports web search only.");
        const query = request.query.trim();
        const limit = request.limit ?? 10;
        if (!query || query.length > 400)
          throw new Error("Keenable queries require 1–400 characters.");
        if (!Number.isInteger(limit) || limit < 1 || limit > 20)
          throw new Error(
            "Keenable result limit must be an integer from 1 to 20.",
          );
        const key = await credential(context);
        context.signal.throwIfAborted();
        const headers: Record<string, string> = {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Keenable-Title": "oh-my-agent",
        };
        if (key) headers["X-API-Key"] = key;
        let response: Response;
        try {
          response = await fetcher(key ? KEYED_URL : PUBLIC_URL, {
            method: "POST",
            headers,
            body: JSON.stringify({ query, max_results: limit }),
            signal: context.signal,
            redirect: "error",
          });
        } catch {
          context.signal.throwIfAborted();
          throw new Error("Keenable search request failed.");
        }
        if (!response.ok) {
          await response.body?.cancel().catch(() => {});
          // Never echo upstream errors, which can include tokens or query text.
          throw new Error(`Keenable search failed (HTTP ${response.status}).`);
        }
        let raw: unknown;
        try {
          raw = await response.json();
        } catch {
          throw new Error("Keenable returned invalid JSON.");
        }
        const parsed = ResponseSchema.safeParse(raw);
        if (!parsed.success)
          throw new Error("Keenable returned an invalid search response.");
        const results = (parsed.data.results ?? [])
          .filter((result) => {
            try {
              return (
                !!result.url &&
                ["https:", "http:"].includes(new URL(result.url).protocol)
              );
            } catch {
              return false;
            }
          })
          .slice(0, limit);
        return {
          provider: "keenable",
          capability: "web",
          sources: results.map(({ url, title, description, snippet }) => ({
            url: url as string,
            title,
            // Prefer the short description; fall back to a truncated snippet.
            excerpt: description || snippet?.slice(0, MAX_EXCERPT_CHARS),
          })),
          extensions: { keenable: { results } },
        };
      },
    },
  };
}
