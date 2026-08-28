import * as p from "@clack/prompts";
import pc from "picocolors";
import { maybeApplyRecommendedGitConfig } from "../../../io/git-recommended.js";
import { checkStarred } from "../../../io/github.js";
import type { DoctorReport } from "../types.js";

export async function renderFooter(report: DoctorReport): Promise<void> {
  await renderGitRecommended(report);

  if (report.hasCoordinationStore) {
    p.note(
      `${pc.green("✅")} Coordination store directory exists\n${pc.dim(`${report.coordinationFileCount} coordination files found`)}`,
      "Coordination Store",
    );
  } else {
    p.note(
      `${pc.yellow("⚠️")} Coordination store directory not found\n${pc.dim("Dashboard will show 'No agents detected'")}`,
      "Coordination Store",
    );
  }

  if (report.serenaBinary.installed) {
    p.note(
      `${pc.green("✅")} serena binary on PATH${report.serenaBinary.version ? `\n${pc.dim(report.serenaBinary.version)}` : ""}`,
      "Serena Binary",
    );
  } else {
    p.note(
      `${pc.yellow("⚠️")} serena binary not found on PATH\n${pc.dim("MCP would fail with 'MCP error -32001: Request timed out'")}\n${pc.dim(`Fix: ${report.serenaBinary.installCmd}`)}`,
      "Serena Binary",
    );
  }

  renderSerenaDaemons(report);
  renderSerenaReap(report);

  for (const doc of report.vendorDocs) {
    if (!doc.required) continue;
    const label = `./${doc.fileName}`;
    if (doc.hasOmaBlock) {
      p.note(`${pc.green("✅")} OMA block found in ${label}`, doc.fileName);
    } else {
      p.note(
        `${pc.yellow("⚠️")} OMA block missing in ${label}\n${pc.dim("Run 'oh-my-agent' to install or reinstall")}`,
        doc.fileName,
      );
    }
  }

  if (report.totalIssues === 0) {
    p.outro(pc.green("✅ All checks passed! Ready to use."));
  } else {
    p.outro(
      pc.yellow(`⚠️  Found ${report.totalIssues} issue(s). See details above.`),
    );
  }

  if (checkStarred()) {
    p.note(`${pc.green("⭐")} Thank you for starring oh-my-agent!`, "Support");
  } else {
    p.note(
      `${pc.yellow("❤️")} Enjoying oh-my-agent? Give it a star or sponsor!\n${pc.dim("gh api --method PUT /user/starred/first-fluke/oh-my-agent")}\n${pc.dim("https://github.com/sponsors/first-fluke")}`,
      "Support",
    );
  }
}

/**
 * Report recommended global git settings and offer interactive fixes when
 * something is missing or wrong. Does not mutate config in non-TTY / cancelled
 * paths beyond the shared maybeApply helper (which is always interactive here).
 */
async function renderGitRecommended(report: DoctorReport): Promise<void> {
  const git = report.gitRecommended;
  if (!git.available) {
    p.note(
      `${pc.dim("git not available — skipped recommended config check")}`,
      "Git Config",
    );
    return;
  }

  if (git.allOk) {
    const lines = git.items.map(
      (item) => `${pc.green("✅")} ${item.key}=${item.desired}`,
    );
    p.note(lines.join("\n"), "Git Config");
    return;
  }

  const lines = git.items.map((item) => {
    if (item.ok) {
      return `${pc.green("✅")} ${item.key}=${item.desired}`;
    }
    const current =
      item.current === null ? "unset" : JSON.stringify(item.current);
    return `${pc.yellow("⚠️")} ${item.key} ${pc.dim(`(${current}, want ${item.desired})`)}\n${pc.dim(`   ${item.fixHint}`)}`;
  });
  p.note(lines.join("\n"), "Git Config");

  // Offer the same opt-in apply path used by install/update.
  await maybeApplyRecommendedGitConfig({ nonInteractive: false });
}

/**
 * Render the Serena reaper diagnostic (T1-3: always surface the per-root signal
 * source; T2-2: surface heavy/unmapped language advisories). Skipped silently
 * only when no Serena roots are running (nothing to report).
 */
/**
 * Render the shared serena daemon fleet (`oma bridge`). Skipped when empty —
 * a machine using stdio mode, or with no sessions yet, has nothing to show.
 */
function renderSerenaDaemons(report: DoctorReport): void {
  const check = report.serenaDaemons;
  if (!check || check.daemons.length === 0) return;

  const lines = check.daemons.map((daemon) => {
    const status = daemon.pendingReclaim
      ? pc.yellow(`idle ${daemon.idleMinutes}m — reclaim pending`)
      : daemon.liveClients > 0
        ? pc.green(`${daemon.liveClients} client(s)`)
        : pc.dim(`idle ${daemon.idleMinutes ?? 0}m (grace)`);
    return `${daemon.root} ${pc.dim(`(${daemon.context}, :${daemon.port}, pid ${daemon.pid})`)} — ${status}`;
  });
  if (check.prunedCount > 0) {
    lines.push(pc.dim(`pruned ${check.prunedCount} dead registration(s)`));
  }
  p.note(lines.join("\n"), "Serena Daemons");
}

function renderSerenaReap(report: DoctorReport): void {
  const check = report.serenaReap;
  if (!check || check.roots.length === 0) {
    if (check?.languageAdvisories.length) {
      renderLanguageAdvisories(check.languageAdvisories);
    }
    return;
  }

  const lines: string[] = [];
  lines.push(
    `${pc.dim("policy")} ${check.config.policy}  ${pc.dim("keep-warm")} ${check.config.keepWarm}  ${pc.dim("enabled")} ${check.config.enabled ? pc.green("yes") : pc.yellow("no (opt-in)")}`,
  );
  lines.push(
    `${check.roots.length} root(s), LSP RSS ${check.totalLspRssMb.toFixed(1)} MB · reapable ${check.reapableRssMb.toFixed(1)} MB across ${check.reapTargetCount} target(s)`,
  );
  for (const root of check.roots) {
    const tag = root.isReapTarget ? pc.yellow("REAP") : pc.green("KEEP");
    lines.push(
      `${tag} ${root.project} ${pc.dim(`(pid ${root.pid})`)} — signal:${root.signalSource} idle:${root.idleMinutes}m rss:${root.lspRssMb.toFixed(1)}MB`,
    );
  }
  p.note(lines.join("\n"), "Serena Reaper");

  renderLanguageAdvisories(check.languageAdvisories);
}

function renderLanguageAdvisories(
  advisories: DoctorReport["serenaReap"]["languageAdvisories"],
): void {
  if (advisories.length === 0) return;
  const lines = advisories.map(
    (a) =>
      `${pc.yellow("⚠️")} ${a.language}: ${a.reason}\n${pc.dim(`   ${a.suggestion}`)}`,
  );
  p.note(lines.join("\n"), "Serena Languages");
}
