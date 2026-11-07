import type { EffortLevel, ModelSpec } from "../../platform/model-registry.js";
import type { VendorType } from "../../types/vendors.js";

/**
 * A runtime/dispatch target vendor. Derived from the canonical VENDORS hook set
 * (minus commandcode, which has no dispatch path) plus the extension vendors
 * opencode, kilo and pi, plus "unknown" for an undetected runtime. Adding a hook
 * vendor to VENDORS flows here automatically.
 */
export type RuntimeVendor =
  | Exclude<VendorType, "commandcode">
  | "opencode"
  | "kilo"
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
  freeProvider?: import("../../utils/free-provider.js").FreeProvider;
  cli: Exclude<RuntimeVendor, "unknown">;
  /** Absent in auto mode: the vendor's agent/session configuration selects the model. */
  cliModel?: string;
  effort?: EffortLevel;
  thinking?: boolean;
  memory?: "user" | "project" | "local";
  spec?: ModelSpec;
};
