import { loadConfig } from "./config.js";
import { defaultRegistry } from "./registry.js";

export async function runListVendors({
  opts,
}: {
  opts: Record<string, unknown>;
}): Promise<void> {
  const config = await loadConfig();
  const registry = defaultRegistry(config);
  const providers = registry.list();
  const formatMode = (opts.format as string) ?? "text";

  const rows = providers.map((p) => ({
    name: p.name,
    enabled: config.vendors[p.name]?.enabled ?? true,
    defaultModel: config.vendors[p.name]?.model ?? "unknown",
    strategies: config.vendors[p.name]?.strategies,
  }));

  if (formatMode === "json") {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  for (const r of rows) {
    const strategyPart = r.strategies
      ? ` strategies=${r.strategies.join(",")}`
      : "";
    console.log(
      `${r.name} (enabled=${r.enabled}) default=${r.defaultModel}${strategyPart}`,
    );
  }
}
