import { AsyncLocalStorage } from "node:async_hooks";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Runtime dependency injection for the CLI and a local-only standalone fallback. */
export interface HookMemoryAdapter {
  recall(
    query: string,
    limit: number,
    projectDir?: string,
  ): Promise<Array<{ text: string; score: number; source?: string }>>;
  observe(payload: {
    sessionId: string;
    content: string;
    source: string;
    projectDir?: string;
  }): Promise<boolean>;
}

const adapters = new AsyncLocalStorage<HookMemoryAdapter>();
const localOnly: HookMemoryAdapter = {
  recall: async () => [],
  observe: async () => true,
};

export function currentMemoryAdapter(
  projectDir = process.cwd(),
): HookMemoryAdapter | undefined {
  const adapter = adapters.getStore();
  if (adapter) return adapter;
  let directory = resolve(projectDir);
  while (true) {
    const path = join(directory, ".agents", "state", "provider-selection.json");
    if (existsSync(path)) {
      try {
        return JSON.parse(readFileSync(path, "utf8")).semantic_memory ===
          "agentmemory"
          ? undefined
          : localOnly;
      } catch {
        return localOnly;
      }
    }
    // A nested OMA project owns its configuration independently of its parent,
    // whichever shared config source (CUE or YAML) it keeps.
    if (
      ["oma-config.cue", "oma-config.yaml"].some((name) =>
        existsSync(join(directory, ".agents", name)),
      )
    )
      return undefined;
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}
export function withMemoryAdapter<T>(
  adapter: HookMemoryAdapter,
  run: () => T,
): T {
  return adapters.run(adapter, run);
}
