import { validateEventEnvelope } from "../../.agents/hooks/core/event-contract.js";
import { withMemoryAdapter } from "../../.agents/hooks/core/memory-adapter.js";
import type { MemoryProvider } from "../types/memory.js";
import { loadProviders } from "../utils/providers.js";
import { deliverEventMemory } from "./events.js";
import { parseMemoryRetryLine } from "./memory-retry-queue.js";
import { createMemoryProvider } from "./semantic-memory.js";

/** Async-local injection isolates concurrent hook invocations without changing process.env. */
export function withSelectedHookMemory<T>(projectDir: string, run: () => T): T {
  const selected = loadProviders(projectDir).semantic_memory;
  if (selected === "agentmemory") return run();
  let provider: MemoryProvider | undefined;
  try {
    provider = createMemoryProvider({ projectDir });
  } catch (error) {
    console.warn(`[hook] Memory provider unavailable: ${String(error)}`);
  }
  return withMemoryAdapter(
    {
      recall: (query, limit) =>
        provider?.recall?.({ query, limit }) ?? Promise.resolve([]),
      async observe(payload) {
        if (selected === "honcho") {
          const parsed = parseMemoryRetryLine(payload.content);
          if (parsed && validateEventEnvelope(parsed.event).length === 0)
            await deliverEventMemory(projectDir, parsed.event, provider);
        }
        return true;
      },
    },
    run,
  );
}
