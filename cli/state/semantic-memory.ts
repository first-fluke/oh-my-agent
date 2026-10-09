import type {
  AgentMemoryProviderOptions,
  MemoryProvider,
} from "../types/memory.js";
import { loadHonchoConfig, loadProviders } from "../utils/providers.js";
import { createHonchoMemoryProvider } from "./honcho-provider.js";
import {
  createAgentMemoryProvider,
  createNoneMemoryProvider,
} from "./memory-provider.js";

export function createMemoryProvider(
  options: AgentMemoryProviderOptions = {},
): MemoryProvider {
  const provider = loadProviders(options.projectDir).semantic_memory;
  if (provider === "honcho") {
    return createHonchoMemoryProvider({
      projectDir: options.projectDir,
      config: loadHonchoConfig(options.projectDir),
      env: options.env,
    });
  }
  if (provider === "none")
    return { ...createNoneMemoryProvider(), observeEvents: false };
  return createAgentMemoryProvider(options);
}
