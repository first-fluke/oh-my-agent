import type { Command } from "commander";
import { createSearchContext } from "../../platform/search-context.js";
import { createSearchProviderRegistry } from "../../platform/search-providers.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";
import {
  loadProviders,
  SearchProviderIdSchema,
} from "../../utils/providers.js";

export async function webSearch(
  query: string,
  options: {
    provider?: string;
    limit?: number;
    timeoutMs?: number;
    projectDir?: string;
  } = {},
) {
  const root = resolveProjectRoot(options.projectDir);
  const provider = SearchProviderIdSchema.parse(
    options.provider ?? loadProviders(root).web,
  );
  const timeout = options.timeoutMs ?? 15000;
  if (!Number.isFinite(timeout) || timeout < 100 || timeout > 120000)
    throw new Error("Search timeout must be between 0.1 and 120 seconds.");
  return createSearchProviderRegistry().execute(
    provider,
    {
      capability: "web",
      query,
      limit: options.limit ?? 10,
    },
    createSearchContext(root, AbortSignal.timeout(timeout)),
  );
}

export function registerWebSearch(search: Command): void {
  search
    .command("web <query>")
    .description(
      "Search with the selected web provider (Brave and Exa have CLI adapters)",
    )
    .option("--provider <id>", "Override providers.web for this request")
    .option("--limit <n>", "Maximum results (Brave: 1–20; Exa: 1–100)", "10")
    .option("--timeout <seconds>", "Request deadline", "15")
    .option("--json", "Output JSON (default)")
    .option("--pretty", "Pretty-print JSON")
    .action(
      async (
        query: string,
        opts: {
          provider?: string;
          limit: string;
          timeout: string;
          pretty?: boolean;
        },
      ) => {
        try {
          const result = await webSearch(query, {
            provider: opts.provider,
            limit: Number(opts.limit),
            timeoutMs: Number(opts.timeout) * 1000,
          });
          console.log(
            JSON.stringify(result, null, opts.pretty ? 2 : undefined),
          );
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
        }
      },
    );
}
