import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import type { Readable, Writable } from "node:stream";
import { resolveOmaInvocation } from "../../utils/oma-invocation.js";
import { AcpConnection, AcpMethodNotFound } from "./acp-client.js";
import type { Invocation } from "./types.js";

/**
 * Antigravity CLI (agy) subagents run through agy's Agent Client Protocol
 * server (`agy acp`), not its print mode (`agy -p`).
 *
 * The invocation builders keep emitting agy-shaped argv (`--model`, `--mode`,
 * `--add-dir`, `-p <prompt>`, …) so model plans, restrictions and vendor
 * config compose exactly as they do for every other vendor. planDispatch then
 * hands that argv to `oma agent:acp`, which:
 *
 *   1. starts `agy acp` with the process-level flags (`--add-dir`, `--agent`,
 *      `--dangerously-skip-permissions`, `--sandbox`, …),
 *   2. opens one session in the spawn cwd and applies the session-level flags
 *      (`--model` → session/set_model, `--mode` → session/set_mode,
 *      `--effort` → the `thought_level` config option),
 *   3. sends the prompt and streams the agent's message text to stdout,
 *   4. answers permission requests: approve when the launch carries
 *      `--dangerously-skip-permissions`, deny otherwise (read-only / edit-only),
 *   5. exits 0 on `end_turn`, non-zero on any other stop reason or failure.
 *
 * ACP is stdio JSON-RPC, so the agent's output no longer depends on a TTY
 * (print mode dropped stdout on non-TTY runs), the turn runs to completion
 * without a print timeout, and a cancel stops the session's subagents and
 * background tasks. Workspace hooks (`.agents/hooks.json`) fire in ACP
 * sessions as they do interactively.
 *
 * Requires agy 1.5.10+ (MIN_AGY_ACP_VERSION). On 1.5.9 a turn that hands work
 * to a background subagent (e.g. `image-generator`) can end before that work
 * finishes, and the agent's wake-up output is withheld until the next prompt,
 * so the client never sees the result. 1.5.10 keeps `session/prompt` open
 * until the woken agent answers. Verified against agy 1.5.10 (2026-11-18).
 */

/** Internal `oma` subcommand that runs the ACP driver (fast path in cli.ts). */
export const AGY_ACP_SUBCOMMAND = "agent:acp";

/** ACP protocol version this client speaks. */
const ACP_PROTOCOL_VERSION = 1;

/** Oldest `agy acp` whose turns include background-subagent completion. */
export const MIN_AGY_ACP_VERSION = "1.5.10";

/**
 * True when `version` (agy's `agentInfo.version`, e.g. "1.5.10") is at least
 * MIN_AGY_ACP_VERSION. An unparseable version is accepted: a dev or renamed
 * build should not be refused on a format guess.
 */
export function isSupportedAgyVersion(version: unknown): boolean {
  if (typeof version !== "string") return true;
  const parse = (value: string) =>
    value
      .match(/^(\d+)\.(\d+)\.(\d+)/)
      ?.slice(1, 4)
      .map(Number);
  const actual = parse(version.trim());
  const minimum = parse(MIN_AGY_ACP_VERSION) as number[];
  if (!actual) return true;
  for (let index = 0; index < 3; index++) {
    const a = actual[index] as number;
    const b = minimum[index] as number;
    if (a !== b) return a > b;
  }
  return true;
}

/** Prompt flags of agy print mode; the driver lifts the prompt out of them. */
const PROMPT_FLAGS = new Set(["-p", "--print", "--prompt"]);

/** Flags applied to the ACP session instead of the `agy acp` process. */
const SESSION_FLAGS: Record<string, "model" | "mode" | "effort"> = {
  "--model": "model",
  "--mode": "mode",
  "--effort": "effort",
};

/**
 * Print-mode-only flags (value arity). `agy acp` rejects them with its usage
 * text, and they mean nothing to an ACP session, so the driver drops them —
 * a vendor config written for `agy -p` keeps working.
 */
const PRINT_ONLY_FLAGS: Record<string, boolean> = {
  "--print-timeout": true,
  "--output-format": true,
  "--input-format": true,
  "--json-schema": true,
  "--disable-slash-commands": false,
};

/**
 * Every top-level agy flag (agy 1.5.10 `--help`). Used only to tell a prompt
 * value from the next flag when a caller moved the prompt to stdin.
 */
const AGY_FLAGS = new Set([
  "--add-dir",
  "--agent",
  "-c",
  "--continue",
  "--conversation",
  "--dangerously-skip-permissions",
  "--disable-slash-commands",
  "--effort",
  "-i",
  "--input-format",
  "--json-schema",
  "--log-file",
  "--mode",
  "--model",
  "--new-project",
  "--output-format",
  "-p",
  "--print",
  "--print-timeout",
  "--project",
  "--prompt",
  "--prompt-interactive",
  "--remote-agent",
  "--remote-control",
  "--sandbox",
  "--settings",
]);

const AUTO_APPROVE_FLAG = "--dangerously-skip-permissions";

/** Parsed `oma agent:acp <agy> [flags…]` argv. */
export interface AgyAcpArgs {
  /** agy binary (vendor config `command`, default `agy`). */
  command: string;
  /** Flags passed to `agy acp` verbatim, in order. */
  serverArgs: string[];
  /** Prompt text; undefined → read from stdin. */
  prompt?: string;
  model?: string;
  mode?: string;
  effort?: string;
  /** Approve every permission request (launch carries the auto-approve flag). */
  autoApprove: boolean;
  /** Print-mode-only flags that were dropped (see PRINT_ONLY_FLAGS). */
  ignored: string[];
}

function flagName(token: string): string {
  if (!token.startsWith("--")) return token;
  const equals = token.indexOf("=");
  return equals === -1 ? token : token.slice(0, equals);
}

function isAgyFlag(token: string): boolean {
  return token.startsWith("-") && AGY_FLAGS.has(flagName(token));
}

/** Split agy print-mode argv into `agy acp` flags and session settings. */
export function parseAgyAcpArgs(argv: readonly string[]): AgyAcpArgs {
  const [command, ...rest] = argv;
  if (!command) throw new Error("missing agy command");

  const parsed: AgyAcpArgs = {
    command,
    serverArgs: [],
    autoApprove: false,
    ignored: [],
  };
  for (let index = 0; index < rest.length; index++) {
    const token = rest[index] as string;
    const name = flagName(token);
    const inline =
      name !== token ? token.slice(token.indexOf("=") + 1) : undefined;

    if (PROMPT_FLAGS.has(name)) {
      if (inline !== undefined) {
        parsed.prompt = inline;
      } else {
        const next = rest[index + 1];
        // A caller that pipes a dash-leading prompt through stdin removes the
        // value and leaves the bare flag (harness dispatch).
        if (next !== undefined && !isAgyFlag(next)) {
          parsed.prompt = next;
          index++;
        }
      }
      continue;
    }

    if (name in PRINT_ONLY_FLAGS) {
      parsed.ignored.push(name);
      if (PRINT_ONLY_FLAGS[name] && inline === undefined) index++;
      continue;
    }

    const sessionKey = SESSION_FLAGS[name];
    if (sessionKey) {
      const value = inline ?? rest[++index];
      if (value === undefined || value === "") {
        throw new Error(`${name} needs a value`);
      }
      parsed[sessionKey] = value;
      continue;
    }

    if (token === AUTO_APPROVE_FLAG) parsed.autoApprove = true;
    parsed.serverArgs.push(token);
  }
  return parsed;
}

/** One entry of `session/new` → `models.availableModels`. */
export interface AgyModelInfo {
  modelId: string;
  name?: string;
}

/**
 * Map a requested model onto an ACP model id. OMA's registry and vendor config
 * name agy models by their `agy models` display name ("Gemini 4 Argon (High)");
 * ACP addresses them by id ("gemini-4-argon-high"). Either spelling is accepted.
 */
export function resolveAgyModelId(
  requested: string,
  models: readonly AgyModelInfo[],
): string | null {
  const wanted = requested.trim();
  const byId = models.find((model) => model.modelId === wanted);
  if (byId) return byId.modelId;
  const lower = wanted.toLowerCase();
  const byName = models.find(
    (model) => model.name?.trim().toLowerCase() === lower,
  );
  return byName?.modelId ?? null;
}

interface PermissionOption {
  optionId: string;
  kind?: string;
}

interface PermissionRequest {
  options?: PermissionOption[];
  toolCall?: { title?: string; name?: string };
}

/** Pick the reply to a `session/request_permission` request. */
export function choosePermissionOutcome(
  params: unknown,
  autoApprove: boolean,
): {
  outcome: { outcome: "selected"; optionId: string } | { outcome: "cancelled" };
} {
  const options = (params as PermissionRequest | undefined)?.options ?? [];
  const kinds = autoApprove
    ? ["allow_once", "allow_always"]
    : ["reject_once", "reject_always"];
  for (const kind of kinds) {
    const option = options.find((candidate) => candidate.kind === kind);
    if (option)
      return { outcome: { outcome: "selected", optionId: option.optionId } };
  }
  return { outcome: { outcome: "cancelled" } };
}

/** Tools that start work which outlives the tool call (a background subagent). */
const BACKGROUND_LAUNCH_TOOLS = new Set(["invoke_subagent"]);

/** Reply that means "nothing of mine is still running" in a settle turn. */
export const AGY_SETTLED_MARKER = "OMA_SETTLED";

/** Settle turns after the first prompt before the driver stops asking. */
const MAX_SETTLE_TURNS = 3;

/**
 * Follow-up turn sent after a turn that started a background subagent.
 *
 * agy (1.5.10) may end a turn while a subagent it launched is still running:
 * `invoke_subagent` completes as soon as the subagent starts, and whether the
 * agent then waits (a timer, a sleep) or ends the turn varies run to run. ACP
 * exposes no running-task state, and closing the session stops the subagent,
 * so the driver asks the agent itself, which can list its subagents and tasks.
 */
export const AGY_SETTLE_PROMPT = [
  "Before this session closes: check whether any subagent or background task you started in this conversation is still running (list your subagents and tasks).",
  "If one is still running, wait until it finishes, then complete the original request using its result and give the final answer in the format the original request asked for.",
  `If nothing you started is still running and you already gave the final answer, reply with exactly ${AGY_SETTLED_MARKER} and nothing else.`,
].join("\n");

/**
 * The text a settle turn adds to stdout: empty when the agent only confirmed
 * it is settled, else its answer with the marker removed.
 */
export function settleTurnOutput(text: string): string {
  const stripped = text.split(AGY_SETTLED_MARKER).join("").trim();
  return stripped;
}

/** Exit code for an ACP `session/prompt` stop reason. */
export function stopReasonExitCode(stopReason: unknown): number {
  if (stopReason === "end_turn") return 0;
  if (stopReason === "cancelled") return 130;
  return 1;
}

/**
 * Route an agy invocation through the ACP driver. The agy argv is passed
 * through unchanged after the binary; `vendorCommand` keeps the real CLI for
 * callers that report or probe it.
 */
export function wrapAgyInvocationForAcp(
  invocation: Invocation,
  oma: { command: string; prefixArgs: string[] } = resolveOmaInvocation(),
): Invocation {
  return {
    command: oma.command,
    args: [
      // Subagents run from the workspace, not from where oma was launched.
      ...oma.prefixArgs.map((arg) => path.resolve(arg)),
      AGY_ACP_SUBCOMMAND,
      invocation.command,
      ...invocation.args,
    ],
    env: invocation.env,
    vendorCommand: invocation.vendorCommand ?? invocation.command,
  };
}

export interface AgyAcpIo {
  stdin: Readable;
  stdout: Writable;
  stderr: Writable;
  cwd: string;
  env: NodeJS.ProcessEnv;
  spawnAgent: (
    command: string,
    args: string[],
    options: { cwd: string; env: NodeJS.ProcessEnv },
  ) => ChildProcess;
  /** Emitter for SIGINT/SIGTERM (process in production). */
  signals: Pick<NodeJS.Process, "on" | "off">;
}

const defaultSpawnAgent: AgyAcpIo["spawnAgent"] = (command, args, options) =>
  spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["pipe", "pipe", "inherit"],
    windowsHide: true,
  });

async function readAll(stream: Readable): Promise<string> {
  if ((stream as { isTTY?: boolean }).isTTY) return "";
  let text = "";
  stream.setEncoding("utf8");
  for await (const chunk of stream) text += chunk;
  return text;
}

function waitFor<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    timer.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      },
    );
  });
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface NewSessionResult {
  sessionId: string;
  models?: { availableModels?: AgyModelInfo[] };
}

/** Exit codes for driver-side failures before the prompt runs. */
const USAGE_ERROR = 2;
const SIGNAL_EXIT: Record<string, number> = { SIGINT: 130, SIGTERM: 143 };

/** Grace periods for shutting the agy acp server down. */
const CLOSE_TIMEOUT_MS = 5_000;
const EXIT_TIMEOUT_MS = 10_000;
const CANCEL_TIMEOUT_MS = 10_000;

/**
 * Run one agy prompt over ACP. `argv` is `<agy> [agy flags…]` as produced by
 * the invocation builders. Resolves with the process exit code.
 */
export async function runAgyAcp(
  argv: readonly string[],
  overrides: Partial<AgyAcpIo> = {},
): Promise<number> {
  const io: AgyAcpIo = {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    cwd: process.cwd(),
    env: process.env,
    spawnAgent: defaultSpawnAgent,
    signals: process,
    ...overrides,
  };
  // A parent that gives up (e.g. `oma image` on timeout) destroys our pipes
  // before signalling us; a late write must not crash the driver while it is
  // still cancelling the session and stopping agy.
  const ignoreStreamError = () => {};
  io.stdout.on("error", ignoreStreamError);
  io.stderr.on("error", ignoreStreamError);
  const write = (stream: Writable, text: string) => {
    if (stream.destroyed || stream.writableEnded) return;
    try {
      stream.write(text);
    } catch {
      // stream closed underneath us
    }
  };
  const log = (text: string) => write(io.stderr, `[agy-acp] ${text}\n`);

  let args: AgyAcpArgs;
  try {
    args = parseAgyAcpArgs(argv);
  } catch (error) {
    log(message(error));
    return USAGE_ERROR;
  }
  if (args.ignored.length > 0) {
    log(`ignoring print-mode flags under ACP: ${args.ignored.join(", ")}`);
  }
  const prompt = args.prompt ?? (await readAll(io.stdin));
  if (!prompt.trim()) {
    log("no prompt given (-p <prompt> or stdin)");
    return USAGE_ERROR;
  }

  let child: ChildProcess;
  try {
    child = io.spawnAgent(args.command, ["acp", ...args.serverArgs], {
      cwd: io.cwd,
      env: io.env,
    });
  } catch (error) {
    log(`failed to start ${args.command} acp: ${message(error)}`);
    return 1;
  }
  if (!child.stdin || !child.stdout) {
    child.kill();
    log(`${args.command} acp started without stdio pipes`);
    return 1;
  }

  let spawnError: Error | null = null;
  const exited = new Promise<number | null>((resolve) => {
    child.once("close", (code) => resolve(code));
    child.once("error", (error) => {
      spawnError = error;
      resolve(null);
    });
  });

  let endsWithNewline = true;
  const emit = (text: string) => {
    if (!text) return;
    write(io.stdout, text);
    endsWithNewline = text.endsWith("\n");
  };
  // Settle turns are buffered: their text reaches stdout only when it is more
  // than the settled marker.
  let settleBuffer: string | null = null;
  let launchedBackgroundWork = false;
  const connection = new AcpConnection(child.stdin, child.stdout, {
    onNotification: (method, params) => {
      if (method !== "session/update") return;
      const update = (
        params as {
          update?: {
            sessionUpdate?: string;
            name?: unknown;
            content?: { type?: string; text?: unknown };
          };
        }
      )?.update;
      if (
        update?.sessionUpdate === "tool_call" &&
        typeof update.name === "string" &&
        BACKGROUND_LAUNCH_TOOLS.has(update.name)
      ) {
        launchedBackgroundWork = true;
      }
      if (
        update?.sessionUpdate === "agent_message_chunk" &&
        update.content?.type === "text" &&
        typeof update.content.text === "string" &&
        update.content.text.length > 0
      ) {
        if (settleBuffer !== null) settleBuffer += update.content.text;
        else emit(update.content.text);
      }
    },
    onRequest: (method, params) => {
      if (method !== "session/request_permission") {
        throw new AcpMethodNotFound(method);
      }
      const reply = choosePermissionOutcome(params, args.autoApprove);
      if (!args.autoApprove) {
        const tool = (params as PermissionRequest | undefined)?.toolCall;
        log(
          `denied permission for ${tool?.title ?? tool?.name ?? "a tool call"} (restricted launch)`,
        );
      }
      return reply;
    },
    onStrayOutput: (line) => write(io.stderr, `${line}\n`),
  });
  void exited.then((code) => {
    const reason = spawnError
      ? `failed to start ${args.command} acp: ${spawnError.message}`
      : `${args.command} acp exited with code ${code ?? "null"}`;
    connection.close(new Error(reason));
  });

  let sessionId: string | undefined;
  let signalled: string | undefined;
  const onSignal = (signal: NodeJS.Signals) => {
    if (signalled) {
      child.kill("SIGKILL");
      return;
    }
    signalled = signal;
    if (sessionId) {
      connection.notify("session/cancel", { sessionId });
      const timer = setTimeout(() => child.kill("SIGTERM"), CANCEL_TIMEOUT_MS);
      timer.unref?.();
    } else {
      child.kill("SIGTERM");
    }
  };
  io.signals.on("SIGINT", onSignal);
  io.signals.on("SIGTERM", onSignal);

  let exitCode = 1;
  try {
    const init = await connection.request<{
      agentInfo?: { version?: unknown };
    }>("initialize", {
      protocolVersion: ACP_PROTOCOL_VERSION,
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
      },
    });
    const agyVersion = init?.agentInfo?.version;
    if (!isSupportedAgyVersion(agyVersion)) {
      throw Object.assign(
        new Error(
          `agy ${String(agyVersion)} is too old: oma needs agy ${MIN_AGY_ACP_VERSION}+ for ACP subagents (run \`agy update\`)`,
        ),
        { exitCode: USAGE_ERROR },
      );
    }
    const session = await connection.request<NewSessionResult>("session/new", {
      cwd: io.cwd,
      mcpServers: [],
    });
    sessionId = session.sessionId;

    if (args.model) {
      const available = session.models?.availableModels ?? [];
      const modelId = resolveAgyModelId(args.model, available);
      if (!modelId) {
        const names = available
          .map((model) => model.name ?? model.modelId)
          .join(", ");
        throw Object.assign(
          new Error(
            `unknown model '${args.model}'; available: ${names || "(none reported)"}`,
          ),
          { exitCode: USAGE_ERROR },
        );
      }
      await connection.request("session/set_model", { sessionId, modelId });
    }
    if (args.effort) {
      await connection.request("session/set_config_option", {
        sessionId,
        configId: "thought_level",
        value: args.effort,
      });
    }
    if (args.mode) {
      await connection.request("session/set_mode", {
        sessionId,
        modeId: args.mode,
      });
    }

    const runTurn = async (text: string): Promise<number> => {
      const result = await connection.request<{ stopReason?: unknown }>(
        "session/prompt",
        { sessionId, prompt: [{ type: "text", text }] },
      );
      const code = stopReasonExitCode(result?.stopReason);
      if (code !== 0 && code !== 130) {
        log(`turn ended with stop reason '${String(result?.stopReason)}'`);
      }
      return code;
    };

    exitCode = await runTurn(prompt);
    // A turn that started a background subagent may have ended before the
    // subagent finished, and closing the session would stop it. Ask until the
    // agent answers with the bare settled marker: a settle turn that says
    // anything else either delivered the finished work or is still waiting,
    // so the next round checks again.
    let unsettled = launchedBackgroundWork;
    for (let round = 0; unsettled && exitCode === 0 && !signalled; round++) {
      if (round >= MAX_SETTLE_TURNS) {
        log(
          `background work still unsettled after ${MAX_SETTLE_TURNS} follow-up turns; closing the session`,
        );
        break;
      }
      settleBuffer = "";
      try {
        exitCode = await runTurn(AGY_SETTLE_PROMPT);
      } finally {
        const extra = settleTurnOutput(settleBuffer ?? "");
        settleBuffer = null;
        unsettled = extra.length > 0;
        if (extra) {
          if (!endsWithNewline) emit("\n");
          emit(extra);
        }
      }
    }
  } catch (error) {
    log(message(error));
    const code = (error as { exitCode?: unknown }).exitCode;
    exitCode = typeof code === "number" ? code : 1;
  } finally {
    io.signals.off("SIGINT", onSignal);
    io.signals.off("SIGTERM", onSignal);
    if (!endsWithNewline) write(io.stdout, "\n");

    // Close the session first so agy stops its subagents and background
    // tasks, then end stdin: `agy acp` shuts down when the client disconnects.
    if (sessionId) {
      await waitFor(
        connection.request("session/close", { sessionId }),
        CLOSE_TIMEOUT_MS,
      );
    }
    child.stdin.end();
    if ((await waitFor(exited, EXIT_TIMEOUT_MS)) === undefined) {
      child.kill("SIGTERM");
      if ((await waitFor(exited, CLOSE_TIMEOUT_MS)) === undefined) {
        child.kill("SIGKILL");
      }
    }
  }

  if (signalled) return SIGNAL_EXIT[signalled] ?? 130;
  return exitCode;
}
