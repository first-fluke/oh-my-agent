import { createBraveSearchProvider } from "../io/brave-search.js";
import { createExaSearchProvider } from "../io/exa-search.js";
import type {
  SearchCapability,
  SearchProviderContext,
  SearchProviderDefinition,
  SearchProviderInspection,
  SearchProviderStatus,
  SearchRequest,
  SearchResponse,
} from "../types/search-provider.js";
import { SearchProviderIdSchema } from "../utils/providers.js";

const CAPABILITIES: readonly SearchCapability[] = [
  "web",
  "docs",
  "contents",
  "research",
];

async function withinDeadline<T>(
  signal: AbortSignal,
  run: () => Promise<T>,
): Promise<T> {
  signal.throwIfAborted();
  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    const result = await Promise.race([run(), aborted]);
    signal.throwIfAborted();
    return result;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

/** Explicit, instance-scoped registration: configuration never imports arbitrary code. */
export class SearchProviderRegistry {
  private readonly providers = new Map<string, SearchProviderDefinition>();

  constructor(definitions: readonly SearchProviderDefinition[] = []) {
    for (const definition of definitions) this.register(definition);
  }

  register(definition: SearchProviderDefinition): void {
    if (!SearchProviderIdSchema.safeParse(definition.id).success)
      throw new Error(`Invalid search provider ID: ${definition.id}`);
    if (this.providers.has(definition.id))
      throw new Error(`Search provider already registered: ${definition.id}`);
    if (
      !definition.capabilities.length ||
      definition.capabilities.some((value) => !CAPABILITIES.includes(value))
    )
      throw new Error(`Invalid search capabilities for ${definition.id}`);
    // Snapshot metadata so a caller cannot silently change registered capabilities.
    this.providers.set(
      definition.id,
      Object.freeze({
        ...definition,
        capabilities: Object.freeze([...new Set(definition.capabilities)]),
        authentication: Object.freeze({ ...definition.authentication }),
        ...(definition.mcp
          ? {
              mcp: Object.freeze({
                ...definition.mcp,
                tools: Object.freeze([...definition.mcp.tools]),
              }),
            }
          : {}),
      }),
    );
  }

  list(capability?: SearchCapability): readonly SearchProviderDefinition[] {
    return [...this.providers.values()].filter(
      (entry) => !capability || entry.capabilities.includes(capability),
    );
  }

  inspect(id: string, capability: SearchCapability): SearchProviderInspection {
    const definition = this.providers.get(id);
    const status = !definition
      ? "unregistered"
      : !definition.capabilities.includes(capability)
        ? "unsupported"
        : definition.adapter
          ? "adapter-registered"
          : definition.transport === "api"
            ? "adapter-missing"
            : "runtime-managed";
    return { provider: id, capability, status, reachability: "not-probed" };
  }

  resolve(id: string, capability: SearchCapability): SearchProviderDefinition {
    const inspection = this.inspect(id, capability);
    const definition = this.providers.get(id);
    if (!definition || inspection.status === "unsupported")
      throw new Error(
        `Search provider ${id}: ${inspection.status} for ${capability}`,
      );
    return definition;
  }

  async execute(
    id: string,
    request: SearchRequest,
    context: SearchProviderContext,
  ): Promise<SearchResponse> {
    const provider = this.resolve(id, request.capability);
    if (!provider.adapter)
      throw new Error(
        `Search provider ${id} has no CLI adapter (${this.inspect(id, request.capability).status})`,
      );
    const adapter = provider.adapter;
    const result = await withinDeadline(context.signal, () =>
      adapter.execute(request, context),
    );
    if (result.provider !== id || result.capability !== request.capability)
      throw new Error(`Search provider ${id} returned mismatched provenance`);
    return result;
  }

  async status(
    id: string,
    capability: SearchCapability,
    context: SearchProviderContext,
  ): Promise<SearchProviderStatus> {
    const provider = this.resolve(id, capability);
    const adapter = provider.adapter;
    if (!adapter)
      return {
        available: false,
        reachability: "not-probed",
        reason:
          "Search availability is managed by the agent runtime; no CLI adapter is registered.",
      };
    return withinDeadline(context.signal, () => adapter.status(context));
  }
}

/** Only shipped integrations are registered. */
export function createSearchProviderRegistry(): SearchProviderRegistry {
  return new SearchProviderRegistry([
    {
      id: "native",
      label: "Runtime native search",
      capabilities: ["web"],
      transport: "runtime",
      authentication: { mode: "none" },
    },
    {
      id: "context7",
      label: "Context7",
      capabilities: ["docs"],
      transport: "mcp",
      authentication: { mode: "optional", env: "CONTEXT7_API_KEY" },
      mcp: { server: "context7", tools: ["resolve-library-id", "query-docs"] },
    },
    createBraveSearchProvider(),
    createExaSearchProvider(),
  ]);
}
