// cli/platform/model-registry/schema.ts
// Zod schema for user-provided ModelSpec validation.

import { z } from "zod";
import { VENDORS } from "../../constants/vendors.js";

const RuntimeIdSchema = z.enum([
  "claude",
  "codex",
  "gemini",
  "cursor",
  "antigravity",
  "qwen",
  "kiro",
]);

const EffortLevelSchema = z.enum(["none", "low", "medium", "high", "xhigh"]);

const ThinkingModeSchema = z.enum(["none", "dynamic", "fixed"]);

const EffortSpecSchema = z.union([
  z.object({ type: z.literal("granular"), levels: z.array(EffortLevelSchema) }),
  z.object({ type: z.literal("cli-session"), auto_default: EffortLevelSchema }),
  z.object({
    type: z.literal("thinking-budget"),
    modes: z.array(ThinkingModeSchema),
  }),
  z.object({ type: z.literal("binary-thinking") }),
  z.null(),
]);

export const ModelSpecSchema = z.object({
  cli: z.enum(VENDORS),
  cli_model: z.string().min(1),
  supports: z.object({
    effort: EffortSpecSchema,
    apply_patch: z.boolean(),
    task_budget: z.boolean(),
    prompt_cache: z.boolean(),
    computer_use: z.boolean(),
    native_dispatch_from: z.array(RuntimeIdSchema),
    api_only: z.boolean(),
  }),
  pricing_note: z.string().optional(),
  auth_hint: z.string().min(1),
  subscription_tier: z.string().optional(),
});
