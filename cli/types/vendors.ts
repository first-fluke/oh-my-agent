export type VendorType = "claude" | "codex" | "cursor" | "gemini" | "qwen";

/** CLI tools that support skill symlinking. */
export const CLI_TOOLS = ["claude", "copilot", "hermes"] as const;
export type CliTool = (typeof CLI_TOOLS)[number];

/** All CLI tools including non-hook vendors. */
export type CliVendor = VendorType | "copilot" | "hermes";

export interface CLICheck {
  name: string;
  installed: boolean;
  version?: string;
  installCmd: string;
}
