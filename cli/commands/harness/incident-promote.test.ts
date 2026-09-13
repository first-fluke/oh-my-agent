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
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml } from "yaml";
import { runHarnessFeedback } from "./feedback.js";
import { captureHarnessIncident } from "./incident.js";
import {
  listUnpromotedIncidents,
  promoteHarnessIncident,
  readIncidentPromotion,
  resolveIncidentSkill,
} from "./incident-promote.js";

const roots: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-promote-"));
  roots.push(root);
  mkdirSync(join(root, ".agents", "skills", "oma-scm"), { recursive: true });
  writeFileSync(
    join(root, ".agents", "skills", "oma-scm", "SKILL.md"),
    "---\nname: oma-scm\ndescription: scm\n---\n\nUse --force-with-lease.\n",
  );
  mkdirSync(join(root, ".agents", "agents"), { recursive: true });
  writeFileSync(
    join(root, ".agents", "agents", "docs-curator.md"),
    "---\nname: docs-curator\nskills:\n  - oma-docs\n---\n",
  );
  mkdirSync(join(root, ".agents", "eval", "oma-scm"), { recursive: true });
  writeFileSync(
    join(root, ".agents", "eval", "oma-scm", "existing.yaml"),
    "id: oma-scm-existing\nskill: oma-scm\ndomain: scm\nprompt: p\nchecker:\n  type: assert\n  expect_contains: [x]\nweight: 1\n",
  );
  return root;
}

function capture(
  root: string,
  id: string,
  patch: Record<string, unknown> = {},
): void {
  const specPath = join(root, `${id}.json`);
  writeFileSync(
    specPath,
    JSON.stringify({
      schema_version: 1,
      id,
      summary: "Answer omitted the required push flag",
      prompt: "Which push flag do you use after an approved rewrite?",
      agent: "scm",
      observed: {
        failure: "No force-with-lease in the answer",
        output: "Use git push --force.",
        exit_code: 0,
      },
      expected_checks: [{ type: "output_contains", value: "force-with-lease" }],
      dependencies: [],
      ...patch,
    }),
  );
  captureHarnessIncident(root, specPath);
}

describe("incident promotion", () => {
  it("attributes an incident to the agent's declared skill or the oma-<agent> skill", () => {
    const root = workspace();
    expect(resolveIncidentSkill(root, "docs-curator")).toBe("oma-docs");
    expect(resolveIncidentSkill(root, "scm")).toBe("oma-scm");
    expect(resolveIncidentSkill(root, "nobody")).toBeUndefined();
  });

  it("derives an assert fixture from output_contains checks and validates it against the observed output", async () => {
    const root = workspace();
    capture(root, "push-flag");
    expect(listUnpromotedIncidents(root).map((i) => i.id)).toEqual([
      "push-flag",
    ]);
    const { promotion, fixture } = await promoteHarnessIncident({
      root,
      id: "push-flag",
    });
    expect(promotion).toMatchObject({
      skill: "oma-scm",
      derivation: "assert",
      validatedAgainstObserved: true,
      fixturePath: ".agents/eval/oma-scm/incident-push-flag.yaml",
    });
    expect(fixture).toMatchObject({
      id: "oma-scm-incident-push-flag",
      domain: "scm",
      group: "incident-push-flag",
      checker: { type: "assert", expect_contains: ["force-with-lease"] },
    });
    const written = parseYaml(
      readFileSync(join(root, promotion.fixturePath), "utf-8"),
    );
    expect(written).toMatchObject({ id: "oma-scm-incident-push-flag" });
    expect(readIncidentPromotion(root, "push-flag")?.fixtureId).toBe(
      "oma-scm-incident-push-flag",
    );
    expect(listUnpromotedIncidents(root)).toEqual([]);
    await expect(
      promoteHarnessIncident({ root, id: "push-flag" }),
    ).rejects.toThrow(/already promoted/);
  });

  it("refuses a fixture the observed failure already passes", async () => {
    const root = workspace();
    capture(root, "not-a-regression", {
      observed: {
        failure: "x",
        output: "Use git push --force-with-lease.",
        exit_code: 0,
      },
    });
    await expect(
      promoteHarnessIncident({ root, id: "not-a-regression" }),
    ).rejects.toThrow(/already satisfies/);
    expect(
      existsSync(
        join(
          root,
          ".agents",
          "eval",
          "oma-scm",
          "incident-not-a-regression.yaml",
        ),
      ),
    ).toBe(false);
  });

  it("drafts a judge rubric for non-output checks and requires the observed output to fail it", async () => {
    const root = workspace();
    capture(root, "file-check", {
      expected_checks: [
        {
          type: "file_contains",
          path: "docs/push.md",
          value: "force-with-lease",
        },
      ],
    });
    await expect(
      promoteHarnessIncident({ root, id: "file-check" }),
    ).rejects.toThrow(/--draft/);
    const drafter = vi.fn(
      (_prompt: string) =>
        "PASS only if the answer names --force-with-lease. FAIL if it uses --force.",
    );
    const passingJudge = vi.fn(() => "PASS");
    await expect(
      promoteHarnessIncident({
        root,
        id: "file-check",
        drafter,
        judge: passingJudge,
      }),
    ).rejects.toThrow(/passes the observed failing output/);
    const failingJudge = vi.fn(() => "FAIL");
    const { promotion, fixture } = await promoteHarnessIncident({
      root,
      id: "file-check",
      drafter,
      judge: failingJudge,
    });
    expect(promotion).toMatchObject({
      derivation: "judge-draft",
      validatedAgainstObserved: true,
    });
    expect(fixture.checker).toMatchObject({
      type: "judge",
      rubric: expect.stringMatching(/^PASS only if/),
    });
    expect(drafter.mock.calls[0]?.[0]).toContain("file_contains");
  });

  it("runs the feedback chain: promote, then optimize each affected skill, and writes a report", async () => {
    const root = workspace();
    capture(root, "one");
    capture(root, "two", {
      observed: {
        failure: "x",
        output: "Use git push --force-with-lease.",
        exit_code: 0,
      },
    });
    const optimizer = vi.fn(async (skill: string) => ({
      skill,
      baselineLift: 0.5,
      finalLift: 0.5,
      baselineTrainLift: 0.4,
      finalTrainLift: 0.6,
      epochs: [],
      acceptedEdits: [{ op: "add" as const, anchor: "Use", after: " lease" }],
      rejectedCount: 0,
      finalSkillMd: "",
      diff: "+ lease",
      applied: false,
      finalTest: { baselineLift: 0, candidateLift: 0, passed: true },
      promotion: { eligible: true, reasons: [] },
    }));
    const report = await runHarnessFeedback({
      root,
      optimize: true,
      optimizer,
    });
    expect(report.promoted.map((p) => p.incidentId)).toEqual(["one"]);
    expect(report.skipped).toEqual([
      { incidentId: "two", reason: expect.stringMatching(/already satisfies/) },
    ]);
    expect(optimizer).toHaveBeenCalledWith("oma-scm");
    expect(report.skills).toEqual([
      expect.objectContaining({
        skill: "oma-scm",
        incidents: ["one"],
        status: "optimized",
        result: expect.objectContaining({ acceptedEdits: [expect.anything()] }),
      }),
    ]);
    expect(report.reportPath).toMatch(
      /^\.agents\/results\/feedback\/feedback-.*\.json$/,
    );
    expect(existsSync(join(root, report.reportPath as string))).toBe(true);
  });
});
