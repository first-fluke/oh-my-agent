import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NATIVE_TRANSCRIPT_BYTE_LIMIT } from "../../io/native-transcript/identity.js";
import { sha256Hex } from "../../utils/hash.js";
import { HarnessDispatchError, runHarnessInvocation } from "./dispatch.js";
import {
  captureHarnessToolTrace,
  HARNESS_TOOL_CALL_LIMIT,
} from "./tool-trace.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixture(
  vendor: "claude" | "codex",
  options: {
    pending?: boolean;
    count?: number;
    value?: string;
    inWorkspace?: boolean;
    stale?: boolean;
    otherWorkspace?: boolean;
    toolName?: string;
  } = {},
) {
  const root = mkdtempSync(join(tmpdir(), "oma-native-tool-trace-"));
  roots.push(root);
  const workspace = join(root, "workspace");
  mkdirSync(workspace);
  const home = options.inWorkspace ? workspace : join(root, "native-home");
  const vendorSid = "aabbccdd-1122-3344-5566-778899aabbcc";
  const startedAt = Date.now();
  const timestamp = new Date(
    startedAt - (options.stale ? 60_000 : 0),
  ).toISOString();
  const cwd = options.otherWorkspace ? root : workspace;
  const request = { command: options.value ?? "secret request" };
  const response = "secret response";
  const rows: unknown[] =
    vendor === "codex"
      ? [{ type: "session_meta", payload: { id: vendorSid, cwd, timestamp } }]
      : [];
  for (let index = 0; index < (options.count ?? 1); index++) {
    const callId = `call-${index}`;
    if (vendor === "claude") {
      rows.push({
        type: "assistant",
        timestamp,
        cwd,
        sessionId: vendorSid,
        message: {
          id: `msg-${index}`,
          content: [
            {
              type: "tool_use",
              id: callId,
              name: options.toolName ?? "Bash",
              input: request,
            },
          ],
        },
      });
      if (!options.pending)
        rows.push({
          type: "user",
          timestamp,
          cwd,
          sessionId: vendorSid,
          message: {
            content: [
              {
                type: "tool_result",
                tool_use_id: callId,
                content: response,
                is_error: true,
              },
            ],
          },
        });
    } else {
      rows.push({
        type: "response_item",
        timestamp,
        payload: {
          type: "function_call",
          call_id: callId,
          name: options.toolName ?? "exec_command",
          arguments: request,
        },
      });
      if (!options.pending)
        rows.push({
          type: "response_item",
          timestamp,
          payload: {
            type: "function_call_output",
            call_id: callId,
            output: response,
          },
        });
    }
  }
  const path =
    vendor === "claude"
      ? join(home, "projects", "fixture", `${vendorSid}.jsonl`)
      : join(home, "sessions", `rollout-${vendorSid}.jsonl`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
  const stdout =
    vendor === "claude"
      ? JSON.stringify({
          type: "result",
          result: "done",
          session_id: vendorSid,
        })
      : JSON.stringify({ type: "thread.started", thread_id: vendorSid });
  const env =
    vendor === "claude" ? { CLAUDE_CONFIG_DIR: home } : { CODEX_HOME: home };
  return {
    vendor,
    stdout,
    workspace,
    startedAt,
    vendorSid,
    env,
    path,
    request,
    response,
  };
}

describe("native harness tool observations", () => {
  it.each(["claude", "codex"] as const)(
    "captures %s call/response identity and digests without payload text",
    (vendor) => {
      const input = fixture(vendor);
      const trace = captureHarnessToolTrace(input);
      expect(trace.status).toBe("captured");
      expect(trace.vendorSessionId).toBe(input.vendorSid);
      expect(trace.calls).toHaveLength(1);
      expect(trace.calls[0]).toMatchObject({
        callId: "call-0",
        request: {
          status: "captured",
          sha256: sha256Hex(JSON.stringify(input.request, null, 2)),
        },
        response: { status: "captured", sha256: sha256Hex(input.response) },
      });
      if (vendor === "claude") expect(trace.calls[0]?.isError).toBe(true);
      expect(JSON.stringify(trace)).not.toContain("secret request");
      expect(JSON.stringify(trace)).not.toContain("secret response");
    },
  );

  it.each(["claude", "codex"] as const)(
    "marks an unanswered %s tool as partial",
    (vendor) => {
      const trace = captureHarnessToolTrace(fixture(vendor, { pending: true }));
      expect(trace.status).toBe("partial");
      expect(trace.calls[0]?.response).toEqual({ status: "missing" });
    },
  );

  it("marks bounded payloads and call-count limits as partial", () => {
    const payload = captureHarnessToolTrace(
      fixture("claude", { value: "x".repeat(25_000) }),
    );
    expect(payload.status).toBe("partial");
    expect(payload.calls[0]?.request.status).toBe("truncated");
    const calls = captureHarnessToolTrace(
      fixture("codex", { count: HARNESS_TOOL_CALL_LIMIT + 1 }),
    );
    expect(calls.status).toBe("partial");
    expect(calls.truncated).toBe(true);
    expect(calls.calls).toHaveLength(HARNESS_TOOL_CALL_LIMIT);
  });

  it.each([{ inWorkspace: true }, { stale: true }, { otherWorkspace: true }])(
    "rejects unrelated or workspace-authored native logs: %j",
    (options) => {
      const trace = captureHarnessToolTrace(fixture("codex", options));
      expect(trace.status).toBe("missing");
      expect(trace.calls).toEqual([]);
    },
  );

  it("does not accept a result from a different fresh Claude session", () => {
    const trace = captureHarnessToolTrace({
      ...fixture("claude"),
      expectedSessionId: "different-session",
    });
    expect(trace.status).toBe("missing");
    expect(trace.vendorSessionId).toBeUndefined();
  });

  it("rejects a vendor log symlink that resolves into evaluated task artifacts", () => {
    const input = fixture("codex");
    const forged = join(input.workspace, "forged-native.jsonl");
    renameSync(input.path, forged);
    symlinkSync(forged, input.path);
    expect(captureHarnessToolTrace(input).status).toBe("missing");
  });

  it("rejects oversized native logs before parsing them", () => {
    const input = fixture("codex");
    truncateSync(input.path, NATIVE_TRANSCRIPT_BYTE_LIMIT + 1);
    const trace = captureHarnessToolTrace(input);
    expect(trace.status).toBe("missing");
    expect(trace.limitations).toContain(
      "Native transcript exceeds its evidence budget",
    );
  });

  it("bounds unexpected tool names without persisting their content", () => {
    const toolName = "confidential-name ".repeat(50);
    const trace = captureHarnessToolTrace(fixture("codex", { toolName }));
    expect(trace.status).toBe("partial");
    expect(trace.truncated).toBe(true);
    expect(trace.calls[0]?.toolName).toBe(`sha256:${sha256Hex(toolName)}`);
    expect(JSON.stringify(trace)).not.toContain("confidential-name");
  });

  it("keeps interrupted Claude observations from its preassigned session without a final envelope", () => {
    const input = fixture("claude", { pending: true });
    const trace = captureHarnessToolTrace({
      ...input,
      stdout: "",
      expectedSessionId: input.vendorSid,
      interrupted: true,
    });
    expect(trace.status).toBe("partial");
    expect(trace.vendorSessionId).toBe(input.vendorSid);
    expect(trace.calls).toHaveLength(1);
    expect(trace.calls[0]?.response.status).toBe("missing");
  });

  it("distinguishes unsupported adapters from missing native evidence", () => {
    const input = fixture("claude");
    expect(captureHarnessToolTrace({ ...input, vendor: "pi" }).status).toBe(
      "unsupported",
    );
    expect(
      captureHarnessToolTrace({ ...input, stdout: "plain answer" }).status,
    ).toBe("missing");
    rmSync(input.path);
    expect(captureHarnessToolTrace(input).status).toBe("missing");
  });

  it("keeps malformed transcript tails and interrupted calls explicitly partial", () => {
    const input = fixture("codex");
    writeFileSync(input.path, '{"type":', { flag: "a" });
    expect(captureHarnessToolTrace(input).status).toBe("partial");
    const completed = fixture("claude");
    expect(
      captureHarnessToolTrace({ ...completed, interrupted: true }).status,
    ).toBe("partial");
  });

  it("captures the exact subprocess transcript and returns its final answer", () => {
    const input = fixture("codex");
    const stdout =
      input.stdout +
      "\n" +
      JSON.stringify({
        type: "item.completed",
        item: { type: "agent_message", text: "done" },
      });
    const invocation = {
      command: process.execPath,
      args: ["-e", `process.stdout.write(${JSON.stringify(stdout)})`],
      env: { PATH: process.env.PATH ?? "", ...input.env },
    };
    const result = runHarnessInvocation(
      invocation,
      input.workspace,
      "prompt",
      null,
      10_000,
      { vendor: "codex" },
    );
    expect(result.output).toBe("done");
    expect(result.toolTrace?.status).toBe("captured");
    try {
      runHarnessInvocation(
        {
          ...invocation,
          args: [
            "-e",
            `process.stdout.write(${JSON.stringify(stdout)});process.exit(3)`,
          ],
        },
        input.workspace,
        "prompt",
        null,
        10_000,
        { vendor: "codex" },
      );
      expect.fail("Expected interrupted subprocess failure");
    } catch (error) {
      expect(error).toBeInstanceOf(HarnessDispatchError);
      expect((error as HarnessDispatchError).toolTrace?.status).toBe("partial");
    }
  });
});
