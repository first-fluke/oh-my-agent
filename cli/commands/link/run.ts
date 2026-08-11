import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import pc from "picocolors";
import { VENDORS } from "../../constants/vendors.js";
import { ensureOmaProjectGitignore } from "../../io/gitignore.js";
import { installVendorAgents } from "../../platform/agent-composer.js";
import {
  getInstallMode,
  safeGetInstallMode,
  safeGetInstallRoot,
} from "../../platform/install-context.js";
import {
  installOpencodePlugin,
  registerOpencodePlugin,
} from "../../platform/opencode-plugin-composer.js";
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
  installZcodeWorkflowCommands,
  isExtensionVendor,
  isHookVendor,
  readVendorsFromConfig,
  vendorRequiresHomeConsent,
  vendorSkillsDir,
} from "../../platform/skills-installer.js";
import type { CliTool, CliVendor } from "../../types/index.js";
import { isTelemetryEnabled } from "../../utils/config.js";
import { safeWriteJson } from "../../utils/safe-write.js";
import { installAntigravityHud } from "../../vendors/antigravity/hud.js";
import { applyAntigravityMcpConfig } from "../../vendors/antigravity/mcp.js";
import type { ClaudeMcpServer } from "../../vendors/claude/mcp.js";
import {
  applyClaudeMcp,
  needsClaudeMcpUpdate,
} from "../../vendors/claude/mcp.js";
import {
  applyClaudeSettings,
  needsClaudeSettingsUpdate,
} from "../../vendors/claude/settings.js";
import { ensureClaudeWorkspaceTrust } from "../../vendors/claude/trust.js";
import {
  applyCodexSettings,
  needsCodexSettingsUpdate,
  parseCodexConfig,
  serializeCodexConfig,
} from "../../vendors/codex/settings.js";
import { disableCursorAgentAttribution } from "../../vendors/cursor/settings.js";
import {
  applyGrokProjectMcp,
  applyGrokTelemetryConfig,
  needsGrokProjectMcpUpdate,
  needsGrokTelemetryUpdate,
} from "../../vendors/grok/settings.js";
import { installKimiHooks } from "../../vendors/kimi/hooks.js";
import { installKimiMcp } from "../../vendors/kimi/mcp.js";
import {
  applyKiroOmaHooksAgent,
  applyKiroProjectMcp,
  needsKiroMcpUpdate,
} from "../../vendors/kiro/settings.js";
import {
  applyQwenSettings,
  needsQwenSettingsUpdate,
} from "../../vendors/qwen/settings.js";
import type { LinkPlanEntry } from "./plan.js";
import { renderLinkPlan } from "./plan.js";

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

  /**
   * Install root to reconcile against — the directory that holds `.agents/`
   * and receives the generated vendor dirs (`.claude/`, `.opencode/`, …).
   * Defaults to the process-wide install context resolved by the CLI bootstrap
   * (`OMA_HOME` > `--global`/`OMA_INSTALL_GLOBAL=1` > `process.cwd()`), so
   * `oma link --global` targets `$HOME` from any working directory. Callers
   * that already resolved a root (`install` / `update`) pass it explicitly.
   */
  root?: string;

  /**
   * Preview mode: walk the full reconciliation, record every target into
   * {@link LinkResult.plan}, but perform no writes. Vendor gating is evaluated
   * by the same conditionals as a real pass — the plan is recorded inline at
   * each write site rather than rebuilt by a parallel planner — so the preview
   * cannot drift from what a real run would do.
   *
   * Derived counts that come back from the skipped writers (`mergedDocs`,
   * `symlinksCreated`, `agyInstalled`) stay empty in this mode; read `plan`
   * instead.
   */
  dryRun?: boolean;
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
  /**
   * Every target this pass touched — written on a normal run, or that would
   * have been written under {@link LinkOptions.dryRun}. Recorded at the write
   * sites themselves, so both modes produce it from one code path.
   */
  plan: LinkPlanEntry[];
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
  // Never process.cwd(): `oma link --global` must reconcile $HOME regardless of
  // the directory it was invoked from, the same way install / update / doctor
  // do. safeGetInstallRoot falls back to process.cwd() only when the context is
  // unset (unit tests), which matches project mode anyway.
  const root = opts.root ?? safeGetInstallRoot();
  const quiet = opts.quiet ?? false;
  const refreshSymlinks = opts.refreshSymlinks ?? true;
  const dryRun = opts.dryRun ?? false;

  // Recorded at each write site and gated by `dryRun` there, so the preview and
  // a real pass share one set of vendor conditionals.
  const plan: LinkPlanEntry[] = [];
  const record = (
    path: string,
    kind: LinkPlanEntry["kind"],
    reason: string,
  ): void => {
    plan.push({ path, kind, reason });
  };

  const empty: LinkResult = {
    vendors: [],
    agyInstalled: false,
    mergedDocs: [],
    symlinksCreated: [],
    plan,
  };

  if (!existsSync(join(root, ".agents"))) {
    // Name the root that was searched: the message is otherwise indistinguishable
    // between "not installed" and "installed globally, linked without --global".
    console.error(
      `${pc.red("✗")} No .agents/ directory found in ${root}. Run ${pc.cyan("oma install")} first${
        safeGetInstallMode() === "project"
          ? `, or pass ${pc.cyan("--global")} to link the HOME install`
          : ""
      }.`,
    );
    process.exitCode = 1;
    return empty;
  }

  // 1. Resolve vendor list
  const configuredVendors: CliVendor[] =
    opts.vendorFilter !== undefined
      ? (opts.vendorFilter as CliVendor[])
      : readVendorsFromConfig(root);
  const hookVendors = configuredVendors.filter(isHookVendor);
  // Extension-model vendors (pi) install via a forked path, not the
  // settings-file hook flow. Match through the extension-vendor guard so they
  // stay out of the hook-vendor pipeline.
  const extensionVendors = (configuredVendors as readonly string[]).filter(
    isExtensionVendor,
  );
  // Workflow-only vendors (zcode) have no hook bridge and no skill symlinks —
  // they receive only `.zcode/commands/*.md` workflow links, installed below
  // alongside the extension vendors and ahead of the hook-vendor pipeline.
  const zcodeConfigured = configuredVendors.includes("zcode");

  if (
    hookVendors.length === 0 &&
    extensionVendors.length === 0 &&
    !zcodeConfigured
  ) {
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
    record(
      join(root, ".pi", "extensions", "oma"),
      "write",
      "installPiExtension",
    );
    record(join(root, ".pi", "prompts"), "write", "installPiPromptTemplates");
    if (!dryRun) {
      installPiExtension(root, root);
      installPiPromptTemplates(root, root);
    }
    if (hookVendors.length === 0) {
      record(join(root, "AGENTS.md"), "write", "mergeRulesIndexForVendor (pi)");
      piMergedDocs = dryRun ? false : mergeRulesIndexForVendor(root, "pi");
    }
    if (!quiet && !dryRun) {
      console.log(`${pc.green("✓")} pi (.pi/extensions/oma/, .pi/prompts/)`);
    }
  }

  // Install in-process extension vendor: opencode (Sst opencode). opencode
  // loads in-process plugins (event handlers) from `.opencode/plugins/` rather
  // than settings-file hook registrations. The bridge is materialized under a
  // nested `oma/` subdir and registered explicitly in opencode.jsonc, since
  // opencode's auto-discovery only scans `.opencode/plugins/*` flatly.
  const opencodeConfigured = extensionVendors.includes("opencode");
  if (opencodeConfigured) {
    record(
      join(root, ".opencode", "plugins", "oma"),
      "write",
      "installOpencodePlugin",
    );
    record(
      join(root, ".opencode", "agents"),
      "write",
      "installVendorAgents (opencode)",
    );
    record(join(root, "opencode.jsonc"), "write", "registerOpencodePlugin");
    // installVendorAgents both counts and writes, so the zero-agent warning
    // below has no dry-run equivalent — the recorded targets stand in for it.
    if (!dryRun) {
      installOpencodePlugin(root, root);
      // Generate `.opencode/agents/*.md` subagent personas from the SSOT variant
      // (`.agents/agents/variants/opencode.json`). Extension vendors are skipped
      // by installVendorAdaptations (hook-vendor only), so generate them here.
      const agentsWritten = installVendorAgents(root, root, "opencode");
      // The bridge lives in a nested subdir that opencode's flat plugin
      // auto-discovery skips, so register it explicitly in opencode.jsonc.
      registerOpencodePlugin(root);
      if (agentsWritten === 0) {
        // Printed even in quiet mode: a zero-agent link is silent data loss —
        // per-agent model pins in oma-config.yaml never reach .opencode/agents/.
        console.log(
          `${pc.yellow("⚠")} opencode: no agents generated from ${join(root, ".agents", "agents")} — .opencode/agents/ left untouched.`,
        );
      } else if (!quiet) {
        console.log(
          `${pc.green("✓")} opencode (.opencode/plugins/oma/, .opencode/agents/ — ${agentsWritten} agents)`,
        );
      }
    }
  }

  // Install workflow-only vendor: zcode. Runs regardless of whether any
  // hook/extension vendors are configured, since zcode has no hook bridge.
  if (zcodeConfigured) {
    record(
      join(root, ".zcode", "commands"),
      "link",
      "installZcodeWorkflowCommands",
    );
    if (!dryRun) {
      const { created } = installZcodeWorkflowCommands(root);
      if (!quiet && created.length > 0) {
        console.log(`${pc.green("✓")} zcode (.zcode/commands/)`);
      }
    }
  }

  if (hookVendors.length === 0) {
    // Only extension / workflow-only vendors were configured; their
    // bridge / prompts / commands are installed above.
    if (dryRun && !quiet) {
      renderLinkPlan(plan, root);
    }
    return { ...empty, mergedDocs: piMergedDocs ? ["AGENTS.md"] : [] };
  }

  if (!quiet && !dryRun) {
    console.log(
      `${pc.blue("●")} Linking vendors: ${hookVendors.map((v) => pc.cyan(v)).join(", ")}`,
    );
  }

  // 2. Resolve telemetry preference once for all vendor writers.
  const telemetry = opts.telemetry ?? isTelemetryEnabled(root);
  const telemetryOptions = { telemetry };

  // 3. Install vendor-specific adaptations (agents, hooks, settings).
  //    Snapshot .codex/hooks.json first: Codex re-gates hook trust (TOFU)
  //    whenever the command string changes, so we notify the user to re-trust
  //    when this install creates or updates the file.
  const codexConfigured = configuredVendors.includes("codex");
  const codexHooksPath = join(root, ".codex", "hooks.json");
  const codexHooksBefore =
    codexConfigured && existsSync(codexHooksPath)
      ? readFileSync(codexHooksPath, "utf-8")
      : null;

  // Each vendor's output dirs are declared in its variant JSON (hookDir,
  // settingsFile), not derivable from the vendor name — record the scope rather
  // than fabricate per-vendor paths the preview cannot verify.
  record(root, "write", `installVendorAdaptations ×${hookVendors.length}`);
  if (!dryRun) {
    installVendorAdaptations(root, root, hookVendors);
  }

  // Codex hook-trust notice: printed even in quiet mode because untrusted hooks
  // silently do not run — install/update (quiet) callers must surface it too.
  if (codexConfigured && !dryRun) {
    const codexHooksAfter = existsSync(codexHooksPath)
      ? readFileSync(codexHooksPath, "utf-8")
      : null;
    if (codexHooksAfter !== null && codexHooksAfter !== codexHooksBefore) {
      console.log(
        `${pc.yellow("⚠")} Codex hooks installed/updated — run ${pc.cyan("codex")} and use ${pc.cyan("/hooks")} to trust them (untrusted hooks do not run).`,
      );
    }
  }

  // 4a. Claude `.claude/settings.json` — telemetry-aware env opt-out.
  if (configuredVendors.includes("claude")) {
    const claudeSettingsPath = join(root, ".claude", "settings.json");
    let claudeSettings: unknown = {};
    if (existsSync(claudeSettingsPath)) {
      try {
        claudeSettings = JSON.parse(readFileSync(claudeSettingsPath, "utf-8"));
      } catch {
        claudeSettings = {};
      }
    }
    if (needsClaudeSettingsUpdate(claudeSettings, telemetryOptions)) {
      record(claudeSettingsPath, "write", "claude settings (telemetry)");
      if (!dryRun) {
        applyClaudeSettings(claudeSettings, telemetryOptions);
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
    const qwenSettingsPath = join(root, ".qwen", "settings.json");
    let qwenSettings: unknown = {};
    if (existsSync(qwenSettingsPath)) {
      try {
        qwenSettings = JSON.parse(readFileSync(qwenSettingsPath, "utf-8"));
      } catch {
        qwenSettings = {};
      }
    }
    if (needsQwenSettingsUpdate(qwenSettings, telemetryOptions)) {
      record(qwenSettingsPath, "write", "qwen settings (telemetry)");
      if (!dryRun) {
        const next = applyQwenSettings(qwenSettings, telemetryOptions);
        safeWriteJson(qwenSettingsPath, next);
      }
    }
  }

  // 4d. Copilot workflow prompt wrappers under `.github/prompts/`.
  if (configuredVendors.includes("copilot")) {
    record(
      join(root, ".github", "prompts"),
      "write",
      "installCopilotWorkflowPrompts",
    );
    if (!dryRun) {
      installCopilotWorkflowPrompts(root, root);
    }
  }

  // 4e. Codex `.codex/config.toml`.
  if (configuredVendors.includes("codex")) {
    const codexConfigPath = join(root, ".codex", "config.toml");
    const rawToml = existsSync(codexConfigPath)
      ? readFileSync(codexConfigPath, "utf-8")
      : "";
    const codexSettings = parseCodexConfig(rawToml);
    if (needsCodexSettingsUpdate(codexSettings, telemetryOptions)) {
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
  if (configuredVendors.includes("grok") && needsGrokProjectMcpUpdate(root)) {
    record(
      join(root, ".grok", "config.toml"),
      "write",
      "grok project [mcp_servers]",
    );
    if (!dryRun) {
      applyGrokProjectMcp(root);
    }
  }

  // 4f-kiro. Kiro uses agent configuration for hooks and settings for MCP.
  if (configuredVendors.includes("kiro")) {
    record(
      join(root, ".kiro", "agents", "oma-hooks.json"),
      "write",
      "applyKiroOmaHooksAgent",
    );
    if (!dryRun) {
      applyKiroOmaHooksAgent(root);
    }
    if (needsKiroMcpUpdate(root)) {
      record(
        join(root, ".kiro", "settings", "cli.json"),
        "write",
        "kiro mcpServers",
      );
      if (!dryRun) {
        applyKiroProjectMcp(root);
      }
    }
  }

  // 4f. Claude Code project-level MCP (`.mcp.json` at project root, serena
  //     with --context=claude-code, shared via version control). When the
  //     file is missing, seed mcpServers from the SSOT `.agents/mcp.json` so
  //     other servers (chrome-devtools, context7, etc.) are also exposed to
  //     Claude. Existing user customizations in `.mcp.json` are preserved.
  if (configuredVendors.includes("claude")) {
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

    let claudeMcp: unknown = {};
    if (claudeMcpExists) {
      try {
        claudeMcp = JSON.parse(readFileSync(claudeMcpPath, "utf-8"));
      } catch {
        claudeMcp = {};
      }
    }
    if (!claudeMcpExists || needsClaudeMcpUpdate(claudeMcp, ssotServers)) {
      record(
        claudeMcpPath,
        "write",
        claudeMcpExists
          ? "claude mcp (back-fill SSOT)"
          : "claude mcp (seed from SSOT)",
      );
      if (!dryRun) {
        const next = applyClaudeMcp(claudeMcp, ssotServers);
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
    record(
      join(homedir(), ".kimi-code", "config.toml"),
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
    record(join(root, ".kimi-code", "mcp.json"), "write", "installKimiMcp");
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
    record(join(root, ".cursor", "mcp.json"), "write", "applyCursorMcpConfig");
    record(join(root, ".cursor", "rules"), "write", "applyCursorRules");
    record(
      join(homedir(), ".cursor", "cli-config.json"),
      "write",
      "disableCursorAgentAttribution",
    );
    if (!dryRun) {
      applyCursorMcpConfig(root);
      applyCursorRules(root);
      disableCursorAgentAttribution();
    }
  }

  // 6. Merge vendor documentation (CLAUDE.md, AGENTS.md)
  const mergedDocs: string[] = [];
  const mergedDocsSet = new Set<string>();
  // mergeRulesIndexForVendor both splices the OMA block and reports whether it
  // changed anything, so dry-run records the target and leaves mergedDocs empty
  // rather than claiming a merge it cannot evaluate without writing.
  const plannedDocs = new Set<string>();
  for (const v of VENDORS) {
    if (!configuredVendors.includes(v)) continue;
    const target = v === "claude" ? "CLAUDE.md" : "AGENTS.md";
    if (mergedDocsSet.has(target) || plannedDocs.has(target)) continue;
    if (dryRun) {
      plannedDocs.add(target);
      record(join(root, target), "write", "mergeRulesIndexForVendor");
      continue;
    }
    if (mergeRulesIndexForVendor(root, v)) {
      mergedDocsSet.add(target);
      mergedDocs.push(target);
      record(join(root, target), "write", "mergeRulesIndexForVendor");
    }
  }
  if (piConfigured && !mergedDocsSet.has("AGENTS.md")) {
    if (dryRun) {
      if (!plannedDocs.has("AGENTS.md")) {
        plannedDocs.add("AGENTS.md");
        record(
          join(root, "AGENTS.md"),
          "write",
          "mergeRulesIndexForVendor (pi)",
        );
      }
    } else if (mergeRulesIndexForVendor(root, "pi")) {
      mergedDocsSet.add("AGENTS.md");
      mergedDocs.push("AGENTS.md");
      record(join(root, "AGENTS.md"), "write", "mergeRulesIndexForVendor (pi)");
    }
  }

  // 7. Refresh CLI skill symlinks. HOME-write vendors only proceed if
  //    already in oma-config (consent recorded by `oma install`).
  const symlinksCreated: string[] = [];
  if (refreshSymlinks) {
    const cliTools = detectExistingCliSymlinkDirs(root);
    if (cliTools.length > 0) {
      const skillNames = getInstalledSkillNames(root);
      const recordedVendors = readVendorsFromConfig(root);
      const safeCliTools: CliTool[] = cliTools.filter(
        (cli) =>
          !vendorRequiresHomeConsent(cli) || recordedVendors.includes(cli),
      );
      const workflowNames = getInstalledWorkflowNames(root);
      if (safeCliTools.length > 0) {
        for (const cli of safeCliTools) {
          record(
            vendorSkillsDir(cli, root),
            "link",
            `${skillNames.length} skills, ${workflowNames.length} workflows`,
          );
        }
      }
      if (!dryRun) {
        if (skillNames.length > 0 && safeCliTools.length > 0) {
          const { created } = createVendorSymlinks(
            root,
            safeCliTools,
            skillNames,
          );
          symlinksCreated.push(...created);
        }
        // Workflows are surfaced as slash-command skills via direct symlinks at
        // `.agents/workflows/<name>.md` (no generated wrapper under .agents/skills).
        if (workflowNames.length > 0 && safeCliTools.length > 0) {
          const { created } = createVendorWorkflowSymlinks(
            root,
            safeCliTools,
            workflowNames,
          );
          symlinksCreated.push(...created);
        }
      }
    }
  }

  // Project-scoped hygiene only: a global install has no project .gitignore to
  // maintain. Recorded inside the existing mode check so the preview and the
  // write share one decision rather than re-deriving the mode.
  const gitignoreStep = (): void => {
    record(join(root, ".gitignore"), "write", "ensureOmaProjectGitignore");
    if (!dryRun) {
      ensureOmaProjectGitignore(root);
    }
  };
  try {
    if (getInstallMode() === "project") {
      gitignoreStep();
    }
  } catch {
    // Default to project-scoped hygiene when install context is unset (tests).
    gitignoreStep();
  }

  // 8. Summary (suppressed in quiet mode — callers render their own UX).
  if (dryRun) {
    if (!quiet) {
      renderLinkPlan(plan, root);
    }
  } else if (!quiet) {
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
    plan,
  };
}
