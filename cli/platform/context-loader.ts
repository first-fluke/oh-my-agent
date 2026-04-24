import fs from "node:fs";
import path from "node:path";

// =============================================================================
// context-loader.ts
//
// Programmatic enforcement of the difficulty-adaptive context loading policy
// defined in .agents/skills/_shared/core/context-loading.md and difficulty-guide.md.
//
// Resource mapping rationale
// --------------------------
// context-loading.md is advisory rather than exhaustive — it does not enumerate
// exact file paths for Simple/Medium/Complex tiers.  The mapping below is derived
// from the "Loading Based on Difficulty" section (lines 16-9) of that document
// combined with the protocol branching table in difficulty-guide.md:
//
//   Simple  → Fast Track: skip analysis, skip common-checklist, minimal verify
//   Medium  → Standard Protocol: examples + clarification
//   Complex → Extended Protocol: sprint-based, full common-checklist, error playbook
//
// The CORE_SHARED_DIR constant points to the _shared/core directory that owns
// all shared context resources.  Rules files in .agents/rules/ are included for
// Medium+ because difficulty-guide.md calls for "relevant rules" at that level.
// =============================================================================

export type Difficulty = "Simple" | "Medium" | "Complex";

export interface ContextBundle {
  /** Classified difficulty level for this context resolution */
  difficulty: Difficulty;
  /** Ordered list of resource paths relative to the repository root */
  resources: string[];
  /** Resources intentionally omitted for this difficulty level */
  skipped: string[];
  /** Rough word-count based token estimate for metrics (missing files counted as 0) */
  estimatedTokens: number;
}

// ---------------------------------------------------------------------------
// Resource manifests per difficulty tier
// Paths are relative to the repository root.
// ---------------------------------------------------------------------------

/**
 * Simple tier: minimal quality/structure docs only.
 * Skips heavy references (checklist, error-playbook, lessons-learned, etc.)
 * to reduce context window usage.
 */
const SIMPLE_RESOURCES = [
  ".agents/skills/_shared/core/quality-principles.md",
  ".agents/skills/_shared/core/prompt-structure.md",
];

/**
 * Medium tier: everything in Simple + clarification protocol,
 * reasoning templates, and the relevant rules files.
 */
const MEDIUM_EXTRA_RESOURCES = [
  ".agents/skills/_shared/core/clarification-protocol.md",
  ".agents/skills/_shared/core/reasoning-templates.md",
  // Rules loaded for Medium+ — agents need coding conventions at this level
  ".agents/rules/backend.md",
  ".agents/rules/quality.md",
];

/**
 * Complex tier: everything in Medium + heavy reference docs required for
 * sprint-based extended protocol (difficulty-guide.md Complex → Extended Protocol).
 */
const COMPLEX_EXTRA_RESOURCES = [
  ".agents/skills/_shared/core/context-budget.md",
  ".agents/skills/_shared/core/common-checklist.md",
  ".agents/skills/_shared/core/lessons-learned.md",
  // error-playbook is agent-skill-local; fall back to the backend one if present
  ".agents/skills/oma-backend/resources/error-playbook.md",
];

// ---------------------------------------------------------------------------
// classifyDifficulty
// ---------------------------------------------------------------------------

/**
 * Keywords whose presence in a task description signals Complex difficulty.
 * Documented here so T16 (CHARTER_CHECK skip-on-Simple) can reference the same
 * list when deciding whether to emit a full CHARTER_CHECK block.
 */
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

// ---------------------------------------------------------------------------
// resolveContextBundle
// ---------------------------------------------------------------------------

/**
 * Estimate token count from file contents using a word-count heuristic.
 * Returns 0 gracefully for files that do not exist or cannot be read.
 * (Pure function in terms of side effects on program state — it reads from
 * the filesystem but does not mutate any module-level state.)
 */
function estimateFileTokens(absolutePath: string): number {
  try {
    const content = fs.readFileSync(absolutePath, "utf-8");
    // Approximation: 1 token ≈ 0.75 words (standard GPT tokenizer ratio)
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
    return Math.ceil(wordCount / 0.75);
  } catch {
    // Missing or unreadable file — return 0 and continue (AC requirement)
    return 0;
  }
}

/**
 * Build the ordered resource list and skipped list for a given difficulty.
 * Returns paths relative to the repository root (not absolute).
 */
function buildResourceLists(difficulty: Difficulty): {
  resources: string[];
  skipped: string[];
} {
  const allPossibleResources = [
    ...SIMPLE_RESOURCES,
    ...MEDIUM_EXTRA_RESOURCES,
    ...COMPLEX_EXTRA_RESOURCES,
  ];

  let resources: string[];

  switch (difficulty) {
    case "Simple":
      resources = [...SIMPLE_RESOURCES];
      break;
    case "Medium":
      resources = [...SIMPLE_RESOURCES, ...MEDIUM_EXTRA_RESOURCES];
      break;
    case "Complex":
      resources = [
        ...SIMPLE_RESOURCES,
        ...MEDIUM_EXTRA_RESOURCES,
        ...COMPLEX_EXTRA_RESOURCES,
      ];
      break;
  }

  const resourceSet = new Set(resources);
  const skipped = allPossibleResources.filter((r) => !resourceSet.has(r));

  return { resources, skipped };
}

/**
 * Resolve a difficulty-appropriate context bundle for an agent.
 *
 * Pure function — no side effects on module state. File reads only occur
 * during estimatedTokens computation and are handled gracefully for missing
 * files (returns 0 for that file, does not throw).
 *
 * @param agentId   - Identifier for the agent (reserved for future per-agent
 *                    resource overrides; not used in the current implementation).
 * @param difficulty - Pre-classified or user-supplied difficulty level.
 * @param cwd       - Repository root used to resolve absolute paths for token
 *                    estimation. Defaults to process.cwd().
 */
export function resolveContextBundle(
  _agentId: string,
  difficulty: Difficulty,
  cwd: string = process.cwd(),
): ContextBundle {
  const { resources, skipped } = buildResourceLists(difficulty);

  const estimatedTokens = resources.reduce((total, relPath) => {
    const absolutePath = path.resolve(cwd, relPath);
    return total + estimateFileTokens(absolutePath);
  }, 0);

  return {
    difficulty,
    resources,
    skipped,
    estimatedTokens,
  };
}
