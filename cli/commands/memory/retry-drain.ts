import { drainMemoryDeliveries } from "../../state/memory-delivery.js";
import type {
  MemoryProvider,
  MemoryRetryDrainResult,
} from "../../types/memory.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";

/** CLI argument resolution; all delivery transitions belong to the state service. */
export async function drainMemoryRetryQueue(
  args: {
    projectDir?: string;
    provider?: MemoryProvider;
    dryRun?: boolean;
  } = {},
): Promise<MemoryRetryDrainResult> {
  return drainMemoryDeliveries({
    ...args,
    projectDir: args.projectDir ?? resolveProjectRoot(),
  });
}
