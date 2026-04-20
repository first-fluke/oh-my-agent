import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  analyze,
  fetchOrigin,
  fmtCommitTypes,
  fmtDelta,
  fmtHotspots,
  fmtHourlyHistogram,
  fmtLeaderboard,
  fmtMetricsTable,
  fmtSessions,
  fmtTweetable,
  getCompareWindows,
  getDisplayData,
  getGitUserName,
  loadPreviousSnapshot,
  parseTimeWindow,
  type RetroSnapshot,
  saveSnapshot,
  type TimeWindow,
} from "./types.js";

function renderRetro(
  snapshot: RetroSnapshot,
  sessions: ReturnType<typeof getDisplayData>["sessions"],
  hourly: number[],
  currentUser: string,
  previous: RetroSnapshot | null,
): void {
  // Tweetable summary
  console.log(pc.bold(pc.cyan(fmtTweetable(snapshot))));
  console.log();

  // Summary Table
  p.note(fmtMetricsTable(snapshot.metrics), "Summary");

  // Trends vs Last Retro
  if (previous) {
    p.note(fmtDelta(snapshot, previous), "Trends vs Last Retro");
  }

  // Contributor Leaderboard
  if (snapshot.metrics.contributors > 0) {
    p.note(fmtLeaderboard(snapshot.authors, currentUser), "Contributors");
  }

  // Hourly Distribution
  p.note(fmtHourlyHistogram(hourly), "Commit Time Distribution");

  // Sessions
  if (sessions.length > 0) {
    p.note(fmtSessions(sessions), "Work Sessions");
  }

  // Commit Types
  p.note(
    fmtCommitTypes(snapshot.commitTypes, snapshot.metrics.commits),
    "Commit Types",
  );

  // Hotspots
  if (snapshot.hotspots.length > 0) {
    const fixRatio =
      snapshot.metrics.commits > 0
        ? Math.round(
            ((snapshot.commitTypes.fix || 0) / snapshot.metrics.commits) * 100,
          )
        : 0;

    let hotspotContent = fmtHotspots(snapshot.hotspots);
    if (fixRatio > 50) {
      hotspotContent += `\n\n  ${pc.yellow(`Fix ratio ${fixRatio}% — ship-fast-fix-fast pattern detected`)}`;
    }
    p.note(hotspotContent, "File Hotspots (Top 10)");
  }

  // Focus Score
  const { focusScore, focusArea } = snapshot.metrics;
  const focusColor =
    focusScore >= 60 ? pc.green : focusScore >= 40 ? pc.yellow : pc.red;
  p.note(
    `  ${focusColor(`${focusScore}%`)} — primary area: ${pc.bold(focusArea)}`,
    "Focus Score",
  );

  // Streak
  p.note(
    `  ${pc.bold(String(snapshot.metrics.streakDays))} consecutive days with commits`,
    "Shipping Streak",
  );

  // AI-assisted
  if (snapshot.metrics.aiAssistedCommits > 0) {
    const pct =
      snapshot.metrics.commits > 0
        ? Math.round(
            (snapshot.metrics.aiAssistedCommits / snapshot.metrics.commits) *
              100,
          )
        : 0;
    p.note(
      `  ${snapshot.metrics.aiAssistedCommits} commits (${pct}%) AI-assisted`,
      "AI Collaboration",
    );
  }
}

export async function retro(
  windowArg?: string,
  options: {
    json?: boolean;
    compare?: boolean;
    interactive?: boolean;
  } = {},
): Promise<void> {
  const cwd = process.cwd();

  // Interactive mode (legacy)
  if (options.interactive) {
    const { retro: legacyRetro } = await import("./interactive.js");
    await legacyRetro();
    return;
  }

  console.clear();
  p.intro(pc.bgMagenta(pc.white(" retro ")));

  const s = p.spinner();
  s.start("Fetching origin...");
  fetchOrigin(cwd);
  s.stop("Origin fetched");

  const currentUser = getGitUserName(cwd);

  if (options.compare) {
    // Compare mode
    const { current, previous } = getCompareWindows(windowArg);

    s.start(`Analyzing current window (${current.label})...`);
    const currentSnapshot = analyze(cwd, current);
    const currentDisplay = getDisplayData(cwd, current);
    s.stop("Current window analyzed");

    s.start(`Analyzing previous window (${previous.label})...`);
    const previousSnapshot = analyze(cwd, previous);
    s.stop("Previous window analyzed");

    if (
      currentSnapshot.metrics.commits === 0 &&
      previousSnapshot.metrics.commits === 0
    ) {
      p.note(pc.yellow("No commits found in either window."), "Empty");
      p.outro(pc.dim("Try a wider window: oma retro compare 30d"));
      return;
    }

    if (options.json) {
      console.log(
        JSON.stringify(
          { current: currentSnapshot, previous: previousSnapshot },
          null,
          2,
        ),
      );
      return;
    }

    console.log(
      pc.bold(
        `\nComparing: ${current.label} (current) vs ${previous.label} (prior)\n`,
      ),
    );

    // Side-by-side comparison
    p.note(fmtDelta(currentSnapshot, previousSnapshot), "Period Comparison");

    console.log(pc.bold("\n--- Current Period ---\n"));
    renderRetro(
      currentSnapshot,
      currentDisplay.sessions,
      currentDisplay.hourly,
      currentUser,
      null,
    );

    // Save only current window
    const filepath = saveSnapshot(cwd, currentSnapshot);
    p.outro(pc.dim(`Snapshot saved: ${filepath}`));
    return;
  }

  // Normal mode
  let window: TimeWindow;
  try {
    window = parseTimeWindow(windowArg);
  } catch (e) {
    p.note(
      [
        "Usage: oma retro [window]",
        "",
        "  oma retro              last 7 days (default)",
        "  oma retro 24h          last 24 hours",
        "  oma retro 14d          last 14 days",
        "  oma retro 30d          last 30 days",
        "  oma retro 2w           last 2 weeks",
        "  oma retro --compare    compare current vs prior period",
        "  oma retro --compare 14d",
      ].join("\n"),
      "Usage",
    );
    p.outro(pc.dim((e as Error).message));
    return;
  }

  s.start(`Analyzing ${window.label} window...`);
  const snapshot = analyze(cwd, window);
  const displayData = getDisplayData(cwd, window);
  s.stop(`Analysis complete (${snapshot.metrics.commits} commits)`);

  if (snapshot.metrics.commits === 0) {
    p.note(pc.yellow("No commits found in this window."), "Empty");
    p.outro(pc.dim("Try a wider window: oma retro 30d"));
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  const previous = loadPreviousSnapshot(cwd);
  renderRetro(
    snapshot,
    displayData.sessions,
    displayData.hourly,
    currentUser,
    previous,
  );

  // Save snapshot
  const filepath = saveSnapshot(cwd, snapshot);
  p.outro(pc.dim(`Snapshot saved: ${filepath}`));
}
