import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadTriggerCorpus } from "./triggers-corpus.js";
import { detectAll, detectOne } from "./triggers-detect.js";
import { scoreDetections } from "./triggers-score.js";

// End-to-end: drives the REAL keyword-detector.run() (no mocks) against a
// small, hand-picked mini-corpus covering a positive, a hard negative, and a
// clean negative in both en and ko. Fully deterministic — zero LLM calls.

let scratchFiles: string[] = [];

afterEach(() => {
  for (const dir of scratchFiles) rmSync(dir, { recursive: true, force: true });
  scratchFiles = [];
});

function writeMiniCorpus(): string {
  const dir = mkdtempSync(join(tmpdir(), "oma-verify-triggers-fixture-"));
  scratchFiles.push(dir);
  const path = join(dir, "mini-corpus.json");
  writeFileSync(
    path,
    JSON.stringify([
      {
        prompt: "Review my code before I open the PR.",
        lang: "en",
        expected: "review",
      },
      {
        prompt: "이 PR 리뷰해줘.",
        lang: "ko",
        expected: "review",
      },
      {
        prompt: "I read the ralph.md file to understand the workflow.",
        lang: "en",
        expected: null,
        note: "artifact reference, not a run request",
      },
      {
        prompt: "What's the capital of France?",
        lang: "en",
        expected: null,
      },
      {
        prompt: "오늘 날씨 어때?",
        lang: "ko",
        expected: null,
      },
    ]),
  );
  return path;
}

describe("triggers end-to-end (real keyword-detector, mini-corpus)", () => {
  it("detects a genuine English review request", async () => {
    const outcome = await detectOne({
      prompt: "Review my code before I open the PR.",
      lang: "en",
      expected: "review",
    });
    expect(outcome.detected).toBe("review");
    expect(outcome.matchedKeyword).toBeTruthy();
  });

  it("detects a genuine Korean review request", async () => {
    const outcome = await detectOne({
      prompt: "이 PR 리뷰해줘.",
      lang: "ko",
      expected: "review",
    });
    expect(outcome.detected).toBe("review");
  });

  it("suppresses a ralph.md artifact reference (RC3 technical-reference guard)", async () => {
    const outcome = await detectOne({
      prompt: "I read the ralph.md file to understand the workflow.",
      lang: "en",
      expected: null,
    });
    expect(outcome.detected).toBeNull();
  });

  it("does not fire on ordinary chit-chat", async () => {
    const outcome = await detectOne({
      prompt: "What's the capital of France?",
      lang: "en",
      expected: null,
    });
    expect(outcome.detected).toBeNull();
  });

  it("runs a full corpus file end-to-end and scores it with zero missed/false fires", async () => {
    const corpusPath = writeMiniCorpus();
    const entries = loadTriggerCorpus(corpusPath);
    expect(entries).toHaveLength(5);

    const outcomes = await detectAll(entries);
    const report = scoreDetections(
      outcomes.map((o) => ({
        prompt: o.entry.prompt,
        lang: o.entry.lang,
        expected: o.entry.expected,
        detected: o.detected,
        matchedKeyword: o.matchedKeyword,
        note: o.entry.note,
      })),
    );

    expect(report.totals.total).toBe(5);
    expect(report.totals.positives).toBe(2);
    expect(report.totals.negatives).toBe(3);
    expect(report.totals.missedFires).toBe(0);
    expect(report.totals.falseFires).toBe(0);
    expect(
      report.perWorkflow.find((w) => w.workflow === "review"),
    ).toMatchObject({
      support: 2,
      truePositives: 2,
      recall: 1,
    });
  });

  it("keeps L1 session writes out of the caller's OMA_STATE_HOME and restores it", async () => {
    // A positive detection activates an L1 session. `oma verify triggers`
    // used to leave one orphaned session per positive in the user's real
    // ~/.oma profile; detectAll now redirects the state home for the run.
    const previous = process.env.OMA_STATE_HOME;
    const callerHome = mkdtempSync(join(tmpdir(), "oma-verify-caller-home-"));
    scratchFiles.push(callerHome);
    process.env.OMA_STATE_HOME = callerHome;
    try {
      const outcomes = await detectAll([
        {
          prompt: "Review my code before I open the PR.",
          lang: "en",
          expected: "review",
        },
      ]);
      expect(outcomes[0]?.detected).toBe("review");
      expect(process.env.OMA_STATE_HOME).toBe(callerHome);
      expect(readdirSync(callerHome)).toEqual([]);
    } finally {
      process.env.OMA_STATE_HOME = previous;
    }
  });

  it("detects reproduced false positives as non-triggering under language: ko", async () => {
    for (const prompt of ["fix the network timeout", "계속해"]) {
      const outcome = await detectOne({ prompt, lang: "ko", expected: null });
      expect(outcome.detected, prompt).toBeNull();
    }
    const preview = await detectOne({
      prompt: "preview 페이지 레이아웃 고쳐줘",
      lang: "ko",
      expected: "debug",
    });
    expect(preview.detected).toBe("debug");
  });

  it("keeps corpus entries isolated (no reinforcement-suppression leakage across entries)", async () => {
    // Regression: if all entries shared one scratch dir, the 3rd+ trigger of
    // the same workflow within 60s would be reinforcement-suppressed and
    // wrongly look like a missed-fire. Running the same workflow's keyword
    // three times in a row must succeed all three times.
    const prompt = "Review my code before I open the PR.";
    const results = await Promise.all([
      detectOne({ prompt, lang: "en", expected: "review" }),
      detectOne({ prompt, lang: "en", expected: "review" }),
      detectOne({ prompt, lang: "en", expected: "review" }),
    ]);
    for (const r of results) {
      expect(r.detected).toBe("review");
    }
  });
});
