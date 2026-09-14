import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { evolutionNoticeLines } from "../../.agents/hooks/core/evolution-notice.ts";
import { renderStateSnapshot } from "../../.agents/hooks/core/vendor-renderer.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-evolution-notice-"));
  roots.push(root);
  const skills = join(root, ".agents", "results", "skill-evolution");
  mkdirSync(join(skills, "oma-docs"), { recursive: true });
  mkdirSync(join(skills, "_procedure"), { recursive: true });
  writeFileSync(
    join(skills, "oma-docs", "promotions.jsonl"),
    `${JSON.stringify({
      schemaVersion: 1,
      ts: "2026-09-14T01:00:00.000Z",
      action: "apply",
      skillId: "oma-docs",
      parentHash: "aaaaaaaaaaaaaaaa",
      candidateHash: "bbbbbbbbbbbbbbbb",
      evidence: {
        baselineLift: 1,
        finalLift: 1,
        edits: [
          {
            op: "replace",
            anchor: "| Missing CLI | Report unavailable",
            after: "x",
          },
        ],
        gains: { train: [0.56, 0.78] },
      },
    })}\n`,
  );
  writeFileSync(
    join(skills, "_procedure", "promotions.jsonl"),
    `${JSON.stringify({
      schemaVersion: 1,
      ts: "2026-09-14T13:04:44.207Z",
      action: "apply",
      target: "optimizer",
      parentHash: "2333195563ef8865",
      candidateHash: "2c15f95ac1ce1467",
      evidence: { meanDiff: 0.2694, pairs: 5, skills: ["oma-docs", "oma-scm"] },
    })}\n`,
  );
  return root;
}

describe("evolution notice", () => {
  it("announces each promotion once and then stays quiet", () => {
    const root = project();
    const first = evolutionNoticeLines(root);
    expect(first).toEqual([
      '- 2026-09-14T01:00 oma-docs: replace "| Missing CLI | Report unavailable" (train 56%→78%, validation 100%→100%)',
      "- 2026-09-14T13:04 optimizer procedure 23331955 → 2c15f95a (mean gain diff +0.27, 5 pairs)",
    ]);
    expect(
      JSON.parse(
        readFileSync(
          join(root, ".agents", "state", "evolution-notice.json"),
          "utf-8",
        ),
      ),
    ).toEqual({ lastSeen: "2026-09-14T13:04:44.207Z" });
    expect(evolutionNoticeLines(root)).toEqual([]);
  });

  it("renders the notice in the session snapshot and nothing when empty", () => {
    const withNotice = renderStateSnapshot({
      vendor: "claude",
      sid: "s",
      reason: "vendor/session boundary",
      recentEvents: [],
      evolution: ["- 2026-09-14T13:04 optimizer procedure a → b"],
    });
    expect(withNotice).toContain("harness evolved since your last session");
    expect(withNotice).toContain("optimizer procedure a → b");
    const without = renderStateSnapshot({
      vendor: "claude",
      sid: "s",
      reason: "vendor/session boundary",
      recentEvents: [],
      evolution: [],
    });
    expect(without).not.toContain("harness evolved");
  });

  it("is silent for a project without lineage", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-evolution-none-"));
    roots.push(root);
    expect(evolutionNoticeLines(root)).toEqual([]);
  });
});
