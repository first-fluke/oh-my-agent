import type {
  EffortLevel,
  ModelSpec,
  RuntimeId,
} from "../../platform/model-registry.js";
import type { VendorType } from "../../types/vendors.js";

/**
 * A runtime/dispatch target vendor. Derived from the canonical VENDORS hook set
 * (minus commandcode, which has no dispatch path) plus the extension vendors
 * opencode and pi, plus "unknown" for an undetected runtime. Adding a hook
 * vendor to VENDORS flows here automatically.
 */
export type RuntimeVendor =
  | Exclude<VendorType, "commandcode">
  | "opencode"
  | "pi"
  | "unknown";

export type DispatchMode = "native" | "external";

export type Invocation = {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
};

export type DispatchPlan = {
  mode: DispatchMode;
  runtimeVendor: RuntimeVendor;
  targetVendor: string;
  reason: string;
  invocation: Invocation;
};

export type AgentPlan = {
  cli: RuntimeId;
  cliModel: string;
  effort?: EffortLevel;
  thinking?: boolean;
  memory?: "user" | "project" | "local";
  spec: ModelSpec;
};
