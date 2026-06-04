import color from "picocolors";
import { loadVideoConfig } from "./config.js";
import { defaultVideoRegistry } from "./registry.js";

export async function runVideoListProviders({
  opts,
}: {
  opts: Record<string, unknown>;
}): Promise<number> {
  const config = await loadVideoConfig();
  const registry = defaultVideoRegistry(config);
  const entries = await registry.availability();
  const formatMode = (opts.format as string | undefined) ?? "text";

  if (formatMode === "json") {
    console.log(JSON.stringify({ providers: entries }));
    return 0;
  }

  console.log(color.bold("Video providers:"));
  for (const entry of entries) {
    const mark = entry.availability.ok ? color.green("✓") : color.yellow("!");
    const detail = entry.availability.ok
      ? "ok"
      : (entry.availability.reason ?? "unavailable");
    console.log(`  ${mark} ${entry.capability}:${entry.id} ${detail}`);
    if (!entry.availability.ok && entry.availability.remediation) {
      console.log(`      ${color.cyan("→")} ${entry.availability.remediation}`);
    }
  }
  return 0;
}
