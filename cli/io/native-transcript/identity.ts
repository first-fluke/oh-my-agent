import { randomUUID } from "node:crypto";
import {
  closeSync,
  fstatSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import { homedir } from "node:os";
import { relative, resolve, sep } from "node:path";
import { sha256Hex } from "../../utils/hash.js";
import {
  findClaudeTranscriptPath,
  loadClaudeTranscript,
  parseClaudeRows,
} from "./claude.js";
import { findCodexTranscriptPath, parseCodexRows } from "./codex.js";
import { isSafeVendorSid } from "./text.js";
import type { TranscriptRecord } from "./types.js";

export const NATIVE_TRANSCRIPT_BYTE_LIMIT = 16 * 1024 * 1024;

/** Each observed subprocess starts a new native session and exposes its id. */
export function prepareNativeSession(
  vendor: string,
  input: string[],
): { args: string[]; expectedSessionId?: string } {
  const args = [...input];
  if (vendor === "claude") {
    if (
      args.some((arg) =>
        ["--resume", "--continue", "-r", "-c", "--fork-session"].includes(arg),
      )
    )
      throw new Error(
        "Native transcript capture requires a fresh Claude session",
      );
    const sessionIndex = args.indexOf("--session-id");
    if (sessionIndex >= 0) args.splice(sessionIndex, 2);
    const expectedSessionId = randomUUID();
    args.push("--session-id", expectedSessionId);
    const formatIndex = args.indexOf("--output-format");
    if (formatIndex >= 0)
      args.splice(formatIndex, 2, "--output-format", "json");
    else args.push("--output-format", "json");
    return { args, expectedSessionId };
  }
  if (vendor === "codex") {
    if (
      ["resume", "fork"].includes(args[0] ?? "") ||
      (args[0] === "exec" && ["resume", "fork"].includes(args[1] ?? ""))
    )
      throw new Error(
        "Native transcript capture requires a fresh Codex session",
      );
    if (!args.includes("--json")) args.push("--json");
  }
  return { args };
}

/** Only native protocol metadata can identify the just-finished process. */
export function nativeSessionId(
  vendor: string,
  stdout: string,
): string | undefined {
  if (vendor !== "claude" && vendor !== "codex") return undefined;
  const candidates = vendor === "claude" ? [stdout] : stdout.split(/\r?\n/);
  for (const text of candidates) {
    try {
      const row = JSON.parse(text) as Record<string, unknown>;
      const id =
        vendor === "claude"
          ? row.type === "result" || typeof row.is_error === "boolean"
            ? row.session_id
            : undefined
          : row.type === "thread.started"
            ? row.thread_id
            : undefined;
      if (typeof id === "string" && isSafeVendorSid(id)) return id;
    } catch {
      // Progress lines and interrupted final JSON are not session identities.
    }
  }
  return undefined;
}

/** Preserve the final answer when observation enables Codex JSONL output. */
export function nativeResultOutput(vendor: string, stdout: string): string {
  if (vendor === "claude") {
    try {
      const result = JSON.parse(stdout) as Record<string, unknown>;
      if (
        (result.type === "result" || typeof result.is_error === "boolean") &&
        typeof result.result === "string"
      )
        return result.result;
    } catch {
      /* Plain output from older CLIs stays unchanged. */
    }
    return stdout;
  }
  if (vendor !== "codex" || !nativeSessionId(vendor, stdout)) return stdout;
  const answers: string[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    try {
      const event = JSON.parse(line) as {
        type?: string;
        item?: { type?: string; text?: string; phase?: string };
      };
      if (
        event.type === "item.completed" &&
        event.item?.type === "agent_message" &&
        event.item.phase !== "commentary" &&
        typeof event.item.text === "string"
      )
        answers.push(event.item.text);
    } catch {
      /* Non-protocol progress output is not part of the answer. */
    }
  }
  return answers.join("\n\n");
}

export interface BoundNativeTranscriptOptions {
  vendor: string;
  vendorSid: string;
  workspace: string;
  startedAt: number;
  expectedSessionId?: string;
  home?: string;
  env?: NodeJS.ProcessEnv;
  includeNestedAgents?: boolean;
}

export type BoundNativeTranscript =
  | {
      status: "loaded";
      records: TranscriptRecord[];
      sourceHash: string;
      sourcePath: string;
      complete: boolean;
    }
  | { status: "missing"; reason: string };

/** Read only the new native session whose header names this exact workspace. */
export function loadBoundNativeTranscript(
  options: BoundNativeTranscriptOptions,
): BoundNativeTranscript {
  const missing = (reason: string): BoundNativeTranscript => ({
    status: "missing",
    reason,
  });
  if (
    options.expectedSessionId &&
    options.expectedSessionId !== options.vendorSid
  )
    return missing(
      "Native result session does not match the requested fresh session",
    );
  const locate =
    options.vendor === "claude"
      ? findClaudeTranscriptPath
      : options.vendor === "codex"
        ? findCodexTranscriptPath
        : undefined;
  if (!locate) return missing("Native transcript adapter is unavailable");
  try {
    const roots = {
      home: options.home ?? homedir(),
      env: options.env ?? process.env,
      projectDir: options.workspace,
      includeNestedAgents: options.includeNestedAgents ?? false,
      maxBytes: NATIVE_TRANSCRIPT_BYTE_LIMIT,
    };
    const located = locate(options.vendorSid, roots);
    if (!located) return missing("Native session transcript is missing");
    const sourcePath = realpathSync(located);
    const workspace = realpathSync(options.workspace);
    const path = relative(workspace, sourcePath);
    if (
      !path ||
      (!path.startsWith(`..${sep}`) && path !== ".." && !path.startsWith(sep))
    )
      return missing(
        "Evaluated workspace artifacts cannot supply native transcript evidence",
      );
    const fd = openSync(sourcePath, "r");
    let source: string;
    try {
      const stat = fstatSync(fd);
      if (stat.size > NATIVE_TRANSCRIPT_BYTE_LIMIT)
        return missing("Native transcript exceeds its evidence budget");
      if (stat.mtimeMs < options.startedAt - 1000)
        return missing("Native transcript predates this dispatch");
      const buffer = Buffer.alloc(stat.size + 1);
      let bytes = 0;
      while (bytes < buffer.length) {
        const read = readSync(fd, buffer, bytes, buffer.length - bytes, bytes);
        if (read === 0) break;
        bytes += read;
      }
      if (bytes !== stat.size)
        return missing("Native transcript changed during capture");
      source = buffer.subarray(0, bytes).toString("utf-8");
    } finally {
      closeSync(fd);
    }
    let complete = true;
    const rows = source
      .split(/\r?\n/)
      .filter(Boolean)
      .flatMap((line) => {
        try {
          const row: unknown = JSON.parse(line);
          if (!row || typeof row !== "object" || Array.isArray(row)) {
            complete = false;
            return [];
          }
          return [row as Record<string, unknown>];
        } catch {
          complete = false;
          return [];
        }
      });
    const header =
      options.vendor === "codex"
        ? (rows.find((row) => row.type === "session_meta")?.payload as
            | Record<string, unknown>
            | undefined)
        : rows.find(
            (row) =>
              row.sessionId === options.vendorSid &&
              typeof row.cwd === "string",
          );
    const id = options.vendor === "codex" ? header?.id : header?.sessionId;
    const timestamp = header?.timestamp;
    const started =
      typeof timestamp === "string"
        ? Date.parse(timestamp)
        : typeof timestamp === "number"
          ? timestamp
          : NaN;
    if (
      id !== options.vendorSid ||
      typeof header?.cwd !== "string" ||
      realpathSync(resolve(header.cwd)) !== workspace
    )
      return missing(
        "Native transcript session or workspace does not match this dispatch",
      );
    if (
      !Number.isFinite(started) ||
      started < options.startedAt - 1000 ||
      started > Date.now() + 1000
    )
      return missing("Native transcript has no fresh session timestamp");
    const records =
      options.vendor === "codex" ? parseCodexRows(rows) : parseClaudeRows(rows);
    if (options.includeNestedAgents && options.vendor === "claude") {
      const loaded = loadClaudeTranscript(options.vendorSid, roots);
      records.push(
        ...(loaded?.records.filter((record) => record.agent !== undefined) ??
          []),
      );
    }
    return {
      status: "loaded",
      records,
      sourceHash: sha256Hex(source),
      sourcePath,
      complete,
    };
  } catch {
    return missing("Native transcript could not be validated or parsed");
  }
}
