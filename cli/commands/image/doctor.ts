import color from "picocolors";
import { loadConfig } from "./config.js";
import { defaultRegistry } from "./registry.js";

export async function runDoctor({
  opts,
}: {
  opts: Record<string, unknown>;
}): Promise<number> {
  const config = await loadConfig();
  const registry = defaultRegistry(config);
  const entries = await registry.listHealthy();
  const formatMode = (opts.format as string) ?? "text";

  if (formatMode === "json") {
    console.log(
      JSON.stringify({
        vendors: entries.map((e) => ({
          name: e.provider.name,
          health: e.health,
        })),
      }),
    );
  } else {
    console.log(color.bold("Image vendors:"));
    for (const e of entries) {
      if (e.health.ok) {
        console.log(
          `  ${color.green("✓")} ${e.provider.name}: ${e.health.detail ?? "ok"} (${e.health.supportedModels.join(", ")})`,
        );
        continue;
      }
      console.log(
        `  ${color.yellow("!")} ${e.provider.name}: ${e.health.hint}`,
      );
      const s = e.health.setup;
      if (s?.url) {
        console.log(`    ${color.cyan(s.url)}`);
      }
      for (const step of s?.steps ?? []) {
        console.log(`    ${color.dim("→")} ${step}`);
      }
    }
  }

  const hasHealthy = entries.some((e) => e.health.ok);
  return hasHealthy ? 0 : 5;
}
