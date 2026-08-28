import type { Command } from "commander";
import {
  getAgentMemoryServicePresence,
  installAgentMemoryService,
  uninstallAgentMemoryService,
} from "../../platform/agentmemory-service.js";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { controlAgentMemoryDaemon } from "./daemon.js";
import { garbageCollectLocalState } from "./gc.js";
import { printAgentMemoryImport } from "./import.js";
import { maintainAgentMemory } from "./maintain.js";
import {
  initMemory,
  printAgentMemoryDaemon,
  printAgentMemoryMaintain,
  printAgentMemoryServiceInstall,
  printAgentMemoryServiceUninstall,
  printAgentMemorySetup,
  printAgentMemoryStatus,
  printAgentMemoryUpgrade,
  printMemoryGc,
  printMemoryRetryDrain,
} from "./render.js";
import { drainMemoryRetryQueue } from "./retry-drain.js";
import { getAgentMemoryStatus, setupAgentMemory } from "./setup.js";
import { upgradeAgentMemory } from "./upgrade.js";

export {
  controlAgentMemoryDaemon,
  drainMemoryRetryQueue,
  garbageCollectLocalState,
  getAgentMemoryServicePresence,
  getAgentMemoryStatus,
  installAgentMemoryService,
  maintainAgentMemory,
  setupAgentMemory,
  uninstallAgentMemoryService,
  upgradeAgentMemory,
};

export function registerMemory(program: Command): void {
  addOutputOptions(
    program
      .command("memory:init")
      .description(
        "Initialize the coordination store in .agents/state/memories",
      )
      .option("--force", "Overwrite empty or existing schema files"),
  ).action(
    runAction(
      async (options) => {
        await initMemory(resolveJsonMode(options), options.force);
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    program
      .command("memory:setup")
      .description("Prepare AgentMemory endpoint configuration")
      .option("--endpoint <url>", "Write an explicit AgentMemory endpoint URL")
      .option("--port <port>", "Write a loopback AgentMemory port")
      .option("--install", "Install @agentmemory/agentmemory globally")
      .option("--start", "Start AgentMemory after setup")
      .option("--dry-run", "Preview setup without writing files"),
  ).action(
    runAction(
      async (options) => {
        await printAgentMemorySetup(resolveJsonMode(options), {
          endpoint: options.endpoint,
          port: options.port,
          install: options.install,
          start: options.start,
          dryRun: options.dryRun,
        });
      },
      { supportsJsonOutput: true },
    ),
  );

  const daemon = program
    .command("memory:daemon")
    .description("Manage an OMA-owned AgentMemory daemon process");

  addOutputOptions(
    daemon.command("status").description("Show daemon status"),
  ).action(
    runAction(
      async (options) => {
        await printAgentMemoryDaemon("status", resolveJsonMode(options));
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    daemon
      .command("start")
      .description("Start AgentMemory in the background")
      .option("--port <port>", "Loopback REST port", "3111")
      .option("--dry-run", "Preview the daemon command without starting it"),
  ).action(
    runAction(
      async (options) => {
        await printAgentMemoryDaemon("start", resolveJsonMode(options), {
          port: options.port,
          dryRun: options.dryRun,
        });
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    daemon
      .command("stop")
      .description("Stop the OMA-owned AgentMemory daemon")
      .option("--dry-run", "Preview stop without signaling a process"),
  ).action(
    runAction(
      async (options) => {
        await printAgentMemoryDaemon("stop", resolveJsonMode(options), {
          dryRun: options.dryRun,
        });
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    daemon
      .command("restart")
      .description("Restart the OMA-owned AgentMemory daemon")
      .option("--port <port>", "Loopback REST port", "3111")
      .option("--dry-run", "Preview restart without signaling a process"),
  ).action(
    runAction(
      async (options) => {
        await printAgentMemoryDaemon("restart", resolveJsonMode(options), {
          port: options.port,
          dryRun: options.dryRun,
        });
      },
      { supportsJsonOutput: true },
    ),
  );

  const service = program
    .command("memory:service")
    .description("Manage AgentMemory OS service integration");

  addOutputOptions(
    service
      .command("install")
      .description("Install AgentMemory launchd/systemd service integration")
      .option("--port <port>", "Loopback REST port", "3111")
      .option("--dry-run", "Preview service install without writing files"),
  ).action(
    runAction(
      async (options) => {
        printAgentMemoryServiceInstall(
          resolveJsonMode(options),
          options.dryRun,
          options.port,
        );
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    service
      .command("uninstall")
      .description("Uninstall AgentMemory launchd/systemd service integration")
      .option("--dry-run", "Preview service uninstall without changing files"),
  ).action(
    runAction(
      async (options) => {
        printAgentMemoryServiceUninstall(
          resolveJsonMode(options),
          options.dryRun,
        );
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    program
      .command("memory:status")
      .description("Show AgentMemory provider health"),
  ).action(
    runAction(
      async (options) => {
        await printAgentMemoryStatus(resolveJsonMode(options));
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    program
      .command("memory:retry-drain")
      .description("Drain queued AgentMemory observe retries")
      .option("--dry-run", "Inspect retry queue without modifying it"),
  ).action(
    runAction(
      async (options) => {
        await printMemoryRetryDrain(resolveJsonMode(options), options.dryRun);
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    program
      .command("memory:import")
      .description("Import vendor conversation history into AgentMemory")
      .option(
        "--source <source>",
        "Import source: all, claude, codex, cursor, gemini, qwen, retry",
        "all",
      )
      .option(
        "--since <since>",
        "Import window start: 24h, 7d, 30d, or YYYY-MM-DD",
        "30d",
      )
      .option("--dry-run", "Preview import without writing to AgentMemory")
      .option(
        "--force-partial",
        "Accept partial source coverage for locked or best-effort stores",
      ),
  ).action(
    runAction(
      async (options) => {
        await printAgentMemoryImport(resolveJsonMode(options), {
          source: options.source,
          since: options.since,
          dryRun: options.dryRun,
          forcePartial: options.forcePartial,
        });
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    program
      .command("memory:maintain <action>")
      .description("Maintain AgentMemory local storage: backup, prune, vacuum")
      .option("--keep <count>", "Backups to keep when pruning", "5")
      .option("--dry-run", "Preview maintenance without changing files"),
  ).action(
    runAction(
      async (action, options) => {
        if (!["backup", "prune", "vacuum"].includes(action)) {
          throw new Error(
            "invalid memory maintain action: use backup, prune, or vacuum",
          );
        }
        printAgentMemoryMaintain(action, resolveJsonMode(options), {
          keep: options.keep,
          dryRun: options.dryRun,
        });
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    program
      .command("memory:gc")
      .description(
        "Garbage-collect project-local memory: prune old L1 sessions and ephemeral Serena files",
      )
      .option(
        "--scope <scope>",
        "Stores to sweep: all, sessions, serena",
        "all",
      )
      .option(
        "--keep <count>",
        "Most-recent L1 sessions to retain (config: memory.gc.keep_sessions, default 100)",
      )
      .option(
        "--max-age-days <days>",
        "Prune Serena run artifacts older than N days, 0 disables (config: memory.gc.max_age_days, default 50)",
      )
      .option("--dry-run", "Preview the prune plan without deleting files"),
  ).action(
    runAction(
      async (options) => {
        const scope = options.scope ?? "all";
        if (!["all", "sessions", "serena"].includes(scope)) {
          throw new Error(
            "invalid memory gc scope: use all, sessions, or serena",
          );
        }
        printMemoryGc(resolveJsonMode(options), {
          scope,
          keep: options.keep,
          maxAgeDays: options.maxAgeDays,
          dryRun: options.dryRun,
        });
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    program
      .command("memory:upgrade")
      .description(
        "Stop, backup, upgrade, restart, and health-check AgentMemory",
      )
      .option("--port <port>", "Loopback REST port after restart")
      .option("--dry-run", "Preview upgrade without changing files"),
  ).action(
    runAction(
      async (options) => {
        await printAgentMemoryUpgrade(resolveJsonMode(options), {
          port: options.port,
          dryRun: options.dryRun,
        });
      },
      { supportsJsonOutput: true },
    ),
  );
}
