import { validateEventEnvelope } from "../../.agents/hooks/core/event-contract.js";
import { withMemoryAdapter } from "../../.agents/hooks/core/memory-adapter.js";
import type { OmaEvent } from "../../.agents/hooks/core/state-core.js";
import type { MemoryProvider } from "../types/memory.js";
import {
  loadProviders,
  type SemanticMemoryProviderName,
} from "../utils/providers.js";
import { deliverEventMemory } from "./events.js";
import { recallAgentMemoryForHook } from "./hook-agentmemory.js";
import { createNoneMemoryProvider } from "./memory-provider.js";
import { createMemoryProvider } from "./semantic-memory.js";

/**
 * Async-local injection isolates concurrent hook invocations without changing
 * process.env. `selection` lets the hook dispatcher reuse the provider it
 * already resolved from config instead of loading the config a second time.
 */
export function withSelectedHookMemory<T>(
  projectDir: string,
  run: () => T,
  selection?: SemanticMemoryProviderName,
): T {
  const selected = selection ?? loadProviders(projectDir).semantic_memory;
  let provider: MemoryProvider | undefined;
  try {
    provider =
      selected === "none"
        ? createNoneMemoryProvider()
        : createMemoryProvider({ projectDir });
  } catch (error) {
    console.warn(`[hook] Memory provider unavailable: ${String(error)}`);
  }
  return withMemoryAdapter(
    {
      recall: (query, limit) =>
        selected === "agentmemory"
          ? recallAgentMemoryForHook(query, limit, projectDir)
          : (provider?.recall?.({ query, limit }) ?? Promise.resolve([])),
      async observe(payload) {
        if (selected !== "none") {
          let event: unknown;
          try {
            event = JSON.parse(payload.content);
          } catch {
            return true;
          }
          if (validateEventEnvelope(event).length === 0)
            await deliverEventMemory(projectDir, event as OmaEvent, provider);
        }
        return true;
      },
    },
    run,
  );
}
