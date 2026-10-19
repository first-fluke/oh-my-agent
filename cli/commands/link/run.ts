import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import pc from "picocolors";
import { VENDORS } from "../../constants/vendors.js";
import { ensureCoAuthorGuardHook, OMA_HOOKS_DIR } from "../../io/git-hooks.js";
import { ensureOmaProjectGitignore } from "../../io/gitignore.js";
import { installVendorAgents } from "../../platform/agent-composer.js";
import {
  claudeMdShadowsAgentsMd,
  ensureAgentsMdImport,
} from "../../platform/agents-md-import.js";
import {
  getInstallMode,
  isProjectModeInHome,
  safeGetInstallMode,
  safeGetInstallRoot,
} from "../../platform/install-context.js";
import {
  installOpencodePlugin,
  registerOpencodePlugin,
} from "../../platform/opencode-plugin-composer.js";
import { installPiExtension } from "../../platform/pi-extension-composer.js";
import { installPiPromptTemplates } from "../../platform/pi-prompts.js";
import { syncProviderMcp } from "../../platform/provider-mcp.js";
import {
  mergeRulesIndexForVendor,
  vendorDocFile,
} from "../../platform/rules.js";
import {
  createGlobalSkillDiscoveryLinks,
  createVendorSymlinks,
  createVendorWorkflowSymlinks,
  detectExistingCliSymlinkDirs,
  getInstalledSkillNames,
  getInstalledWorkflowNames,
  installVendorAdaptations,
  installZcodeWorkflowCommands,
  isExtensionVendor,
  isHookVendor,
  readVendorsFromConfig,
  vendorRequiresHomeConsent,
  vendorSkillsDir,
} from "../../platform/skills-installer.js";
import type { CliTool, CliVendor } from "../../types/index.js";
import {
  isTelemetryEnabled,
  loadDevToolsBrowsers,
} from "../../utils/config.js";
import { syncBrowserMcp } from "../../vendors/browser-mcp.js";
import { syncVendorSettings } from "./internal/vendor-settings.js";
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
   * Definition root to reconcile. Project mode writes vendor projections here;
   * global mode reads definitions here and writes native vendor paths under HOME.
   * Defaults to the process-wide install context resolved by the CLI bootstrap.
   * `oma link --global` reads OMA_HOME from any working directory. Callers
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
  /** Vendor doc files that were merged (only ever `["AGENTS.md"]`). */
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
  // Never process.cwd(): `oma link --global` must reconcile OMA_HOME regardless of
  // the directory it was invoked from, the same way install / update / doctor
  // do. safeGetInstallRoot falls back to process.cwd() only when the context is
  // unset (unit tests), which matches project mode anyway.
  const root = opts.root ?? safeGetInstallRoot();
  const nativeRoot = safeGetInstallMode() === "global" ? homedir() : root;
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

  const symlinksCreated: string[] = [];
  const empty: LinkResult = {
    vendors: [],
    agyInstalled: false,
    mergedDocs: [],
    symlinksCreated,
    plan,
  };

  // #788 — standalone `oma link` from $HOME without --global: `<root>/.claude/
  // settings.json` is then the user's GLOBAL Claude settings, and project-mode
  // rendering would replace its `$HOME/.claude/hooks/...` commands with
  // `$CLAUDE_PROJECT_DIR/...`, breaking every hook and the statusline in every
  // project. Only the CLI wrapper omits `root`; install/update pass it (install
  // has already obtained explicit HOME consent), so they are not gated here.
  // `homedir()` is passed from here (not defaulted inside install-context) so
  // the test setup's early import of install-context cannot pin the real HOME.
  if (
    opts.root === undefined &&
    isProjectModeInHome(root, safeGetInstallMode(), homedir())
  ) {
    console.error(
      `${pc.red("✗")} Refusing to link in HOME without --global: ${join(nativeRoot, ".claude", "settings.json")} is your global Claude Code settings, and a project-mode link would rewrite its hook paths to $CLAUDE_PROJECT_DIR. ` +
        `Run ${pc.cyan("oma link --global")} to reconcile the HOME install, or cd to a project directory first.`,
    );
    process.exitCode = 1;
    return empty;
  }

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

  if (safeGetInstallMode() === "global") {
    record(
      join(nativeRoot, ".agents", "skills"),
      "link",
      "global common skill discovery",
    );
    if (!dryRun) symlinksCreated.push(...createGlobalSkillDiscoveryLinks(root));
  }

  // 1. Resolve vendor list
  const configuredVendors: CliVendor[] =
    opts.vendorFilter !== undefined
      ? (opts.vendorFilter as CliVendor[])
      : readVendorsFromConfig(root);
  // AGENTS.md is shared by codex/cursor/qwen/pi and its OMA block carries
  // vendor-specific subagent/hook wiring. A vendor-filtered run
  // (`oma link cursor`) must therefore still render every vendor recorded in
  // oma-config, or it would overwrite the other vendors' instructions with its
  // own flavor and flip the file back on the next unfiltered `oma link`.
  const docVendors = Array.from(
    new Set<string>([...readVendorsFromConfig(root), ...configuredVendors]),
  );
  const hookVendors = configuredVendors.filter(isHookVendor);
  // Capture the user's original entries before legacy vendor writers refresh Serena.
  // The projector validates all native config before writing and honors dry-run.
  for (const path of syncProviderMcp(root, configuredVendors, {
    prepare: true,
    global: safeGetInstallMode() === "global",
    dryRun,
  })) {
    record(path, "write", "code intelligence provider selection");
  }
  const syncProviders = (): void => {
    for (const path of syncProviderMcp(root, configuredVendors, {
      global: safeGetInstallMode() === "global",
      dryRun,
    }))
      record(path, "write", "code intelligence provider selection");
  };
  const syncBrowsers = (): void => {
    const browsers = loadDevToolsBrowsers(root);
    if (browsers === undefined) return;
    for (const path of syncBrowserMcp(root, browsers, configuredVendors, {
      global: safeGetInstallMode() === "global",
      dryRun,
    })) {
      record(path, "write", "browser MCP selection");
    }
  };
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
    syncBrowsers();
    syncProviders();
    return empty;
  }

  // Install in-process extension vendors (pi) regardless of whether any
  // hook-model vendors are configured. pi auto-loads `.pi/extensions/oma/` and
  // `.pi/prompts/*.md` supplies OMA workflow slash commands.
  const piConfigured = extensionVendors.includes("pi");
  let piMergedDocs = false;
  if (piConfigured) {
    record(
      join(
        nativeRoot,
        ".pi",
        ...(safeGetInstallMode() === "global" ? ["agent"] : []),
        "extensions",
        "oma",
      ),
      "write",
      "installPiExtension",
    );
    record(
      join(
        nativeRoot,
        ".pi",
        ...(safeGetInstallMode() === "global" ? ["agent"] : []),
        "prompts",
      ),
      "write",
      "installPiPromptTemplates",
    );
    if (!dryRun) {
      installPiExtension(root, nativeRoot);
      installPiPromptTemplates(root, nativeRoot);
    }
    if (hookVendors.length === 0) {
      record(
        join(nativeRoot, "AGENTS.md"),
        "write",
        "mergeRulesIndexForVendor (pi)",
      );
      piMergedDocs = dryRun
        ? false
        : mergeRulesIndexForVendor(nativeRoot, "pi", docVendors, root);
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
    const opencodeDir = join(
      nativeRoot,
      ...(safeGetInstallMode() === "global"
        ? [".config", "opencode"]
        : [".opencode"]),
    );
    record(
      join(opencodeDir, "plugins", "oma"),
      "write",
      "installOpencodePlugin",
    );
    record(
      join(opencodeDir, "agents"),
      "write",
      "installVendorAgents (opencode)",
    );
    // registerOpencodePlugin rewrites an existing opencode.json in place and
    // only falls back to creating opencode.jsonc beside the plugins dir.
    const opencodeJson = join(opencodeDir, "opencode.json");
    record(
      existsSync(opencodeJson)
        ? opencodeJson
        : join(opencodeDir, "opencode.jsonc"),
      "write",
      "registerOpencodePlugin",
    );
    // installVendorAgents both counts and writes, so the zero-agent warning
    // below has no dry-run equivalent — the recorded targets stand in for it.
    if (!dryRun) {
      installOpencodePlugin(root, nativeRoot);
      // Generate `.opencode/agents/*.md` subagent personas from the SSOT variant
      // (`.agents/agents/variants/opencode.json`). Extension vendors are skipped
      // by installVendorAdaptations (hook-vendor only), so generate them here.
      const agentsWritten = installVendorAgents(root, nativeRoot, "opencode");
      // The bridge lives in a nested subdir that opencode's flat plugin
      // auto-discovery skips, so register it explicitly in opencode.jsonc.
      registerOpencodePlugin(nativeRoot);
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
      join(nativeRoot, ".zcode", "commands"),
      "link",
      "installZcodeWorkflowCommands",
    );
    if (!dryRun) {
      const { created } = installZcodeWorkflowCommands(root, nativeRoot);
      if (!quiet && created.length > 0) {
        console.log(`${pc.green("✓")} zcode (.zcode/commands/)`);
      }
    }
  }

  if (hookVendors.length === 0) {
    // Only extension / workflow-only vendors were configured; their
    // bridge / prompts / commands are installed above.
    syncBrowsers();
    syncProviders();
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
  const codexHooksPath = join(nativeRoot, ".codex", "hooks.json");
  const codexHooksBefore =
    codexConfigured && existsSync(codexHooksPath)
      ? readFileSync(codexHooksPath, "utf-8")
      : null;

  // Each vendor's output dirs are declared in its variant JSON (hookDir,
  // settingsFile), not derivable from the vendor name — record the scope rather
  // than fabricate per-vendor paths the preview cannot verify.
  record(
    nativeRoot,
    "write",
    `installVendorAdaptations ×${hookVendors.length}`,
  );
  if (!dryRun) {
    installVendorAdaptations(root, nativeRoot, hookVendors);
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

  const { agyInstalled, agySkipReason } = syncVendorSettings({
    root,
    nativeRoot,
    configuredVendors,
    telemetryOptions,
    dryRun,
    quiet,
    record,
  });

  syncBrowsers();
  syncProviders();

  // 6. Merge vendor documentation. AGENTS.md is the only managed doc;
  //    CLAUDE.md / GEMINI.md are never written and stay fully user-owned.
  const mergedDocs: string[] = [];
  const mergedDocsSet = new Set<string>();
  // mergeRulesIndexForVendor both splices the OMA block and reports whether it
  // changed anything, so dry-run records the target and leaves mergedDocs empty
  // rather than claiming a merge it cannot evaluate without writing.
  const plannedDocs = new Set<string>();
  for (const v of VENDORS) {
    if (!docVendors.includes(v)) continue;
    const target = vendorDocFile(v);
    if (target !== "AGENTS.md") continue;
    if (mergedDocsSet.has(target) || plannedDocs.has(target)) continue;
    if (dryRun) {
      plannedDocs.add(target);
      record(join(nativeRoot, target), "write", "mergeRulesIndexForVendor");
      continue;
    }
    if (mergeRulesIndexForVendor(nativeRoot, v, docVendors, root)) {
      mergedDocsSet.add(target);
      mergedDocs.push(target);
      record(join(nativeRoot, target), "write", "mergeRulesIndexForVendor");
    }
  }
  if (piConfigured && !mergedDocsSet.has("AGENTS.md")) {
    if (dryRun) {
      if (!plannedDocs.has("AGENTS.md")) {
        plannedDocs.add("AGENTS.md");
        record(
          join(nativeRoot, "AGENTS.md"),
          "write",
          "mergeRulesIndexForVendor (pi)",
        );
      }
    } else if (mergeRulesIndexForVendor(nativeRoot, "pi", docVendors, root)) {
      mergedDocsSet.add("AGENTS.md");
      mergedDocs.push("AGENTS.md");
      record(
        join(nativeRoot, "AGENTS.md"),
        "write",
        "mergeRulesIndexForVendor (pi)",
      );
    }
  }

  // 6b. Claude Code reads CLAUDE.md alone when both files exist, unless
  //     CLAUDE.md imports AGENTS.md. Never create CLAUDE.md; only append the
  //     one import line to a user-owned file that would otherwise shadow the
  //     AGENTS.md block just written.
  if (docVendors.includes("claude") && claudeMdShadowsAgentsMd(nativeRoot)) {
    record(join(nativeRoot, "CLAUDE.md"), "write", "ensureAgentsMdImport");
    if (!dryRun && ensureAgentsMdImport(nativeRoot) && !quiet) {
      console.log(`${pc.green("✓")} CLAUDE.md: added @AGENTS.md import`);
    }
  }

  // 7. Refresh CLI skill symlinks. HOME-write vendors only proceed if
  //    already in oma-config (consent recorded by `oma install`).
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

  // 7b. Co-author guard. oma tells agents to append a `Co-authored-by:` trailer
  //     and agents type it as literal text, so a wrong address is a plain typo
  //     the model can produce from memory. GitHub resolves that address against
  //     verified account emails and credits an unrelated person as a
  //     contributor, and refs/pull/* keeps the commit reachable permanently —
  //     a history rewrite does not undo it. Only a hook below the agent can
  //     stop it, and it covers every vendor at once. Project mode only: a
  //     global install has no repository to attach hooks to.
  const coAuthorGuardStep = (): void => {
    record(
      join(root, OMA_HOOKS_DIR, "commit-msg"),
      "write",
      "ensureCoAuthorGuardHook",
    );
    if (dryRun) return;
    const guard = ensureCoAuthorGuardHook(root);
    if (!quiet && guard.status === "written") {
      console.log(
        `${pc.green("✓")} git: co-author guard (${OMA_HOOKS_DIR}/commit-msg)`,
      );
    }
    // Printed even in quiet mode: an installed-but-inert hook reads as
    // protection the user does not actually have.
    if (guard.warning) {
      console.log(`${pc.yellow("⚠")} co-author guard: ${guard.warning}`);
    }
  };

  try {
    if (getInstallMode() === "project") {
      gitignoreStep();
      coAuthorGuardStep();
    }
  } catch {
    // Default to project-scoped hygiene when install context is unset (tests).
    gitignoreStep();
    coAuthorGuardStep();
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
