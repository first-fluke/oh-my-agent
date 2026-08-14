import {
  HARNESS_MIN_TASKS,
  HARNESS_PASS_LIFT,
  type HarnessArmRun,
  type HarnessScore,
} from "./types.js";

interface WeightedTask {
  id: string;
  weight: number;
}

export function scoreHarnessRuns(
  tasks: WeightedTask[],
  runs: HarnessArmRun[],
): HarnessScore {
  const byTask = new Map<
    string,
    { baseline?: HarnessArmRun; candidate?: HarnessArmRun }
  >();
  for (const run of runs) {
    const pair = byTask.get(run.taskId) ?? {};
    pair[run.arm] = run;
    byTask.set(run.taskId, pair);
  }

  const scored = tasks.filter((task) => {
    const pair = byTask.get(task.id);
    return pair?.baseline !== undefined && pair.candidate !== undefined;
  });
  const totalWeight = scored.reduce((sum, task) => sum + task.weight, 0);
  const weightedScore = (arm: "baseline" | "candidate"): number =>
    totalWeight === 0
      ? 0
      : scored.reduce((sum, task) => {
          const passed = byTask.get(task.id)?.[arm]?.passed ?? false;
          return sum + (passed ? task.weight : 0);
        }, 0) / totalWeight;

  const baselineScore = weightedScore("baseline");
  const candidateScore = weightedScore("candidate");
  const correctedTaskIds = scored
    .filter((task) => {
      const pair = byTask.get(task.id);
      return (
        pair?.baseline?.passed === false && pair.candidate?.passed === true
      );
    })
    .map((task) => task.id);
  const regressedTaskIds = scored
    .filter((task) => {
      const pair = byTask.get(task.id);
      return (
        pair?.baseline?.passed === true && pair.candidate?.passed === false
      );
    })
    .map((task) => task.id);
  const coverage = scored.length >= HARNESS_MIN_TASKS ? "ok" : "insufficient";
  const lift = candidateScore - baselineScore;
  let decision: HarnessScore["decision"] = "insufficient";
  if (coverage === "ok") {
    if (regressedTaskIds.length > 0 || lift < 0) decision = "fail";
    else if (lift >= HARNESS_PASS_LIFT) decision = "pass";
    else decision = "warn";
  }

  return {
    taskCount: tasks.length,
    scoredTaskCount: scored.length,
    baselineScore,
    candidateScore,
    lift,
    correctedTaskIds,
    regressedTaskIds,
    coverage,
    decision,
  };
}
