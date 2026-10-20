import {
  loadBoundNativeTranscript,
  nativeSessionId,
} from "../../io/native-transcript/identity.js";
import { sha256Hex } from "../../utils/hash.js";
import type {
  HarnessNativeToolTrace,
  HarnessToolPayloadDigest,
} from "./types.js";

export const HARNESS_TOOL_CALL_LIMIT = 200;
const DETAIL_TRUNCATION = /\n… \[truncated \d+ chars\]$/;
const TOOL_IDENTIFIER = /^[A-Za-z0-9_.:/-]{1,128}$/;

function boundedIdentifier(value: string): string {
  return TOOL_IDENTIFIER.test(value) ? value : `sha256:${sha256Hex(value)}`;
}

function payloadDigest(value: string | undefined): HarnessToolPayloadDigest {
  if (value === undefined) return { status: "missing" };
  return {
    status: DETAIL_TRUNCATION.test(value) ? "truncated" : "captured",
    sha256: sha256Hex(value),
    bytes: Buffer.byteLength(value),
  };
}

/** Native logs remain local; tool payloads are represented only by digests. */
export function captureHarnessToolTrace(options: {
  vendor: string;
  stdout: string;
  workspace: string;
  startedAt: number;
  expectedSessionId?: string;
  env?: NodeJS.ProcessEnv;
  home?: string;
  interrupted?: boolean;
}): HarnessNativeToolTrace {
  const supported = options.vendor === "claude" || options.vendor === "codex";
  const trace: HarnessNativeToolTrace = {
    status: supported ? "missing" : "unsupported",
    vendor: options.vendor,
    scope: "root-session",
    calls: [],
    truncated: false,
    limitations: [
      "Only root-session tool observations are captured; payload digests cannot replay tool responses or external state",
    ],
  };
  if (!supported) return trace;
  const reportedSessionId = nativeSessionId(options.vendor, options.stdout);
  const vendorSid =
    reportedSessionId ??
    (options.vendor === "claude" ? options.expectedSessionId : undefined);
  if (!vendorSid) {
    trace.limitations.push(
      "Native process output did not identify its session",
    );
    return trace;
  }
  const loaded = loadBoundNativeTranscript({ ...options, vendorSid });
  if (loaded.status !== "loaded") {
    trace.limitations.push(loaded.reason);
    return trace;
  }
  trace.vendorSessionId = vendorSid;
  trace.transcriptHash = loaded.sourceHash;
  const tools = loaded.records.filter((record) => record.kind === "tool");
  trace.calls = tools.slice(0, HARNESS_TOOL_CALL_LIMIT).map((record) => ({
    callId: boundedIdentifier(record.callId ?? record.id),
    toolName: boundedIdentifier(record.toolName ?? "tool"),
    startedAt: record.startedAt,
    durationMs: record.durationMs,
    ...(record.isError === undefined ? {} : { isError: record.isError }),
    request: payloadDigest(record.input),
    response: payloadDigest(record.output),
  }));
  trace.truncated =
    tools.length > HARNESS_TOOL_CALL_LIMIT ||
    tools.some(
      (record) =>
        !TOOL_IDENTIFIER.test(record.callId ?? record.id) ||
        !TOOL_IDENTIFIER.test(record.toolName ?? "tool"),
    );
  const partial =
    options.interrupted ||
    !reportedSessionId ||
    !loaded.complete ||
    trace.truncated ||
    trace.calls.some(
      (call) =>
        call.request.status !== "captured" ||
        call.response.status !== "captured",
    );
  trace.status = partial ? "partial" : "captured";
  if (partial)
    trace.limitations.push(
      "Tool observations are incomplete, interrupted, or exceed the capture budget",
    );
  return trace;
}
