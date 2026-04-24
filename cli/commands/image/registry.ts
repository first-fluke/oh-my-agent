import type { ImageConfig } from "./config.js";
import { CodexProvider } from "./providers/codex.js";
import { GeminiProvider } from "./providers/gemini.js";
import { PollinationsProvider } from "./providers/pollinations.js";
import type { HealthResult, VendorProvider } from "./types.js";

export class Registry {
  private providers: VendorProvider[] = [];

  register(p: VendorProvider): this {
    this.providers.push(p);
    return this;
  }

  list(): VendorProvider[] {
    return [...this.providers];
  }

  async listHealthy(): Promise<
    Array<{ provider: VendorProvider; health: HealthResult }>
  > {
    const results = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          return { provider, health: await provider.health() };
        } catch (err) {
          return {
            provider,
            health: {
              ok: false as const,
              reason: "other" as const,
              hint: (err as Error).message,
            },
          };
        }
      }),
    );
    return results;
  }
}

let cached: Registry | null = null;

export function defaultRegistry(config?: ImageConfig): Registry {
  if (cached) return cached;
  cached = new Registry();
  const enabled = (name: string) => config?.vendors[name]?.enabled !== false;
  if (enabled("codex")) cached.register(new CodexProvider(config));
  if (enabled("gemini")) cached.register(new GeminiProvider(config));
  if (enabled("pollinations"))
    cached.register(new PollinationsProvider(config));
  return cached;
}

export function resetRegistry(): void {
  cached = null;
}
