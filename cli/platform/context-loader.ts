import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../utils/frontmatter.js";
import { buildGraph, type Graph, selectGraph } from "../utils/graph.js";
import { normalizeAgentId } from "./agent-config/agent-ids.js";

export type Difficulty = "Simple" | "Medium" | "Complex";

export interface ContextBundle {
  difficulty: Difficulty;
  resources: string[];
  skipped: string[];
  /** Estimate only; not a model tokenizer measurement. */
  estimatedTokens: number;
  /** Required entry instructions are never dropped to meet a soft budget. */
  budgetExceeded?: boolean;
}

export const COMPLEX_KEYWORDS = [
  "refactor",
  "architecture",
  "cross-cutting",
  "migration",
  "redesign",
  "overhaul",
  "restructure",
  "rewrite",
] as const;

/**
 * Classify task difficulty from lightweight heuristics.
 *
 * Thresholds:
 *   Simple  — description < 200 chars AND acceptanceCriteriaCount <= 2
 *             AND filesInScope <= 1 AND no COMPLEX_KEYWORDS
 *   Complex — acceptanceCriteriaCount >= 5 OR filesInScope >= 3
 *             OR COMPLEX_KEYWORDS present in description
 *   Medium  — everything else
 */
export function classifyDifficulty(
  taskDescription: string,
  acceptanceCriteriaCount: number,
  filesInScope: number,
): Difficulty {
  const lower = taskDescription.toLowerCase();

  const hasComplexKeyword = COMPLEX_KEYWORDS.some((kw) => lower.includes(kw));
  const isDefinitelyComplex =
    acceptanceCriteriaCount >= 5 || filesInScope >= 3 || hasComplexKeyword;

  if (isDefinitelyComplex) return "Complex";

  const isDefinitelySimple =
    taskDescription.length < 200 &&
    acceptanceCriteriaCount <= 2 &&
    filesInScope <= 1 &&
    !hasComplexKeyword;

  if (isDefinitelySimple) return "Simple";

  return "Medium";
}

function estimateFileTokens(file: string): number {
  return Math.ceil(
    Buffer.byteLength(fs.readFileSync(file, "utf8"), "utf8") / 4,
  );
}

function entrySkill(
  graph: Graph,
  agentId: string,
  cwd: string,
): string | undefined {
  const normalized = normalizeAgentId(agentId);
  const skill = graph.nodes.find(
    (node) =>
      node.category === "skill" &&
      [agentId, `oma-${normalized ?? agentId}`].includes(node.label),
  );
  if (skill) return skill.id;
  const agent = graph.nodes.find(
    (node) =>
      node.category === "agent" &&
      (node.label === agentId ||
        (normalized && normalizeAgentId(node.label) === normalized)),
  );
  if (!agent) return undefined;
  // The first declared skill owns the task; additional skills are available routes.
  for (const file of agent.paths ?? []) {
    if (!file.startsWith(".agents/") || !file.endsWith(".md")) continue;
    const { frontmatter } = parseFrontmatter(
      fs.readFileSync(path.join(cwd, file), "utf8"),
    );
    for (const name of Array.isArray(frontmatter.skills)
      ? frontmatter.skills
      : []) {
      const declared = graph.nodes.find((node) => node.id === `skill:${name}`);
      if (declared) return declared.id;
    }
  }
  return (
    graph.edges.find(
      (edge) => edge.from === agent.id && edge.type === "implements",
    )?.to ??
    graph.edges.find(
      (edge) => edge.from === agent.id && edge.to.startsWith("skill:"),
    )?.to
  );
}

/** The graph is a reference index, not a preload list. Difficulty sets a soft
 * size budget; it does not activate conditional workflows or specialists.
 */
export function resolveContextBundle(
  agentId: string,
  difficulty: Difficulty,
  cwd: string = process.cwd(),
  options: {
    /** Compatibility option; all context resolution now uses the graph. */
    graph?: boolean;
    vendor?: string;
    maxTokens?: number;
    requestedResources?: string[];
  } = {},
): ContextBundle {
  const graph = buildGraph(cwd, { includeChecks: false });
  const seed = entrySkill(graph, agentId, cwd);
  if (!seed)
    return { difficulty, resources: [], skipped: [], estimatedTokens: 0 };
  const entry = graph.nodes.find((node) => node.id === seed)?.paths?.[0];
  if (!entry || !fs.existsSync(path.join(cwd, entry)))
    throw new Error(`Missing entry skill for ${agentId}`);
  const skillDir = `${path.posix.dirname(entry)}/`;
  const directRefs = new Set(
    graph.edges.filter((edge) => edge.from === seed).map((edge) => edge.to),
  );
  const selected = selectGraph(graph, [seed], "dependencies");
  const references = [
    ...new Set(
      selected.nodes
        .filter(
          (node) =>
            node.id !== seed &&
            (node.category === "resource" ||
              (node.category === "shared" && directRefs.has(node.id))),
        )
        .flatMap((node) => node.paths ?? [])
        .filter(
          (file) =>
            (file.startsWith(skillDir) ||
              file.startsWith(".agents/skills/_shared/")) &&
            file.endsWith(".md") &&
            !file.includes("/execution-protocols/") &&
            !file.endsWith("/execution-policy.md") &&
            !file.endsWith("/result-contract.md"),
        ),
    ),
  ].sort();
  const resources = [entry];
  const budget =
    options.maxTokens ??
    { Simple: 1500, Medium: 4000, Complex: 8000 }[difficulty];
  let estimatedTokens = estimateFileTokens(path.join(cwd, entry));
  for (const file of new Set(options.requestedResources ?? [])) {
    if (!references.includes(file))
      throw new Error(`${file} is not a reference of ${agentId}`);
    const cost = estimateFileTokens(path.join(cwd, file));
    if (estimatedTokens + cost <= budget) {
      resources.push(file);
      estimatedTokens += cost;
    }
  }
  return {
    difficulty,
    resources,
    skipped: references.filter((file) => !resources.includes(file)),
    estimatedTokens,
    budgetExceeded: estimatedTokens > budget,
  };
}

export function loadGraphContext(
  agentId: string,
  difficulty: Difficulty,
  root: string,
): string {
  const bundle = resolveContextBundle(agentId, difficulty, root);
  if (!bundle.resources.length) return "";
  const files = bundle.resources.map(
    (file) =>
      `### ${file}\n${fs.readFileSync(path.resolve(root, file), "utf8")}`,
  );
  const budgetNote = bundle.budgetExceeded
    ? "\nThe entry skill exceeds the soft context budget and was retained in full. Load further references only when needed."
    : "";
  return `## Task context (graph-selected, approximately ${bundle.estimatedTokens} tokens)\n${files.join("\n\n")}${budgetNote}\nDeferred references (read only when the task meets their loading condition): ${bundle.skipped.join(", ") || "none"}`;
}
