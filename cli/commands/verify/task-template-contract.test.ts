import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TEST_APPROACHES } from "./plan-checks.js";

const templatePath = join(
  __dirname,
  "../../..",
  ".agents/skills/oma-pm/resources/task-template.json",
);

describe("PM task-template.json contract", () => {
  const template = JSON.parse(readFileSync(templatePath, "utf-8"));
  const task = template.tasks[0];

  it("keeps the per-task test strategy fields (issue #671)", () => {
    expect(task).toHaveProperty("test_approach");
    expect(task).toHaveProperty("test_scope");
    expect(task).toHaveProperty("tdd_evidence_required");
    expect(task).toHaveProperty("test_approach_rationale");
    expect(task).toHaveProperty("alternative_verification");
  });

  it("keeps the template's enum placeholder in sync with the validator", () => {
    expect(task.test_approach).toBe(TEST_APPROACHES.join("|"));
  });

  it("keeps the plan-level testing_strategy block intact", () => {
    expect(template.testing_strategy).toMatchObject({
      unit_tests: expect.any(String),
      integration_tests: expect.any(String),
      e2e_tests: expect.any(String),
      performance_tests: expect.any(String),
    });
  });
});
