import type { CliTool, CliVendor } from "../types/index.js";
import { AGENTS_SKILLS_DIR } from "./paths.js";

export const REPO = "first-fluke/oh-my-agent";
export const INSTALLED_SKILLS_DIR = AGENTS_SKILLS_DIR;

/**
 * Canonical vendor set: host LLM CLIs that have both a type identity and a
 * hook-detection identity in this codebase. Single source of truth consumed
 * by validators, registries, doc-merging loops in cli/, and the derived
 * `VendorType` in `cli/types/vendors.ts`. NOTE: cursor is included here
 * because it has hook detection, rules generation, and CLI binary identity,
 * even though it lacks a full runtime adapter under `cli/vendors/cursor/`.
 * Sites that require a fully implemented runtime (doctor probe, agent
 * review, native dispatch) keep their own narrower lists.
 */
export const VENDORS = [
  "antigravity",
  "claude",
  "codex",
  "commandcode",
  "cursor",
  "grok",
  "kimi",
  "kiro",
  "qwen",
] as const;

/**
 * Vendors whose hooks load as in-process extensions rather than settings-file
 * hook registrations. These are deliberately kept OUT of `VENDORS` (and thus
 * out of `VendorType`, `HOOK_VENDORS`, and the `installHooksFromVariant` path):
 * their install is forked to a dedicated composer.
 *
 * `pi` (Earendil pi-coding-agent) auto-discovers `.pi/extensions/*​/index.ts`
 * and dispatches `pi.on(event, handler)`; `installPiExtension` writes that
 * bridge. See `cli/platform/pi-extension-composer.ts`.
 *
 * `opencode` (Sst opencode) is also a pi-class in-process plugin vendor. Its
 * hooks are loaded as extensions rather than settings-file registrations, so it
 * receives its own dedicated install path and is excluded from `VENDORS`,
 * `HOOK_VENDORS`, and `installHooksFromVariant`.
 */
export const EXTENSION_VENDORS = ["pi", "opencode"] as const;
export type ExtensionVendor = (typeof EXTENSION_VENDORS)[number];

/**
 * Vendors that only receive skill installs (no hook detection, no runtime
 * adapter). Source of truth for the `InstallOnlyVendor` type and the
 * install-only tail of `ALL_CLI_VENDORS` / `CliTool`.
 */
export const INSTALL_ONLY_VENDORS = ["copilot", "hermes"] as const;

/**
 * Vendors that receive ONLY workflow slash-commands (no skill symlinks, no
 * hook detection, no runtime adapter). Source of truth for the
 * `WorkflowOnlyVendor` type and the workflow-only tail of `ALL_CLI_VENDORS` /
 * `CliVendor`.
 *
 * `zcode` (Z.ai ZCode) reads workspace slash-commands as flat `.md` files under
 * `.zcode/commands/` (user-level: `~/.zcode/commands`). It is deliberately kept
 * OUT of `VENDORS`, `CliTool`, and `CLI_SKILLS_DIR`: it has no skills concept,
 * so its workflows are exposed via flat command symlinks
 * (`installZcodeWorkflowCommands`) rather than `<skills>/<name>/SKILL.md`.
 */
export const WORKFLOW_ONLY_VENDORS = ["zcode"] as const;
export type WorkflowOnlyVendor = (typeof WORKFLOW_ONLY_VENDORS)[number];

/**
 * Hook vendors that have no skill-symlink target (no `CLI_SKILLS_DIR`
 * entry). Excluded from `CliTool` via type-level `Exclude`.
 */
export const NO_SKILL_VENDORS = ["grok"] as const;

/**
 * Every vendor oma can link — the runtime enumeration of {@link CliVendor}.
 * Sorted alphabetically for deterministic output where consumers iterate.
 *
 * This must cover all four arms of `CliVendor`. `EXTENSION_VENDORS` is kept out
 * of `VENDORS` because its install is forked to a dedicated composer, not
 * because it is optional — omitting it here silently dropped pi and opencode
 * from `readVendorsFromConfig`'s fallback, so a config with no `vendors:` block
 * never linked them and `AGENTS.md` lost pi's subagent and hook instructions.
 */
export const ALL_CLI_VENDORS: CliVendor[] = [
  ...VENDORS,
  ...EXTENSION_VENDORS,
  ...INSTALL_ONLY_VENDORS,
  ...WORKFLOW_ONLY_VENDORS,
].sort() as CliVendor[];

export interface SkillTargetSpec {
  /** Relative path under the install root when mode === "project". */
  projectPath: string;
  /** Relative path under the install root when mode === "global". */
  homePath: string;
  /**
   * When true, this vendor writes outside the project directory even in
   * project mode (HOME-base). Callers must obtain explicit user consent
   * before proceeding. Today only `hermes` qualifies.
   */
  requiresHomeConsent?: boolean;
  /**
   * When true, this vendor is shown in the install prompt but NOT selected
   * by default. Users must explicitly opt in.
   */
  optIn?: boolean;
}

export const CLI_SKILLS_DIR: Record<CliTool, SkillTargetSpec> & {
  opencode: SkillTargetSpec;
} = {
  antigravity: {
    projectPath: ".gemini/antigravity-cli/skills",
    homePath: ".gemini/antigravity-cli/skills",
    requiresHomeConsent: true,
  },
  claude: { projectPath: ".claude/skills", homePath: ".claude/skills" },
  codex: { projectPath: ".codex/skills", homePath: ".codex/skills" },
  commandcode: {
    projectPath: ".commandcode/skills",
    homePath: ".commandcode/skills",
    optIn: true,
  },
  copilot: { projectPath: ".github/skills", homePath: ".copilot/skills" },
  cursor: { projectPath: ".cursor/skills", homePath: ".cursor/skills" },
  hermes: {
    projectPath: ".hermes/skills/oma",
    homePath: ".hermes/skills/oma",
    requiresHomeConsent: true,
  },
  kimi: {
    // Kimi's hooks are global-only (~/.kimi-code/config.toml), so selecting Kimi
    // always entails a HOME write. requiresHomeConsent keeps the explicit
    // HOME-write consent prompt that also gates those hooks, and parks the skill
    // symlinks in the user-tier `~/.kimi-code/skills/`. Kimi additionally scans
    // the project's SSOT `.agents/skills/` natively, so skills resolve
    // project-wide regardless. (MCP, which needs no HOME write, stays
    // project-scoped — see cli/vendors/kimi/mcp.ts.)
    projectPath: ".kimi-code/skills",
    homePath: ".kimi-code/skills",
    requiresHomeConsent: true,
    optIn: true,
  },
  kiro: { projectPath: ".kiro/skills", homePath: ".kiro/skills", optIn: true },
  opencode: {
    projectPath: ".opencode/skills",
    homePath: ".opencode/skills",
  },
  qwen: { projectPath: ".qwen/skills", homePath: ".qwen/skills" },
};
