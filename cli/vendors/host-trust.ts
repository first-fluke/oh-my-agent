/**
 * Host trust steps `oma link` (install / update) runs so oma's hooks are not
 * held back by a host's folder-trust or hook-review gate. One step per host
 * that has such a gate; each module documents the host behaviour it mirrors
 * and the decisions it never overrides:
 *
 *   codex       — project trust_level + per-hook trusted_hash (codex/hook-trust.ts)
 *   cursor      — cursor-agent workspace-trust marker            (cursor/trust.ts)
 *   copilot     — trustedFolders in ~/.copilot/config.json       (copilot/trust.ts)
 *   grok        — ~/.grok/trusted_folders.toml                   (grok/trust.ts)
 *   antigravity — agy trustedWorkspaces                          (antigravity/trust.ts)
 *   kiro        — workspace-roots/<id>/permissions.yaml          (kiro/trust.ts)
 *   commandcode — ~/.commandcode/projects/<slug>                 (commandcode/trust.ts)
 *   pi          — ~/.pi/agent/trust.json                         (pi/trust.ts)
 *
 * Claude workspace trust and Qwen hook approval predate this list and run in
 * their own link steps. opencode, Kilo and Kimi load hooks / plugins without
 * a gate.
 *
 * Every target is HOME-scoped, so tests that link for real mock this module.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import type { CliVendor } from "../types/index.js";
import {
  agySettingsPath,
  ensureAgyWorkspaceTrust,
} from "./antigravity/trust.js";
import { codexHome, ensureCodexHookTrust } from "./codex/hook-trust.js";
import { ensureCommandCodeFolderTrust } from "./commandcode/trust.js";
import { copilotHome, ensureCopilotFolderTrust } from "./copilot/trust.js";
import { cursorDataDir, ensureCursorWorkspaceTrust } from "./cursor/trust.js";
import { ensureGrokFolderTrust, grokHome } from "./grok/trust.js";
import { ensureKiroWorkspaceTrust, kiroHome } from "./kiro/trust.js";
import { ensurePiProjectTrust, piAgentHome } from "./pi/trust.js";

export interface HostTrustOutcome {
  changed: boolean;
  reason?: string;
}

export interface HostTrustStep {
  vendor: CliVendor;
  /** Success message, e.g. "cursor: trusted workspace". */
  label: string;
  /** File or directory the step writes, for the link plan. */
  target: string;
  apply: () => HostTrustOutcome;
}

export interface HostTrustOptions {
  /** Project root of a project install (the folder hosts must trust). */
  root: string;
  /** Where vendor files live: the project root, or HOME for a global install. */
  nativeRoot: string;
  project: boolean;
}

/**
 * The trust steps for an install. A global install has no workspace to
 * trust, so only Codex's per-hook trust (which covers `~/.codex/hooks.json`
 * too) applies there.
 */
export function hostTrustSteps(options: HostTrustOptions): HostTrustStep[] {
  const { root, nativeRoot, project } = options;
  const steps: HostTrustStep[] = [
    {
      vendor: "codex",
      label: "codex: trusted oma hooks",
      target: join(codexHome(), "config.toml"),
      apply: () =>
        ensureCodexHookTrust(
          join(nativeRoot, ".codex", "hooks.json"),
          project ? root : undefined,
        ),
    },
  ];
  if (!project) return steps;
  steps.push(
    {
      vendor: "cursor",
      label: "cursor: trusted workspace",
      target: join(cursorDataDir(), "projects"),
      apply: () => ensureCursorWorkspaceTrust(root),
    },
    {
      vendor: "copilot",
      label: "copilot: trusted folder",
      target: join(copilotHome(), "config.json"),
      apply: () => ensureCopilotFolderTrust(root),
    },
    {
      vendor: "grok",
      label: "grok: trusted folder",
      target: join(grokHome(), "trusted_folders.toml"),
      apply: () => ensureGrokFolderTrust(root),
    },
    {
      vendor: "antigravity",
      label: "agy: trusted workspace",
      target: agySettingsPath(),
      apply: () => ensureAgyWorkspaceTrust(root),
    },
    {
      vendor: "kiro",
      label: "kiro: trusted workspace",
      target: join(kiroHome(), "workspace-roots"),
      apply: () => ensureKiroWorkspaceTrust(root),
    },
    {
      vendor: "commandcode",
      label: "commandcode: trusted folder",
      target: join(homedir(), ".commandcode", "projects"),
      apply: () => ensureCommandCodeFolderTrust(root),
    },
    {
      vendor: "pi",
      label: "pi: trusted project",
      target: join(piAgentHome(), "trust.json"),
      apply: () => ensurePiProjectTrust(root),
    },
  );
  return steps;
}
