import type {
  EffortLevel,
  ModelSpec,
  RuntimeId,
} from "../../platform/model-registry.js";

export type RuntimeVendor =
  | "claude"
  | "codex"
  | "gemini"
  | "cursor"
  | "antigravity"
  | "qwen"
  | "grok"
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
