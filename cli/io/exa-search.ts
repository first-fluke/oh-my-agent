import { z } from "zod";
import type {
  SearchProviderContext,
  SearchProviderDefinition,
} from "../types/search-provider.js";
import { loadExaConfig } from "../utils/providers.js";

const MAX_QUERY_CHARACTERS = 4000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

const ResponseSchema = z.object({
  results: z.array(
    z
      .object({
        url: z.string(),
        title: z.string().nullish(),
        publishedDate: z.string().nullish(),
        highlights: z.array(z.string()).nullish(),
        text: z.string().nullish(),
      })
      .passthrough(),
  ),
  requestId: z.string().optional(),
  resolvedSearchType: z.string().optional(),
});

async function credential(
  context: SearchProviderContext,
): Promise<string | undefined> {
  const config = loadExaConfig(context.projectDir);
  try {
    const key = await context.resolveCredential({
      env: config.api_key_env ?? "EXA_API_KEY",
      vault: config.api_key_vault ?? "exa-search",
    });
    if (key && !/[\r\n\0]/.test(key)) return key.trim() || undefined;
    return undefined;
  } catch {
    // Credential-store errors can contain sensitive data.
    return undefined;
  }
}

async function readPayload(
  response: Response,
  signal: AbortSignal,
): Promise<unknown> {
  const contentLength = Number(response.headers.get("content-length"));
  if (contentLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw new Error("Exa search response exceeded the 2 MiB limit.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Exa returned invalid JSON.");
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  try {
    for (;;) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {});
        throw new Error("Exa search response exceeded the 2 MiB limit.");
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
  } catch (error) {
    signal.throwIfAborted();
    if (bytes > MAX_RESPONSE_BYTES) throw error;
    throw new Error("Exa search response could not be read.");
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Exa returned invalid JSON.");
  }
}

export function createExaSearchProvider(
  fetcher: typeof fetch = (...args) => fetch(...args),
): SearchProviderDefinition {
  return {
    id: "exa",
    label: "Exa Search",
    capabilities: ["web"],
    transport: "api",
    authentication: { mode: "required", env: "EXA_API_KEY" },
    adapter: {
      async status(context) {
        const available = Boolean(await credential(context));
        return {
          available,
          reachability: "not-probed",
          ...(!available
            ? {
                reason:
                  "Set EXA_API_KEY or run `oma vault store exa-search` (or configure exa.api_key_env/api_key_vault).",
              }
            : {}),
        };
      },
      async execute(request, context) {
        if (request.capability !== "web")
          throw new Error("Exa supports web search only.");
        const query = request.query.trim();
        const limit = request.limit ?? 10;
        if (!query || query.length > MAX_QUERY_CHARACTERS)
          throw new Error("Exa queries require 1–4000 characters.");
        if (!Number.isInteger(limit) || limit < 1 || limit > 100)
          throw new Error("Exa result limit must be an integer from 1 to 100.");
        const key = await credential(context);
        context.signal.throwIfAborted();
        if (!key)
          throw new Error(
            "Exa credential unavailable. Set EXA_API_KEY or run `oma vault store exa-search`.",
          );
        let response: Response;
        try {
          response = await fetcher("https://api.exa.ai/search", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "x-api-key": key,
            },
            body: JSON.stringify({
              query,
              type: "auto",
              numResults: limit,
              contents: { highlights: true },
            }),
            signal: context.signal,
            redirect: "error",
          });
        } catch {
          context.signal.throwIfAborted();
          throw new Error("Exa search request failed.");
        }
        if (!response.ok) {
          await response.body?.cancel().catch(() => {});
          // Upstream bodies can contain credentials or query text.
          throw new Error(`Exa search failed (HTTP ${response.status}).`);
        }
        const parsed = ResponseSchema.safeParse(
          await readPayload(response, context.signal),
        );
        if (!parsed.success)
          throw new Error("Exa returned an invalid search response.");
        const results = parsed.data.results
          .filter((result) => {
            try {
              const url = new URL(result.url);
              return (
                ["https:", "http:"].includes(url.protocol) &&
                !url.username &&
                !url.password
              );
            } catch {
              return false;
            }
          })
          .slice(0, limit);
        return {
          provider: "exa",
          capability: "web",
          sources: results.map(
            ({ url, title, publishedDate, highlights, text }) => ({
              url,
              title: title ?? undefined,
              excerpt: highlights?.length
                ? highlights.join("\n")
                : (text ?? undefined),
              publishedAt: publishedDate ?? undefined,
            }),
          ),
          extensions: { exa: { ...parsed.data, results } },
        };
      },
    },
  };
}
