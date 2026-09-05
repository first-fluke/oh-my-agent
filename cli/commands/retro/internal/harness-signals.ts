import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";

/**
 * Harness refine signals (design-prime-agent-adoption, Track A reduced form).
 *
 * Deterministic collector over the L1 event trail: aggregates gate.failed /
 * blocker.raised / decision.missing events within the retro window into
 * grouped signals, each with a suggested harness target and a one-line
 * proposal. The CLI emits structured evidence only — turning a proposal into
 * an actual SKILL.md / rules / workflow diff is the host LLM's (or the
 * user's) job, per the house pattern (no LLM calls from the CLI).
 */

const SIGNAL_KINDS = new Set([
  "gate.failed",
  "blocker.raised",
  "decision.missing",
]);

export interface HarnessSignal {
  kind: string;
  /** Grouping key: gate name, blocker code, or workflow. */
  key: string;
  count: number;
  workflows: string[];
  sids: string[];
  latestTs: string;
  latestSummary: string;
  /** Harness file/area the proposal points at. */
  suggestedTarget: string;
  /** One-line refine proposal for the host LLM / user to act on. */
  suggestedAction: string;
}

interface RawEvent {
  ts: string;
  sid: string;
  kind: string;
  payload?: Record<string, unknown>;
}

function str(
  payload: Record<string, unknown> | undefined,
  key: string,
): string {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function suggestFor(
  kind: string,
  key: string,
  workflows: string[],
): { target: string; action: string } {
  const wf = workflows[0] ?? "workflow";
  if (kind === "gate.failed") {
    if (key === "budget") {
      return {
        target: `.agents/workflows/${wf}.md`,
        action:
          "wall-clock budget exhausted — split the scope into smaller runs or raise --budget-minutes; if recurring, record the pattern in lessons-learned.md",
      };
    }
    if (key === "typecheck" || key === "test" || key === "lint") {
      return {
        target: ".agents/skills/_shared/core/lessons-learned.md",
        action: `stop gate '${key}' failed repeatedly — inspect the recurring failure class and add an RCA entry (consider a skill/rule edit if the same mistake repeats)`,
      };
    }
    return {
      target: `.agents/workflows/${wf}.md`,
      action:
        "a workflow gate failed — check whether the gate criteria or the phase instructions need tightening",
    };
  }
  if (kind === "blocker.raised") {
    if (key === "spawn.no-workspace-artifact") {
      return {
        target: ".agents/oma-config.yaml (agents: override)",
        action:
          "external vendor dispatch produced no workspace artifact — pin the affected agent to a reliable vendor or use native dispatch",
      };
    }
    return {
      target: ".agents/skills/_shared/core/lessons-learned.md",
      action:
        "a blocker was raised — if the same blocker class repeats across sessions, encode the workaround as a lesson or guardrail",
    };
  }
  // decision.missing
  return {
    target: `.agents/workflows/${wf}.md`,
    action:
      "a required decision was not emitted — re-check the workflow's `oma state emit` steps and its required-decisions list",
  };
}

/**
 * Scan `.agents/state/sessions/<sid>/events.jsonl` for refine-relevant events
 * newer than the window cutoff and group them into signals.
 */
export function collectHarnessSignals(
  cwd: string,
  windowDays: number,
): HarnessSignal[] {
  const sessionsDir = path.join(cwd, ".agents", "state", "sessions");
  if (!fs.existsSync(sessionsDir)) return [];
  const cutoffMs = Date.now() - windowDays * 86_400_000;

  const groups = new Map<
    string,
    {
      kind: string;
      key: string;
      count: number;
      workflows: Set<string>;
      sids: Set<string>;
      latestTs: string;
      latestSummary: string;
    }
  >();

  let sessionDirs: string[];
  try {
    sessionDirs = fs.readdirSync(sessionsDir);
  } catch {
    return [];
  }

  for (const sid of sessionDirs) {
    const eventsPath = path.join(sessionsDir, sid, "events.jsonl");
    let raw: string;
    try {
      raw = fs.readFileSync(eventsPath, "utf-8");
    } catch {
      continue;
    }
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      let event: RawEvent;
      try {
        event = JSON.parse(line) as RawEvent;
      } catch {
        continue;
      }
      if (!SIGNAL_KINDS.has(event.kind)) continue;
      const tsMs = new Date(event.ts).getTime();
      if (Number.isNaN(tsMs) || tsMs < cutoffMs) continue;

      const payload = event.payload;
      const key =
        str(payload, "gate") ||
        str(payload, "code") ||
        str(payload, "workflow") ||
        "unknown";
      const groupKey = `${event.kind}::${key}`;
      const group = groups.get(groupKey) ?? {
        kind: event.kind,
        key,
        count: 0,
        workflows: new Set<string>(),
        sids: new Set<string>(),
        latestTs: "",
        latestSummary: "",
      };
      group.count += 1;
      const workflow = str(payload, "workflow");
      if (workflow) group.workflows.add(workflow);
      group.sids.add(event.sid);
      if (!group.latestTs || event.ts > group.latestTs) {
        group.latestTs = event.ts;
        group.latestSummary =
          str(payload, "summary") || str(payload, "decision") || "";
      }
      groups.set(groupKey, group);
    }
  }

  return [...groups.values()]
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .map((group) => {
      const workflows = [...group.workflows].sort();
      const suggestion = suggestFor(group.kind, group.key, workflows);
      return {
        kind: group.kind,
        key: group.key,
        count: group.count,
        workflows,
        sids: [...group.sids].sort(),
        latestTs: group.latestTs,
        latestSummary: group.latestSummary,
        suggestedTarget: suggestion.target,
        suggestedAction: suggestion.action,
      };
    });
}

/** Render signals for the retro terminal report. */
export function fmtHarnessSignals(signals: HarnessSignal[]): string {
  const lines: string[] = [];
  for (const signal of signals) {
    const scope = signal.workflows.length
      ? ` [${signal.workflows.join(", ")}]`
      : "";
    lines.push(
      `  ${pc.yellow(signal.kind)} ${pc.bold(signal.key)}${scope} ×${signal.count}`,
    );
    if (signal.latestSummary) {
      lines.push(`    latest: ${signal.latestSummary}`);
    }
    lines.push(
      `    ${pc.cyan("propose:")} ${signal.suggestedAction}`,
      `    ${pc.dim(`target: ${signal.suggestedTarget} · sessions: ${signal.sids.length}`)}`,
    );
  }
  lines.push(
    "",
    pc.dim(
      "  Proposals are evidence-backed suggestions from the L1 event trail — draft the actual edit, verify with `oma skill eval`, then apply.",
    ),
  );
  return lines.join("\n");
}
