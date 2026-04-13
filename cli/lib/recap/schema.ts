import { z } from "zod";

export const toolNames = [
  "claude",
  "codex",
  "gemini",
  "qwen",
  "cursor",
] as const;

export type ToolName = (typeof toolNames)[number];

export const NormalizedEntrySchema = z.object({
  tool: z.enum(toolNames),
  timestamp: z.number(),
  project: z.string().optional(),
  prompt: z.string(),
  sessionId: z.string().optional(),
  metadata: z
    .object({
      gitBranch: z.string().optional(),
      tokensUsed: z.number().optional(),
      model: z.string().optional(),
    })
    .optional(),
});

export type NormalizedEntry = z.infer<typeof NormalizedEntrySchema>;

export const RecapOutputSchema = z.object({
  window: z.object({
    start: z.number(),
    end: z.number(),
  }),
  timezone: z.string(),
  entries: z.array(NormalizedEntrySchema),
  stats: z.object({
    totalPrompts: z.number(),
    byTool: z.record(z.enum(toolNames), z.number()),
    topProjects: z.array(
      z.object({
        name: z.string(),
        count: z.number(),
        duration: z.number().optional(),
      }),
    ),
  }),
});

export type RecapOutput = z.infer<typeof RecapOutputSchema>;
