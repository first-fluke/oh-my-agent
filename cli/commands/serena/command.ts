import type { Command } from "commander";
import {
  daemonPidsWithLiveClients,
  pruneRegistry,
} from "../../io/serena-daemon.js";
import { runAction } from "../../utils/cli-framework.js";

/**
 * Register all `oma serena *` commands:
 *   - serena reap [--dry-run] [--quiet]      (Task 6)
 *   - serena reaper:enable                   (Task 7)
 *   - serena reaper:disable                  (Task 7)
 *
 * Design: docs/plans/designs/021-serena-memory-reaper.md §Track C′
 */
export function registerSerenaCommands(program: Command): void {
  const serena = program
    .command("serena")
    .description("Serena MCP language-server lifecycle utilities");

  // ---------------------------------------------------------------------------
  // oma serena reap [--dry-run] [--quiet]
  // ---------------------------------------------------------------------------
  serena
    .command("reap")
    .description(
      "Kill idle Serena LSP children to reclaim memory (Serena self-heals on next tool call)",
    )
    .option("--dry-run", "Show reap targets without killing any processes")
    .option("--quiet", "Suppress all output (for use in scheduled tasks)")
    .action(
      runAction(async (options) => {
        const {
          buildActivityResolver,
          buildReaperLogEntries,
          appendReaperLog,
          buildRealKillAdapter,
          formatReapSummary,
          loadOmaConfigContent,
          runPs,
          scanSerenaLogs,
        } = await import("../../io/serena-reaper-runtime.js");

        const {
          computeReapTargets,
          discoverSerenaRoots,
          executeReapPlan,
          loadSerenaReaperConfigFromContent,
          shouldSkipScheduledReap,
        } = await import("../../io/serena-reaper.js");

        const dryRun: boolean = options.dryRun === true;
        const quiet: boolean = options.quiet === true;

        // 1. Gather process list
        const psOutput = runPs();

        // 2. Scan Serena logs for activity signals
        const logEntries = scanSerenaLogs();
        const activityResolver = buildActivityResolver(logEntries);

        // 3. Discover Serena roots
        const roots = discoverSerenaRoots(psOutput, activityResolver);

        // 4. Load config
        const configContent = loadOmaConfigContent();
        const config = loadSerenaReaperConfigFromContent(configContent);

        // 4b. Opt-in gate (T1-4): the automatic/scheduled path (--quiet) honors
        // `serena_reaper.enabled`; interactive and --dry-run runs always proceed.
        if (shouldSkipScheduledReap(quiet, dryRun, config.enabled)) {
          return;
        }

        // 5. Compute reap targets. Shared daemons with attached MCP clients
        // are protected: the reaper's log/mtime/cpu signals can't see a client
        // that is merely between tool calls, and stripping a warm LSP stack
        // out from under live sessions defeats the point of sharing.
        // Dead daemon registrations are pruned on the same pass.
        pruneRegistry();
        const nowMs = Date.now();
        const targets = computeReapTargets(
          roots,
          config,
          undefined,
          nowMs,
          daemonPidsWithLiveClients(),
        );

        // 6. Always show summary first (T1-4: no surprise kills)
        if (!quiet) {
          const summary = formatReapSummary(roots, targets, nowMs);
          for (const line of summary) {
            console.log(line);
          }
        }

        if (dryRun) return;

        if (targets.length === 0) return;

        // 7. Execute reap
        const killAdapter = buildRealKillAdapter();
        await executeReapPlan(
          targets,
          psOutput,
          config.graceSeconds,
          killAdapter,
        );

        // 8. Append to ~/.serena/logs/oma-reaper.log (T1-4)
        const logEntriesToWrite = buildReaperLogEntries(targets, nowMs);
        appendReaperLog(logEntriesToWrite);

        if (!quiet) {
          console.log(
            `\nReaped ${targets.length} root(s). Serena will self-heal LSPs on next tool call.`,
          );
        }
      }),
    );

  // ---------------------------------------------------------------------------
  // oma serena reaper enable
  // ---------------------------------------------------------------------------
  serena
    .command("reaper:enable")
    .description(
      "Install the periodic Serena Reaper scheduled task (runs every 5 minutes)",
    )
    .option("--dry-run", "Preview the service file without installing")
    .action(
      runAction(async (options) => {
        const { getSerenaReaperServicePresence, installSerenaReaperService } =
          await import("../../platform/serena-reaper-service.js");
        const { loadOmaConfigContent } = await import(
          "../../io/serena-reaper-runtime.js"
        );
        const { loadSerenaReaperConfigFromContent } = await import(
          "../../io/serena-reaper.js"
        );

        const dryRun: boolean = options.dryRun === true;

        // Warn if the scheduled task would no-op due to the opt-in gate.
        const reaperConfig = loadSerenaReaperConfigFromContent(
          loadOmaConfigContent(),
        );
        if (!reaperConfig.enabled) {
          console.log(
            "⚠️  serena_reaper.enabled is false — the scheduled task will be installed but each run is a no-op.\n   Set `serena_reaper: { enabled: true }` in oma-config.yaml to activate periodic reaping.",
          );
        }

        // Idempotency check
        if (!dryRun) {
          const presence = getSerenaReaperServicePresence();
          if (presence.installed) {
            console.log(
              `Serena Reaper periodic task is already installed at:\n  ${presence.servicePath}`,
            );
            return;
          }
        }

        const result = installSerenaReaperService({ dryRun });

        if (dryRun && result.content) {
          console.log("Service file content (dry run):\n");
          console.log(result.content);
          if (result.commands.length > 0) {
            console.log("\nActivation commands (dry run):");
            for (const cmd of result.commands) {
              console.log(`  ${cmd}`);
            }
          }
          return;
        }

        console.log(result.message);

        if (result.servicePath) {
          console.log(`Service path: ${result.servicePath}`);
        }

        if (!result.supported) {
          console.log(
            `Platform "${result.platform}" is not supported. Install oma and run "oma serena reap --quiet" manually on a cron.`,
          );
        }
      }),
    );

  // ---------------------------------------------------------------------------
  // oma serena reaper disable
  // ---------------------------------------------------------------------------
  serena
    .command("reaper:disable")
    .description("Uninstall the periodic Serena Reaper scheduled task")
    .option("--dry-run", "Preview the disable steps without removing anything")
    .action(
      runAction(async (options) => {
        const { getSerenaReaperServicePresence, uninstallSerenaReaperService } =
          await import("../../platform/serena-reaper-service.js");

        const dryRun: boolean = options.dryRun === true;

        // Idempotency check
        if (!dryRun) {
          const presence = getSerenaReaperServicePresence();
          if (!presence.installed) {
            console.log("Serena Reaper periodic task is not installed.");
            return;
          }
        }

        const result = uninstallSerenaReaperService({ dryRun });

        if (dryRun) {
          console.log(result.message);
          if (result.commands.length > 0) {
            console.log("\nDisable commands (dry run):");
            for (const cmd of result.commands) {
              console.log(`  ${cmd}`);
            }
          }
          return;
        }

        console.log(result.message);
      }),
    );
}
