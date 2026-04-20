import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  getCommitsSince,
  getCommitTypes,
  getGitStats,
  getLastRetroDate,
  getRecentChangedFiles,
  getRecentGitCommits,
} from "../../io/git.js";
import {
  extractKeyLearningsFromActivities,
  getRecentAgentActivities,
  getSessionSummary,
} from "../../io/memory.js";
import type { Retrospective } from "../../types/index.js";

function getRetroPath(cwd: string): string {
  return join(cwd, ".serena", "retrospectives");
}

function loadRetrospectives(cwd: string): Retrospective[] {
  const retroDir = getRetroPath(cwd);
  if (!existsSync(retroDir)) return [];

  try {
    const files = readdirSync(retroDir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();
    return files
      .slice(0, 10)
      .map((f) => JSON.parse(readFileSync(join(retroDir, f), "utf-8")));
  } catch {
    return [];
  }
}

function saveRetrospective(cwd: string, r: Retrospective): void {
  const retroDir = getRetroPath(cwd);
  if (!existsSync(retroDir)) {
    mkdirSync(retroDir, { recursive: true });
  }
  const filename = `${r.date.replace(/[:.]/g, "-")}_${r.id}.json`;
  writeFileSync(join(retroDir, filename), JSON.stringify(r, null, 2), "utf-8");
}

function generateAutoSummary(cwd: string): {
  summary: string;
  learnings: string[];
  nextSteps: string[];
} {
  const lastRetroDate = getLastRetroDate(cwd);
  const commits = getCommitsSince(cwd, lastRetroDate);
  const commitTypes = getCommitTypes(commits);
  const stats = getGitStats(cwd);
  const sessionSummary = getSessionSummary(cwd);
  const activities = getRecentAgentActivities(cwd, lastRetroDate || undefined);

  const mainType = Object.entries(commitTypes).sort(([, a], [, b]) => b - a)[0];
  let summary = "Development session";

  if (mainType) {
    const [type] = mainType;
    const typeDescriptions: Record<string, string> = {
      feat: "Feature development",
      fix: "Bug fixes and improvements",
      refactor: "Code refactoring",
      docs: "Documentation updates",
      test: "Testing improvements",
      chore: "Maintenance tasks",
      build: "Build system updates",
      perf: "Performance improvements",
    };
    summary = typeDescriptions[type] || "Development session";
  }

  if (stats.filesChanged > 0) {
    summary += ` (${stats.filesChanged} files, +${stats.linesAdded}/-${stats.linesRemoved})`;
  }

  if (sessionSummary.agents.length > 0) {
    summary += ` with ${sessionSummary.agents.join(", ")}`;
  }

  const learnings = extractKeyLearningsFromActivities(activities);

  if (commits.length > 0 && learnings.length === 0) {
    if (commitTypes.refactor || commitTypes.perf) {
      learnings.push("Code quality and performance improvements");
    }
    if (commitTypes.test) {
      learnings.push("Enhanced test coverage");
    }
    if (commitTypes.fix) {
      learnings.push("Issue resolution and stability improvements");
    }
  }

  const nextSteps: string[] = [];
  if (sessionSummary.inProgressTasks.length > 0) {
    nextSteps.push(...sessionSummary.inProgressTasks.slice(0, 3));
  }

  if (commits.length > 0) {
    const lastCommit = commits[0]?.toLowerCase() || "";
    if (lastCommit.includes("wip") || lastCommit.includes("todo")) {
      nextSteps.push("Complete work-in-progress items");
    }
  }

  if (nextSteps.length === 0) {
    nextSteps.push("Continue development", "Review and test changes");
  }

  return {
    summary,
    learnings: learnings.slice(0, 5),
    nextSteps: nextSteps.slice(0, 5),
  };
}

export async function retro(): Promise<void> {
  const cwd = process.cwd();
  const retroDir = getRetroPath(cwd);
  const existingRetros = loadRetrospectives(cwd);

  console.clear();
  p.intro(pc.bgMagenta(pc.white(" retro (interactive) ")));

  const recentRetro = existingRetros[0];
  if (recentRetro) {
    p.note(
      [
        pc.bold("Last Retrospective"),
        `Date: ${recentRetro.date}`,
        "",
        pc.bold("Summary:"),
        recentRetro.summary,
        "",
        pc.bold("Key Learnings:"),
        ...recentRetro.keyLearnings.map((l) => `  - ${l}`),
        "",
        pc.bold("Next Steps:"),
        ...recentRetro.nextSteps.map((s) => `  > ${s}`),
      ].join("\n"),
      "Previous Session",
    );
  }

  const action = await p.select({
    message: "What would you like to do?",
    options: [
      {
        value: "auto",
        label: "Auto-generate from git history",
        hint: "Analyze commits and agent activity",
      },
      {
        value: "manual",
        label: "Create manually",
        hint: "Write your own retrospective",
      },
      { value: "list", label: "View past retrospectives" },
      { value: "exit", label: "Exit" },
    ],
  });

  if (p.isCancel(action) || action === "exit") {
    p.outro(pc.dim("Goodbye!"));
    return;
  }

  if (action === "list") {
    if (existingRetros.length === 0) {
      p.note(pc.yellow("No retrospectives found."), "History");
    } else {
      const list = existingRetros
        .map(
          (r, i) =>
            `${i + 1}. [${r.date.split("T")[0]}] ${r.summary.slice(0, 50)}...`,
        )
        .join("\n");
      p.note(list, `Past Retrospectives (${existingRetros.length})`);
    }
    p.outro(pc.dim(`Stored in: ${retroDir}`));
    return;
  }

  if (action === "auto") {
    const { summary, learnings, nextSteps } = generateAutoSummary(cwd);
    const changedFiles = getRecentChangedFiles(cwd);

    p.note(
      [
        pc.bold("Auto-generated Content"),
        "",
        pc.bold("Summary:"),
        summary,
        "",
        pc.bold("Key Learnings:"),
        ...learnings.map((l) => `  - ${l}`),
        "",
        pc.bold("Next Steps:"),
        ...nextSteps.map((s) => `  > ${s}`),
      ].join("\n"),
      "Preview",
    );

    const shouldSave = await p.confirm({
      message: "Save this retrospective?",
      initialValue: true,
    });

    if (p.isCancel(shouldSave) || !shouldSave) {
      p.cancel("Cancelled.");
      return;
    }

    const newRetro: Retrospective = {
      id: Math.random().toString(36).slice(2, 8),
      date: new Date().toISOString(),
      summary,
      keyLearnings: learnings,
      filesChanged: changedFiles,
      nextSteps,
    };

    saveRetrospective(cwd, newRetro);
    p.note(pc.green("Retrospective saved!"), "Done");
    p.outro(pc.dim(`Stored in: ${retroDir}`));
    return;
  }

  // Manual mode
  const recentCommits = getRecentGitCommits(cwd);
  const changedFiles = getRecentChangedFiles(cwd);

  if (recentCommits.length > 0) {
    p.note(recentCommits.join("\n"), "Recent Commits");
  }
  if (changedFiles.length > 0) {
    p.note(changedFiles.join("\n"), "Changed Files");
  }

  const summary = await p.text({
    message: "What did you accomplish in this session?",
    placeholder: "e.g., Implemented user authentication flow",
  });

  if (p.isCancel(summary)) {
    p.cancel("Cancelled.");
    return;
  }

  const learningsInput = await p.text({
    message: "Key learnings? (comma-separated)",
    placeholder: "e.g., JWT needs refresh token, bcrypt is slow",
  });

  if (p.isCancel(learningsInput)) {
    p.cancel("Cancelled.");
    return;
  }

  const nextStepsInput = await p.text({
    message: "Next steps? (comma-separated)",
    placeholder: "e.g., Add password reset, Write tests",
  });

  if (p.isCancel(nextStepsInput)) {
    p.cancel("Cancelled.");
    return;
  }

  const newRetro: Retrospective = {
    id: Math.random().toString(36).slice(2, 8),
    date: new Date().toISOString(),
    summary: summary as string,
    keyLearnings: (learningsInput as string)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    filesChanged: changedFiles,
    nextSteps: (nextStepsInput as string)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };

  saveRetrospective(cwd, newRetro);
  p.note(pc.green("Retrospective saved!"), "Done");
  p.outro(pc.dim(`Stored in: ${retroDir}`));
}
