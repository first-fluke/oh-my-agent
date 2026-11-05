import { spawnSync } from "node:child_process";

const ACTION_ARITY: Record<string, number> = {
  show: 0,
  task: 1,
  claim: 1,
  done: 1,
  ask: 2,
  answer: 2,
  decline: 2,
};

export interface QwenBoardOptions {
  board: string;
  actor?: string;
  owner?: string;
  note?: string;
  json?: boolean;
}

/** Build explicit board operations; OMA run claims and receipts stay separate. */
export function buildQwenBoardArgs(
  action: string,
  values: string[],
  options: QwenBoardOptions,
): string[] {
  const arity = ACTION_ARITY[action];
  if (arity === undefined || values.length !== arity) {
    throw new Error(
      `Qwen board action '${action}' expects ${arity ?? "a supported number of"} arguments (show, task, claim, done, ask, answer, decline).`,
    );
  }
  if (!options.board.trim()) throw new Error("A board name is required.");
  if (action !== "show" && !options.actor?.trim()) {
    throw new Error("Board mutations require --actor <label>.");
  }
  if (options.owner && action !== "task") {
    throw new Error("--owner is supported only for task creation.");
  }
  if (options.note && action !== "done") {
    throw new Error("--note is supported only for done.");
  }
  const args = ["board", action, ...values, "--board", options.board];
  if (options.actor) args.push("--as", options.actor);
  if (options.owner) args.push("--owner", options.owner);
  if (options.note) args.push("--note", options.note);
  if (options.json) args.push("--json");
  return args;
}

/** A bounded CLI capability check, never an attempted model prompt. */
export function supportsQwenBoard(help: string): boolean {
  return /^\s*qwen board(?:\s|$)/m.test(help);
}

/** Opt-in native coordination adapter, invoked only by `oma agent board`. */
export function runQwenBoard(
  action: string,
  values: string[],
  options: QwenBoardOptions,
): void {
  const args = buildQwenBoardArgs(action, values, options);
  const help = spawnSync("qwen", ["--help"], {
    encoding: "utf8",
    timeout: 3000,
    maxBuffer: 1024 * 1024,
  });
  if (
    help.error ||
    help.status !== 0 ||
    !supportsQwenBoard(help.stdout ?? "")
  ) {
    throw new Error(
      "The installed Qwen CLI does not advertise 'qwen board'. OMA task state and execution receipts remain available through 'oma agent status'.",
    );
  }
  const result = spawnSync("qwen", args, {
    encoding: "utf8",
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Qwen board command exited with ${result.status ?? result.signal}.`,
    );
  }
}
