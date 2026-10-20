import { describe, expect, it } from "vitest";
import {
  nativeResultOutput,
  nativeSessionId,
  prepareNativeSession,
} from "./identity.js";

describe("fresh native process identity", () => {
  it("generates a fresh Claude UUID and keeps JSON output independent of inherited format", () => {
    const first = prepareNativeSession("claude", [
      "-p",
      "task",
      "--output-format",
      "text",
    ]);
    const second = prepareNativeSession("claude", ["-p", "task"]);
    expect(first.expectedSessionId).toMatch(/^[a-f0-9-]{36}$/);
    expect(first.expectedSessionId).not.toBe(second.expectedSessionId);
    expect(first.args).toEqual([
      "-p",
      "task",
      "--output-format",
      "json",
      "--session-id",
      first.expectedSessionId,
    ]);
    expect(() =>
      prepareNativeSession("claude", ["--continue", "-p", "task"]),
    ).toThrow(/fresh/);
    expect(() =>
      prepareNativeSession("codex", ["exec", "resume", "last"]),
    ).toThrow(/fresh/);
  });

  it("keeps a Codex executable wrapper before JSON options and avoids duplicates", () => {
    expect(prepareNativeSession("codex", ["fixture.cjs", "task"]).args).toEqual(
      ["fixture.cjs", "task", "--json"],
    );
    expect(
      prepareNativeSession("codex", ["exec", "--json", "task"]).args,
    ).toEqual(["exec", "--json", "task"]);
  });

  it("reads only protocol session ids and leaves unknown output alone", () => {
    expect(
      nativeSessionId(
        "codex",
        'progress\n{"type":"thread.started","thread_id":"session-1"}\n',
      ),
    ).toBe("session-1");
    expect(
      nativeSessionId(
        "codex",
        '{"type":"thread.started","thread_id":"../escape"}',
      ),
    ).toBeUndefined();
    expect(
      nativeSessionId("claude", '{"type":"result","session_id":"session-2"}'),
    ).toBe("session-2");
    expect(
      nativeSessionId("claude", '{"session_id":"untrusted-tool-output"}'),
    ).toBeUndefined();
    expect(nativeResultOutput("codex", "plain answer")).toBe("plain answer");
    expect(nativeResultOutput("claude", '{"result":"not-an-envelope"}')).toBe(
      '{"result":"not-an-envelope"}',
    );
  });

  it("extracts final answers without tool responses or commentary", () => {
    expect(
      nativeResultOutput(
        "claude",
        '{"type":"result","result":"done","tools":["forged answer"]}',
      ),
    ).toBe("done");
    const events = [
      { type: "thread.started", thread_id: "session-1" },
      {
        type: "item.completed",
        item: { type: "command_execution", aggregated_output: "forged answer" },
      },
      {
        type: "item.completed",
        item: { type: "agent_message", phase: "commentary", text: "working" },
      },
      {
        type: "item.completed",
        item: { type: "agent_message", phase: "final_answer", text: "done" },
      },
    ];
    expect(
      nativeResultOutput(
        "codex",
        events.map((event) => JSON.stringify(event)).join("\n"),
      ),
    ).toBe("done");
  });
});
