import { isAbsolute } from "node:path";
import { z } from "zod";

const pointer = z
  .string()
  .regex(/^(?:\/(?:[^~]|~[01])*)*$/)
  .optional();

export const harnessCheckSchema = z.union([
  z.object({
    type: z.enum(["file_exists", "file_not_exists"]),
    path: z.string().min(1),
  }),
  z.object({
    type: z.enum(["file_contains", "file_not_contains"]),
    path: z.string().min(1),
    value: z.string(),
  }),
  z.object({
    type: z.enum(["output_contains", "output_not_contains"]),
    value: z.string(),
  }),
  z.object({
    /**
     * A graded acceptance contract for the captured output. The mechanical
     * harness evaluator cannot run it; it is carried on incidents so a skill
     * regression fixture can be derived with the same rubric.
     */
    type: z.literal("output_judge"),
    rubric: z.string().min(1).max(4000),
  }),
  z.object({
    type: z.literal("file_json_equals"),
    path: z.string().min(1),
    pointer,
    value: z.json(),
  }),
  z.object({
    type: z.literal("output_json_equals"),
    pointer,
    value: z.json(),
  }),
  z.object({
    type: z.literal("command"),
    argv: z
      .array(z.string())
      .min(2)
      .refine(
        (argv) => isAbsolute(argv[0] ?? "") && argv.includes("{checker}"),
        "command argv must start with an absolute executable and include {checker}",
      ),
    checker: z.string().min(1),
    timeout_ms: z.number().int().positive().max(300_000),
    expected_exit_code: z.number().int().min(0).max(255),
  }),
]);
