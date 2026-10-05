import type { Command } from "commander";
import { resolveDecisionVerifierSid } from "../../../state/decision-verifier.js";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../../utils/cli-framework.js";
import { resolveProjectRoot } from "../../../utils/fs-utils.js";
import { openUrl } from "../../../utils/open-url.js";
import { isValidSid } from "../sessions.js";
import { buildTrajectory } from "./build.js";
import { type RenderTrajectoryOptions, renderTrajectory } from "./render.js";

const MIN_WIDTH = 40;
const PIPED_WIDTH = 80;

/**
 * A terminal, or an explicit width, gets rows cut to fit. Piped output keeps
 * every row whole so it stays greppable, and only the overview is sized.
 */
export function resolveLayout(
  requested: string | undefined,
  stream: { isTTY?: boolean; columns?: number } = process.stdout,
  env: NodeJS.ProcessEnv = process.env,
): RenderTrajectoryOptions {
  if (requested !== undefined) {
    const width = Number(requested);
    if (!Number.isInteger(width) || width < MIN_WIDTH) {
      throw new Error(`--width must be an integer of at least ${MIN_WIDTH}`);
    }
    return { width, fitRows: true };
  }
  if (stream.isTTY && stream.columns) {
    // One cell short of the edge: some terminals wrap a full-width row.
    return { width: Math.max(MIN_WIDTH, stream.columns - 1), fitRows: true };
  }
  const columns = Number(env.COLUMNS);
  return {
    width:
      Number.isInteger(columns) && columns >= MIN_WIDTH ? columns : PIPED_WIDTH,
    fitRows: false,
  };
}

export function registerTrajectory(program: Command): void {
  addOutputOptions(
    program
      .command("state:trajectory [sid]")
      .description(
        "Show a session trajectory: L1 events joined with vendor transcripts",
      )
      .option("--category <category>", "Active category lookup", "main")
      .option("--open", "Open the trajectory viewer in the web dashboard")
      .option(
        "--width <columns>",
        "Fit the overview and every row to this many columns",
      )
      .option(
        "--sequence",
        "Lay the overview out by record order, each record the same width",
      )
      .option(
        "--ascii",
        "Draw the overview with ASCII (for terminals with wide block glyphs)",
      ),
  ).action(
    runAction(
      async (sid: string | undefined, options) => {
        const projectDir = resolveProjectRoot();
        const resolvedSid = resolveDecisionVerifierSid({
          projectDir,
          sid,
          category: options.category as string | undefined,
        });
        if (!isValidSid(resolvedSid)) {
          throw new Error(`Invalid session id: ${resolvedSid}`);
        }
        if (options.open === true) {
          const { startDashboard } = await import("../../../dashboard.js");
          const dashboard = startDashboard({
            route: `/trajectory?sid=${encodeURIComponent(resolvedSid)}`,
            projectDir,
          });
          // Give the server a moment to start listening.
          setTimeout(() => openUrl(dashboard.url), 500);
          return;
        }
        const trajectory = buildTrajectory(resolvedSid, { projectDir });
        if (resolveJsonMode(options)) {
          console.log(JSON.stringify(trajectory, null, 2));
        } else {
          console.log(
            renderTrajectory(trajectory, {
              ...resolveLayout(options.width as string | undefined),
              ascii: options.ascii === true,
              sequence: options.sequence === true,
            }),
          );
        }
      },
      { supportsJsonOutput: true },
    ),
  );
}
