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
import { renderTrajectory } from "./render.js";

export function registerTrajectory(program: Command): void {
  addOutputOptions(
    program
      .command("state:trajectory [sid]")
      .description(
        "Show a session trajectory: L1 events joined with vendor transcripts",
      )
      .option("--category <category>", "Active category lookup", "main")
      .option("--open", "Open the trajectory viewer in the web dashboard"),
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
          console.log(renderTrajectory(trajectory));
        }
      },
      { supportsJsonOutput: true },
    ),
  );
}
