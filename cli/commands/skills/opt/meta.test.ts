import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  bootstrapMeanInterval,
  buildLlmMetaProposer,
  candidatesFromEdits,
  decideCandidate,
  type InnerRunner,
  type InnerRunOutcome,
  mulberry32,
  type ProcedureCandidate,
  procedurePromotionsLog,
  runMetaOptimization,
} from "./meta.js";
import {
  CONSTITUTION_FILE,
  DEFAULT_OPTIMIZER_TEMPLATE,
  EVOLUTION_DIR,
  loadEvolutionProcedure,
} from "./procedure.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-meta-"));
  roots.push(root);
  return root;
}

const candidate = (template: string): ProcedureCandidate => ({
  target: "optimizer",
  template,
  hash: template.length.toString(16).padStart(16, "0"),
  origin: "proposed",
  edits: [],
});

const run = (
  skill: string,
  repeat: number,
  gain: number,
  status: InnerRunOutcome["status"] = "completed",
): InnerRunOutcome => ({
  skill,
  repeat,
  procedureHash: "p",
  status,
  baselineLift: 0,
  finalLift: gain,
  gain,
  promotionEligible: gain > 0,
  acceptedEdits: gain > 0 ? 1 : 0,
});

describe("bootstrap interval", () => {
  it("is deterministic for a seed and null below two values", () => {
    expect(mulberry32(1)()).toBe(mulberry32(1)());
    expect(bootstrapMeanInterval([0.2])).toBeNull();
    const a = bootstrapMeanInterval([0.1, 0.3, 0.2, 0.4, 0.25]);
    const b = bootstrapMeanInterval([0.1, 0.3, 0.2, 0.4, 0.25]);
    expect(a).toEqual(b);
    expect(a?.lower).toBeGreaterThan(0);
    expect(a?.upper).toBeLessThanOrEqual(0.4);
    const wide = bootstrapMeanInterval([-0.5, 0.5, -0.4, 0.4]);
    expect(wide?.lower).toBeLessThan(0);
    expect(wide?.upper).toBeGreaterThan(0);
  });
});

describe("candidate decision", () => {
  const baseline = [
    run("a", 0, 0.1),
    run("a", 1, 0.1),
    run("a", 2, 0.1),
    run("b", 0, 0.0),
    run("b", 1, 0.0),
    run("b", 2, 0.0),
  ];

  it("promotes a candidate whose paired interval sits above zero", () => {
    const better = [
      run("a", 0, 0.3),
      run("a", 1, 0.3),
      run("a", 2, 0.25),
      run("b", 0, 0.2),
      run("b", 1, 0.15),
      run("b", 2, 0.2),
    ];
    const decision = decideCandidate(candidate("x"), baseline, better);
    expect(decision.decision).toBe("promote");
    expect(decision.pairs).toBe(6);
    expect(decision.ci95?.lower).toBeGreaterThan(0);
    expect(decision.reasons).toEqual(["paired-ci-above-zero"]);
  });

  it("rejects a candidate that regresses a skill the current procedure improved", () => {
    const shifted = [
      run("a", 0, 0.0),
      run("a", 1, 0.0),
      run("a", 2, 0.0),
      run("b", 0, 0.5),
      run("b", 1, 0.5),
      run("b", 2, 0.5),
    ];
    const decision = decideCandidate(candidate("y"), baseline, shifted);
    expect(decision.decision).toBe("reject");
    expect(decision.regressions).toEqual(["a"]);
  });

  it("is inconclusive with too few pairs or an interval that includes zero", () => {
    const few = decideCandidate(candidate("z"), baseline, [
      run("a", 0, 0.5),
      run("b", 0, 0.5),
    ]);
    expect(few.decision).toBe("inconclusive");
    expect(few.reasons[0]).toMatch(/insufficient-pairs:2<3/);
    const noisy = decideCandidate(candidate("w"), baseline, [
      run("a", 0, 0.4),
      run("a", 1, 0.1),
      run("a", 2, 0.1),
      run("b", 0, 0.0),
      run("b", 1, 0.3),
      run("b", 2, 0.0),
    ]);
    expect(noisy.decision).toBe("inconclusive");
    expect(noisy.reasons).toEqual(["paired-ci-includes-zero"]);
    const failed = decideCandidate(candidate("v"), baseline, [
      run("a", 0, 0.9, "failed"),
      run("a", 1, 0.9, "failed"),
      run("a", 2, 0.9, "failed"),
    ]);
    expect(failed.pairs).toBe(0);
    expect(failed.decision).toBe("inconclusive");
  });
});

describe("procedure candidates", () => {
  it("keeps only edits that apply and preserve required placeholders", () => {
    const template = DEFAULT_OPTIMIZER_TEMPLATE;
    const candidates = candidatesFromEdits(
      "optimizer",
      template,
      [
        {
          op: "add",
          anchor: "Rules:",
          after: "\n- Prefer edits that add a concrete command",
        },
        { op: "delete", anchor: "{{findings}}" },
        { op: "replace", anchor: "not in template", after: "x" },
        {
          op: "add",
          anchor: "Rules:",
          after: "\n- Prefer edits that add a concrete command",
        },
        { op: "add", anchor: "Rules:", after: "\n- Cite the task id" },
        { op: "add", anchor: "Rules:", after: "\n- One more" },
      ],
      2,
    );
    expect(candidates).toHaveLength(2);
    expect(candidates[0]?.template).toContain(
      "- Prefer edits that add a concrete command",
    );
    expect(candidates[1]?.template).toContain("- Cite the task id");
    expect(candidates.every((c) => c.template.includes("{{findings}}"))).toBe(
      true,
    );
  });

  it("parses EDIT lines from the proposer and honours NO_ACTION", () => {
    const seen: string[] = [];
    const proposer = buildLlmMetaProposer((text) => {
      seen.push(text);
      return 'EDIT: {"op":"add","anchor":"Rules:","after":"\\n- Ground edits in a failing task"}';
    });
    const result = proposer({
      target: "optimizer",
      template: DEFAULT_OPTIMIZER_TEMPLATE,
      diagnostics: {
        runs: 3,
        failed: 0,
        meanGain: 0.1,
        eligibleRuns: 1,
        acceptedEdits: 2,
      },
      candidates: 2,
    });
    expect(result).toHaveLength(1);
    expect(seen[0]).toContain("Inner-loop diagnostics");
    expect(seen[0]).toContain('"meanGain": 0.1');
    const none = buildLlmMetaProposer(() => "NO_ACTION")({
      target: "maintainer",
      template: "x {{evidence}} {{priorFacts}}",
      diagnostics: {
        runs: 0,
        failed: 0,
        meanGain: 0,
        eligibleRuns: 0,
        acceptedEdits: 0,
      },
      candidates: 1,
    });
    expect(none).toEqual([]);
  });
});

describe("meta-optimization run", () => {
  function fakeRunner(gainFor: (template: string, skill: string) => number): {
    runner: InnerRunner;
    requests: Array<{ skill: string; repeat: number; hash: string }>;
  } {
    const requests: Array<{ skill: string; repeat: number; hash: string }> = [];
    const runner: InnerRunner = async (request) => {
      requests.push({
        skill: request.skill,
        repeat: request.repeat,
        hash: request.procedureHash,
      });
      const gain = gainFor(request.optimizerTemplate, request.skill);
      return {
        skill: request.skill,
        repeat: request.repeat,
        procedureHash: request.procedureHash,
        status: "completed",
        baselineLift: 0,
        finalLift: gain,
        gain,
        promotionEligible: gain > 0,
        acceptedEdits: gain > 0 ? 1 : 0,
      };
    };
    return { runner, requests };
  }

  it("runs the current procedure and every candidate on each skill and repeat, then applies the winner with lineage", async () => {
    const root = workspace();
    const procedure = loadEvolutionProcedure(root);
    const { runner, requests } = fakeRunner((template, skill) =>
      template.includes("BETTER") ? (skill === "a" ? 0.4 : 0.3) : 0.1,
    );
    const report = await runMetaOptimization({
      workspace: root,
      procedure,
      target: "optimizer",
      skills: ["a", "b"],
      anchors: ["anchor"],
      repeats: 2,
      candidateCount: 2,
      budget: { maxEpochs: 1, editsPerEpoch: 3 },
      proposer: ({ template }) =>
        candidatesFromEdits(
          "optimizer",
          template,
          [
            { op: "add", anchor: "Rules:", after: "\n- BETTER grounding" },
            { op: "add", anchor: "Rules:", after: "\n- neutral wording" },
          ],
          2,
        ),
      innerRunner: runner,
      apply: true,
    });
    // 2 skills × 2 repeats × (current + 2 candidates) + anchor: current + winner
    expect(requests).toHaveLength(14);
    expect(new Set(requests.map((r) => r.hash)).size).toBe(3);
    expect(report.candidates.map((c) => c.decision)).toEqual([
      "promote",
      "inconclusive",
    ]);
    expect(report.winner?.candidate.template).toContain("BETTER grounding");
    expect(report.anchorCheck?.winner[0]?.gain).toBe(0.3);
    expect(report.applied?.path).toBe(`${EVOLUTION_DIR}/optimizer.md`);
    const written = readFileSync(
      join(root, report.applied?.path ?? ""),
      "utf-8",
    );
    expect(written).toContain("BETTER grounding");
    expect(existsSync(join(root, report.applied?.backupPath ?? ""))).toBe(true);
    expect(
      readFileSync(join(root, report.applied?.patchPath ?? ""), "utf-8"),
    ).toContain("+- BETTER grounding");
    const log = readFileSync(procedurePromotionsLog(root), "utf-8")
      .trim()
      .split("\n");
    expect(log).toHaveLength(1);
    expect(JSON.parse(log[0] ?? "{}")).toMatchObject({
      action: "apply",
      target: "optimizer",
      candidateHash: report.winner?.candidate.hash,
      constitutionHash: procedure.constitution.hash,
      evidence: { skills: ["a", "b"], repeats: 2 },
    });
    // The applied procedure is what the next load reads.
    expect(loadEvolutionProcedure(root).optimizer.hash).toBe(
      report.winner?.candidate.hash,
    );
  });

  it("writes nothing on a dry run or when no candidate is promotable", async () => {
    const root = workspace();
    const procedure = loadEvolutionProcedure(root);
    const { runner } = fakeRunner(() => 0.1);
    const report = await runMetaOptimization({
      workspace: root,
      procedure,
      target: "optimizer",
      skills: ["a"],
      repeats: 3,
      budget: { maxEpochs: 1, editsPerEpoch: 3 },
      proposer: ({ template }) =>
        candidatesFromEdits(
          "optimizer",
          template,
          [{ op: "add", anchor: "Rules:", after: "\n- same" }],
          1,
        ),
      innerRunner: runner,
      apply: true,
    });
    expect(report.winner).toBeNull();
    expect(report.candidates[0]?.decision).toBe("inconclusive");
    expect(report.applied).toBeNull();
    expect(existsSync(join(root, EVOLUTION_DIR, "optimizer.md"))).toBe(false);
  });

  it("refuses to apply a target the constitution does not open to meta-optimization", async () => {
    const root = workspace();
    mkdirSync(join(root, EVOLUTION_DIR), { recursive: true });
    writeFileSync(
      join(root, EVOLUTION_DIR, CONSTITUTION_FILE),
      `schema_version: 1\nimmutable: ["${EVOLUTION_DIR}/${CONSTITUTION_FILE}"]\nmeta_targets: [maintainer]\n`,
    );
    const procedure = loadEvolutionProcedure(root);
    const { runner } = fakeRunner((template) =>
      template.includes("BETTER") ? 0.5 : 0.1,
    );
    await expect(
      runMetaOptimization({
        workspace: root,
        procedure,
        target: "optimizer",
        skills: ["a"],
        repeats: 3,
        budget: { maxEpochs: 1, editsPerEpoch: 3 },
        proposer: ({ template }) =>
          candidatesFromEdits(
            "optimizer",
            template,
            [{ op: "add", anchor: "Rules:", after: "\n- BETTER" }],
            1,
          ),
        innerRunner: runner,
        apply: true,
      }),
    ).rejects.toThrow(/does not list optimizer in meta_targets/);
    expect(existsSync(join(root, EVOLUTION_DIR, "optimizer.md"))).toBe(false);
  });
});
