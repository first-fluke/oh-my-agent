import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const PASS_COMMAND = [process.execPath, "-e", "process.exit(0)"];
export function testTask(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    description: `Verify ${id}`,
    agent: "qa-reviewer",
    task: `Perform ${id}`,
    acceptance_criteria: [
      { id: "AC1", description: "Fixture acceptance condition" },
    ],
    required_checks: [
      { id: "acceptance", criteria: ["AC1"], command: PASS_COMMAND, cwd: "." },
    ],
    retry_policy: "safe",
    ...extra,
  };
}
export function writeTestPlan(root: string, ids = ["T1"], session = "s1") {
  mkdirSync(join(root, ".agents/results"), { recursive: true });
  writeFileSync(
    join(root, ".agents/results", `plan-${session}.json`),
    JSON.stringify({ tasks: ids.map((id) => testTask(id)) }),
  );
}
