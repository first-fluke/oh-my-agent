import type { ScoringFn } from "./types.js";

/**
 * Dispatch budget for one optimization run, taken from
 * `constitution.budget.max_dispatches_per_run`. Every underlying model call
 * (task arm, judge, optimizer, maintainer) charges one unit; the call that
 * would exceed the limit is refused before it is made.
 */
export interface DispatchBudget {
  limit: number | null;
  used: number;
}

export class DispatchBudgetExceededError extends Error {
  readonly limit: number;
  readonly used: number;
  constructor(limit: number, used: number) {
    super(
      `[oma skill opt] dispatch budget exhausted: ${used} of ${limit} model calls used (constitution budget.max_dispatches_per_run).`,
    );
    this.name = "DispatchBudgetExceededError";
    this.limit = limit;
    this.used = used;
  }
}

export interface DispatchMeter {
  /** Refuse the next call when the limit is reached; otherwise count it. */
  charge(): void;
  snapshot(): DispatchBudget;
}

export function createDispatchMeter(limit: number | null): DispatchMeter {
  let used = 0;
  return {
    charge() {
      if (limit !== null && used >= limit)
        throw new DispatchBudgetExceededError(limit, used);
      used++;
    },
    snapshot() {
      return { limit, used };
    },
  };
}

/** Charge one unit per call of any async function (optimizer, maintainer). */
export function meterCall<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  meter: DispatchMeter,
): (...args: Args) => Result {
  return (...args) => {
    meter.charge();
    return fn(...args);
  };
}

/**
 * Charge the meter before every arm, neighbor, and judge call the scorer
 * makes. The scorer keeps building its own real dispatch, so the isolation
 * status it reports stays that of the real path.
 */
export function meterScoringFn(
  scoringFn: ScoringFn,
  meter: DispatchMeter,
): ScoringFn {
  return (options) =>
    scoringFn({ ...options, beforeDispatch: () => meter.charge() });
}
