import type { Command } from "commander";
import {
  listRequiredDecisionCheckpoints,
  resolveDecisionVerifierSid,
  verifyRequiredDecisions,
} from "../../state/decision-verifier.js";
import {
  evaluateSelfHealingGate,
  renderSelfHealingGateResult,
} from "../../state/self-healing.js";
import {
  migrateLegacySessions,
  sessionMigrationActions,
} from "../../state/session-migration.js";
import {
  exportSessionSummary,
  renderSessionSummaryResult,
} from "../../state/session-summary.js";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";
import { listInjectLogs, viewInjectLog } from "./inject-log.js";
import {
  archiveStateSessions,
  purgeStateSessions,
  repairStateSessions,
} from "./maintenance.js";
import {
  renderArchivedStateList,
  renderArchiveResult,
  renderGlobalStateList,
  renderInjectLogView,
  renderPurgeResult,
  renderRepairResult,
  renderSessionView,
  renderStateList,
} from "./render.js";
import {
  activateStateSession,
  collectArchivedState,
  collectGlobalState,
  collectState,
  isValidSid,
  parseOlderThan,
  viewSession,
} from "./sessions.js";
import type {
  ArchivedSession,
  ArchivedStateView,
  ArchiveResult,
  InjectLogEntryRef,
  InjectLogView,
  PurgeResult,
  RepairResult,
  SessionView,
  StateView,
} from "./types.js";

export type {
  ArchivedSession,
  ArchivedStateView,
  ArchiveResult,
  InjectLogEntryRef,
  InjectLogView,
  PurgeResult,
  RepairResult,
  SessionView,
  StateView,
};
export {
  activateStateSession,
  archiveStateSessions,
  collectArchivedState,
  collectState,
  isValidSid,
  listInjectLogs,
  parseOlderThan,
  purgeStateSessions,
  renderArchivedStateList,
  renderArchiveResult,
  renderInjectLogView,
  renderPurgeResult,
  renderRepairResult,
  renderSessionView,
  renderStateList,
  repairStateSessions,
  viewInjectLog,
  viewSession,
};

function registerDecisionVerifyCommand(
  program: Command,
  commandName: string,
  description: string,
): void {
  addOutputOptions(
    program
      .command(commandName)
      .description(description)
      .requiredOption("--workflow <workflow>", "Workflow name")
      .requiredOption(
        "--checkpoint <checkpoint>",
        "Required decision checkpoint",
      )
      .requiredOption(
        "--instance <id>",
        "Current finding, revision, or attempt identifier",
      )
      .option("--sid <sid>", "Target session id")
      .option("--category <category>", "Active category lookup", "main")
      .option(
        "--no-emit-missing",
        "Do not append a decision.missing event when verification fails",
      ),
  ).action(
    runAction(
      async (options) => {
        const jsonMode = resolveJsonMode(options);
        const workflow = options.workflow as string;
        const checkpoint = options.checkpoint as string;
        const sid = resolveDecisionVerifierSid({
          projectDir: resolveProjectRoot(),
          sid: options.sid as string | undefined,
          category: options.category as string | undefined,
        });
        const result = await verifyRequiredDecisions({
          projectDir: resolveProjectRoot(),
          sid,
          workflow,
          checkpoint,
          instanceId: options.instance as string,
          emitMissing: options.emitMissing !== false,
        });

        if (jsonMode) {
          console.log(JSON.stringify(result, null, 2));
        } else if (result.ok) {
          console.log(
            `Required decisions present for ${workflow}/${checkpoint} (${result.instanceId}) -> ${sid}`,
          );
        } else {
          console.error(
            `Missing required decisions for ${workflow}/${checkpoint} (${result.instanceId}) -> ${sid}:`,
          );
          for (const decision of result.missing) {
            console.error(`  - ${decision.subject}: ${decision.description}`);
          }
        }

        if (!result.ok) {
          process.exitCode = 1;
        }
      },
      { supportsJsonOutput: true },
    ),
  );
}

export function registerState(program: Command): void {
  addOutputOptions(
    program
      .command("state:migrate")
      .description(
        "Migrate legacy sessions to the home profile and remove verified originals",
      )
      .option(
        "--include-active",
        "Also migrate active sessions under session write locks",
      )
      .option("--dry-run", "Preview migration without writing files"),
  ).action(
    runAction(
      async (options) => {
        const result = migrateLegacySessions({
          projectDir: resolveProjectRoot(),
          dryRun: options.dryRun === true,
          includeActive: options.includeActive === true,
        });
        if (resolveJsonMode(options))
          console.log(JSON.stringify(result, null, 2));
        else
          console.log(
            sessionMigrationActions(result).join("\n") ||
              "No legacy sessions to migrate",
          );
        if (result.failed.length > 0) process.exitCode = 1;
      },
      { supportsJsonOutput: true },
    ),
  );
  // Explicit lookup avoids the legacy `state repair` reserved-word dispatch.
  addOutputOptions(
    program
      .command("state:get <sid>", { hidden: true })
      .description("Inspect one OMA L1 session by ID"),
  ).action(
    runAction(
      async (sid: string, options) => {
        const result = viewSession(sid);
        if (resolveJsonMode(options))
          console.log(JSON.stringify(result, null, 2));
        else
          console.log(
            renderSessionView(sid, result.meta, result.events, {
              archived: result.archived,
              archivePath: result.archivePath,
            }),
          );
      },
      { supportsJsonOutput: true },
    ),
  );
  addOutputOptions(
    program
      .command("state [sid]")
      .description("Inspect OMA L1 workflow state")
      .option("--activate <sid>", "Set active session id")
      .option("--category <category>", "Active category", "main")
      .option("--archive", "Move inactive terminal sessions to state archive")
      .option("--archived", "List archived sessions")
      .option(
        "--all-projects",
        "List sessions from every project in the selected profile",
      )
      .option(
        "--project <project>",
        "Filter --all-projects by project ID or path",
      )
      .option("--search <text>", "Search --all-projects session metadata")
      .option("--purge", "Delete inactive sessions older than --older-than")
      .option("--older-than <duration>", "Purge age threshold", "90d")
      .option("--dry-run", "Preview purge without deleting sessions"),
  ).action(
    runAction(
      async (sid: string | undefined, options) => {
        const jsonMode = resolveJsonMode(options);
        const activate = options.activate as string | undefined;
        const category = (options.category as string | undefined) ?? "main";
        const archive = options.archive === true;
        const archived = options.archived === true;
        const purge = options.purge === true;
        const allProjects = options.allProjects === true;

        if ((options.project || options.search) && !allProjects) {
          throw new Error("--project and --search require --all-projects");
        }
        if (allProjects) {
          if (sid || activate || archive || archived || purge) {
            throw new Error(
              "--all-projects is read-only and only supports --project and --search",
            );
          }
          const state = collectGlobalState({
            project: options.project as string | undefined,
            search: options.search as string | undefined,
          });
          if (jsonMode) console.log(JSON.stringify(state, null, 2));
          else console.log(renderGlobalStateList(state));
          return;
        }

        if (sid === "repair") {
          const result = repairStateSessions({
            dryRun: options.dryRun === true,
          });
          if (jsonMode) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log(renderRepairResult(result));
          }
          return;
        }

        if (activate) {
          activateStateSession(activate, category);
          if (jsonMode) {
            console.log(JSON.stringify({ activated: activate, category }));
          } else {
            console.log(`Activated ${category}: ${activate}`);
          }
          return;
        }

        if (purge) {
          const result = purgeStateSessions({
            olderThan: options.olderThan as string,
            dryRun: options.dryRun === true,
          });
          if (jsonMode) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log(renderPurgeResult(result));
          }
          return;
        }

        if (archive) {
          const result = archiveStateSessions({
            olderThan: options.olderThan as string,
            dryRun: options.dryRun === true,
          });
          if (jsonMode) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log(renderArchiveResult(result));
          }
          return;
        }

        if (sid) {
          const result = viewSession(sid);
          if (jsonMode) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log(
              renderSessionView(sid, result.meta, result.events, {
                archived: result.archived,
                archivePath: result.archivePath,
              }),
            );
          }
          return;
        }

        if (archived) {
          const state = collectArchivedState();
          if (jsonMode) {
            console.log(JSON.stringify(state, null, 2));
          } else {
            console.log(renderArchivedStateList(state));
          }
          return;
        }

        const state = collectState();
        if (jsonMode) {
          console.log(JSON.stringify(state, null, 2));
        } else {
          console.log(renderStateList(state));
        }
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    program
      .command("state:repair")
      .description("Repair OMA L1 workflow state files")
      .option("--dry-run", "Preview repairs without writing changes"),
  ).action(
    runAction(
      async (options) => {
        const result = repairStateSessions({
          dryRun: options.dryRun === true,
        });
        if (resolveJsonMode(options)) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(renderRepairResult(result));
        }
      },
      { supportsJsonOutput: true },
    ),
  );

  registerDecisionVerifyCommand(
    program,
    "state:verify",
    "Verify required L1 events for a workflow checkpoint",
  );

  addOutputOptions(
    program
      .command("state:required-decisions [workflow]")
      .description("List required L1 decision.made checkpoints"),
  ).action(
    runAction(
      async (workflow: string | undefined, options) => {
        const table = listRequiredDecisionCheckpoints(workflow);
        if (resolveJsonMode(options)) {
          console.log(JSON.stringify(table, null, 2));
          return;
        }
        for (const [workflowName, checkpoints] of Object.entries(table)) {
          console.log(workflowName);
          for (const [checkpoint, decisions] of Object.entries(checkpoints)) {
            console.log(`  ${checkpoint}`);
            for (const decision of decisions) {
              console.log(`    - ${decision.subject}`);
            }
          }
        }
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    program
      .command("state:inject-log <sid>")
      .description("List or view per-boundary inject audit logs (D52)")
      .option("--entry <file>", "Print a specific inject-log entry"),
  ).action(
    runAction(
      async (sid: string, options) => {
        const view = viewInjectLog(sid, {
          entry: options.entry as string | undefined,
        });
        if (resolveJsonMode(options)) {
          console.log(JSON.stringify(view, null, 2));
        } else {
          console.log(renderInjectLogView(view));
        }
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    program
      .command("state:summary [sid]")
      .alias("state:mirror")
      .description("Export a session summary to the coordination store")
      .option("--category <category>", "Active category lookup", "main"),
  ).action(
    runAction(
      async (sid: string | undefined, options) => {
        const resolvedSid = resolveDecisionVerifierSid({
          projectDir: resolveProjectRoot(),
          sid,
          category: options.category as string | undefined,
        });
        const result = await exportSessionSummary({
          projectDir: resolveProjectRoot(),
          sid: resolvedSid,
        });
        if (resolveJsonMode(options)) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(renderSessionSummaryResult(result));
        }
        if (!result.written) {
          process.exitCode = 1;
        }
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    program
      .command("state:heal-check")
      .description("Check whether self-healing is allowed for an agent")
      .requiredOption("--agent <agentType>", "Agent or skill type, e.g. debug"),
  ).action(
    runAction(
      async (options) => {
        const result = evaluateSelfHealingGate({
          workspace: resolveProjectRoot(),
          agentType: options.agent as string,
        });

        if (resolveJsonMode(options)) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(renderSelfHealingGateResult(result));
        }

        if (!result.ok) {
          process.exitCode = 1;
        }
      },
      { supportsJsonOutput: true },
    ),
  );
}
