import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { INSTALLED_SKILLS_DIR } from "../../../constants/vendors.js";
import { parseFrontmatter } from "../../../utils/frontmatter.js";
import { resolveDispatchResult, unwrapVendorEnvelope } from "./envelope.js";
import { contentHash, taskFixtureHash, taskSetHash } from "./rollouts.js";
import type { LiveDispatchFn, TaskFixture } from "./types.js";

/**
 * Routing measurement (activation).
 *
 * Utility lift measures what a skill body does once it is loaded. Every vendor
 * decides whether to load a skill from its frontmatter `description`, so a
 * better body that is never selected is not an improvement. This module asks
 * the same protected, tool-free model which installed skill it would load for
 * each task prompt, given every installed skill's name and description. The
 * target being chosen is an activation; another skill is a misroute; NONE is a
 * miss. It measures the description against the catalog, not the vendor's
 * actual discovery mechanism, which the protected profile deliberately hides.
 */

export interface SkillCatalogEntry {
  name: string;
  description: string;
}

export type RoutingOutcome = "target" | "other" | "none" | "unparsed";

export interface RoutingEntry {
  taskId: string;
  arm: "routing";
  output: string;
  choice: string | null;
  outcome: RoutingOutcome;
  promptHash: string;
  taskHash: string;
}

export interface SkillRoutingSummary {
  /** `stale` means a recording exists but its catalog or tasks changed. */
  status: "not-requested" | "measured" | "stale" | "unavailable";
  measured: number;
  activated: number;
  misrouted: number;
  none: number;
  unparsed: number;
  /** activated / measured; 0 when nothing was measured. */
  activationRate: number;
  misroutedTo: Record<string, number>;
  catalogSize: number;
}

export function loadSkillCatalog(workspace: string): SkillCatalogEntry[] {
  const root = join(workspace, INSTALLED_SKILLS_DIR);
  if (!existsSync(root)) return [];
  const catalog: SkillCatalogEntry[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const path = join(root, entry.name, "SKILL.md");
    if (!existsSync(path)) continue;
    let content: string;
    try {
      content = readFileSync(path, "utf-8");
    } catch {
      continue;
    }
    const { frontmatter } = parseFrontmatter(content);
    const description =
      typeof frontmatter.description === "string"
        ? frontmatter.description.trim()
        : "";
    if (!description) continue;
    const name =
      typeof frontmatter.name === "string" && frontmatter.name.trim()
        ? frontmatter.name.trim()
        : entry.name;
    catalog.push({ name, description });
  }
  return catalog.sort((a, b) => a.name.localeCompare(b.name));
}

export function catalogHash(catalog: SkillCatalogEntry[]): string {
  return contentHash(JSON.stringify(catalog));
}

export function buildRoutingPrompt(
  catalog: SkillCatalogEntry[],
  taskPrompt: string,
): string {
  return [
    "You are an agent runtime deciding which skill to load before handling a request.",
    "",
    "## Available skills (name — description)",
    ...catalog.map((entry) => `- ${entry.name} — ${entry.description}`),
    "",
    "## Request",
    taskPrompt,
    "",
    "Reply with exactly one line: the name of the single skill you would load, or NONE if no listed skill applies. No other text.",
  ].join("\n");
}

export function parseRoutingChoice(
  response: string,
  catalog: SkillCatalogEntry[],
  target: string,
): { choice: string | null; outcome: RoutingOutcome } {
  const text = unwrapVendorEnvelope(response).trim();
  const line = (text.split(/\r?\n/).find((l) => l.trim()) ?? "")
    .trim()
    .replace(/^[-*•\d.)\s]+/, "")
    .replace(/[`"'*_]/g, "")
    .trim();
  if (!line) return { choice: null, outcome: "unparsed" };
  if (/^none\b/i.test(line)) return { choice: null, outcome: "none" };
  const lower = line.toLowerCase();
  const exact = catalog.find((entry) => entry.name.toLowerCase() === lower);
  const contained =
    exact ??
    catalog
      .filter((entry) => lower.includes(entry.name.toLowerCase()))
      .sort((a, b) => b.name.length - a.name.length)[0];
  if (!contained) return { choice: null, outcome: "unparsed" };
  return {
    choice: contained.name,
    outcome: contained.name === target ? "target" : "other",
  };
}

export function measureRouting(args: {
  tasks: TaskFixture[];
  target: string;
  catalog: SkillCatalogEntry[];
  dispatchFn: LiveDispatchFn;
  workspace: string;
}): RoutingEntry[] {
  const entries: RoutingEntry[] = [];
  for (const task of args.tasks) {
    const prompt = buildRoutingPrompt(args.catalog, task.prompt);
    const dir = join(args.workspace, `routing-${entries.length}`);
    mkdirSync(dir, { recursive: true });
    let output: string;
    try {
      // The routing arm withholds the target body exactly like the baseline.
      output = resolveDispatchResult(
        args.dispatchFn("baseline", prompt, dir),
      ).output;
    } catch (error) {
      console.warn(
        `[oma skill eval] routing for task ${task.id} could not be measured: ${error instanceof Error ? error.message : String(error)}.`,
      );
      continue;
    }
    const parsed = parseRoutingChoice(output, args.catalog, args.target);
    entries.push({
      taskId: task.id,
      arm: "routing",
      output: unwrapVendorEnvelope(output),
      choice: parsed.choice,
      outcome: parsed.outcome,
      promptHash: contentHash(task.prompt),
      taskHash: taskFixtureHash(task),
    });
  }
  return entries;
}

export function summarizeRouting(
  tasks: TaskFixture[],
  entries: RoutingEntry[],
  status: SkillRoutingSummary["status"],
  catalogSize: number,
): SkillRoutingSummary {
  const byTask = new Map(entries.map((entry) => [entry.taskId, entry]));
  const summary: SkillRoutingSummary = {
    status,
    measured: 0,
    activated: 0,
    misrouted: 0,
    none: 0,
    unparsed: 0,
    activationRate: 0,
    misroutedTo: {},
    catalogSize,
  };
  for (const task of tasks) {
    const entry = byTask.get(task.id);
    if (!entry) continue;
    summary.measured += 1;
    if (entry.outcome === "target") summary.activated += 1;
    else if (entry.outcome === "other") {
      summary.misrouted += 1;
      const name = entry.choice ?? "?";
      summary.misroutedTo[name] = (summary.misroutedTo[name] ?? 0) + 1;
    } else if (entry.outcome === "none") summary.none += 1;
    else summary.unparsed += 1;
  }
  summary.activationRate =
    summary.measured > 0 ? summary.activated / summary.measured : 0;
  return summary;
}

interface RoutingRecordFile {
  schemaVersion: 1;
  skill: string;
  catalogHash: string;
  entries: RoutingEntry[];
}

export function routingRecordPath(taskDir: string, taskIds: string[]): string {
  return join(taskDir, "_rollouts", `${taskSetHash(taskIds)}.routing.json`);
}

export function writeRoutingRecord(
  taskDir: string,
  skill: string,
  hash: string,
  entries: RoutingEntry[],
): string {
  const path = routingRecordPath(taskDir, [
    ...new Set(entries.map((entry) => entry.taskId)),
  ]);
  mkdirSync(join(taskDir, "_rollouts"), { recursive: true });
  const sorted = [...entries].sort((a, b) => a.taskId.localeCompare(b.taskId));
  const file: RoutingRecordFile = {
    schemaVersion: 1,
    skill,
    catalogHash: hash,
    entries: sorted,
  };
  writeFileSync(path, JSON.stringify(file, null, 2), "utf-8");
  return path;
}

/**
 * Replay a routing recording. Entries whose task changed are dropped; a changed
 * catalog (any skill description) makes the whole recording stale because the
 * choice was made against a different list.
 */
export function loadRoutingRecord(
  taskDir: string,
  skill: string,
  hash: string,
  tasks: TaskFixture[],
): { entries: RoutingEntry[]; status: "measured" | "stale" | "unavailable" } {
  const path = routingRecordPath(
    taskDir,
    tasks.map((task) => task.id),
  );
  if (!existsSync(path)) return { entries: [], status: "unavailable" };
  let file: RoutingRecordFile;
  try {
    file = JSON.parse(readFileSync(path, "utf-8")) as RoutingRecordFile;
  } catch {
    return { entries: [], status: "unavailable" };
  }
  if (
    file.schemaVersion !== 1 ||
    file.skill !== skill ||
    !Array.isArray(file.entries)
  )
    return { entries: [], status: "unavailable" };
  if (file.catalogHash !== hash) return { entries: [], status: "stale" };
  const expected = new Map(
    tasks.map((task) => [task.id, taskFixtureHash(task)]),
  );
  const entries = file.entries.filter(
    (entry) =>
      entry &&
      entry.arm === "routing" &&
      expected.get(entry.taskId) === entry.taskHash,
  );
  return {
    entries,
    status: entries.length === tasks.length ? "measured" : "stale",
  };
}
