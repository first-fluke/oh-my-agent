import { isAbsolute, relative, resolve, sep } from "node:path";
import type { MatrixRead, MatrixRun, MatrixVendor } from "./types.js";

export const MATRIX_STREAM_LIMIT = 4 * 1024 * 1024;
const MAX_LINE_BYTES = 1024 * 1024;
const MAX_EVENTS = 10_000;

type ObjectValue = Record<string, unknown>;

function object(value: unknown): ObjectValue | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as ObjectValue)
    : undefined;
}

function textContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .flatMap((entry) => {
      const block = object(entry);
      return block?.type === "text" && typeof block.text === "string"
        ? [block.text]
        : [];
    })
    .join("\n");
}

function readPath(workspace: string, value: unknown): string | undefined {
  if (typeof value !== "string" || !value || value.includes("\0")) {
    return undefined;
  }
  const path = resolve(workspace, value);
  const fromRoot = relative(resolve(workspace), path);
  return fromRoot !== ".." &&
    !fromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(fromRoot)
    ? path
    : undefined;
}

function missingResult(content: string): boolean {
  const diagnostic = content.trim().replace(/^<tool_use_error>\s*/, "");
  return (
    /^(?:Error:\s*)?(?:ENOENT(?:[:, ]|$)|File (?:does not exist|not found)(?:[.: ]|$))/i.test(
      diagnostic,
    ) || /(?:^|:\s*)No such file or directory[.\s]*$/im.test(diagnostic)
  );
}

function truncated(content: string): boolean {
  return /(?:\boutput (?:was )?truncated\b|\btruncated output\b)/i.test(
    content,
  );
}

function claudeReadContent(content: string): string {
  // Read decorates source lines and may append a safety reminder, neither of
  // which belongs to the file. Do not remove arbitrary XML from source text.
  return content
    .replace(/^\s*\d+(?:→|\t)/gm, "")
    .replace(
      /\n\n<system-reminder>\nWhenever you read a file,[\s\S]*?<\/system-reminder>\s*$/,
      "",
    );
}

/** Tokenize only literal shell words; this never executes shell text. */
function literalWords(command: string): string[] | undefined {
  if (/[\0\r\n$`]/.test(command)) return undefined;
  const words: string[] = [];
  let word = "";
  let started = false;
  let quote: "'" | '"' | undefined;
  for (let index = 0; index < command.length; index += 1) {
    const character = command.charAt(index);
    if (quote === "'") {
      if (character === "'") quote = undefined;
      else word += character;
    } else if (quote === '"') {
      if (character === '"') quote = undefined;
      else if (character === "\\") {
        const next = command[++index];
        if (next !== "\\" && next !== '"') return undefined;
        word += next;
      } else word += character;
    } else if (character === "'" || character === '"') {
      quote = character;
      started = true;
    } else if (character === "\\") {
      const next = command[++index];
      if (next === undefined) return undefined;
      word += next;
      started = true;
    } else if (/\s/.test(character)) {
      if (started) words.push(word);
      word = "";
      started = false;
    } else {
      if (/[;|&<>(){}*?[\]~]/.test(character)) return undefined;
      word += character;
      started = true;
    }
  }
  if (quote) return undefined;
  if (started) words.push(word);
  return words;
}

function commandReadPath(
  command: unknown,
  workspace: string,
  cwd: string | null | undefined,
): string | undefined {
  if (typeof command !== "string" || cwd === null) return undefined;
  let words = literalWords(command);
  if (!words) return undefined;
  if (
    words.length === 3 &&
    /^(?:\/bin\/)?(?:ba|z)?sh$/.test(words[0] ?? "") &&
    (words[1] === "-c" || words[1] === "-lc")
  ) {
    words = literalWords(words[2] ?? "");
    if (!words) return undefined;
  }
  const executable = words[0];
  let path: string | undefined;
  if (executable === "cat" || executable === "/bin/cat") {
    if (words.length === 2 && !words[1]?.startsWith("-")) path = words[1];
    else if (words.length === 3 && words[1] === "--") path = words[2];
  } else if (executable === "sed" || executable === "/usr/bin/sed") {
    if (
      words.length === 4 &&
      words[1] === "-n" &&
      /^\d+(?:,\d+)?p$/.test(words[2] ?? "") &&
      !words[3]?.startsWith("-")
    ) {
      path = words[3];
    }
  } else if (executable === "head" || executable === "/usr/bin/head") {
    if (
      words.length === 4 &&
      words[1] === "-n" &&
      /^\d+$/.test(words[2] ?? "") &&
      !words[3]?.startsWith("-")
    ) {
      path = words[3];
    }
  }
  if (!path || (!isAbsolute(path) && !cwd)) return undefined;
  return readPath(
    workspace,
    isAbsolute(path) ? path : resolve(cwd ?? workspace, path),
  );
}

function commandCwd(
  event: ObjectValue,
  item: ObjectValue,
  workspace: string,
): string | null | undefined {
  const values = [item.cwd, item.workdir, event.cwd, event.workdir].filter(
    (value) => value !== undefined,
  );
  if (!values.length) return undefined;
  const paths = values.map((value) =>
    typeof value === "string" && isAbsolute(value)
      ? readPath(workspace, value)
      : undefined,
  );
  if (paths.some((path) => !path) || paths.some((path) => path !== paths[0]))
    return null;
  return paths[0];
}

function usage(value: unknown): MatrixRun["usage"] | undefined {
  const data = object(value);
  if (!data) return undefined;
  const result: NonNullable<MatrixRun["usage"]> = {};
  for (const [source, target] of [
    ["input_tokens", "inputTokens"],
    ["output_tokens", "outputTokens"],
    ["cached_input_tokens", "cachedInputTokens"],
    ["cache_read_input_tokens", "cachedInputTokens"],
  ] as const) {
    const count = data[source];
    if (
      typeof count === "number" &&
      Number.isSafeInteger(count) &&
      count >= 0
    ) {
      result[target] = count;
    }
  }
  return Object.keys(result).length ? result : undefined;
}

function reportedModel(value: unknown): string | null {
  return typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:/+@-]{0,255}$/.test(value)
    ? value
    : null;
}

function emptyRun(): MatrixRun {
  return {
    exitCode: null,
    complete: false,
    nativeSuccess: false,
    output: "",
    reads: [],
    activations: [],
    cliVersion: null,
    model: null,
    durationMs: 0,
  };
}

/** Parse bounded native events only; no transcript/history fallback is used. */
export function parseMatrixStream(
  vendor: MatrixVendor,
  raw: string,
  workspace: string,
): MatrixRun {
  const run = emptyRun();
  if (Buffer.byteLength(raw) > MATRIX_STREAM_LIMIT) {
    return { ...run, error: "Native event stream exceeded its limit." };
  }
  const lines = raw.split("\n").filter((line) => line.trim());
  if (!lines.length || lines.length > MAX_EVENTS) {
    return {
      ...run,
      error: "Native event stream is empty or exceeds its limit.",
    };
  }
  const events: ObjectValue[] = [];
  for (const line of lines) {
    if (Buffer.byteLength(line) > MAX_LINE_BYTES) {
      return { ...run, error: "Native event exceeds its limit." };
    }
    try {
      const event = object(JSON.parse(line));
      if (!event || typeof event.type !== "string") throw new Error();
      events.push(event);
    } catch {
      return {
        ...run,
        error: "Native event stream is malformed or truncated.",
      };
    }
  }

  let terminal = false;
  let failed = false;
  const pending = new Map<string, ObjectValue>();
  const codexPending = new Set<string>();
  for (const event of events) {
    if (terminal) {
      return { ...run, error: "Native events follow the terminal event." };
    }
    if (
      event.type === "error" ||
      event.type === "turn.failed" ||
      event.error !== undefined ||
      event.is_error === true
    ) {
      failed = true;
    }
    if (vendor === "claude") {
      const message = object(event.message);
      if (event.parent_tool_use_id) continue;
      if (event.model !== undefined) run.model = reportedModel(event.model);
      if (message?.model !== undefined)
        run.model = reportedModel(message.model);
      if (event.type === "assistant" && Array.isArray(message?.content)) {
        for (const value of message.content) {
          const block = object(value);
          if (block?.type !== "tool_use" || typeof block.id !== "string") {
            continue;
          }
          if (pending.has(block.id)) {
            return {
              ...run,
              error: "Native tool call identifiers are ambiguous.",
            };
          }
          pending.set(block.id, block);
        }
      }
      if (event.type === "user" && Array.isArray(message?.content)) {
        for (const value of message.content) {
          const block = object(value);
          if (
            block?.type !== "tool_result" ||
            typeof block.tool_use_id !== "string"
          ) {
            continue;
          }
          const call = pending.get(block.tool_use_id);
          if (!call) continue;
          pending.delete(block.tool_use_id);
          const input = object(call.input);
          const content = textContent(block.content);
          const success =
            block.is_error !== true &&
            !/^\s*(?:Error:|<tool_use_error>)/.test(content) &&
            !truncated(content);
          if (
            call.name === "Skill" &&
            success &&
            typeof input?.skill === "string"
          ) {
            run.activations.push(input.skill);
          }
          if (call.name === "Read") {
            const path = readPath(workspace, input?.file_path);
            if (path) {
              run.reads.push({
                path,
                success,
                missing: !success && missingResult(content),
                content: claudeReadContent(content),
              });
            }
          }
        }
      }
      if (event.type === "result") {
        terminal = true;
        run.output = typeof event.result === "string" ? event.result : "";
        run.nativeSuccess =
          event.subtype === "success" &&
          event.is_error !== true &&
          !failed &&
          pending.size === 0 &&
          typeof event.result === "string";
        run.usage = usage(event.usage);
        if (
          typeof event.total_cost_usd === "number" &&
          Number.isFinite(event.total_cost_usd) &&
          event.total_cost_usd >= 0
        ) {
          run.costUsd = event.total_cost_usd;
        }
      }
    } else {
      const item = object(event.item);
      if (item?.type === "error") failed = true;
      if (event.model !== undefined) run.model = reportedModel(event.model);
      if (event.type === "item.started" && item?.type === "command_execution") {
        run.output = "";
        if (typeof item.id === "string") codexPending.add(item.id);
      }
      if (event.type === "item.completed" && item?.type === "agent_message") {
        run.output =
          item.phase !== "commentary" && typeof item.text === "string"
            ? item.text
            : "";
      }
      if (
        event.type === "item.completed" &&
        item?.type === "command_execution"
      ) {
        run.output = "";
        if (typeof item.id === "string") codexPending.delete(item.id);
        const path = commandReadPath(
          item.command,
          workspace,
          commandCwd(event, item, workspace),
        );
        if (path && typeof item.aggregated_output === "string") {
          const content = item.aggregated_output;
          const success =
            item.status === "completed" &&
            item.exit_code === 0 &&
            !truncated(content);
          const read: MatrixRead = {
            path,
            success,
            missing:
              typeof item.exit_code === "number" &&
              item.exit_code !== 0 &&
              missingResult(content),
            content,
          };
          run.reads.push(read);
        }
      }
      if (event.type === "turn.completed" || event.type === "turn.failed") {
        terminal = true;
        run.nativeSuccess =
          event.type === "turn.completed" && !failed && codexPending.size === 0;
        run.usage = usage(event.usage);
      }
    }
  }
  run.complete = terminal;
  if (!terminal) run.error = "Native terminal event was not observed.";
  else if (!run.nativeSuccess)
    run.error = "Native CLI reported an unsuccessful run.";
  return run;
}
