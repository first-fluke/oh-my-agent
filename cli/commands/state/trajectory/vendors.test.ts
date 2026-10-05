import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zstdCompressSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emitEvent } from "../../../state/events.js";
import { buildTrajectory, windowTranscript } from "./build.js";
import { parseCodexRows } from "./codex.js";
import { parseCursorRows } from "./cursor.js";
import { parseDshEvents } from "./dsh.js";
import { parseGrokRows } from "./grok.js";
import { parseKimiRows } from "./kimi.js";
import { parseKiroRows } from "./kiro.js";
import { parsePiRows } from "./pi.js";
import { parseQwenRows } from "./qwen.js";

const at = (clock: string): string => `2026-05-25T${clock}.000Z`;
const ms = (clock: string): number => Date.parse(at(clock));

describe("parseQwenRows", () => {
  it("separates thoughts from output and pairs function responses", () => {
    const records = parseQwenRows([
      {
        uuid: "u1",
        type: "user",
        provenance: "real_user",
        timestamp: at("09:00:00"),
        message: { role: "user", parts: [{ text: "read the plan" }] },
      },
      {
        uuid: "s1",
        type: "system",
        subtype: "ui_telemetry",
        timestamp: at("09:00:03"),
      },
      {
        uuid: "a1",
        type: "assistant",
        timestamp: at("09:00:04"),
        model: "qwen-test",
        message: {
          role: "model",
          parts: [
            { text: "the plan lives in docs", thought: true },
            { text: "Reading it." },
            {
              functionCall: {
                id: "call_1",
                name: "read_file",
                args: { path: "docs/plan.md" },
              },
            },
          ],
        },
        usageMetadata: {
          promptTokenCount: 1000,
          cachedContentTokenCount: 600,
          candidatesTokenCount: 80,
          thoughtsTokenCount: 30,
        },
      },
      {
        uuid: "t1",
        type: "tool_result",
        timestamp: at("09:00:06"),
        message: {
          role: "user",
          parts: [
            {
              functionResponse: {
                id: "call_1",
                name: "read_file",
                response: { error: "missing" },
              },
            },
          ],
        },
        toolCallResult: {
          callId: "call_1",
          status: "error",
          resultDisplay: "file not found",
        },
      },
      {
        uuid: "n1",
        type: "user",
        subtype: "notification",
        provenance: "system",
        timestamp: at("09:00:07"),
        message: { role: "user", parts: [{ text: "background task done" }] },
      },
    ]);

    expect(records.map((entry) => entry.kind)).toEqual([
      "user",
      "assistant",
      "tool",
      "context",
    ]);
    expect(records[1]).toMatchObject({
      // Telemetry rows do not move the request start.
      startedAt: ms("09:00:00"),
      durationMs: 4000,
      output: "Reading it.",
      thinking: "the plan lives in docs",
      model: "qwen-test",
      tokens: {
        input: 400,
        cacheRead: 600,
        cacheWrite: 0,
        output: 80,
        think: 30,
      },
    });
    expect(records[2]).toMatchObject({
      text: "read_file docs/plan.md",
      durationMs: 2000,
      isError: true,
      output: "file not found",
    });
  });
});

describe("parsePiRows", () => {
  it("reads tool calls, results, and usage from a session log", () => {
    const records = parsePiRows(
      [
        { type: "session", id: "s", timestamp: at("10:00:00") },
        {
          type: "message",
          id: "m1",
          timestamp: at("10:00:01"),
          message: {
            role: "user",
            content: [{ type: "text", text: "list the files" }],
          },
        },
        {
          type: "message",
          id: "m2",
          timestamp: at("10:00:05"),
          message: {
            role: "assistant",
            model: "pi-test",
            timestamp: ms("10:00:02"),
            content: [
              { type: "thinking", thinking: "use bash" },
              {
                type: "toolCall",
                id: "tc1",
                name: "bash",
                arguments: { command: "ls" },
              },
            ],
            usage: { input: 10, output: 20, cacheRead: 300, cacheWrite: 5 },
          },
        },
        {
          type: "message",
          id: "m3",
          timestamp: at("10:00:06"),
          message: {
            role: "toolResult",
            toolCallId: "tc1",
            toolName: "bash",
            isError: true,
            content: [{ type: "text", text: "ls: denied" }],
          },
        },
      ],
      "pi",
    );

    expect(records.map((entry) => entry.kind)).toEqual([
      "user",
      "assistant",
      "tool",
    ]);
    expect(records[1]).toMatchObject({
      id: "pi:m2",
      text: "→ bash",
      // message.timestamp is when the response began.
      startedAt: ms("10:00:02"),
      durationMs: 3000,
      thinking: "use bash",
      tokens: {
        input: 10,
        cacheRead: 300,
        cacheWrite: 5,
        output: 20,
        think: 0,
      },
    });
    expect(records[2]).toMatchObject({
      text: "bash ls",
      durationMs: 1000,
      isError: true,
      output: "ls: denied",
    });
  });
});

describe("parseKiroRows", () => {
  it("times prompts only and pairs tool results by id", () => {
    const records = parseKiroRows([
      {
        kind: "Prompt",
        data: {
          message_id: "p1",
          content: [{ kind: "text", data: "where do skills go" }],
          meta: { timestamp: ms("11:00:00") / 1000 },
        },
      },
      {
        kind: "AssistantMessage",
        data: {
          message_id: "a1",
          content: [
            { kind: "text", data: "" },
            {
              kind: "toolUse",
              data: {
                toolUseId: "tu1",
                name: "introspect",
                input: { query: "skills" },
              },
            },
          ],
        },
      },
      {
        kind: "ToolResults",
        data: {
          message_id: "r1",
          content: [
            {
              kind: "toolResult",
              data: {
                toolUseId: "tu1",
                status: "error",
                content: [{ kind: "text", data: "no docs" }],
              },
            },
          ],
        },
      },
    ]);

    expect(records.map((entry) => [entry.kind, entry.startedAt])).toEqual([
      ["user", ms("11:00:00")],
      ["assistant", null],
      ["tool", null],
    ]);
    expect(records[1]?.text).toBe("→ introspect");
    expect(records[2]).toMatchObject({
      text: "introspect skills",
      isError: true,
      output: "no docs",
    });
  });
});

describe("parseCursorRows", () => {
  it("unwraps the user query and leaves every record untimed", () => {
    const records = parseCursorRows([
      {
        role: "user",
        message: {
          content: [
            {
              type: "text",
              text: "<user_query>\nare deps current?\n</user_query>",
            },
          ],
        },
      },
      {
        role: "assistant",
        message: {
          content: [
            { type: "text", text: "Checking the manifest." },
            { type: "tool_use", name: "Read", input: { path: "package.json" } },
          ],
        },
      },
    ]);

    expect(records.map((entry) => entry.kind)).toEqual([
      "user",
      "assistant",
      "tool",
    ]);
    expect(records[0]).toMatchObject({
      opensTurn: true,
      text: "are deps current?",
    });
    expect(records[2]?.text).toBe("Read package.json");
    expect(records.every((entry) => entry.startedAt === null)).toBe(true);
  });
});

describe("parseKimiRows", () => {
  const row = (
    clock: string,
    type: string,
    payload: Record<string, unknown>,
  ) => ({
    timestamp: ms(clock) / 1000,
    message: { type, payload },
  });

  it("assembles steps, streamed tool arguments, and subagent events", () => {
    const records = parseKimiRows([
      row("12:00:00", "TurnBegin", { user_input: "fix the test" }),
      row("12:00:00", "StepBegin", { n: 1 }),
      row("12:00:02", "ContentPart", { type: "think", think: "run it first" }),
      row("12:00:03", "ContentPart", { type: "text", text: "Running " }),
      row("12:00:03", "ContentPart", { type: "text", text: "the suite." }),
      row("12:00:04", "ToolCall", {
        type: "function",
        id: "tc1",
        function: { name: "Shell", arguments: '{"command":' },
      }),
      row("12:00:04", "ToolCallPart", { arguments_part: '"bun test"}' }),
      row("12:00:05", "SubagentEvent", {
        parent_tool_call_id: "tc1",
        agent_id: "explorer",
        event: {
          type: "ContentPart",
          payload: { type: "text", text: "looking" },
        },
      }),
      row("12:00:09", "ToolResult", {
        tool_call_id: "tc1",
        return_value: { is_error: true, output: "1 failed", message: "exit 1" },
      }),
      row("12:00:09", "StatusUpdate", {
        token_usage: {
          input_other: 50,
          output: 9,
          input_cache_read: 400,
          input_cache_creation: 7,
        },
      }),
      row("12:00:10", "TurnEnd", {}),
    ]);

    expect(records.map((entry) => [entry.kind, entry.agent])).toEqual([
      ["user", undefined],
      ["assistant", undefined],
      ["tool", undefined],
      ["assistant", "explorer"],
    ]);
    expect(records[1]).toMatchObject({
      startedAt: ms("12:00:00"),
      thinking: "run it first",
      output: "Running the suite.",
      tokens: { input: 50, cacheRead: 400, cacheWrite: 7, output: 9, think: 0 },
    });
    expect(records[2]).toMatchObject({
      text: "Shell bun test",
      input: '{"command":"bun test"}',
      durationMs: 5000,
      isError: true,
      output: "1 failed\nexit 1",
    });
    expect(records[3]).toMatchObject({
      parentCallId: "tc1",
      output: "looking",
    });
    expect(records[3]?.opensTurn).toBeUndefined();
  });
});

describe("transcripts without timestamps", () => {
  let projectDir: string;
  let home: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-trajectory-vendors-"));
    home = mkdtempSync(join(tmpdir(), "oma-trajectory-vendors-home-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  it("places untimed records at the time of the record before them", () => {
    const kept = windowTranscript(
      [
        {
          id: "old",
          kind: "user",
          text: "old",
          startedAt: ms("08:00:00"),
          durationMs: null,
          opensTurn: true,
        },
        {
          id: "old-answer",
          kind: "assistant",
          text: "old",
          startedAt: null,
          durationMs: null,
        },
        {
          id: "now",
          kind: "user",
          text: "now",
          startedAt: ms("10:00:05"),
          durationMs: null,
          opensTurn: true,
        },
        {
          id: "now-answer",
          kind: "assistant",
          text: "now",
          startedAt: null,
          durationMs: null,
        },
      ],
      ms("10:00:00"),
      Number.POSITIVE_INFINITY,
    );
    expect(kept.map((entry) => [entry.record.id, entry.at])).toEqual([
      ["now", ms("10:00:05")],
      ["now-answer", ms("10:00:05")],
    ]);
  });

  it("shows a fully untimed transcript whole, anchored where the session met it", () => {
    const dir = join(
      home,
      ".cursor",
      "projects",
      "work-app",
      "agent-transcripts",
      "cursor-1",
    );
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "cursor-1.jsonl"),
      `${[
        {
          role: "user",
          message: {
            content: [{ type: "text", text: "<user_query>first</user_query>" }],
          },
        },
        {
          role: "assistant",
          message: { content: [{ type: "text", text: "done" }] },
        },
      ]
        .map((entry) => JSON.stringify(entry))
        .join("\n")}\n`,
    );
    emitEvent(projectDir, "oma-cursor", {
      kind: "session.created",
      ts: at("10:00:00"),
      vendor: "cursor",
      vendorSid: "cursor-1",
      payload: { workflow: "work", category: "main" },
    });
    emitEvent(projectDir, "oma-cursor", {
      kind: "workflow.phase",
      ts: at("10:05:00"),
      payload: { phase: "verify" },
    });

    const trajectory = buildTrajectory("oma-cursor", {
      projectDir,
      home,
      env: {},
    });
    expect(trajectory.vendorSessions[0]).toMatchObject({
      vendor: "cursor",
      status: "loaded",
      records: 2,
      timing: "none",
    });
    expect(
      trajectory.records.map((entry) => [
        entry.kind === "oma" ? entry.event?.kind : entry.kind,
        entry.startedAt,
      ]),
    ).toEqual([
      ["session.created", ms("10:00:00")],
      ["user", null],
      ["assistant", null],
      ["workflow.phase", ms("10:05:00")],
    ]);
  });

  it("finds a transcript through a vendor home another session recorded", () => {
    const codexHome = join(home, "accounts", "work");
    mkdirSync(join(codexHome, "sessions"), { recursive: true });
    writeFileSync(
      join(codexHome, "sessions", "rollout-codex-old.jsonl"),
      `${JSON.stringify({
        type: "response_item",
        timestamp: at("10:00:02"),
        payload: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "an older prompt" }],
        },
      })}\n`,
    );
    emitEvent(projectDir, "oma-old", {
      kind: "session.created",
      ts: at("10:00:00"),
      vendor: "codex",
      vendorSid: "codex-old",
      payload: { workflow: "work", category: "main" },
    });
    expect(
      buildTrajectory("oma-old", { projectDir, home, env: {} })
        .vendorSessions[0]?.status,
    ).toBe("missing");

    emitEvent(projectDir, "oma-new", {
      kind: "session.created",
      ts: at("11:00:00"),
      vendor: "codex",
      vendorSid: "codex-new",
      payload: { workflow: "work", category: "main", vendorHome: codexHome },
    });
    expect(
      buildTrajectory("oma-old", { projectDir, home, env: {} })
        .vendorSessions[0],
    ).toMatchObject({ status: "loaded", records: 1 });
  });
});

describe("time to first token", () => {
  it("lands on the first response of a Codex task", () => {
    const records = parseCodexRows([
      {
        type: "event_msg",
        timestamp: at("13:00:00"),
        payload: { type: "task_started" },
      },
      {
        type: "response_item",
        timestamp: at("13:00:04"),
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "first" }],
        },
      },
      {
        type: "event_msg",
        timestamp: at("13:00:04"),
        payload: { type: "token_count", info: null },
      },
      {
        type: "response_item",
        timestamp: at("13:00:09"),
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "second" }],
        },
      },
      {
        type: "event_msg",
        timestamp: at("13:00:09"),
        payload: { type: "task_complete", time_to_first_token_ms: 1500 },
      },
    ]);
    expect(records.map((entry) => entry.ttftMs)).toEqual([1500, undefined]);
  });

  it("is the gap between stream start and the first Grok chunk", () => {
    const records = parseGrokRows([
      {
        timestamp: ms("13:00:03") / 1000,
        params: {
          update: {
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text: "hi" },
          },
          _meta: {
            agentTimestampMs: ms("13:00:03"),
            streamStartMs: ms("13:00:01"),
          },
        },
      },
    ]);
    expect(records[0]).toMatchObject({
      startedAt: ms("13:00:01"),
      ttftMs: 2000,
    });
  });
});

describe("parseCursorRows failures", () => {
  it("keeps the error of a turn that produced nothing else", () => {
    const records = parseCursorRows([
      { type: "turn_ended", status: "error", error: "You're out of usage." },
    ]);
    expect(records).toMatchObject([
      { kind: "context", isError: true, input: "You're out of usage." },
    ]);
  });
});

describe("session window", () => {
  let projectDir: string;
  let home: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-trajectory-window-"));
    home = mkdtempSync(join(tmpdir(), "oma-trajectory-window-home-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  function writeClaude(prompts: string[]): void {
    const dir = join(home, ".claude", "projects", "-work-app");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "claude-1.jsonl"),
      `${prompts
        .map((clock, index) =>
          JSON.stringify({
            type: "user",
            uuid: `u${index}`,
            timestamp: at(clock),
            message: { role: "user", content: `prompt at ${clock}` },
          }),
        )
        .join("\n")}\n`,
    );
  }

  function prompts(sid: string): string[] {
    return buildTrajectory(sid, { projectDir, home, env: {} })
      .records.filter((entry) => entry.kind === "user")
      .map((entry) => entry.text);
  }

  it("ends an unfinished session where its successor begins", () => {
    writeClaude(["10:00:00", "10:30:00", "11:00:00"]);
    emitEvent(projectDir, "oma-first", {
      kind: "session.created",
      ts: at("10:00:01"),
      vendor: "claude",
      vendorSid: "claude-1",
      payload: { workflow: "work", category: "main" },
    });
    emitEvent(projectDir, "oma-second", {
      kind: "session.created",
      ts: at("11:00:01"),
      vendor: "claude",
      vendorSid: "claude-1",
      payload: { workflow: "work", category: "main" },
    });
    expect(prompts("oma-first")).toEqual([
      "prompt at 10:00:00",
      "prompt at 10:30:00",
    ]);
  });

  it("follows a session that kept emitting after its successor began", () => {
    writeClaude(["10:00:00", "11:30:00", "13:00:00"]);
    emitEvent(projectDir, "oma-first", {
      kind: "session.created",
      ts: at("10:00:01"),
      vendor: "claude",
      vendorSid: "claude-1",
      payload: { workflow: "work", category: "main" },
    });
    emitEvent(projectDir, "oma-second", {
      kind: "session.created",
      ts: at("11:00:00"),
      payload: { workflow: "work", category: "main" },
    });
    emitEvent(projectDir, "oma-first", {
      kind: "workflow.phase",
      ts: at("12:00:00"),
      payload: { phase: "verify" },
    });
    // The turn in flight at the last event stays; the one after it does not.
    expect(prompts("oma-first")).toEqual([
      "prompt at 10:00:00",
      "prompt at 11:30:00",
    ]);
  });
});

describe("DeepSeek Harness", () => {
  const event = (
    clock: string,
    type: string,
    data: Record<string, unknown>,
  ) => ({
    type,
    time: ms(clock),
    data,
  });
  const LOG = [
    { type: "session", version: 4, id: "dsh-1", cwd: "/work/app" },
    event("14:00:00", "turn/start", { turn: 1 }),
    // The step opens before its prompt is appended.
    event("14:00:00", "step/start", { turn: 1, step: 1 }),
    event("14:00:01", "system/message", {
      message: {
        role: "system",
        content: [{ type: "text", text: "be brief" }],
      },
    }),
    event("14:00:02", "user/message", {
      content: [{ type: "text", text: "run the check" }],
      source: { kind: "user" },
    }),
    event("14:00:09", "assistant/message", {
      turn: 1,
      step: 1,
      message: {
        role: "assistant",
        content: [
          { type: "reasoning", text: "one shell call" },
          {
            type: "tool-call",
            id: "c1",
            name: "bash",
            arguments: '{"command":"make check"}',
          },
        ],
        source: { kind: "model", model: "deepseek-test" },
      },
      usage: {
        inputTokens: 100,
        outputTokens: 40,
        cacheReadTokens: 900,
        reasoningTokens: 15,
      },
      stream: [
        { type: "chunk", time: ms("14:00:05"), chunk: { type: "block-start" } },
        { type: "chunk", time: ms("14:00:08"), chunk: { type: "finish" } },
      ],
    }),
    event("14:00:09", "tool/call", {
      turn: 1,
      step: 1,
      callId: "c1",
      name: "bash",
      arguments: '{"command":"make check"}',
    }),
    event("14:00:12", "tool/result", {
      message: {
        role: "tool",
        toolCallId: "c1",
        isError: true,
        content: [{ type: "text", text: "2 checks failed" }],
      },
      error: { name: "CommandFailedError", code: "COMMAND_FAILED" },
    }),
    event("14:00:13", "user/message", {
      content: [{ type: "text", text: "validation feedback" }],
      source: { kind: "oma-hook" },
    }),
    event("14:00:20", "turn/end", { turn: 1 }),
  ];

  it("reads steps, tool results, usage, and first-token timing", () => {
    const records = parseDshEvents(LOG);
    expect(records.map((entry) => entry.kind)).toEqual([
      "context",
      "user",
      "assistant",
      "tool",
      "context",
    ]);
    expect(records[2]).toMatchObject({
      text: "→ bash",
      // Not the step start (14:00:00): the prompt arrived at 14:00:02.
      startedAt: ms("14:00:02"),
      durationMs: 6000,
      ttftMs: 5000,
      model: "deepseek-test",
      thinking: "one shell call",
      tokens: {
        input: 100,
        cacheRead: 900,
        cacheWrite: 0,
        output: 40,
        think: 15,
      },
    });
    expect(records[3]).toMatchObject({
      text: "bash make check",
      durationMs: 3000,
      isError: true,
      output: "CommandFailedError COMMAND_FAILED\n2 checks failed",
    });
    // A hook's user-role message is context, not a prompt.
    expect(records[4]?.kind).toBe("context");
  });

  it("reads the format 3 result shape, nested in a content block", () => {
    const records = parseDshEvents([
      event("14:00:09", "tool/call", {
        callId: "c1",
        name: "bash",
        arguments: "{}",
      }),
      event("14:00:10", "tool/result", {
        message: {
          role: "user",
          source: { kind: "tool", callId: "c1" },
          content: [
            {
              type: "tool-result",
              toolCallId: "c1",
              isError: true,
              content: [{ type: "text", text: "nope" }],
            },
          ],
        },
      }),
    ]);
    expect(records[0]).toMatchObject({
      isError: true,
      output: "nope",
      durationMs: 1000,
    });
  });

  describe("session log on disk", () => {
    let projectDir: string;
    let home: string;

    beforeEach(() => {
      projectDir = mkdtempSync(join(tmpdir(), "oma-trajectory-dsh-"));
      home = mkdtempSync(join(tmpdir(), "oma-trajectory-dsh-home-"));
    });

    afterEach(() => {
      rmSync(projectDir, { recursive: true, force: true });
      rmSync(home, { recursive: true, force: true });
    });

    it("joins a Zstandard log through the session the plugin announced", () => {
      const dshHome = join(home, "harness");
      const dir = join(dshHome, "sessions", "--work-app--", "dsh-1");
      mkdirSync(dir, { recursive: true });
      const lines = LOG.map((entry) => JSON.stringify(entry));
      // An older generation is ignored in favour of the newest one.
      writeFileSync(join(dir, "session.v3.jsonl"), `${lines[0]}\n`);
      // The writer emits one frame for the header and one per append batch.
      writeFileSync(
        join(dir, "session.v4.jsonl.zstd"),
        Buffer.concat([
          zstdCompressSync(Buffer.from(`${lines[0]}\n`)),
          zstdCompressSync(Buffer.from(`${lines.slice(1).join("\n")}\n`)),
        ]),
      );
      emitEvent(projectDir, "oma-dsh", {
        kind: "session.created",
        ts: at("14:00:00"),
        payload: { workflow: "work", category: "main" },
      });
      // What the DSH plugin emits: the session is named only in the payload.
      emitEvent(projectDir, "oma-dsh", {
        kind: "boundary",
        ts: at("14:00:01"),
        payload: {
          reason: "dsh-session",
          toVendor: "dsh",
          toVendorSid: "dsh-1",
          vendorHome: dshHome,
        },
      });

      const trajectory = buildTrajectory("oma-dsh", {
        projectDir,
        home,
        env: {},
      });
      expect(trajectory.vendorSessions).toMatchObject([
        {
          vendor: "dsh",
          vendorSid: "dsh-1",
          status: "loaded",
          records: 5,
          timing: "full",
        },
      ]);
      expect(trajectory.vendorSessions[0]?.sourcePath).toMatch(
        /session\.v4\.jsonl\.zstd$/,
      );
      expect(trajectory.totals).toMatchObject({
        turns: 1,
        toolCalls: 1,
        toolErrors: 1,
      });
    });
  });
});
