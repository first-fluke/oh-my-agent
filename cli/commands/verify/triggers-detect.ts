import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// keyword-detector.run() is the single logic source the real hooks call
// (see cli/commands/hook/dispatch.ts HANDLER_REGISTRY) — importing it here
// exercises the exact same decision path a live UserPromptSubmit hook would,
// with zero LLM calls (pure regex/config matching).
import * as keywordDetector from "../../../.agents/hooks/core/keyword-detector.js";
import triggersConfig from "../../../.agents/hooks/core/triggers.json" with {
  type: "json",
};
import type { TriggerCorpusEntry } from "./triggers-corpus.js";

interface WorkflowDef {
  persistent: boolean;
  keywords: Record<string, string[]>;
  patterns?: Record<string, string[]>;
}

interface TriggersJson {
  workflows: Record<string, WorkflowDef>;
  cjkScripts: string[];
}

const CONFIG = triggersConfig as unknown as TriggersJson;

export interface DetectionOutcome {
  entry: TriggerCorpusEntry;
  /** Workflow name the detector actually activated, or null if none fired. */
  detected: string | null;
  /** Best-effort matched keyword/pattern text, only set when detected !== null. */
  matchedKeyword: string | null;
}

const WORKFLOW_TAG_RE = /\[OMA WORKFLOW: ([A-Z0-9_-]+)\]/;

function extractWorkflow(
  result: Awaited<ReturnType<typeof keywordDetector.run>>,
): string | null {
  if (result?.type !== "context") return null;
  const match = WORKFLOW_TAG_RE.exec(result.additionalContext);
  return match?.[1] ? match[1].toLowerCase() : null;
}

/**
 * Re-derive which keyword/pattern text caused a fire, by rebuilding the exact
 * same pattern set run() used (buildPatterns/buildRawPatterns are the SSOT for
 * pattern construction) and re-testing them against the cleaned prompt. This
 * is best-effort attribution for the "worst offenders" report — run()'s
 * public HandlerResult contract does not expose the matched span itself.
 */
function findMatchedKeyword(
  entry: TriggerCorpusEntry,
  workflow: string,
): string | null {
  const def = CONFIG.workflows[workflow];
  if (!def) return null;
  const cleaned = keywordDetector.normalizeForMatching(
    keywordDetector.stripSystemEchoes(
      keywordDetector.stripCodeBlocks(entry.prompt),
    ),
  );
  const patterns = [
    ...keywordDetector.buildPatterns(
      def.keywords,
      entry.lang,
      CONFIG.cjkScripts,
    ),
    ...keywordDetector.buildRawPatterns(def.patterns),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(cleaned);
    if (match) return match[0].trim();
  }
  return null;
}

/**
 * Run the keyword detector against one corpus entry in an isolated scratch
 * project directory. Each entry gets its own fresh directory so:
 *  - `.agents/oma-config.yaml` can pin the language the entry was authored for
 *    (detectLanguage() reads this file; without it every entry would fall
 *    back to "en" and ko-only keyword banks would never be exercised).
 *  - the 60s/2-trigger reinforcement-suppression state (keyword-detector-state.json)
 *    and session index never leak between entries, which would otherwise
 *    make later positives for the same workflow look like false "misses".
 */
export async function detectOne(
  entry: TriggerCorpusEntry,
): Promise<DetectionOutcome> {
  const scratch = mkdtempSync(join(tmpdir(), "oma-verify-triggers-"));
  try {
    mkdirSync(join(scratch, ".agents"), { recursive: true });
    writeFileSync(
      join(scratch, ".agents", "oma-config.yaml"),
      `language: ${entry.lang}\n`,
    );
    const result = await keywordDetector.run(
      { kind: "prompt", prompt: entry.prompt, cwd: scratch },
      { vendor: "claude", cwd: scratch, sid: "verify-triggers-eval" },
    );
    const detected = extractWorkflow(result);
    const matchedKeyword = detected
      ? findMatchedKeyword(entry, detected)
      : null;
    return { entry, detected, matchedKeyword };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Run detection over an entire corpus, sequentially (deterministic, no shared state). */
export async function detectAll(
  entries: TriggerCorpusEntry[],
): Promise<DetectionOutcome[]> {
  const outcomes: DetectionOutcome[] = [];
  for (const entry of entries) {
    outcomes.push(await detectOne(entry));
  }
  return outcomes;
}
