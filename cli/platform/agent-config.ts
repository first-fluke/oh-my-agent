// Module entry point for agent configuration. Implementation lives in
// ./agent-config/ — this file re-exports the public API.

export { normalizeAgentId } from "./agent-config/agent-ids.js";
export { parseOmaConfig } from "./agent-config/config-io.js";
export {
  loadAgentPersona,
  loadExecutionProtocol,
  resolvePromptContent,
} from "./agent-config/loaders.js";
export type { AgentSpec } from "./agent-config/schemas.js";
export { OmaConfigSchema } from "./agent-config/schemas.js";
export type {
  AgentId,
  BuiltInPresetKey,
  CliConfig,
  ModelPreset,
  OmaConfig,
  OmaDocsConfig,
  UserModelSpec,
  VendorConfig,
} from "./agent-config/types.js";
export {
  resolvePromptFlag,
  resolveVendor,
  splitArgs,
} from "./agent-config/vendor-resolution.js";
