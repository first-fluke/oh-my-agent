// `oma memory:*` command surface. Implementation lives in `./memory/`
// (endpoint-config, maintain, daemon, upgrade, setup, retry-drain, render);
// this entry point re-exports the public API so existing import sites stay
// stable.
import {
  getAgentMemoryServicePresence,
  installAgentMemoryService,
  uninstallAgentMemoryService,
} from "../../platform/agentmemory-service.js";

export { controlAgentMemoryDaemon } from "./memory/daemon.js";
export { maintainAgentMemory } from "./memory/maintain.js";
export {
  initMemory,
  printAgentMemoryDaemon,
  printAgentMemoryMaintain,
  printAgentMemoryServiceInstall,
  printAgentMemoryServiceUninstall,
  printAgentMemorySetup,
  printAgentMemoryStatus,
  printAgentMemoryUpgrade,
  printMemoryRetryDrain,
} from "./memory/render.js";
export { drainMemoryRetryQueue } from "./memory/retry-drain.js";
export { getAgentMemoryStatus, setupAgentMemory } from "./memory/setup.js";
export { upgradeAgentMemory } from "./memory/upgrade.js";
// Service-file generation lives in `platform/agentmemory-service.ts` (D43);
// re-export the public surface so existing import sites stay stable.
export {
  getAgentMemoryServicePresence,
  installAgentMemoryService,
  uninstallAgentMemoryService,
};
