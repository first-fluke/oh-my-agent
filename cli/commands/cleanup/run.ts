import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  AGENTS_RESULTS_DIR,
  agentsPathFromRoot,
} from "../../constants/paths.js";
import { readRegistry, reclaimIdleDaemons } from "../../io/serena-daemon.js";
import {
  type ActivitySignal,
  discoverSerenaRoots,
  selectOrphanedSerenaRoots,
} from "../../io/serena-reaper.js";
import { runPs } from "../../io/serena-reaper-runtime.js";
import type { CleanupResult } from "../../types/index.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";

interface GeminiCleanupConfig {
  shouldCleanupBrain: boolean;
  shouldCleanupImplicit: boolean;
  shouldCleanupKnowledge: boolean;
}

async function shouldCleanupGeminiDirs(
  cwd: string,
  jsonMode: boolean,
  skipConfirm: boolean,
): Promise<GeminiCleanupConfig> {
  const geminiDir = join(cwd, ".gemini", "antigravity");
  const brainDir = join(geminiDir, "brain");
  const implicitDir = join(geminiDir, "implicit");
  const knowledgeDir = join(geminiDir, "knowledge");

  const brainExists = existsSync(brainDir);
  const implicitExists = existsSync(implicitDir);
  const knowledgeExists = existsSync(knowledgeDir);

  if (!brainExists && !implicitExists && !knowledgeExists) {
    return {
      shouldCleanupBrain: false,
      shouldCleanupImplicit: false,
      shouldCleanupKnowledge: false,
    };
  }

  if (jsonMode) {
    return {
      shouldCleanupBrain: brainExists,
      shouldCleanupImplicit: implicitExists,
      shouldCleanupKnowledge: knowledgeExists,
    };
  }

  const dirList = [
    brainExists && "  - brain",
    implicitExists && "  - implicit",
    knowledgeExists && "  - knowledge",
  ]
    .filter(Boolean)
    .join("\n");

  const shouldCleanup = skipConfirm
    ? true
    : await p.confirm({
        message: `Clean up IDE garbage?\n${dirList}`,
        initialValue: true,
      });

  if (p.isCancel(shouldCleanup) || !shouldCleanup) {
    return {
      shouldCleanupBrain: false,
      shouldCleanupImplicit: false,
      shouldCleanupKnowledge: false,
    };
  }

  return {
    shouldCleanupBrain: brainExists,
    shouldCleanupImplicit: implicitExists,
    shouldCleanupKnowledge: knowledgeExists,
  };
}

export async function cleanup(
  dryRun = false,
  jsonMode = false,
  skipConfirm = false,
): Promise<void> {
  const cwd = process.cwd();
  const resultsDir = agentsPathFromRoot(
    resolveProjectRoot(cwd),
    AGENTS_RESULTS_DIR,
  );
  const tmpDir = tmpdir();

  const result: CleanupResult = {
    cleaned: 0,
    skipped: 0,
    details: [],
  };

  const geminiConfig = await shouldCleanupGeminiDirs(
    cwd,
    jsonMode,
    skipConfirm,
  );

  const logAction = (msg: string) => {
    result.details.push(dryRun ? `[DRY-RUN] ${msg}` : `[CLEAN] ${msg}`);
    result.cleaned++;
  };

  const logSkip = (msg: string) => {
    result.details.push(`[SKIP] ${msg}`);
    result.skipped++;
  };

  const safeRemove = (targetPath: string) => {
    if (dryRun) return;
    try {
      rmSync(targetPath, { force: true });
    } catch {}
  };

  const isProcessRunning = (pid: number): boolean => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };

  const killProcess = async (pid: number) => {
    if (dryRun) return;
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      if (isProcessRunning(pid)) {
        process.kill(pid, "SIGKILL");
      }
    } catch {}
  };

  try {
    const pidFiles = readdirSync(tmpDir).filter(
      (f) => f.startsWith("subagent-") && f.endsWith(".pid"),
    );

    for (const pidFile of pidFiles) {
      const pidPath = join(tmpDir, pidFile);
      const pidContent = readFileSync(pidPath, "utf-8").trim();

      if (!pidContent) {
        logAction(`Removing empty PID file: ${pidPath}`);
        safeRemove(pidPath);
        continue;
      }

      const pid = parseInt(pidContent, 10);
      if (Number.isNaN(pid)) {
        logAction(`Removing invalid PID file: ${pidPath}`);
        safeRemove(pidPath);
        continue;
      }

      if (isProcessRunning(pid)) {
        logAction(`Killing orphaned process PID=${pid} (from ${pidPath})`);
        await killProcess(pid);
        safeRemove(pidPath);
      } else {
        logAction(`Removing stale PID file (process gone): ${pidPath}`);
        safeRemove(pidPath);
      }
    }
  } catch {}

  try {
    const logFiles = readdirSync(tmpDir).filter(
      (f) => f.startsWith("subagent-") && f.endsWith(".log"),
    );

    for (const logFile of logFiles) {
      const logPath = join(tmpDir, logFile);
      const pidFile = logFile.replace(".log", ".pid");
      const pidPath = join(tmpDir, pidFile);

      if (existsSync(pidPath)) {
        try {
          const pidContent = readFileSync(pidPath, "utf-8").trim();
          const pid = parseInt(pidContent, 10);
          if (!Number.isNaN(pid)) {
            if (isProcessRunning(pid)) {
              logSkip(`Log file has active process: ${logPath}`);
              continue;
            }
          }
        } catch {}
      }

      logAction(`Removing stale log file: ${logPath}`);
      safeRemove(logPath);
    }
  } catch {}

  if (existsSync(resultsDir)) {
    try {
      const parallelDirs = readdirSync(resultsDir).filter((d) =>
        d.startsWith("parallel-"),
      );

      for (const parallelDir of parallelDirs) {
        const pidsPath = join(resultsDir, parallelDir, "pids.txt");
        if (!existsSync(pidsPath)) continue;

        const pidsContent = readFileSync(pidsPath, "utf-8");
        const lines = pidsContent.split("\n").filter((l) => l.trim());

        let hasRunning = false;
        for (const line of lines) {
          const [pidStr, agent] = line.split(":");
          const pid = parseInt(pidStr?.trim() || "", 10);
          if (Number.isNaN(pid)) continue;

          if (isProcessRunning(pid)) {
            hasRunning = true;
            logAction(
              `Killing orphaned parallel agent PID=${pid} (${agent?.trim() || "unknown"})`,
            );
            await killProcess(pid);
            safeRemove(pidsPath);
          }
        }

        if (!hasRunning) {
          logAction(`Removing stale PID list: ${pidsPath}`);
          safeRemove(pidsPath);
        } else {
          if (!dryRun) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            try {
              rmSync(pidsPath, { force: true });
            } catch {}
          }
        }
      }
    } catch {}
  } else {
    logSkip(`No results directory found: ${resultsDir}`);
  }

  // Orphaned Serena language servers: when an MCP client (e.g. claude) exits,
  // its `serena start-mcp-server` reparents to init (ppid === 1) and its LSP
  // children (tsserver/pyright/…, hundreds of MB) keep running with no client.
  // These are pure waste and always safe to reap — the idle-but-live case is
  // handled separately by `oma serena reap` / the reaper scheduler.
  //
  // Bridge daemons are the exception: they are detached on purpose (ppid 1
  // while fully in use), so ppid alone cannot tell them apart. They belong to
  // the daemon registry, whose sweep re-adopts any that fell out of it and
  // stops the idle ones after their grace period; cleanup leaves them to it.
  try {
    reclaimIdleDaemons();
    const managed = new Set(
      Object.values(readRegistry()).map((record) => record.pid),
    );
    const noActivity = (): ActivitySignal => ({
      lastActivityMs: 0,
      signalSource: "mtime",
    });
    const roots = discoverSerenaRoots(runPs(), noActivity);
    const orphans = selectOrphanedSerenaRoots(roots).filter(
      (root) => !managed.has(root.pid),
    );
    for (const orphan of orphans) {
      for (const lsp of orphan.lspChildren) {
        logAction(
          `Killing orphaned Serena LSP PID=${lsp.pid} (${lsp.name}, ${lsp.rssMb.toFixed(0)}MB; ${orphan.project})`,
        );
        await killProcess(lsp.pid);
      }
      logAction(
        `Killing orphaned Serena root PID=${orphan.pid} (${orphan.project})`,
      );
      await killProcess(orphan.pid);
    }
  } catch {}

  if (
    geminiConfig.shouldCleanupBrain ||
    geminiConfig.shouldCleanupImplicit ||
    geminiConfig.shouldCleanupKnowledge
  ) {
    const geminiDir = join(cwd, ".gemini", "antigravity");

    if (geminiConfig.shouldCleanupBrain) {
      const brainDir = join(geminiDir, "brain");
      try {
        if (existsSync(brainDir)) {
          const files = readdirSync(brainDir);
          for (const file of files) {
            const filePath = join(brainDir, file);
            logAction(`Removing brain file: ${filePath}`);
            safeRemove(filePath);
          }
        }
      } catch {}
    }

    if (geminiConfig.shouldCleanupImplicit) {
      const implicitDir = join(geminiDir, "implicit");
      try {
        if (existsSync(implicitDir)) {
          const files = readdirSync(implicitDir);
          for (const file of files) {
            const filePath = join(implicitDir, file);
            logAction(`Removing implicit file: ${filePath}`);
            safeRemove(filePath);
          }
        }
      } catch {}
    }

    if (geminiConfig.shouldCleanupKnowledge) {
      const knowledgeDir = join(geminiDir, "knowledge");
      try {
        if (existsSync(knowledgeDir)) {
          const files = readdirSync(knowledgeDir);
          for (const file of files) {
            const filePath = join(knowledgeDir, file);
            logAction(`Removing knowledge file: ${filePath}`);
            safeRemove(filePath);
          }
        }
      } catch {}
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.clear();
  p.intro(pc.bgMagenta(pc.white(" 🧹 oh-my-agent cleanup ")));

  if (dryRun) {
    p.note(pc.yellow("Dry-run mode — no changes will be made"), "Mode");
  }

  if (result.details.length > 0) {
    const detailsTable = [
      pc.bold("Cleanup Details"),
      ...result.details.map((d) => {
        if (d.startsWith("[DRY-RUN]")) return pc.yellow(d);
        if (d.startsWith("[CLEAN]")) return pc.green(d);
        return pc.cyan(d);
      }),
    ].join("\n");

    p.note(detailsTable, "Details");
  }

  const summaryTable = [
    pc.bold("Summary"),
    `┌─────────┬────────┐`,
    `│ ${pc.bold("Action")}  │ ${pc.bold("Count")}  │`,
    `├─────────┼────────┤`,
    `│ Cleaned │ ${String(result.cleaned).padEnd(6)} │`,
    `│ Skipped │ ${String(result.skipped).padEnd(6)} │`,
    `└─────────┴────────┘`,
  ].join("\n");

  p.note(summaryTable, "Results");

  if (dryRun) {
    p.outro(pc.yellow("Run without --dry-run to apply changes"));
  } else {
    p.outro(pc.green("Cleanup complete!"));
  }
}
