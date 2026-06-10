import { existsSync, mkdirSync } from "node:fs";
import { watch } from "chokidar";
import pc from "picocolors";
import {
  buildFullState,
  type DashboardState,
  resolveMemoriesDir,
} from "./dashboard/state.js";

const SYM_RUNNING = "●";
const SYM_COMPLETED = "✓";
const SYM_FAILED = "✗";
const SYM_BLOCKED = "○";
const SYM_PENDING = "◌";

function statusSymbol(status: string): string {
  const lower = status.toLowerCase();
  if (["running", "active", "in_progress", "in-progress"].includes(lower)) {
    return `${pc.green(SYM_RUNNING)} running`;
  } else if (["completed", "done", "finished"].includes(lower)) {
    return `${pc.cyan(SYM_COMPLETED)} completed`;
  } else if (["failed", "error"].includes(lower)) {
    return `${pc.red(SYM_FAILED)} failed`;
  } else if (["blocked", "waiting"].includes(lower)) {
    return `${pc.yellow(SYM_BLOCKED)} blocked`;
  }
  return `${pc.dim(SYM_PENDING)} pending`;
}

function truncate(text: string, width: number): string {
  return text.length > width ? `${text.substring(0, width - 3)}...` : text;
}

function renderDashboard(memoriesDir: string) {
  console.clear();

  const state: DashboardState = buildFullState(memoriesDir);
  const { session, agents, activity } = state;

  const W = 56;
  const border = "═".repeat(W);
  const safeRepeat = (n: number) => " ".repeat(Math.max(0, n));

  const purple = (s: string) => pc.magenta(s);
  const bold = (s: string) => pc.bold(s);
  const dim = (s: string) => pc.dim(s);

  let statusColor = pc.yellow;
  if (session.status === "RUNNING") statusColor = pc.green;
  else if (session.status === "COMPLETED") statusColor = pc.cyan;
  else if (session.status === "FAILED") statusColor = pc.red;

  console.log(`${purple(`╔${border}╗`)}`);
  console.log(
    `${purple("║")}  ${bold(purple("Serena Memory Dashboard"))}${safeRepeat(W - 25)}${purple("║")}`,
  );
  const sessionLine = `Session: ${bold(session.id.padEnd(20))} [${statusColor(session.status)}]`;
  console.log(
    `${purple("║")}  ${sessionLine}${safeRepeat(W - 4 - sessionLine.length - 9)}${purple("║")}`,
  );
  console.log(`${purple(`╠${border}╣`)}`);

  console.log(
    `${purple("║")}  ${bold(`${"Agent".padEnd(12)} ${"Status".padEnd(12)} ${"Turn".padEnd(6)} ${"Task".padEnd(20)}`)}  ${purple("║")}`,
  );
  console.log(
    `${purple("║")}  ${dim(`${"──────────".padEnd(12)} ${"──────────".padEnd(12)} ${"────".padEnd(6)} ${"──────────────────".padEnd(20)}`)}  ${purple("║")}`,
  );

  if (agents.length === 0) {
    console.log(
      `${purple("║")}  ${dim(`No agents detected yet${safeRepeat(32)}`)}${purple("║")}`,
    );
  } else {
    for (const a of agents) {
      const sym = statusSymbol(a.status);
      const turn = a.turn != null ? String(a.turn) : "-";
      const task = a.task.substring(0, 20);
      console.log(
        `${purple("║")}  ${a.agent.padEnd(12)} ${sym.padEnd(22)} ${turn.padEnd(6)} ${task.padEnd(20)}${purple("║")}`,
      );
    }
  }

  console.log(`${purple(`╠${border}╣`)}`);
  console.log(
    `${purple("║")}  ${bold("Latest Activity:")}${safeRepeat(W - 18)}${purple("║")}`,
  );

  if (activity.length === 0) {
    console.log(
      `${purple("║")}  ${dim(`No activity yet${safeRepeat(38)}`)}${purple("║")}`,
    );
  } else {
    for (const a of activity) {
      const line = truncate(`[${a.agent}] ${a.message}`, 52);
      console.log(`${purple("║")}  ${dim(line.padEnd(52))}${purple("║")}`);
    }
  }

  console.log(`${purple(`╠${border}╣`)}`);

  const now = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const footerText = `Updated: ${now}  |  Ctrl+C to exit`;
  console.log(
    `${purple("║")}  ${dim(footerText)}${safeRepeat(W - 4 - footerText.length)}${purple("║")}`,
  );
  console.log(`${purple(`╚${border}╝`)}`);
}

export async function startTerminalDashboard(): Promise<void> {
  const memoriesDir = resolveMemoriesDir();

  if (!existsSync(memoriesDir)) {
    mkdirSync(memoriesDir, { recursive: true });
    console.log(
      pc.yellow(`Created ${memoriesDir} — waiting for memory files...`),
    );
  }

  console.log(pc.magenta("\n  🛸 Serena Terminal Dashboard"));
  console.log(pc.dim(`     Watching: ${memoriesDir}\n`));

  renderDashboard(memoriesDir);

  const watcher = watch(memoriesDir, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  watcher.on("all", () => renderDashboard(memoriesDir));

  return new Promise((resolve) => {
    process.once("SIGINT", () => {
      console.log("\n");
      watcher.close();
      resolve();
      process.exit(0);
    });

    process.once("SIGTERM", () => process.emit("SIGINT"));
  });
}
