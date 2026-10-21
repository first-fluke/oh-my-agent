import fs from "node:fs";
import path from "node:path";
import type { Command } from "commander";
import {
  type CodeFingerprint,
  captureCodeFingerprint,
  sameCodeFingerprint,
} from "../../../.agents/hooks/core/code-fingerprint.js";
import {
  getActiveSid,
  listSessionIds,
  readEvents,
  readIndex,
} from "../../state/events.js";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";

/**
 * Gate keywords the persistent-mode Stop hook is allowed to execute
 * (mirrors GATE_KEYWORDS in `.agents/hooks/core/persistent-mode.ts`).
 * The hook re-validates on every run — this CLI check only fails fast.
 */
const GATE_KEYWORDS = new Set(["typecheck", "test", "lint"]);

interface PersistentModeState {
  workflow: string;
  sessionId: string;
  activatedAt: string;
  reinforcementCount: number;
  omaSid?: string;
  goal?: {
    description?: string;
    budget?: { wallClockMinutes?: number };
    completion?: { gate?: string };
  };
}

function findStateFiles(projectDir: string, workflow?: string): string[] {
  const stateDir = path.join(projectDir, ".agents", "state");
  if (!fs.existsSync(stateDir)) return [];
  return fs
    .readdirSync(stateDir)
    .filter(
      (f) =>
        /-state-.+\.json$/.test(f) &&
        (!workflow || f.startsWith(`${workflow}-state-`)),
    )
    .map((f) => path.join(stateDir, f));
}

interface GoalStatusOptions {
  workflow?: string;
  sessionId?: string;
  checkFresh?: boolean;
}

function resolveStatusSid(
  projectDir: string,
  options: GoalStatusOptions,
): string {
  if (!options.workflow && !options.sessionId) {
    const activeSid = getActiveSid(readIndex(projectDir));
    if (activeSid) return activeSid;
  }

  let candidates = findStateFiles(projectDir, options.workflow);
  if (options.sessionId) {
    candidates = candidates.filter((file) =>
      file.endsWith(`-state-${options.sessionId}.json`),
    );
  }
  if (!candidates.length && options.sessionId && !options.workflow) {
    return options.sessionId;
  }
  if (!candidates.length && !options.sessionId && !options.workflow) {
    const sessions = listSessionIds(projectDir)
      .map((sid) => {
        const events = readEvents(projectDir, sid);
        return {
          sid,
          createdAt:
            events.find((event) => event.kind === "session.created")?.ts ??
            events.at(-1)?.ts ??
            "",
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sessions[0]) return sessions[0].sid;
  }
  if (candidates.length !== 1) {
    throw new Error(
      candidates.length
        ? "unverified (multiple workflows match; select --workflow/--session-id)"
        : "unverified (no session found; select an OMA session with --session-id)",
    );
  }
  const state = JSON.parse(
    fs.readFileSync(candidates[0] as string, "utf-8"),
  ) as PersistentModeState;
  if (!state.omaSid) {
    throw new Error("unverified (selected workflow has no OMA session id)");
  }
  return state.omaSid;
}

function verifiedFingerprint(
  payload: Record<string, unknown> | undefined,
): CodeFingerprint | undefined {
  if (
    typeof payload?.head !== "string" ||
    !payload.head ||
    typeof payload.dirty !== "boolean" ||
    typeof payload.treeHash !== "string" ||
    !payload.treeHash
  ) {
    return undefined;
  }
  return {
    head: payload.head,
    dirty: payload.dirty,
    treeHash: payload.treeHash,
  };
}

function registerGoalStatus(program: Command): void {
  addOutputOptions(
    program
      .command("goal:status")
      .description("Show the latest gate pass for an OMA session")
      .option("--workflow <name>", "Persistent workflow to inspect")
      .option(
        "--session-id <id>",
        "OMA session id or vendor session id suffix of a persistent state file",
      )
      .option(
        "--check-fresh",
        "Verify that the latest gate pass checked the current commit and tree",
      ),
  ).action(
    runAction(
      async (options) => {
        const projectDir = resolveProjectRoot();
        const sid = resolveStatusSid(projectDir, options);
        const latestPass = readEvents(projectDir, sid)
          .filter((event) => event.kind === "gate.passed")
          .at(-1);
        let status = "passed";
        let message = `Gate ${String(latestPass?.payload?.gate ?? "unknown")} passed in session ${sid}`;
        let current: CodeFingerprint | undefined;
        const recorded = verifiedFingerprint(latestPass?.payload);

        if (!latestPass) {
          status = "unverified";
          message = "unverified (no gate.passed event in session)";
        } else if (options.checkFresh) {
          if (!recorded) {
            status = "unverified";
            message =
              "unverified (latest gate pass has no complete git fingerprint)";
          } else {
            current = await captureCodeFingerprint(projectDir);
            if (!current.head || !current.treeHash) {
              status = "unverified";
              message = "unverified (current git fingerprint is unavailable)";
            } else if (recorded.head !== current.head) {
              status = "stale";
              message = "stale (head moved)";
            } else if (!sameCodeFingerprint(recorded, current)) {
              status = "stale";
              message = "stale (tree changed)";
            } else {
              status = "fresh";
              message = "fresh";
            }
          }
        }

        if (resolveJsonMode(options)) {
          console.log(
            JSON.stringify(
              {
                sid,
                status,
                message,
                eventId: latestPass?.eventId,
                gate: latestPass?.payload?.gate,
                fingerprint: recorded,
                current,
              },
              null,
              2,
            ),
          );
        } else {
          console.log(message);
        }
        if (status === "stale" || status === "unverified") process.exitCode = 1;
      },
      { supportsJsonOutput: true },
    ),
  );
}

export function registerGoal(program: Command): void {
  registerGoalStatus(program);
  addOutputOptions(
    program
      .command("goal:set")
      .description(
        "Attach a goal contract (deterministic stop gate / wall-clock budget) to an active persistent workflow",
      )
      .option(
        "--workflow <name>",
        "Persistent workflow to target (required when several are active)",
      )
      .option("--session <id>", "Vendor session id suffix of the state file")
      .option(
        "--gate <keyword>",
        "Stop gate keyword: typecheck | test | lint (maps to the package.json script of that name; free-form commands are rejected)",
      )
      .option(
        "--budget-minutes <n>",
        "Wall-clock budget in minutes from activation; exceeding it allows an honest partial stop",
      )
      .option("--description <text>", "Human description of the objective"),
  ).action(
    runAction(
      async (options) => {
        const jsonMode = resolveJsonMode(options);
        const projectDir = resolveProjectRoot();

        const gate = options.gate as string | undefined;
        if (gate && !GATE_KEYWORDS.has(gate)) {
          throw new Error(
            `--gate must be one of: ${[...GATE_KEYWORDS].join(", ")} (got ${JSON.stringify(gate)}). ` +
              "Free-form commands are intentionally not supported: the gate value lives in an agent-writable state file and is executed by the Stop hook.",
          );
        }
        const budgetRaw = options.budgetMinutes as string | undefined;
        const budgetMinutes = budgetRaw ? Number(budgetRaw) : undefined;
        if (
          budgetRaw !== undefined &&
          (!Number.isFinite(budgetMinutes) || (budgetMinutes as number) <= 0)
        ) {
          throw new Error(`--budget-minutes must be a positive number`);
        }
        if (!gate && budgetMinutes === undefined && !options.description) {
          throw new Error(
            "Nothing to set: pass at least one of --gate, --budget-minutes, --description",
          );
        }

        let candidates = findStateFiles(
          projectDir,
          options.workflow as string | undefined,
        );
        if (options.session) {
          candidates = candidates.filter((f) =>
            f.endsWith(`-state-${options.session}.json`),
          );
        }
        if (candidates.length === 0) {
          throw new Error(
            "No active persistent-workflow state file found. Start a persistent workflow (orchestrate/ultrawork/work/ralph) first, or check --workflow/--session.",
          );
        }
        if (candidates.length > 1) {
          throw new Error(
            `Multiple active state files match — disambiguate with --workflow/--session:\n${candidates
              .map((f) => `  ${path.basename(f)}`)
              .join("\n")}`,
          );
        }

        const stateFile = candidates[0] as string;
        const state = JSON.parse(
          fs.readFileSync(stateFile, "utf-8"),
        ) as PersistentModeState;
        state.goal = {
          ...state.goal,
          ...(options.description
            ? { description: options.description as string }
            : {}),
          ...(budgetMinutes !== undefined
            ? {
                budget: {
                  ...state.goal?.budget,
                  wallClockMinutes: budgetMinutes,
                },
              }
            : {}),
          ...(gate ? { completion: { ...state.goal?.completion, gate } } : {}),
        };
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

        if (jsonMode) {
          console.log(
            JSON.stringify(
              { file: path.basename(stateFile), goal: state.goal },
              null,
              2,
            ),
          );
        } else {
          console.log(`Goal contract written to ${path.basename(stateFile)}:`);
          if (state.goal?.description)
            console.log(`  description: ${state.goal.description}`);
          if (state.goal?.completion?.gate)
            console.log(
              `  stop gate: ${state.goal.completion.gate} (stop is allowed only when this package script passes)`,
            );
          if (state.goal?.budget?.wallClockMinutes)
            console.log(
              `  budget: ${state.goal.budget.wallClockMinutes} minutes wall-clock (exceeding it allows an honest partial stop)`,
            );
        }
      },
      { supportsJsonOutput: true },
    ),
  );
}
