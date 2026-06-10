import { z } from "zod";

// ---------------------------------------------------------------------------
// AgentSpec — object only (no string shorthand)
// ---------------------------------------------------------------------------

const ModelSlugSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*\/[a-z0-9][a-z0-9.-]+$/,
    "Model slug must be in owner/model format (e.g. openai/gpt-5.4)",
  );

const EffortLevelSchema = z.enum(["none", "low", "medium", "high", "xhigh"]);

const MemoryTierSchema = z.enum(["user", "project", "local"]);

const AgentSpecSchema = z.object({
  model: ModelSlugSchema,
  effort: EffortLevelSchema.optional(),
  thinking: z.boolean().optional(),
  memory: MemoryTierSchema.optional(),
});

export type AgentSpec = z.infer<typeof AgentSpecSchema>;

// ---------------------------------------------------------------------------
// Zod schemas for runtime validation
// ---------------------------------------------------------------------------

const AgentIdValues = [
  "orchestrator",
  "architecture",
  "qa",
  "pm",
  "backend",
  "frontend",
  "mobile",
  "db",
  "debug",
  "tf-infra",
  "retrieval",
] as const;

const _AgentIdSchema = z.enum(AgentIdValues);

// Partial record — zod v4 makes z.record exhaustive over enum keys. Use a
// plain object with all 11 entries optional so users can override subsets.
const AgentsMapSchema = z
  .object({
    orchestrator: AgentSpecSchema.optional(),
    architecture: AgentSpecSchema.optional(),
    qa: AgentSpecSchema.optional(),
    pm: AgentSpecSchema.optional(),
    backend: AgentSpecSchema.optional(),
    frontend: AgentSpecSchema.optional(),
    mobile: AgentSpecSchema.optional(),
    db: AgentSpecSchema.optional(),
    debug: AgentSpecSchema.optional(),
    "tf-infra": AgentSpecSchema.optional(),
    retrieval: AgentSpecSchema.optional(),
  })
  .strict();

const OmaDocsConfigSchema = z
  .object({
    auto_verify: z.boolean().optional(),
    check_urls: z.boolean().optional(),
  })
  .strict();

export const OmaConfigSchema = z
  .object({
    language: z.string().default("en"),
    model_preset: z.string().min(1),
    date_format: z.enum(["ISO", "US", "EU"]).optional(),
    timezone: z.string().optional(),
    auto_update_cli: z.boolean().optional(),
    telemetry: z.boolean().optional(),
    agents: AgentsMapSchema.optional(),
    models: z.record(z.string(), z.unknown()).optional(),
    custom_presets: z.record(z.string(), z.unknown()).optional(),
    vendors: z.record(z.string(), z.unknown()).optional(),
    session: z.unknown().optional(),
    docs: OmaDocsConfigSchema.optional(),
    default_cli: z.string().optional(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Zod schemas for VendorConfig and CliConfig
// ---------------------------------------------------------------------------

const VendorConfigSchema = z
  .object({
    command: z.string().optional(),
    subcommand: z.string().optional(),
    prompt_flag: z
      .string()
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        const normalized = value.trim().toLowerCase();
        if (
          normalized === "" ||
          normalized === "none" ||
          normalized === "null"
        ) {
          return null;
        }
        return value;
      }),
    auto_approve_flag: z.string().optional(),
    read_only_flag: z.string().optional(),
    output_format_flag: z.string().optional(),
    output_format: z.string().optional(),
    model_flag: z.string().optional(),
    default_model: z.string().optional(),
    isolation_env: z.string().optional(),
    isolation_flags: z.string().optional(),
  })
  .passthrough()
  .transform((value) => ({
    ...value,
    prompt_flag: value.prompt_flag ?? undefined,
  }));

export const CliConfigSchema = z
  .object({
    active_vendor: z.string().optional(),
    vendors: z.record(z.string(), VendorConfigSchema).optional(),
  })
  .passthrough()
  .transform((value) => ({
    active_vendor: value.active_vendor,
    vendors: value.vendors ?? {},
  }));
