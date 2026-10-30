import { execFileSync } from "node:child_process";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  isAlreadyStarred,
  isGhAuthenticated,
  isGhInstalled,
} from "../../io/github.js";
import { getInstallMode } from "../../platform/install-context.js";
import { REPO } from "../../platform/skills-installer.js";

/**
 * Task 33 — Skip GitHub star prompt when --global + --yes (T2.3)
 */
export async function maybePromptGithubStar(
  explicitYes: boolean,
  nonInteractive: boolean,
): Promise<void> {
  if (getInstallMode() === "global" && explicitYes) {
    p.log.info(pc.dim("Skipped GitHub star prompt (--global + --yes)."));
  } else if (!isGhInstalled() || !isGhAuthenticated()) {
    // No authenticated gh means no one-step star, so leave the link instead
    // of staying silent. Auto-detected CI stays silent, as below.
    if (explicitYes || !nonInteractive) {
      p.log.info(
        `${pc.yellow("⭐")} Enjoying oh-my-agent? Star it on GitHub: ${pc.cyan(`https://github.com/${REPO}`)}`,
      );
    }
  } else if (!isAlreadyStarred()) {
    // Auto-star on explicit `--yes` / OMA_YES (user opted in to "yes
    // everything"). Stay silent on auto-detected CI to avoid drive-by
    // stars from build runners that happen to have gh auth.
    let shouldStar: boolean | symbol;
    if (explicitYes) {
      shouldStar = true;
    } else if (nonInteractive) {
      shouldStar = false;
    } else {
      shouldStar = await p.confirm({
        message: `${pc.yellow("⭐")} Star ${pc.cyan(REPO)} on GitHub? It helps a lot!`,
      });
    }

    if (!p.isCancel(shouldStar) && shouldStar) {
      try {
        execFileSync("gh", ["api", "-X", "PUT", `/user/starred/${REPO}`], {
          stdio: "ignore",
        });
        p.log.success(`Starred ${pc.cyan(REPO)}! Thank you! 🌟`);
      } catch {
        p.log.warn(
          `Could not star automatically. Try: ${pc.dim(`gh api --method PUT /user/starred/${REPO}`)}`,
        );
      }
    }
  }
}
