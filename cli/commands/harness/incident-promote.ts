import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { AGENTS_DIR } from "../../constants/paths.js";
import { INSTALLED_SKILLS_DIR } from "../../constants/vendors.js";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import type {
  JudgeDispatchFn,
  TaskChecker,
  TaskFixture,
} from "../skills/eval.js";
import { judgeVerdict, loadTaskFixtures } from "../skills/eval.js";
import { type HarnessIncident, readHarnessIncident } from "./incident.js";

/**
 * Deployment feedback, second link: a captured incident becomes a skill
 * regression fixture without a human writing the fixture.
 *
 * The incident already carries the prompt, the observed failing output, and
 * the acceptance checks. Output-level checks translate mechanically; checks
 * the skill evaluator cannot run (files, commands) are turned into a judge
 * rubric drafted by a model. Either way the fixture is admitted only when the
 * recorded failing output fails it: a fixture the failure already passes is
 * not a regression case, it is noise.
 */

export interface IncidentPromotion {
  schemaVersion: 1;
  ts: string;
  incidentId: string;
  skill: string;
  fixturePath: string;
  fixtureId: string;
  derivation: "assert" | "regex" | "judge" | "judge-draft";
  validatedAgainstObserved: boolean;
  limitations: string[];
}

export type RubricDrafter = (prompt: string) => string | Promise<string>;

export function promotionPath(root: string, incidentId: string): string {
  return join(
    root,
    AGENTS_DIR,
    "results",
    "incidents",
    incidentId,
    "promotion.json",
  );
}

export function readIncidentPromotion(
  root: string,
  incidentId: string,
): IncidentPromotion | undefined {
  const path = promotionPath(root, incidentId);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf-8")) as IncidentPromotion;
}

/** Captured incidents that no fixture has been derived from yet. */
export function listUnpromotedIncidents(root: string): HarnessIncident[] {
  const dir = join(root, AGENTS_DIR, "results", "incidents");
  if (!existsSync(dir)) return [];
  const incidents: HarnessIncident[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!existsSync(join(dir, entry.name, "incident.json"))) continue;
    if (existsSync(join(dir, entry.name, "promotion.json"))) continue;
    try {
      incidents.push(readHarnessIncident(root, entry.name));
    } catch {
      // A damaged manifest is reported by `incident show`, not here.
    }
  }
  return incidents.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

/**
 * Which skill a failing agent exercised: the first `skills:` entry of the
 * agent definition, else the installed skill named `oma-<agent>`.
 */
export function resolveIncidentSkill(
  root: string,
  agent: string,
): string | undefined {
  const definition = join(root, AGENTS_DIR, "agents", `${agent}.md`);
  if (existsSync(definition)) {
    const { frontmatter } = parseFrontmatter(readFileSync(definition, "utf-8"));
    const skills = (frontmatter as { skills?: unknown }).skills;
    if (Array.isArray(skills) && typeof skills[0] === "string")
      return skills[0];
  }
  const direct = agent.startsWith("oma-") ? agent : `oma-${agent}`;
  if (existsSync(join(root, INSTALLED_SKILLS_DIR, direct, "SKILL.md")))
    return direct;
  return undefined;
}

export function draftRubricPrompt(incident: HarnessIncident): string {
  return [
    "You write grading rubrics for regression tests of an agent skill.",
    "An agent failed a task. From the incident below, write ONE rubric paragraph",
    "that a judge can apply to a written answer alone (no files, no commands).",
    "It must start with 'PASS only if' and name the concrete behavior the",
    "acceptance checks require, then 'FAIL if' naming the observed failure.",
    "Do not mention file paths that the answer cannot produce; translate file",
    "checks into what the answer must state or propose. Output the rubric only.",
    "",
    `## Task prompt\n${incident.prompt}`,
    `## Summary\n${incident.summary}`,
    `## Observed failure\n${incident.observed.failure}`,
    ...(incident.observed.output
      ? [
          `## Observed output (failing)\n${incident.observed.output.slice(0, 4_000)}`,
        ]
      : []),
    `## Acceptance checks\n${JSON.stringify(incident.expectedChecks, null, 2)}`,
  ].join("\n\n");
}

/** Mechanical translation when every check is an output assertion. */
export function checkerFromChecks(
  checks: HarnessIncident["expectedChecks"],
):
  | { checker: TaskChecker; derivation: "assert" | "regex" | "judge" }
  | undefined {
  const judged = checks.filter((c) => c.type === "output_judge");
  if (judged.length === 1 && checks.length === 1) {
    return {
      checker: {
        type: "judge",
        rubric: (judged[0] as { rubric: string }).rubric,
      },
      derivation: "judge",
    };
  }
  const contains = checks.filter((c) => c.type === "output_contains");
  if (contains.length === checks.length && contains.length > 0) {
    return {
      checker: {
        type: "assert",
        expect_contains: contains.map((c) => (c as { value: string }).value),
      },
      derivation: "assert",
    };
  }
  return undefined;
}

function observedFailsAssert(output: string, values: string[]): boolean {
  return !values.every((value) => output.includes(value));
}

function fixtureDomain(root: string, skill: string): string {
  const dir = join(root, AGENTS_DIR, "eval", skill);
  if (!existsSync(dir)) return "incident";
  const { fixtures } = loadTaskFixtures(dir);
  return fixtures[0]?.domain ?? "incident";
}

export async function promoteHarnessIncident(options: {
  root: string;
  id: string;
  skill?: string;
  /** Drafts a judge rubric when checks are not output assertions. */
  drafter?: RubricDrafter;
  /** Grades the observed output against a drafted rubric. */
  judge?: JudgeDispatchFn;
  /** Admit a fixture that could not be validated against the observed output. */
  force?: boolean;
}): Promise<{ promotion: IncidentPromotion; fixture: TaskFixture }> {
  const { root, id } = options;
  const incident = readHarnessIncident(root, id);
  if (readIncidentPromotion(root, id))
    throw new Error(`Incident ${id} was already promoted to a fixture.`);
  const skill = options.skill ?? resolveIncidentSkill(root, incident.agent);
  if (!skill)
    throw new Error(
      `Cannot attribute incident ${id} to a skill: agent "${incident.agent}" declares no skills and no oma-${incident.agent} skill is installed. Pass --skill.`,
    );
  const skillDir = join(root, INSTALLED_SKILLS_DIR, skill);
  if (!existsSync(join(skillDir, "SKILL.md")))
    throw new Error(
      `Skill ${skill} is not installed under ${INSTALLED_SKILLS_DIR}.`,
    );

  const limitations: string[] = [];
  const observed = incident.observed.output;
  let checker: TaskChecker;
  let derivation: IncidentPromotion["derivation"];
  let validated = false;

  const mechanical = checkerFromChecks(incident.expectedChecks);
  if (mechanical?.derivation === "judge") {
    checker = mechanical.checker;
    derivation = "judge";
    if (observed !== undefined && options.judge) {
      const verdict = await judgeVerdict(
        incident.prompt,
        observed,
        (checker as { rubric: string }).rubric,
        options.judge,
      );
      validated = verdict.score === 0;
      if (!validated)
        throw new Error(
          `Incident ${id}: the graded contract passes the observed failing output; it is not a regression case.`,
        );
    } else if (observed !== undefined) {
      limitations.push(
        "Graded contract was not checked against the observed output (no judge).",
      );
    }
  } else if (mechanical) {
    checker = mechanical.checker;
    derivation = mechanical.derivation;
    if (observed !== undefined) {
      validated = observedFailsAssert(
        observed,
        (checker as { expect_contains: string[] }).expect_contains,
      );
      if (!validated)
        throw new Error(
          `Incident ${id}: the observed output already satisfies every output_contains check; it is not a regression case.`,
        );
    }
  } else {
    if (!options.drafter)
      throw new Error(
        `Incident ${id}: its checks (${incident.expectedChecks.map((c) => c.type).join(", ")}) cannot run in a skill evaluation; pass --draft to derive a judge rubric.`,
      );
    const rubric = String(
      await options.drafter(draftRubricPrompt(incident)),
    ).trim();
    if (!/^PASS only if/i.test(rubric))
      throw new Error(
        `Incident ${id}: drafted rubric does not start with "PASS only if": ${rubric.slice(0, 120)}`,
      );
    checker = { type: "judge", rubric };
    derivation = "judge-draft";
    if (observed !== undefined && options.judge) {
      const verdict = await judgeVerdict(
        incident.prompt,
        observed,
        rubric,
        options.judge,
      );
      validated = verdict.score === 0;
      if (!validated)
        throw new Error(
          `Incident ${id}: the drafted rubric passes the observed failing output; it does not capture the failure.`,
        );
    } else if (observed !== undefined) {
      limitations.push(
        "Drafted rubric was not graded against the observed output (no judge).",
      );
    }
  }
  if (observed === undefined) {
    limitations.push(
      "Incident has no observed output; the fixture could not be validated against the failure.",
    );
    if (!options.force)
      throw new Error(
        `Incident ${id} has no observed output to validate the fixture against; pass --force to admit it anyway.`,
      );
  }

  const fixtureId = `${skill}-incident-${incident.id}`
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-");
  const fixture: TaskFixture = {
    id: fixtureId,
    skill,
    domain: fixtureDomain(root, skill),
    prompt: incident.prompt,
    checker,
    weight: 1,
    group: `incident-${incident.id}`,
  };
  const evalDir = join(root, AGENTS_DIR, "eval", skill);
  mkdirSync(evalDir, { recursive: true });
  const fixturePath = join(evalDir, `incident-${incident.id}.yaml`);
  if (existsSync(fixturePath))
    throw new Error(`Fixture already exists: ${fixturePath}`);
  const header = [
    `# Derived from incident ${incident.id} (${derivation}); the observed failing output ${validated ? "fails" : "was not checked against"} this checker.`,
    `# Source: ${AGENTS_DIR}/results/incidents/${incident.id}/incident.json`,
  ].join("\n");
  writeFileSync(fixturePath, `${header}\n${stringifyYaml(fixture)}`, "utf-8");

  const promotion: IncidentPromotion = {
    schemaVersion: 1,
    ts: new Date().toISOString(),
    incidentId: incident.id,
    skill,
    fixturePath: fixturePath.slice(root.length + 1),
    fixtureId,
    derivation,
    validatedAgainstObserved: validated,
    limitations,
  };
  writeFileSync(
    promotionPath(root, id),
    `${JSON.stringify(promotion, null, 2)}\n`,
    "utf-8",
  );
  return { promotion, fixture };
}
