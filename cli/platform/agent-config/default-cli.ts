import type { OmaConfig } from "./types.js";

/**
 * The vendor used when nothing else selects one: `agents.default.cli`, then
 * the legacy top-level `default_cli` (still read; `oma update` moves it).
 */
export function resolveDefaultCli(
  config: Partial<OmaConfig> | null | undefined,
): string | undefined {
  const agents = config?.agents as Record<string, unknown> | undefined;
  const defaults = agents?.default;
  const cli =
    defaults && typeof defaults === "object" && !Array.isArray(defaults)
      ? (defaults as { cli?: unknown }).cli
      : undefined;
  if (typeof cli === "string" && cli.trim()) return cli.trim();
  return config?.default_cli;
}
