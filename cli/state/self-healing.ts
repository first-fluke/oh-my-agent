import { execFileSync } from "node:child_process";
import pc from "picocolors";
import { checkClosure } from "../utils/skill-outputs.js";

export interface GitSnapshotGate {
  insideWorkTree: boolean;
  head?: string;
  trackedChanges: string[];
}

export interface SkillMetadataGate {
  agentType: string;
  hasStructuredOutputs: boolean;
  missingRequired: string[];
}

export interface SelfHealingGateResult {
  ok: boolean;
  reasons: string[];
  git: GitSnapshotGate;
  skill: SkillMetadataGate;
}

function git(workspace: string, args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: workspace,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return fallback;
  }
}

function readTrackedChanges(workspace: string): string[] {
  const raw = git(workspace, ["status", "--porcelain", "--untracked-files=no"]);
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

export function collectGitSnapshotGate(workspace: string): GitSnapshotGate {
  const insideWorkTree =
    git(workspace, ["rev-parse", "--is-inside-work-tree"]) === "true";
  if (!insideWorkTree) {
    return { insideWorkTree: false, trackedChanges: [] };
  }
  return {
    insideWorkTree,
    head: git(workspace, ["rev-parse", "HEAD"], "unborn"),
    trackedChanges: readTrackedChanges(workspace),
  };
}

export function collectSkillMetadataGate(
  workspace: string,
  agentType: string,
): SkillMetadataGate {
  const closure = checkClosure(workspace, agentType);
  return {
    agentType,
    hasStructuredOutputs: closure.hasStructuredOutputs,
    missingRequired: closure.missingRequired.map((output) => output.name),
  };
}

export function evaluateSelfHealingGate(args: {
  workspace: string;
  agentType: string;
}): SelfHealingGateResult {
  const gitGate = collectGitSnapshotGate(args.workspace);
  const skillGate = collectSkillMetadataGate(args.workspace, args.agentType);
  const reasons: string[] = [];

  if (!gitGate.insideWorkTree) reasons.push("not-a-git-worktree");
  if (gitGate.trackedChanges.length === 0) {
    reasons.push("no-git-tracked-changes");
  }
  if (!skillGate.hasStructuredOutputs) {
    reasons.push("missing-skill-output-metadata");
  }
  if (skillGate.missingRequired.length > 0) {
    reasons.push("missing-required-skill-artifacts");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    git: gitGate,
    skill: skillGate,
  };
}

export function renderSelfHealingGateResult(
  result: SelfHealingGateResult,
): string {
  const head = result.git.head ? `\nhead: ${result.git.head}` : "";
  const trackedChanges =
    result.git.trackedChanges.length === 0
      ? "  (none)"
      : result.git.trackedChanges.map((file) => `  ${file}`).join("\n");
  const missingRequired =
    result.skill.missingRequired.length === 0
      ? ""
      : `\n  missing required artifacts:\n${result.skill.missingRequired
          .map((artifact) => `    - ${artifact}`)
          .join("\n")}`;
  const blockers =
    result.reasons.length === 0
      ? ""
      : `\n\n${pc.bold("Blockers")}\n${result.reasons
          .map((reason) => `  - ${reason}`)
          .join("\n")}`;

  return `${pc.bold("OMA self-healing check")}
status: ${result.ok ? pc.green("pass") : pc.red("blocked")}
agent: ${result.skill.agentType}
git: ${result.git.insideWorkTree ? "worktree" : "not a worktree"}${head}

${pc.bold("Tracked changes")}
${trackedChanges}

${pc.bold("Skill metadata")}
  expected outputs: ${result.skill.hasStructuredOutputs ? "present" : "missing"}${missingRequired}${blockers}`;
}
