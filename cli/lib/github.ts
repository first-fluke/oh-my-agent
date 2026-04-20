import { execSync } from "node:child_process";
import { REPO } from "../platform/skills-installer.js";

export function isGhInstalled(): boolean {
  try {
    execSync("gh --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function isGhAuthenticated(): boolean {
  try {
    execSync("gh auth status", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function isAlreadyStarred(): boolean {
  try {
    execSync(`gh api user/starred/${REPO}`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

export function checkStarred(): boolean {
  return isGhInstalled() && isGhAuthenticated() && isAlreadyStarred();
}
