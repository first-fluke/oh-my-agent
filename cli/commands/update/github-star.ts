import { execFileSync } from "node:child_process";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  isAlreadyStarred,
  isGhAuthenticated,
  isGhInstalled,
} from "../../io/github.js";
import { REPO } from "../../platform/skills-installer.js";

/** Offer to star the repo on GitHub (interactive runs only). */
export async function maybePromptGitHubStar(
  nonInteractive: boolean,
): Promise<void> {
  if (nonInteractive) return;

  if (!isGhInstalled() || !isGhAuthenticated()) {
    // No authenticated gh means no one-step star, so leave the link instead.
    p.log.info(
      `${pc.yellow("⭐")} Enjoying oh-my-agent? Star it on GitHub: ${pc.cyan(`https://github.com/${REPO}`)}`,
    );
  } else if (!isAlreadyStarred()) {
    const shouldStar = await p.confirm({
      message: `${pc.yellow("⭐")} Star ${pc.cyan(REPO)} on GitHub? It helps a lot!`,
    });

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
