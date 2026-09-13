import { execFileSync } from "node:child_process";
import { basename } from "node:path";
import { z } from "zod";
import {
  ConfigError,
  planDispatch,
  resolveAgentPlan,
} from "../../io/runtime-dispatch.js";
import pkg from "../../package.json";
import type { VendorConfig } from "../../platform/agent-config.js";
import { sha256Hex } from "../../utils/hash.js";

/**
 * Execution conditions and environment policy for harness arms.
 *
 * A manifest records the resolved vendor, model, CLI, OMA version, host, and
 * environment policy under which paired arms ran. Records carry it so a stored
 * verdict is never mistaken for evidence about a different model or CLI.
 * Secrets are never recorded: environment entries are names only.
 */

/** Variables every vendor subprocess may inherit. Values are never recorded. */
const BASE_ENV_NAMES = new Set([
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "TMPDIR",
  "TEMP",
  "TMP",
  "LANG",
  "LANGUAGE",
  "LC_ALL",
  "LC_CTYPE",
  "LC_MESSAGES",
  "TERM",
  "COLORTERM",
  "NO_COLOR",
  "FORCE_COLOR",
  "TZ",
  "CI",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_CACHE_HOME",
  "XDG_STATE_HOME",
  "XDG_RUNTIME_DIR",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "ALL_PROXY",
  "http_proxy",
  "https_proxy",
  "no_proxy",
  "all_proxy",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
  "NODE_EXTRA_CA_CERTS",
  "REQUESTS_CA_BUNDLE",
  "SYSTEMROOT",
  "SystemRoot",
  "COMSPEC",
  "ComSpec",
  "PATHEXT",
  "APPDATA",
  "LOCALAPPDATA",
  "USERPROFILE",
  "PROGRAMFILES",
  "ProgramFiles",
  "WINDIR",
  "windir",
]);
const BASE_ENV_PREFIXES = ["OMA_"];
/** Credential and runtime-detection prefixes each vendor CLI needs. */
const VENDOR_ENV_PREFIXES: Record<string, string[]> = {
  antigravity: ["GEMINI_", "GOOGLE_", "ANTIGRAVITY_"],
  claude: ["ANTHROPIC_", "CLAUDE_", "CLAUDECODE"],
  codex: ["OPENAI_", "CODEX_"],
  copilot: ["GITHUB_", "GH_", "COPILOT_"],
  cursor: ["CURSOR_"],
  gemini: ["GEMINI_", "GOOGLE_"],
  grok: ["GROK_", "XAI_"],
  hermes: ["HERMES_", "OPENAI_", "ANTHROPIC_"],
  kiro: ["KIRO_", "AWS_"],
  opencode: ["OPENCODE_", "ANTHROPIC_", "OPENAI_", "GEMINI_", "GOOGLE_"],
  pi: ["PI_", "ANTHROPIC_", "OPENAI_", "GEMINI_", "GOOGLE_"],
  qwen: ["QWEN_", "DASHSCOPE_", "OPENAI_"],
  zcode: ["ZCODE_"],
};
export const HARNESS_ENV_PASSTHROUGH = "OMA_HARNESS_ENV_PASSTHROUGH";
/** Set on every arm so vendor memory cannot carry context between arms. */
const HARNESS_FORCED_ENV: Readonly<Record<string, string>> = {
  OMA_NO_AGENTMEMORY: "1",
};

export const harnessEnvironmentPolicySchema = z.object({
  mode: z.literal("allowlist"),
  vendor: z.string(),
  vendorKnown: z.boolean(),
  passed: z.array(z.string()),
  forced: z.array(z.string()),
  extra: z.array(z.string()),
  dropped: z.number().int().nonnegative(),
});
export type HarnessEnvironmentPolicy = z.infer<
  typeof harnessEnvironmentPolicySchema
>;

export interface HarnessEnvironment {
  env: NodeJS.ProcessEnv;
  policy: HarnessEnvironmentPolicy;
}

function parsePassthrough(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name));
}

/**
 * Build the environment both arms receive. `invocationEnv` may carry entries a
 * dispatch builder added on top of `source`; those stay because the builder
 * chose them for this dispatch. Everything else must be on the allowlist.
 */
export function buildHarnessEnvironment(
  vendor: string,
  source: NodeJS.ProcessEnv = process.env,
  invocationEnv?: NodeJS.ProcessEnv,
): HarnessEnvironment {
  const prefixes = [
    ...BASE_ENV_PREFIXES,
    ...(VENDOR_ENV_PREFIXES[vendor] ?? []),
  ];
  const extra = parsePassthrough(source[HARNESS_ENV_PASSTHROUGH]);
  const allowed = (key: string): boolean =>
    BASE_ENV_NAMES.has(key) ||
    prefixes.some((prefix) => key.startsWith(prefix)) ||
    extra.includes(key);
  const env: NodeJS.ProcessEnv = {};
  const passed: string[] = [];
  let dropped = 0;
  for (const key of Object.keys(source)) {
    if (source[key] === undefined) continue;
    if (allowed(key)) {
      env[key] = source[key];
      passed.push(key);
    } else {
      dropped += 1;
    }
  }
  // Builders spread the parent environment before adding their own entries;
  // only a value absent from both the source and the process counts as added.
  for (const key of Object.keys(invocationEnv ?? {})) {
    const value = invocationEnv?.[key];
    if (value === undefined || env[key] === value) continue;
    if (value === source[key] || value === process.env[key]) continue;
    env[key] = value;
    passed.push(key);
  }
  for (const [key, value] of Object.entries(HARNESS_FORCED_ENV)) {
    env[key] = value;
  }
  return {
    env,
    policy: {
      mode: "allowlist",
      vendor,
      vendorKnown: vendor in VENDOR_ENV_PREFIXES,
      passed: [...new Set(passed)].sort(),
      forced: Object.keys(HARNESS_FORCED_ENV),
      extra,
      dropped,
    },
  };
}

export const harnessExecutionManifestSchema = z.object({
  schemaVersion: z.literal(1),
  agent: z.string(),
  vendor: z.string(),
  dispatchMode: z.enum(["native", "external", "injected"]),
  runtimeVendor: z.string(),
  command: z.string().nullable(),
  model: z.string().nullable(),
  modelSource: z.enum([
    "agent-plan",
    "vendor-default",
    "vendor-session",
    "injected",
  ]),
  effort: z.string().nullable(),
  thinking: z.boolean().nullable(),
  cliVersion: z.string().nullable(),
  cliVersionStatus: z.enum(["probed", "unavailable", "not-probed"]),
  omaVersion: z.string(),
  platform: z.string(),
  arch: z.string(),
  node: z.string(),
  environmentPolicy: harnessEnvironmentPolicySchema,
  memory: z.literal("disabled"),
  confinement: z.object({
    filesystem: z.literal("temporary-workspace"),
    network: z.literal("unrestricted"),
    credentials: z.literal("inherited"),
    tools: z.literal("vendor-default"),
  }),
  manifestHash: z.string(),
});
export type HarnessExecutionManifest = z.infer<
  typeof harnessExecutionManifestSchema
>;

export type CliVersionProbe = (
  command: string,
  env: NodeJS.ProcessEnv,
) => string | null;

/** First line of `<command> --version`; null when the probe cannot complete. */
export const probeCliVersion: CliVersionProbe = (command, env) => {
  try {
    const output = execFileSync(command, ["--version"], {
      env,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5_000,
      maxBuffer: 64 * 1024,
    });
    const line = output.split(/\r?\n/, 1)[0]?.trim() ?? "";
    return line ? line.slice(0, 120) : null;
  } catch {
    return null;
  }
};

export interface ResolveHarnessManifestInput {
  agent: string;
  vendor: string;
  vendorConfig: VendorConfig;
  env?: NodeJS.ProcessEnv;
  /** A caller-supplied dispatch function: no vendor process is described. */
  injected?: boolean;
  probeVersion?: CliVersionProbe | false;
}

function manifestHash(
  manifest: Omit<HarnessExecutionManifest, "manifestHash">,
): string {
  return sha256Hex(JSON.stringify(manifest));
}

export function resolveHarnessExecutionManifest(
  input: ResolveHarnessManifestInput,
): HarnessExecutionManifest {
  const env = input.env ?? process.env;
  const host = {
    omaVersion: pkg.version,
    platform: process.platform,
    arch: process.arch,
    node: process.versions.node,
  };
  const common = {
    schemaVersion: 1 as const,
    agent: input.agent,
    vendor: input.vendor,
    memory: "disabled" as const,
    confinement: {
      filesystem: "temporary-workspace" as const,
      network: "unrestricted" as const,
      credentials: "inherited" as const,
      tools: "vendor-default" as const,
    },
  };
  if (input.injected) {
    const body = {
      ...common,
      dispatchMode: "injected" as const,
      runtimeVendor: "injected",
      command: null,
      model: null,
      modelSource: "injected" as const,
      effort: null,
      thinking: null,
      cliVersion: null,
      cliVersionStatus: "not-probed" as const,
      ...host,
      environmentPolicy: buildHarnessEnvironment(input.vendor, env).policy,
    };
    return { ...body, manifestHash: manifestHash(body) };
  }

  let model: string | null = null;
  let modelSource: HarnessExecutionManifest["modelSource"] = "vendor-session";
  let effort: string | null = null;
  let thinking: boolean | null = null;
  try {
    const plan = resolveAgentPlan(input.agent, undefined, env);
    if (plan.cli === input.vendor && plan.cliModel) {
      model = plan.cliModel;
      modelSource = "agent-plan";
      effort = plan.effort ?? null;
      thinking = plan.thinking ?? null;
    }
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
  }
  if (!model && input.vendorConfig.default_model) {
    model = input.vendorConfig.default_model;
    modelSource = "vendor-default";
  }
  const dispatch = planDispatch(
    input.agent,
    input.vendor,
    input.vendorConfig,
    null,
    "",
    env,
    { readOnly: false },
  );
  const harnessEnv = buildHarnessEnvironment(
    input.vendor,
    env,
    dispatch.invocation.env,
  );
  const command = dispatch.invocation.command;
  const probe =
    input.probeVersion === false
      ? null
      : (input.probeVersion ?? probeCliVersion);
  const cliVersion = probe ? probe(command, harnessEnv.env) : null;
  const body = {
    ...common,
    dispatchMode: dispatch.mode,
    runtimeVendor: dispatch.runtimeVendor,
    command: basename(command),
    model,
    modelSource,
    effort,
    thinking,
    cliVersion,
    cliVersionStatus: probe
      ? cliVersion
        ? ("probed" as const)
        : ("unavailable" as const)
      : ("not-probed" as const),
    ...host,
    environmentPolicy: harnessEnv.policy,
  };
  return { ...body, manifestHash: manifestHash(body) };
}

const CONDITION_KEYS = [
  "vendor",
  "dispatchMode",
  "model",
  "effort",
  "thinking",
  "cliVersion",
  "omaVersion",
  "platform",
  "arch",
  "node",
] as const;

/**
 * Human-readable differences between the conditions a record was produced
 * under and the conditions resolved now. An empty list means the recorded
 * verdicts describe the same vendor, model, CLI, OMA build, and host.
 */
export function harnessManifestDifferences(
  recorded: HarnessExecutionManifest | undefined,
  current: HarnessExecutionManifest,
): string[] {
  if (!recorded) {
    return [
      "Recorded execution conditions are unavailable; the record predates execution manifests",
    ];
  }
  const differences: string[] = [];
  for (const key of CONDITION_KEYS) {
    const before = recorded[key];
    const after = current[key];
    if (before === after) continue;
    if (
      key === "cliVersion" &&
      (recorded.cliVersionStatus !== "probed" ||
        current.cliVersionStatus !== "probed")
    ) {
      differences.push("cliVersion: not comparable; a probe was unavailable");
      continue;
    }
    differences.push(
      `${key}: recorded ${JSON.stringify(before)}, current ${JSON.stringify(after)}`,
    );
  }
  return differences;
}
