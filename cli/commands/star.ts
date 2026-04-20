import { execSync, spawnSync } from "node:child_process";
import { platform } from "node:os";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  isAlreadyStarred,
  isGhAuthenticated,
  isGhInstalled,
} from "../io/github.js";
import { REPO } from "../platform/skills-installer.js";

function getInstallCommand(): string {
  const os = platform();
  if (os === "darwin") return "brew install gh";
  if (os === "win32") return "winget install GitHub.cli";
  return "sudo apt install gh";
}

export async function star(): Promise<void> {
  console.clear();
  p.intro(pc.bgMagenta(pc.white(" ⭐ oh-my-agent star ")));

  if (!isGhInstalled()) {
    const installCmd = getInstallCommand();
    const shouldInstall = await p.confirm({
      message: `GitHub CLI (gh) is not installed. Install with ${pc.cyan(installCmd)}?`,
    });

    if (p.isCancel(shouldInstall) || !shouldInstall) {
      p.outro("Install gh manually and try again.");
      return;
    }

    const spinner = p.spinner();
    spinner.start("Installing GitHub CLI...");
    const result = spawnSync(installCmd, { shell: true, stdio: "pipe" });

    if (result.status !== 0) {
      spinner.stop("Installation failed");
      p.log.error(result.stderr?.toString() || "Unknown error");
      p.outro("Please install gh manually.");
      return;
    }

    spinner.stop("GitHub CLI installed!");
  }

  if (!isGhAuthenticated()) {
    p.log.warn("GitHub CLI is not authenticated.");
    const shouldAuth = await p.confirm({
      message: `Run ${pc.cyan("gh auth login")} now?`,
    });

    if (p.isCancel(shouldAuth) || !shouldAuth) {
      p.outro("Authenticate and try again.");
      return;
    }

    spawnSync("gh", ["auth", "login"], { stdio: "inherit" });

    if (!isGhAuthenticated()) {
      p.outro("Authentication was not completed. Try again.");
      return;
    }

    p.log.success("Authenticated!");
  }

  if (isAlreadyStarred()) {
    p.outro(`Already starred ${pc.cyan(REPO)}! Thank you! 🙏`);
    return;
  }

  const shouldStar = await p.confirm({
    message: `Star ${pc.cyan(REPO)} on GitHub?`,
  });

  if (p.isCancel(shouldStar) || !shouldStar) {
    p.outro("Maybe next time!");
    return;
  }

  try {
    execSync(`gh api -X PUT /user/starred/${REPO}`, {
      stdio: "ignore",
    });
    p.outro(`Starred ${pc.cyan(REPO)}! Thank you! 🌟`);
  } catch {
    p.log.error("Failed to star the repository.");
    p.outro("Please try again later.");
  }
}
