import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFsFunctions = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  openSync: vi.fn(),
  statSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
}));

vi.mock("node:fs", async () => {
  return {
    default: mockFsFunctions,
    ...mockFsFunctions,
  };
});

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import {
  checkPmPlan,
  checkTddEvidence,
  validateTestApproach,
} from "./plan-checks.js";

/** Route mocked fs reads: plan JSON for results/, result markdown for memories/. */
function mockWorkspace(planJson: string, resultMd: string | null): void {
  mockFsFunctions.existsSync.mockReturnValue(true);
  mockFsFunctions.readdirSync.mockImplementation((dir: string) =>
    String(dir).includes("memories")
      ? resultMd !== null
        ? ["result-backend.md"]
        : []
      : ["plan-20260806-120000.json"],
  );
  mockFsFunctions.readFileSync.mockImplementation((file: string) =>
    String(file).endsWith(".json") ? planJson : (resultMd ?? ""),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateTestApproach (schema contract)", () => {
  it("accepts tasks without a test_approach field (opt-in)", () => {
    expect(validateTestApproach([{ id: "task-1", agent: "backend" }])).toEqual(
      [],
    );
  });

  it("accepts every supported approach value", () => {
    expect(
      validateTestApproach([
        { id: "task-1", agent: "backend", test_approach: "tdd" },
        { id: "task-2", agent: "frontend", test_approach: "test_after" },
        {
          id: "task-3",
          agent: "docs",
          test_approach: "not_applicable",
          test_approach_rationale: "Documentation-only change.",
          alternative_verification: "Manual render check of the docs site.",
        },
      ]),
    ).toEqual([]);
  });

  it("rejects unknown test_approach values", () => {
    const errors = validateTestApproach([
      { id: "task-1", agent: "backend", test_approach: "yolo" },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('invalid test_approach "yolo"');
  });

  it("rejects not_applicable without a rationale", () => {
    const errors = validateTestApproach([
      {
        id: "task-1",
        agent: "docs",
        test_approach: "not_applicable",
        alternative_verification: "Manual check.",
      },
    ]);
    expect(errors).toEqual([
      "task-1: not_applicable requires test_approach_rationale",
    ]);
  });

  it("rejects not_applicable without alternative verification", () => {
    const errors = validateTestApproach([
      {
        id: "task-1",
        agent: "docs",
        test_approach: "not_applicable",
        test_approach_rationale: "Docs only.",
      },
    ]);
    expect(errors).toEqual([
      "task-1: not_applicable requires alternative_verification",
    ]);
  });

  it("rejects whitespace-only rationale and verification", () => {
    const errors = validateTestApproach([
      {
        id: "task-1",
        agent: "docs",
        test_approach: "not_applicable",
        test_approach_rationale: "   ",
        alternative_verification: "\n",
      },
    ]);
    expect(errors).toHaveLength(2);
  });

  it("preserves the refactor characterization-test path: tdd is rejected on refactor tasks", () => {
    const errors = validateTestApproach([
      { id: "task-1", agent: "refactor", test_approach: "tdd" },
    ]);
    expect(errors).toEqual([
      'task-1: refactor tasks keep characterization tests; test_approach must not be "tdd"',
    ]);
  });

  it("allows refactor tasks with test_after (characterization safety net)", () => {
    expect(
      validateTestApproach([
        { id: "task-1", agent: "refactor", test_approach: "test_after" },
      ]),
    ).toEqual([]);
  });
});

describe("checkPmPlan (plan contract check)", () => {
  it("passes a plan whose tasks carry no test_approach", () => {
    mockWorkspace(
      JSON.stringify({ tasks: [{ id: "task-1", agent: "backend" }] }),
      null,
    );
    const result = checkPmPlan("/workspace");
    expect(result.status).toBe("pass");
  });

  it("fails when a task has an invalid test_approach", () => {
    mockWorkspace(
      JSON.stringify({
        tasks: [{ id: "task-1", agent: "backend", test_approach: "always" }],
      }),
      null,
    );
    const result = checkPmPlan("/workspace");
    expect(result.status).toBe("fail");
    expect(result.message).toContain("test_approach contract");
    expect(result.message).toContain("task-1");
  });

  it("fails when not_applicable lacks rationale and alternative verification", () => {
    mockWorkspace(
      JSON.stringify({
        tasks: [
          { id: "task-1", agent: "docs", test_approach: "not_applicable" },
        ],
      }),
      null,
    );
    const result = checkPmPlan("/workspace");
    expect(result.status).toBe("fail");
    expect(result.message).toContain("+1 more");
  });

  it("still fails on invalid JSON", () => {
    mockWorkspace("not-json", null);
    const result = checkPmPlan("/workspace");
    expect(result.status).toBe("fail");
    expect(result.message).toBe("Invalid JSON");
  });
});

describe("checkTddEvidence (RED/GREEN evidence check)", () => {
  const tddPlan = JSON.stringify({
    tasks: [
      { id: "task-1", agent: "backend", test_approach: "tdd" },
      { id: "task-2", agent: "frontend", test_approach: "tdd" },
    ],
  });

  const validEvidence = [
    "# Result",
    "",
    "TDD_EVIDENCE:",
    "- task: task-1",
    "  test_command: bun test src/services/discount.test.ts",
    '  red: "expected 400, received 200" (before implementation)',
    "  green: 12 pass, 0 fail (after implementation)",
  ].join("\n");

  it("skips when no plan file exists", () => {
    mockFsFunctions.existsSync.mockReturnValue(false);
    mockFsFunctions.readdirSync.mockReturnValue([]);
    const result = checkTddEvidence("/workspace", "backend");
    expect(result.status).toBe("skip");
    expect(result.message).toBe("No plan file found");
  });

  it("skips agents that have no tdd tasks — evidence is only checked for tdd", () => {
    mockWorkspace(
      JSON.stringify({
        tasks: [
          { id: "task-1", agent: "backend", test_approach: "test_after" },
          {
            id: "task-2",
            agent: "backend",
            test_approach: "not_applicable",
            test_approach_rationale: "Generated code.",
            alternative_verification: "Diff review of generator output.",
          },
        ],
      }),
      "no evidence here",
    );
    const result = checkTddEvidence("/workspace", "backend");
    expect(result.status).toBe("skip");
    expect(result.message).toBe("No tdd tasks for this agent");
  });

  it("skips tdd tasks that explicitly opt out via tdd_evidence_required: false", () => {
    mockWorkspace(
      JSON.stringify({
        tasks: [
          {
            id: "task-1",
            agent: "backend",
            test_approach: "tdd",
            tdd_evidence_required: false,
          },
        ],
      }),
      "no evidence here",
    );
    const result = checkTddEvidence("/workspace", "backend");
    expect(result.status).toBe("skip");
  });

  it("fails when the result file is missing for tdd tasks", () => {
    mockWorkspace(tddPlan, null);
    const result = checkTddEvidence("/workspace", "backend");
    expect(result.status).toBe("fail");
    expect(result.message).toContain("No result file");
  });

  it("fails when the TDD_EVIDENCE block is missing", () => {
    mockWorkspace(tddPlan, "# Result\n\nAll done, tests written afterwards.");
    const result = checkTddEvidence("/workspace", "backend");
    expect(result.status).toBe("fail");
    expect(result.message).toContain("TDD_EVIDENCE block missing");
  });

  it("fails when a tdd task id is absent from the evidence block", () => {
    const evidenceForWrongTask = validEvidence.replaceAll("task-1", "task-9");
    mockWorkspace(tddPlan, evidenceForWrongTask);
    const result = checkTddEvidence("/workspace", "backend");
    expect(result.status).toBe("fail");
    expect(result.message).toContain("task-1");
  });

  it("fails when RED or GREEN entries are missing", () => {
    const noGreen = validEvidence
      .split("\n")
      .filter((line) => !line.includes("green:"))
      .join("\n");
    mockWorkspace(tddPlan, noGreen);
    const result = checkTddEvidence("/workspace", "backend");
    expect(result.status).toBe("fail");
    expect(result.message).toContain("GREEN");
  });

  it("passes with a complete RED/GREEN evidence block", () => {
    mockWorkspace(tddPlan, validEvidence);
    const result = checkTddEvidence("/workspace", "backend");
    expect(result.status).toBe("pass");
    expect(result.message).toContain("1 tdd task(s)");
  });

  it("only counts tasks belonging to the verified agent", () => {
    // task-2 belongs to frontend; backend verification must not demand its evidence
    mockWorkspace(tddPlan, validEvidence);
    const result = checkTddEvidence("/workspace", "backend");
    expect(result.status).toBe("pass");
  });
});
