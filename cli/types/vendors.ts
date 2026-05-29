import type { VENDORS } from "../constants/vendors.js";

/**
 * Canonical vendor type, derived from the `VENDORS` runtime constant in
 * `cli/constants/vendors.ts`. The constant is the source of truth; this type
 * stays in sync via the `typeof` derivation. See the comment on `VENDORS`
 * for the inclusion rationale (especially the cursor partial-support note).
 */
export type VendorType = (typeof VENDORS)[number];

/** CLI tools that support skill symlinking. */
export const CLI_TOOLS = [
  "antigravity",
  "claude",
  "codex",
  "copilot",
  "cursor",
  "gemini",
  "hermes",
  "qwen",
] as const;
export type CliTool = (typeof CLI_TOOLS)[number];

/** All CLI tools including non-hook vendors. */
export type CliVendor = VendorType | "copilot" | "hermes";

export interface CLICheck {
  name: string;
  installed: boolean;
  version?: string;
  installCmd: string;
  diagnostic?: string;
}
