import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import pc from "picocolors";
import {
  getInstallMode,
  safeGetInstallMode,
} from "../../../platform/install-context.js";
import { applyCursorRules } from "../../../platform/rules.js";
import {
  applyCursorMcpConfig,
  installCopilotWorkflowPrompts,
} from "../../../platform/skills-installer.js";
import type { CliVendor } from "../../../types/index.js";
import {
  readJsonForMerge,
  readJsonMergeBaseOrWarn,
  readTomlMergeBaseOrWarn,
  warnUnmergeable,
} from "../../../utils/merge-read.js";
import { safeWriteJson } from "../../../utils/safe-write.js";
import { installAntigravityHud } from "../../../vendors/antigravity/hud.js";
import { applyAntigravityMcpConfig } from "../../../vendors/antigravity/mcp.js";
import type { ClaudeMcpServer } from "../../../vendors/claude/mcp.js";
import {
  applyClaudeMcp,
  needsClaudeMcpUpdate,
} from "../../../vendors/claude/mcp.js";
import {
  applyClaudeSettings,
  claudeAttributionEnabled,
  needsClaudeSettingsUpdate,
} from "../../../vendors/claude/settings.js";
import { ensureClaudeWorkspaceTrust } from "../../../vendors/claude/trust.js";
import {
  applyCodexSettings,
  needsCodexSettingsUpdate,
  serializeCodexConfig,
} from "../../../vendors/codex/settings.js";
import { disableCursorAgentAttribution } from "../../../vendors/cursor/settings.js";
import {
  applyGrokProjectMcp,
  applyGrokTelemetryConfig,
  needsGrokProjectMcpUpdate,
  needsGrokTelemetryUpdate,
} from "../../../vendors/grok/settings.js";
import { kimiHome } from "../../../vendors/kimi/auth.js";
import { installKimiHooks } from "../../../vendors/kimi/hooks.js";
import {
  installKimiMcp,
  kimiMcpConfigPath,
} from "../../../vendors/kimi/mcp.js";
import {
  applyKiroOmaHooksAgent,
  applyKiroProjectMcp,
  needsKiroMcpUpdate,
} from "../../../vendors/kiro/settings.js";
import {
  applyQwenSettings,
  needsQwenSettingsUpdate,
} from "../../../vendors/qwen/settings.js";
import { hasUserQwenModelProviders } from "../../../vendors/qwen/user-settings.js";
import type { LinkPlanEntry } from "../plan.js";

export interface VendorSettingsContext {
  root: string;
  nativeRoot: string;
  configuredVendors: CliVendor[];
  telemetryOptions: { telemetry: boolean };
  dryRun: boolean;
  quiet: boolean;
  record: (path: string, kind: LinkPlanEntry["kind"], reason: string) => void;
}

export interface VendorSettingsResult {
  agyInstalled: boolean;
  agySkipReason?: string;
}

/**
 * Apply vendor-specific settings files after `installVendorAdaptations`.
 *
 * Project-scoped files use `nativeRoot`; HOME-scoped vendor wiring (Claude
 * trust, Grok telemetry, agy, Kimi, Cursor attribution) targets `homedir()`.
 * Every write is recorded through `record` so dry-run previews stay in sync
 * with a real pass.
 */
export function syncVendorSettings(
  ctx: VendorSettingsContext,
): VendorSettingsResult {
  const {
    root,
    nativeRoot,
    configuredVendors,
    telemetryOptions,
    dryRun,
    quiet,
    record,
  } = ctx;

  // 4a. Claude `.claude/settings.json` — telemetry-aware env opt-out. A file
  //     that does not parse is left untouched (never rewritten from `{}`).
  if (configuredVendors.includes("claude")) {
    const claudeSettingsPath = join(nativeRoot, ".claude", "settings.json");
    const claudeSettings = readJsonMergeBaseOrWarn(claudeSettingsPath);
    const claudeOptions = {
      ...telemetryOptions,
      attribution: claudeAttributionEnabled(root),
    };
    if (
      claudeSettings &&
      needsClaudeSettingsUpdate(claudeSettings, claudeOptions)
    ) {
      record(claudeSettingsPath, "write", "claude settings (telemetry)");
      if (!dryRun) {
        applyClaudeSettings(claudeSettings, claudeOptions);
        safeWriteJson(claudeSettingsPath, claudeSettings);
      }
    }
  }

  // 4b. Claude Code workspace trust — pre-accept the trust dialog for this
  //     project so the permissions.allow entries written to
  //     .claude/settings.json take effect immediately. Without this Claude Code
  //     prints "Ignoring N permissions.allow entries ... this workspace has not
  //     been trusted" and re-prompts for each permission. Only project installs
  //     trust the install root; global installs are skipped because the trusted
  //     workspace is whatever project the user later opens. Surgically merges
  //     ~/.claude.json (never overwrites it). See vendors/claude/trust.ts.
  if (
    configuredVendors.includes("claude") &&
    safeGetInstallMode() === "project"
  ) {
    record(
      join(homedir(), ".claude.json"),
      "write",
      "ensureClaudeWorkspaceTrust",
    );
    if (!dryRun) {
      const trust = ensureClaudeWorkspaceTrust(root);
      if (!quiet) {
        if (trust.changed) {
          console.log(
            `${pc.green("✓")} claude: trusted workspace (~/.claude.json)`,
          );
        } else if (trust.reason) {
          console.log(`${pc.yellow("⚠")} claude trust: ${trust.reason}`);
        }
      }
    }
  }

  // 4c. Qwen `.qwen/settings.json` — telemetry-aware.
  if (configuredVendors.includes("qwen")) {
    const qwenSettingsPath = join(nativeRoot, ".qwen", "settings.json");
    const qwenSettings = readJsonMergeBaseOrWarn(qwenSettingsPath);
    const qwenOptions = {
      ...telemetryOptions,
      userModelProviders: hasUserQwenModelProviders(),
    };
    if (qwenSettings && needsQwenSettingsUpdate(qwenSettings, qwenOptions)) {
      record(qwenSettingsPath, "write", "qwen settings (telemetry)");
      if (!dryRun) {
        const next = applyQwenSettings(qwenSettings, qwenOptions);
        safeWriteJson(qwenSettingsPath, next);
      }
    }
  }

  // 4d. Copilot workflow prompt wrappers under `.github/prompts/`.
  if (configuredVendors.includes("copilot")) {
    record(
      join(nativeRoot, ".github", "prompts"),
      "write",
      "installCopilotWorkflowPrompts",
    );
    if (!dryRun) {
      installCopilotWorkflowPrompts(root, nativeRoot);
    }
  }

  // 4e. Codex `.codex/config.toml`.
  if (configuredVendors.includes("codex")) {
    const codexConfigPath = join(nativeRoot, ".codex", "config.toml");
    const codexSettings = readTomlMergeBaseOrWarn(codexConfigPath);
    if (
      codexSettings &&
      needsCodexSettingsUpdate(codexSettings, telemetryOptions)
    ) {
      record(codexConfigPath, "write", "codex config.toml");
      if (!dryRun) {
        const next = applyCodexSettings(codexSettings, telemetryOptions);
        mkdirSync(dirname(codexConfigPath), { recursive: true });
        writeFileSync(codexConfigPath, `${serializeCodexConfig(next)}\n`);
      }
    }
  }

  // 4e. Grok global ~/.grok/config.toml — telemetry/privacy respect.
  // This is global (not per-project), so we apply it whenever we run link
  // so that oma's telemetry preference is honored for Grok.
  if (
    configuredVendors.includes("grok") &&
    needsGrokTelemetryUpdate(telemetryOptions)
  ) {
    record(
      join(homedir(), ".grok", "config.toml"),
      "write",
      "grok telemetry (HOME-scoped)",
    );
    if (!dryRun) {
      applyGrokTelemetryConfig(telemetryOptions);
    }
  }

  // Grok project-level MCP servers in `.grok/config.toml` (only [mcp_servers] supported).
  // Registers Serena (and potentially others) so Grok can use the same MCPs as other vendors.
  if (
    configuredVendors.includes("grok") &&
    needsGrokProjectMcpUpdate(nativeRoot)
  ) {
    record(
      join(nativeRoot, ".grok", "config.toml"),
      "write",
      "grok project [mcp_servers]",
    );
    if (!dryRun) {
      applyGrokProjectMcp(nativeRoot);
    }
  }

  // 4f-kiro. Kiro uses agent configuration for hooks and settings for MCP.
  if (configuredVendors.includes("kiro")) {
    record(
      join(nativeRoot, ".kiro", "agents", "oma-hooks.json"),
      "write",
      "applyKiroOmaHooksAgent",
    );
    if (!dryRun) {
      applyKiroOmaHooksAgent(nativeRoot);
    }
    if (needsKiroMcpUpdate(nativeRoot)) {
      record(
        join(nativeRoot, ".kiro", "settings", "cli.json"),
        "write",
        "kiro mcpServers",
      );
      if (!dryRun) {
        applyKiroProjectMcp(nativeRoot);
      }
    }
  }

  // 4f. Claude Code project-level MCP (`.mcp.json` at project root, serena
  //     with --context=claude-code, shared via version control). When the
  //     file is missing, seed mcpServers from the SSOT `.agents/mcp.json` so
  //     other servers (chrome-devtools, context7, etc.) are also exposed to
  //     Claude. Existing user customizations in `.mcp.json` are preserved.
  if (
    safeGetInstallMode() !== "global" &&
    configuredVendors.includes("claude")
  ) {
    const claudeMcpPath = join(root, ".mcp.json");
    const claudeMcpExists = existsSync(claudeMcpPath);

    // Read the SSOT server set so both first-seed and subsequent updates can
    // propagate newly-added servers (chrome-devtools, context7, …) into
    // `.mcp.json`. On first create the file is empty and every SSOT server is
    // added; on later runs only servers still missing from `.mcp.json` are
    // back-filled (existing user customizations are preserved). serena is
    // excluded here — it's managed via RECOMMENDED_CLAUDE_MCP.
    let ssotServers: Record<string, ClaudeMcpServer> | undefined;
    const agentsMcpPath = join(root, ".agents", "mcp.json");
    if (existsSync(agentsMcpPath)) {
      try {
        const ssot = JSON.parse(readFileSync(agentsMcpPath, "utf-8"));
        if (ssot && typeof ssot === "object" && ssot.mcpServers) {
          ssotServers = ssot.mcpServers as Record<string, ClaudeMcpServer>;
        }
      } catch {
        ssotServers = undefined;
      }
    }

    const claudeMcpRead = readJsonForMerge(claudeMcpPath);
    if (claudeMcpRead.status === "invalid") {
      // User MCP servers live here; a parse failure must not reseed it.
      warnUnmergeable(claudeMcpPath, claudeMcpRead.reason);
    }
    const claudeMcp =
      claudeMcpRead.status === "ok" ? claudeMcpRead.value : undefined;
    if (
      claudeMcpRead.status !== "invalid" &&
      (!claudeMcpExists || needsClaudeMcpUpdate(claudeMcp, ssotServers))
    ) {
      record(
        claudeMcpPath,
        "write",
        claudeMcpExists
          ? "claude mcp (back-fill SSOT)"
          : "claude mcp (seed from SSOT)",
      );
      if (!dryRun) {
        const next = applyClaudeMcp(claudeMcp ?? {}, ssotServers);
        safeWriteJson(claudeMcpPath, next);
      }
    }
  }

  // 4g. Antigravity (agy) HOME wiring — separate from project-scoped variants
  //     because agy reads only ~/.gemini/antigravity-cli/settings.json and
  //     supports Claude-style PreToolUse / Stop / StatusLine. Skipped silently
  //     when agy's config dir doesn't exist yet (user hasn't run agy).
  let agyInstalled = false;
  let agySkipReason: string | undefined;
  if (configuredVendors.includes("antigravity")) {
    record(
      join(homedir(), ".gemini", "antigravity-cli", "settings.json"),
      "write",
      "installAntigravityHud",
    );
    const agyResult = dryRun
      ? { installed: false, reason: undefined }
      : installAntigravityHud(root, telemetryOptions);
    if (agyResult.installed) {
      agyInstalled = true;
    } else if (agyResult.reason) {
      agySkipReason = agyResult.reason;
      if (!quiet) {
        console.log(`${pc.yellow("⚠")} agy: ${agyResult.reason}`);
      }
    }

    // 4e. Antigravity MCP — agy reads from a dedicated `mcp_config.json`
    //     (separate from legacy ~/.gemini/settings.json mcpServers key).
    //     Project: <root>/.agents/mcp_config.json
    //     Global:  ~/.gemini/antigravity-cli/mcp_config.json
    //     Mirrors oma's SSOT mcp.json so users get the same servers without
    //     manual setup. See docs/oma-config-semantics.md.
    try {
      const mode = getInstallMode();
      record(
        mode === "global"
          ? join(homedir(), ".gemini", "antigravity-cli", "mcp_config.json")
          : join(root, ".agents", "mcp_config.json"),
        "write",
        "applyAntigravityMcpConfig",
      );
      if (!dryRun) {
        const written = applyAntigravityMcpConfig(root, mode);
        if (written && !quiet) {
          console.log(`${pc.green("✓")} agy mcp_config.json: ${written}`);
        }
      }
    } catch {
      // getInstallMode may not be set in some test contexts — skip silently.
    }
  }

  // 4h. Kimi Code CLI HOME wiring — Kimi is global-only: it reads hooks from
  //     ~/.kimi-code/config.toml ([[hooks]] TOML, KIMI_CODE_HOME) and exposes
  //     no project-scoped config, so the generic project-variant install is
  //     skipped (kimi.json is homeOnly) and we merge into HOME here. Gated on
  //     recorded consent (kimi in configuredVendors), like the agy block above.
  if (configuredVendors.includes("kimi")) {
    // kimiHome() honors KIMI_CODE_HOME, exactly as installKimiHooks does.
    record(
      join(kimiHome(), "config.toml"),
      "write",
      "installKimiHooks (merge)",
    );
    if (!dryRun) {
      const kimiResult = installKimiHooks(root);
      if (!kimiResult.installed && kimiResult.reason && !quiet) {
        console.log(`${pc.yellow("⚠")} kimi: ${kimiResult.reason}`);
      }
    }
    // Kimi MCP: serena + chrome-devtools into mcp.json (Claude-style JSON).
    // Mode-aware — project installs write <root>/.kimi-code/mcp.json, global
    // installs write ~/.kimi-code/mcp.json (skipped silently when absent).
    record(
      kimiMcpConfigPath(root, safeGetInstallMode()),
      "write",
      "installKimiMcp",
    );
    if (!dryRun) {
      const kimiMcp = installKimiMcp(root);
      if (kimiMcp.installed && kimiMcp.path && !quiet) {
        console.log(`${pc.green("✓")} kimi mcp.json: ${kimiMcp.path}`);
      }
    }
  }

  // 5. Cursor-specific: MCP config (regular file, serena with --context=ide) +
  //    rules + disable cursor-agent commit/PR attribution (no "Co-authored-by:
  //    Cursor" stamping).
  if (configuredVendors.includes("cursor")) {
    record(
      join(nativeRoot, ".cursor", "mcp.json"),
      "write",
      "applyCursorMcpConfig",
    );
    record(join(nativeRoot, ".cursor", "rules"), "write", "applyCursorRules");
    record(
      join(homedir(), ".cursor", "cli-config.json"),
      "write",
      "disableCursorAgentAttribution",
    );
    if (!dryRun) {
      applyCursorMcpConfig(root, nativeRoot);
      applyCursorRules(nativeRoot, root);
      disableCursorAgentAttribution();
    }
  }

  return { agyInstalled, agySkipReason };
}
