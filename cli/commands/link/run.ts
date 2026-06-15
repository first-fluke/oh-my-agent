import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import pc from "picocolors";
import { VENDORS } from "../../constants/vendors.js";
import { ensureOmaProjectGitignore } from "../../io/gitignore.js";
import { installVendorAgents } from "../../platform/agent-composer.js";
import { getInstallMode } from "../../platform/install-context.js";
import { installOpencodePlugin } from "../../platform/opencode-plugin-composer.js";
import { installPiExtension } from "../../platform/pi-extension-composer.js";
import { installPiPromptTemplates } from "../../platform/pi-prompts.js";
import {
  applyCursorRules,
  mergeRulesIndexForVendor,
} from "../../platform/rules.js";
import {
  applyCursorMcpConfig,
  createVendorSymlinks,
  createVendorWorkflowSymlinks,
  detectExistingCliSymlinkDirs,
  getInstalledSkillNames,
  getInstalledWorkflowNames,
  installCopilotWorkflowPrompts,
  installVendorAdaptations,
  isExtensionVendor,
  isHookVendor,
  readVendorsFromConfig,
  vendorRequiresHomeConsent,
} from "../../platform/skills-installer.js";
import type { CliTool, CliVendor } from "../../types/index.js";
import { isTelemetryEnabled, loadSerenaConfig } from "../../utils/config.js";
import { safeWriteJson } from "../../utils/safe-write.js";
import { installAntigravityHud } from "../../vendors/antigravity/hud.js";
import { applyAntigravityMcpConfig } from "../../vendors/antigravity/mcp.js";
import {
  applyClaudeMcp,
  needsClaudeMcpUpdate,
} from "../../vendors/claude/mcp.js";
import {
  applyClaudeSettings,
  needsClaudeSettingsUpdate,
} from "../../vendors/claude/settings.js";
import {
  applyCodexSettings,
  needsCodexSettingsUpdate,
  parseCodexConfig,
  serializeCodexConfig,
} from "../../vendors/codex/settings.js";
import { disableCursorAgentAttribution } from "../../vendors/cursor/settings.js";
import {
  applyGeminiSettings,
  needsGeminiSettingsUpdate,
} from "../../vendors/gemini/settings.js";
import {
  applyGrokProjectMcp,
  applyGrokTelemetryConfig,
  needsGrokProjectMcpUpdate,
  needsGrokTelemetryUpdate,
} from "../../vendors/grok/settings.js";
import {
  applyKiroOmaHooksAgent,
  applyKiroProjectMcp,
  needsKiroMcpUpdate,
} from "../../vendors/kiro/settings.js";
import {
  applyQwenSettings,
  needsQwenSettingsUpdate,
} from "../../vendors/qwen/settings.js";

/**
 * Options for the link kernel.
 *
 * `link()` is the single vendor-reconciliation kernel used by the `oma link`,
 * `oma update`, and `oma install` commands. Callers that embed link inside
 * a larger flow (update / install) should set `quiet: true` and consume the
 * returned {@link LinkResult} to render their own UX.
 */
export interface LinkOptions {
  /**
   * Restrict reconciliation to this subset of vendors. When omitted, falls
   * back to the `vendors:` block in `.agents/oma-config.yaml`, then to
   * `ALL_CLI_VENDORS`.
   */
  vendorFilter?: string[];

  /**
   * Suppress decorative stdout (`● Linking vendors:` header, per-vendor
   * `✓` lines, the trailing `Linked N vendor(s)` summary). Errors and
   * warnings (e.g. agy reason) are still printed.
   */
  quiet?: boolean;

  /**
   * Telemetry opt-in. Threaded to vendor-specific settings writers
   * (Claude / Gemini / Qwen / Codex) so they can strip telemetry-disabling
   * env vars when the user opts in. When omitted, read from
   * `oma-config.yaml` via {@link isTelemetryEnabled}.
   */
  telemetry?: boolean;

  /**
   * Refresh CLI skill symlinks for vendors that already have project- or
   * HOME-scoped skill dirs. Defaults to `true`. Set `false` when the caller
   * manages symlinks itself with a more specific vendor list (e.g.
   * `install` passes explicitly consented HOME vendors).
   */
  refreshSymlinks?: boolean;
}

/**
 * Result of a link reconciliation pass. Consumers (update / install) use
 * this to render their own UX in place of the standalone CLI summary.
 */
export interface LinkResult {
  /** Hook vendors that were processed via {@link installVendorAdaptations}. */
  vendors: CliVendor[];
  /** True when the Antigravity HUD was successfully wired into HOME. */
  agyInstalled: boolean;
  /** Human reason returned by the agy installer when it skipped. */
  agySkipReason?: string;
  /** Vendor doc files that were merged (e.g. `["CLAUDE.md", "AGENTS.md"]`). */
  mergedDocs: string[];
  /** CLI skill symlinks that were created during this pass. */
  symlinksCreated: string[];
}

/**
 * Regenerate all vendor-specific files (.claude/, .cursor/, .gemini/, etc.)
 * from the SSOT in .agents/ without a full install or update.
 *
 * This is the canonical vendor-reconciliation kernel. The `oma link` CLI
 * command is a thin wrapper; `oma install` and `oma update` invoke this
 * function (with `quiet: true`) after their own setup steps so that adding
 * a new vendor only requires a change in this one file.
 */
export function link(opts: LinkOptions = {}): LinkResult {
  const cwd = process.cwd();
  const quiet = opts.quiet ?? false;
  const refreshSymlinks = opts.refreshSymlinks ?? true;

  const empty: LinkResult = {
    vendors: [],
    agyInstalled: false,
    mergedDocs: [],
    symlinksCreated: [],
  };

  if (!existsSync(join(cwd, ".agents"))) {
    console.error(
      `${pc.red("✗")} No .agents/ directory found. Run ${pc.cyan("oma install")} first.`,
    );
    process.exitCode = 1;
    return empty;
  }

  // 1. Resolve vendor list
  const configuredVendors: CliVendor[] =
    opts.vendorFilter !== undefined
      ? (opts.vendorFilter as CliVendor[])
      : readVendorsFromConfig(cwd);
  const hookVendors = configuredVendors.filter(isHookVendor);
  // Extension-model vendors (pi) install via a forked path, not the
  // settings-file hook flow. Match through the extension-vendor guard so they
  // stay out of the hook-vendor pipeline.
  const extensionVendors = (configuredVendors as readonly string[]).filter(
    isExtensionVendor,
  );

  if (hookVendors.length === 0 && extensionVendors.length === 0) {
    if (!quiet) {
      console.log(`${pc.yellow("⚠")} No vendors to link.`);
    }
    return empty;
  }

  // Install in-process extension vendors (pi) regardless of whether any
  // hook-model vendors are configured. pi auto-loads `.pi/extensions/oma/` and
  // `.pi/prompts/*.md` supplies OMA workflow slash commands.
  const piConfigured = extensionVendors.includes("pi");
  let piMergedDocs = false;
  if (piConfigured) {
    installPiExtension(cwd, cwd);
    installPiPromptTemplates(cwd, cwd);
    if (hookVendors.length === 0) {
      piMergedDocs = mergeRulesIndexForVendor(cwd, "pi");
    }
    if (!quiet) {
      console.log(`${pc.green("✓")} pi (.pi/extensions/oma/, .pi/prompts/)`);
    }
  }

  // Install in-process extension vendor: opencode (Sst opencode). opencode
  // auto-loads `.opencode/plugins/oma/` as a plugin directory and dispatches
  // plugin event handlers rather than settings-file hook registrations.
  const opencodeConfigured = extensionVendors.includes("opencode");
  if (opencodeConfigured) {
    installOpencodePlugin(cwd, cwd);
    // Generate `.opencode/agents/*.md` subagent personas from the SSOT variant
    // (`.agents/agents/variants/opencode.json`). Extension vendors are skipped
    // by installVendorAdaptations (hook-vendor only), so generate them here.
    installVendorAgents(cwd, cwd, "opencode");
    if (!quiet) {
      console.log(
        `${pc.green("✓")} opencode (.opencode/plugins/oma/, .opencode/agents/)`,
      );
    }
  }

  if (hookVendors.length === 0) {
    // Only extension vendors were configured; the bridge/prompts are installed above.
    return { ...empty, mergedDocs: piMergedDocs ? ["AGENTS.md"] : [] };
  }

  if (!quiet) {
    console.log(
      `${pc.blue("●")} Linking vendors: ${hookVendors.map((v) => pc.cyan(v)).join(", ")}`,
    );
  }

  // 2. Resolve telemetry preference once for all vendor writers.
  const telemetry = opts.telemetry ?? isTelemetryEnabled(cwd);
  const telemetryOptions = { telemetry };

  // 3. Install vendor-specific adaptations (agents, hooks, settings).
  installVendorAdaptations(cwd, cwd, hookVendors);

  const serenaCfg = loadSerenaConfig(cwd);

  // 4a. Claude `.claude/settings.json` — telemetry-aware env opt-out.
  if (configuredVendors.includes("claude")) {
    const claudeSettingsPath = join(cwd, ".claude", "settings.json");
    let claudeSettings: unknown = {};
    if (existsSync(claudeSettingsPath)) {
      try {
        claudeSettings = JSON.parse(readFileSync(claudeSettingsPath, "utf-8"));
      } catch {
        claudeSettings = {};
      }
    }
    if (needsClaudeSettingsUpdate(claudeSettings, telemetryOptions)) {
      applyClaudeSettings(claudeSettings, telemetryOptions);
      safeWriteJson(claudeSettingsPath, claudeSettings);
    }
  }

  // 4b. Gemini `.gemini/settings.json` — serena MCP follows oma-config
  //     serena.mode. stdio (default): direct `serena start-mcp-server
  //     --context=ide`. bridge + bridge_host=gemini: `{url: bridge_url}` so
  //     Gemini shares the HTTP serena started by `oma bridge` (used when
  //     subagent fan-out matters or when paired with Antigravity).
  if (configuredVendors.includes("gemini")) {
    const geminiSettingsPath = join(cwd, ".gemini", "settings.json");
    let geminiSettings: unknown = {};
    if (existsSync(geminiSettingsPath)) {
      try {
        geminiSettings = JSON.parse(readFileSync(geminiSettingsPath, "utf-8"));
      } catch {
        geminiSettings = {};
      }
    }
    if (needsGeminiSettingsUpdate(geminiSettings, telemetryOptions)) {
      applyGeminiSettings(geminiSettings, telemetryOptions);
      safeWriteJson(geminiSettingsPath, geminiSettings);
    }
    // Override serena entry for bridge mode (settings.ts only knows stdio).
    if (serenaCfg.mode === "bridge" && serenaCfg.bridgeHost === "gemini") {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(readFileSync(geminiSettingsPath, "utf-8"));
      } catch {
        parsed = {};
      }
      const mcpServers =
        parsed.mcpServers &&
        typeof parsed.mcpServers === "object" &&
        !Array.isArray(parsed.mcpServers)
          ? (parsed.mcpServers as Record<string, unknown>)
          : {};
      mcpServers.serena = { url: serenaCfg.bridgeUrl };
      parsed.mcpServers = mcpServers;
      safeWriteJson(geminiSettingsPath, parsed);
    }
  }

  // 4c. Qwen `.qwen/settings.json` — telemetry-aware.
  if (configuredVendors.includes("qwen")) {
    const qwenSettingsPath = join(cwd, ".qwen", "settings.json");
    let qwenSettings: unknown = {};
    if (existsSync(qwenSettingsPath)) {
      try {
        qwenSettings = JSON.parse(readFileSync(qwenSettingsPath, "utf-8"));
      } catch {
        qwenSettings = {};
      }
    }
    if (needsQwenSettingsUpdate(qwenSettings, telemetryOptions)) {
      const next = applyQwenSettings(qwenSettings, telemetryOptions);
      safeWriteJson(qwenSettingsPath, next);
    }
  }

  // 4d. Copilot workflow prompt wrappers under `.github/prompts/`.
  if (configuredVendors.includes("copilot")) {
    installCopilotWorkflowPrompts(cwd, cwd);
  }

  // 4e. Codex `.codex/config.toml`.
  if (configuredVendors.includes("codex")) {
    const codexConfigPath = join(cwd, ".codex", "config.toml");
    const rawToml = existsSync(codexConfigPath)
      ? readFileSync(codexConfigPath, "utf-8")
      : "";
    const codexSettings = parseCodexConfig(rawToml);
    if (needsCodexSettingsUpdate(codexSettings, telemetryOptions)) {
      const next = applyCodexSettings(codexSettings, telemetryOptions);
      mkdirSync(dirname(codexConfigPath), { recursive: true });
      writeFileSync(codexConfigPath, `${serializeCodexConfig(next)}\n`);
    }
  }

  // 4e. Grok global ~/.grok/config.toml — telemetry/privacy respect.
  // This is global (not per-project), so we apply it whenever we run link
  // so that oma's telemetry preference is honored for Grok.
  if (
    configuredVendors.includes("grok") &&
    needsGrokTelemetryUpdate(telemetryOptions)
  ) {
    applyGrokTelemetryConfig(telemetryOptions);
  }

  // Grok project-level MCP servers in `.grok/config.toml` (only [mcp_servers] supported).
  // Registers Serena (and potentially others) so Grok can use the same MCPs as other vendors.
  if (configuredVendors.includes("grok") && needsGrokProjectMcpUpdate(cwd)) {
    applyGrokProjectMcp(cwd);
  }

  // 4f-kiro. Kiro uses agent configuration for hooks and settings for MCP.
  if (configuredVendors.includes("kiro")) {
    applyKiroOmaHooksAgent(cwd);
    if (needsKiroMcpUpdate(cwd)) {
      applyKiroProjectMcp(cwd);
    }
  }

  // 4f. Claude Code project-level MCP (`.mcp.json` at project root, serena
  //     with --context=claude-code, shared via version control). When the
  //     file is missing, seed mcpServers from the SSOT `.agents/mcp.json` so
  //     other servers (chrome-devtools, context7, etc.) are also exposed to
  //     Claude. Existing user customizations in `.mcp.json` are preserved.
  if (configuredVendors.includes("claude")) {
    const claudeMcpPath = join(cwd, ".mcp.json");
    const claudeMcpExists = existsSync(claudeMcpPath);
    let claudeMcp: unknown = {};
    if (claudeMcpExists) {
      try {
        claudeMcp = JSON.parse(readFileSync(claudeMcpPath, "utf-8"));
      } catch {
        claudeMcp = {};
      }
    } else {
      // Seed from SSOT so Claude sees the same MCP server set as Cursor.
      const agentsMcpPath = join(cwd, ".agents", "mcp.json");
      if (existsSync(agentsMcpPath)) {
        try {
          const ssot = JSON.parse(readFileSync(agentsMcpPath, "utf-8"));
          if (ssot && typeof ssot === "object" && ssot.mcpServers) {
            claudeMcp = { mcpServers: ssot.mcpServers };
          }
        } catch {
          claudeMcp = {};
        }
      }
    }
    if (!claudeMcpExists || needsClaudeMcpUpdate(claudeMcp)) {
      const next = applyClaudeMcp(claudeMcp);
      safeWriteJson(claudeMcpPath, next);
    }
  }

  // 4g. Antigravity (agy) HOME wiring — separate from project-scoped variants
  //     because agy reads only ~/.gemini/antigravity-cli/settings.json and
  //     supports Claude-style PreToolUse / Stop / StatusLine. Skipped silently
  //     when agy's config dir doesn't exist yet (user hasn't run agy).
  let agyInstalled = false;
  let agySkipReason: string | undefined;
  if (configuredVendors.includes("antigravity")) {
    const agyResult = installAntigravityHud(cwd, telemetryOptions);
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
    //     Project: <cwd>/.agents/mcp_config.json
    //     Global:  ~/.gemini/antigravity-cli/mcp_config.json
    //     Mirrors oma's SSOT mcp.json so users get the same servers without
    //     manual setup. See docs/oma-config-semantics.md.
    try {
      const mode = getInstallMode();
      const written = applyAntigravityMcpConfig(cwd, mode);
      if (written && !quiet) {
        console.log(`${pc.green("✓")} agy mcp_config.json: ${written}`);
      }
    } catch {
      // getInstallMode may not be set in some test contexts — skip silently.
    }
  }

  // 5. Cursor-specific: MCP config (regular file, serena with --context=ide) +
  //    rules + disable cursor-agent commit/PR attribution (no "Co-authored-by:
  //    Cursor" stamping).
  if (configuredVendors.includes("cursor")) {
    applyCursorMcpConfig(cwd);
    applyCursorRules(cwd);
    disableCursorAgentAttribution();
  }

  // 6. Merge vendor documentation (CLAUDE.md, GEMINI.md, AGENTS.md)
  const mergedDocs: string[] = [];
  const mergedDocsSet = new Set<string>();
  for (const v of VENDORS) {
    if (!configuredVendors.includes(v)) continue;
    const target =
      v === "claude" ? "CLAUDE.md" : v === "gemini" ? "GEMINI.md" : "AGENTS.md";
    if (mergedDocsSet.has(target)) continue;
    if (mergeRulesIndexForVendor(cwd, v)) {
      mergedDocsSet.add(target);
      mergedDocs.push(target);
    }
  }
  if (piConfigured && !mergedDocsSet.has("AGENTS.md")) {
    if (mergeRulesIndexForVendor(cwd, "pi")) {
      mergedDocsSet.add("AGENTS.md");
      mergedDocs.push("AGENTS.md");
    }
  }

  // 7. Refresh CLI skill symlinks. HOME-write vendors only proceed if
  //    already in oma-config (consent recorded by `oma install`).
  const symlinksCreated: string[] = [];
  if (refreshSymlinks) {
    const cliTools = detectExistingCliSymlinkDirs(cwd);
    if (cliTools.length > 0) {
      const skillNames = getInstalledSkillNames(cwd);
      const recordedVendors = readVendorsFromConfig(cwd);
      const safeCliTools: CliTool[] = cliTools.filter(
        (cli) =>
          !vendorRequiresHomeConsent(cli) || recordedVendors.includes(cli),
      );
      if (skillNames.length > 0 && safeCliTools.length > 0) {
        const { created } = createVendorSymlinks(cwd, safeCliTools, skillNames);
        symlinksCreated.push(...created);
      }
      // Workflows are surfaced as slash-command skills via direct symlinks at
      // `.agents/workflows/<name>.md` (no generated wrapper under .agents/skills).
      const workflowNames = getInstalledWorkflowNames(cwd);
      if (workflowNames.length > 0 && safeCliTools.length > 0) {
        const { created } = createVendorWorkflowSymlinks(
          cwd,
          safeCliTools,
          workflowNames,
        );
        symlinksCreated.push(...created);
      }
    }
  }

  try {
    if (getInstallMode() === "project") {
      ensureOmaProjectGitignore(cwd);
    }
  } catch {
    // Default to project-scoped hygiene when install context is unset (tests).
    ensureOmaProjectGitignore(cwd);
  }

  // 8. Summary (suppressed in quiet mode — callers render their own UX).
  if (!quiet) {
    const parts: string[] = [];
    for (const v of hookVendors) {
      parts.push(`${pc.green("✓")} ${v}`);
    }
    if (agyInstalled) {
      parts.push(`${pc.green("✓")} antigravity (~/.gemini/antigravity-cli/)`);
    }
    if (mergedDocs.length > 0) {
      parts.push(`${pc.green("✓")} docs: ${mergedDocs.join(", ")}`);
    }
    console.log(parts.join("\n"));

    const total = hookVendors.length + (agyInstalled ? 1 : 0);
    console.log(`\n${pc.green("✓")} Linked ${total} vendor(s).`);
  }

  return {
    vendors: hookVendors,
    agyInstalled,
    agySkipReason,
    mergedDocs,
    symlinksCreated,
  };
}
