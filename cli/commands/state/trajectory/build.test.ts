import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emitEvent } from "../../../state/events.js";
import { parseAntigravityRows } from "./antigravity.js";
import { buildTrajectory, windowTranscript } from "./build.js";
import { parseClaudeRows } from "./claude.js";
import { parseCodexRows } from "./codex.js";
import { parseGrokRows } from "./grok.js";
import { renderTrajectory } from "./render.js";
import type { TranscriptRecord } from "./types.js";

const at = (clock: string): string => `2026-05-25T${clock}.000Z`;
const ms = (clock: string): number => Date.parse(at(clock));

function jsonl(rows: unknown[]): string {
  return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

const CLAUDE_ROWS = [
  {
    type: "user",
    uuid: "u1",
    timestamp: at("10:00:00"),
    message: { role: "user", content: "fix the login bug" },
  },
  {
    type: "assistant",
    uuid: "a1",
    timestamp: at("10:00:04"),
    message: {
      id: "msg_1",
      model: "claude-test",
      content: [{ type: "thinking", thinking: "look at auth first" }],
      usage: { input_tokens: 5, output_tokens: 10 },
    },
  },
  {
    type: "assistant",
    uuid: "a2",
    timestamp: at("10:00:06"),
    message: {
      id: "msg_1",
      model: "claude-test",
      content: [
        {
          type: "tool_use",
          id: "toolu_1",
          name: "Bash",
          input: { command: "bun test auth" },
        },
      ],
      usage: {
        input_tokens: 5,
        cache_read_input_tokens: 100,
        cache_creation_input_tokens: 20,
        output_tokens: 40,
        output_tokens_details: { thinking_tokens: 12 },
      },
    },
  },
  {
    type: "user",
    uuid: "u2",
    timestamp: at("10:00:09"),
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: "toolu_1",
          is_error: true,
          content: [{ type: "text", text: "1 test failed" }],
        },
      ],
    },
  },
  {
    type: "assistant",
    uuid: "a3",
    timestamp: at("10:00:15"),
    message: {
      id: "msg_2",
      content: [{ type: "text", text: "The token check was inverted." }],
      usage: { input_tokens: 7, output_tokens: 9 },
    },
  },
  { type: "system", subtype: "turn_duration", timestamp: at("10:00:15") },
  {
    type: "user",
    uuid: "u3",
    timestamp: at("10:30:00"),
    message: {
      role: "user",
      content: "<task-notification>background job finished</task-notification>",
    },
  },
];

describe("parseClaudeRows", () => {
  it("groups message rows, pairs tool results, and reads usage", () => {
    const records = parseClaudeRows(CLAUDE_ROWS);
    expect(records.map((record) => record.kind)).toEqual([
      "user",
      "assistant",
      "tool",
      "assistant",
      "context",
    ]);

    const [prompt, step, call, answer, notification] = records;
    expect(prompt).toMatchObject({
      opensTurn: true,
      text: "fix the login bug",
    });
    // The request starts at the prompt and ends with its last block.
    expect(step).toMatchObject({
      startedAt: ms("10:00:00"),
      durationMs: 6000,
      thinking: "look at auth first",
      text: "→ Bash",
      model: "claude-test",
      tokens: {
        input: 5,
        cacheRead: 100,
        cacheWrite: 20,
        output: 40,
        think: 12,
      },
    });
    expect(call).toMatchObject({
      toolName: "Bash",
      callId: "toolu_1",
      text: "Bash bun test auth",
      startedAt: ms("10:00:06"),
      durationMs: 3000,
      isError: true,
      output: "1 test failed",
    });
    expect(answer).toMatchObject({
      startedAt: ms("10:00:09"),
      durationMs: 6000,
      output: "The token check was inverted.",
    });
    // A turn resumed by a notification opens a turn without a user prompt.
    expect(notification).toMatchObject({ kind: "context", opensTurn: true });
  });

  it("marks nested agent records and never lets them open a turn", () => {
    const records = parseClaudeRows(CLAUDE_ROWS.slice(0, 4), {
      agent: "reviewer",
      parentCallId: "toolu_parent",
    });
    expect(records.map((record) => record.kind)).toEqual([
      "context",
      "assistant",
      "subtool",
    ]);
    for (const record of records) {
      expect(record).toMatchObject({
        agent: "reviewer",
        parentCallId: "toolu_parent",
      });
      expect(record.opensTurn).toBeUndefined();
    }
  });
});

const CODEX_ROWS = [
  {
    type: "event_msg",
    timestamp: at("11:00:00"),
    payload: { type: "task_started" },
  },
  {
    type: "response_item",
    timestamp: at("11:00:00"),
    payload: {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "<environment_context>cwd</environment_context>",
        },
      ],
    },
  },
  {
    type: "response_item",
    timestamp: at("11:00:01"),
    payload: {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: "run the linter" }],
      internal_chat_message_metadata_passthrough: {
        content_item_kinds: ["user.text"],
      },
    },
  },
  {
    type: "response_item",
    timestamp: at("11:00:05"),
    payload: {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: "Running it now." }],
    },
  },
  {
    type: "response_item",
    timestamp: at("11:00:05"),
    payload: {
      type: "function_call",
      name: "shell",
      call_id: "call_1",
      arguments: JSON.stringify({ command: "bun run lint" }),
    },
  },
  {
    type: "event_msg",
    timestamp: at("11:00:05"),
    payload: {
      type: "token_count",
      info: {
        last_token_usage: {
          input_tokens: 1000,
          cached_input_tokens: 800,
          output_tokens: 50,
          reasoning_output_tokens: 20,
        },
      },
    },
  },
  {
    type: "response_item",
    timestamp: at("11:00:07"),
    payload: {
      type: "function_call_output",
      call_id: "call_1",
      output: "no issues",
    },
  },
  {
    type: "event_msg",
    timestamp: at("12:00:00"),
    payload: { type: "task_started" },
  },
  {
    type: "response_item",
    timestamp: at("12:00:03"),
    payload: {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: "Follow-up finished." }],
    },
  },
];

describe("parseCodexRows", () => {
  it("folds a response into one step and pairs tool output", () => {
    const records = parseCodexRows(CODEX_ROWS);
    expect(records.map((record) => record.kind)).toEqual([
      "context",
      "user",
      "assistant",
      "tool",
      "assistant",
    ]);

    const [context, prompt, step, call, resumed] = records;
    // Injected context and the prompt it precedes share one turn.
    expect(context?.opensTurn).toBe(true);
    expect(prompt?.opensTurn).toBeUndefined();
    expect(prompt?.text).toBe("run the linter");
    expect(step).toMatchObject({
      startedAt: ms("11:00:01"),
      durationMs: 4000,
      output: "Running it now.",
      // Cached tokens are reported inside input_tokens.
      tokens: {
        input: 200,
        cacheRead: 800,
        cacheWrite: 0,
        output: 50,
        think: 20,
      },
    });
    expect(call).toMatchObject({
      toolName: "shell",
      text: "shell bun run lint",
      durationMs: 2000,
      output: "no issues",
    });
    // A task resumed without a prompt starts timing at task_started.
    expect(resumed).toMatchObject({
      opensTurn: true,
      startedAt: ms("12:00:00"),
      durationMs: 3000,
    });
  });
});

const iso = (clock: string): string => `2026-05-25T${clock}Z`;

describe("parseAntigravityRows", () => {
  it("pairs tool results with calls in order", () => {
    const records = parseAntigravityRows([
      {
        step_index: 0,
        source: "USER_EXPLICIT",
        type: "USER_INPUT",
        created_at: iso("13:00:00"),
        content:
          "<USER_REQUEST>\ngenerate the icon\n</USER_REQUEST>\n<ADDITIONAL_METADATA>x</ADDITIONAL_METADATA>",
      },
      {
        step_index: 1,
        source: "SYSTEM_SDK",
        type: "EPHEMERAL_MESSAGE",
        created_at: iso("13:00:01"),
        content: "workspace reminder",
      },
      {
        step_index: 2,
        source: "MODEL",
        type: "PLANNER_RESPONSE",
        created_at: iso("13:00:05"),
        thinking: "two lookups first",
        input_tokens: 500,
        cache_read_tokens: 2000,
        output_tokens: 80,
        tool_calls: [
          {
            name: "view_file",
            args: { AbsolutePath: "/a", toolAction: "Viewing a" },
          },
          { name: "run_command", args: { CommandLine: "ls" } },
        ],
      },
      {
        step_index: 3,
        source: "MODEL",
        type: "GENERIC",
        status: "DONE",
        created_at: iso("13:00:07"),
        content: "file body",
      },
      {
        step_index: 4,
        source: "MODEL",
        type: "GENERIC",
        status: "ERROR",
        error: "exit 1",
        created_at: iso("13:00:09"),
        content: "ls failed",
      },
      {
        step_index: 5,
        source: "MODEL",
        type: "PLANNER_RESPONSE",
        created_at: iso("13:00:12"),
        content: "Done.",
      },
    ]);

    expect(records.map((entry) => entry.kind)).toEqual([
      "user",
      "context",
      "assistant",
      "tool",
      "tool",
      "assistant",
    ]);
    expect(records[0]).toMatchObject({
      opensTurn: true,
      text: "generate the icon",
    });
    expect(records[2]).toMatchObject({
      text: "→ view_file, run_command",
      startedAt: ms("13:00:01"),
      durationMs: 4000,
      thinking: "two lookups first",
      tokens: {
        input: 500,
        cacheRead: 2000,
        cacheWrite: 0,
        output: 80,
        think: 0,
      },
    });
    expect(records[3]).toMatchObject({
      text: "view_file Viewing a",
      durationMs: 2000,
      output: "file body",
    });
    expect(records[3]?.isError).toBeUndefined();
    expect(records[4]).toMatchObject({
      toolName: "run_command",
      durationMs: 4000,
      isError: true,
      output: "exit 1\n\nls failed",
    });
    expect(records[5]).toMatchObject({ output: "Done.", durationMs: 3000 });
  });
});

describe("parseGrokRows", () => {
  const update = (
    clock: string,
    body: Record<string, unknown>,
  ): Record<string, unknown> => ({
    timestamp: Math.floor(ms(clock) / 1000),
    params: { update: body, _meta: { agentTimestampMs: ms(clock) } },
  });

  it("assembles streamed chunks, tool calls, and per-turn usage", () => {
    const records = parseGrokRows([
      update("14:00:00", {
        sessionUpdate: "user_message_chunk",
        content: { type: "text", text: "commit " },
      }),
      update("14:00:00", {
        sessionUpdate: "user_message_chunk",
        content: { type: "text", text: "and push" },
      }),
      update("14:00:02", {
        sessionUpdate: "agent_thought_chunk",
        content: { type: "text", text: "check status" },
      }),
      update("14:00:03", {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "Checking the tree." },
      }),
      update("14:00:03", {
        sessionUpdate: "tool_call",
        toolCallId: "call-1",
        title: "run_terminal_command",
        rawInput: { command: "git status" },
        _meta: { "x.ai/tool": { name: "run_terminal_command" } },
      }),
      update("14:00:03", {
        sessionUpdate: "tool_call_update",
        toolCallId: "call-1",
        title: "git status",
      }),
      update("14:00:05", {
        sessionUpdate: "tool_call_update",
        toolCallId: "call-1",
        status: "failed",
        content: [
          { type: "content", content: { type: "text", text: "not a repo" } },
        ],
      }),
      update("14:00:08", {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "This is not a repository." },
      }),
      update("14:00:08", {
        sessionUpdate: "turn_completed",
        usage: {
          inputTokens: 1000,
          cachedReadTokens: 700,
          outputTokens: 60,
          reasoningTokens: 25,
        },
      }),
      update("15:00:00", {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "Background job finished." },
      }),
    ]);

    expect(records.map((entry) => entry.kind)).toEqual([
      "user",
      "assistant",
      "tool",
      "assistant",
      "assistant",
    ]);
    expect(records[0]).toMatchObject({
      opensTurn: true,
      text: "commit and push",
    });
    expect(records[1]).toMatchObject({
      startedAt: ms("14:00:00"),
      durationMs: 3000,
      thinking: "check status",
      output: "Checking the tree.",
    });
    expect(records[1]?.tokens).toBeUndefined();
    expect(records[2]).toMatchObject({
      text: "run_terminal_command git status",
      durationMs: 2000,
      isError: true,
      output: "not a repo",
    });
    // Usage is per turn and lands on the turn's last response.
    expect(records[3]).toMatchObject({
      output: "This is not a repository.",
      tokens: {
        input: 300,
        cacheRead: 700,
        cacheWrite: 0,
        output: 60,
        think: 25,
      },
    });
    expect(records[4]?.opensTurn).toBe(true);
  });
});

function record(
  id: string,
  clock: string,
  extra: Partial<TranscriptRecord> = {},
): TranscriptRecord {
  return {
    id,
    kind: "assistant",
    text: id,
    startedAt: ms(clock),
    durationMs: 1000,
    ...extra,
  };
}

describe("windowTranscript", () => {
  const records = [
    record("before", "09:00:00", { kind: "user", opensTurn: true }),
    record("before-answer", "09:00:05"),
    record("inflight", "09:59:50", { kind: "user", opensTurn: true }),
    record("inflight-answer", "10:00:30"),
    record("next", "10:59:58", { kind: "user", opensTurn: true }),
    record("next-answer", "11:00:10"),
  ];

  it("keeps whole turns that overlap the session window", () => {
    const kept = windowTranscript(records, ms("10:00:00"), ms("11:00:00"));
    expect(kept.map((entry) => entry.id)).toEqual([
      "inflight",
      "inflight-answer",
    ]);
  });

  it("keeps everything after the start for an open-ended session", () => {
    const kept = windowTranscript(
      records,
      ms("10:00:00"),
      Number.POSITIVE_INFINITY,
    );
    expect(kept.map((entry) => entry.id)).toEqual([
      "inflight",
      "inflight-answer",
      "next",
      "next-answer",
    ]);
  });
});

describe("buildTrajectory", () => {
  let projectDir: string;
  let home: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-trajectory-project-"));
    home = mkdtempSync(join(tmpdir(), "oma-trajectory-home-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });

  function emitSession(sid: string): void {
    emitEvent(projectDir, sid, {
      kind: "session.created",
      ts: at("10:00:01"),
      vendor: "claude",
      vendorSid: "claude-session-1",
      payload: { workflow: "debug", category: "main" },
    });
    emitEvent(projectDir, sid, {
      kind: "decision.made",
      ts: at("10:00:10"),
      payload: {
        subject: "debug.root-cause",
        decision: "invert the token check",
        rationale: "the guard rejected valid tokens",
      },
    });
    emitEvent(projectDir, sid, {
      kind: "boundary",
      ts: at("10:00:20"),
      vendor: "kiro",
      vendorSid: "kiro-session-1",
      payload: {
        reason: "vendor-session-transition",
        fromVendor: "claude",
        toVendor: "kiro",
        toVendorSid: "kiro-session-1",
      },
    });
    emitEvent(projectDir, sid, {
      kind: "session.ended",
      ts: at("10:00:25"),
      payload: { status: "completed" },
    });
  }

  it("joins L1 events with the vendor transcript in time order", () => {
    const claudeDir = join(home, ".claude", "projects", "-work-app");
    mkdirSync(join(claudeDir, "claude-session-1", "subagents"), {
      recursive: true,
    });
    writeFileSync(
      join(claudeDir, "claude-session-1.jsonl"),
      jsonl([
        {
          type: "user",
          uuid: "old",
          timestamp: at("08:00:00"),
          message: { role: "user", content: "an earlier, unrelated prompt" },
        },
        ...CLAUDE_ROWS,
      ]),
    );
    writeFileSync(
      join(claudeDir, "claude-session-1", "subagents", "agent-a1.jsonl"),
      jsonl([
        {
          type: "user",
          timestamp: at("10:00:07"),
          message: { role: "user", content: "review the auth module" },
        },
      ]),
    );
    writeFileSync(
      join(claudeDir, "claude-session-1", "subagents", "agent-a1.meta.json"),
      JSON.stringify({ name: "reviewer", toolUseId: "toolu_1" }),
    );
    emitSession("oma-trajectory");

    const trajectory = buildTrajectory("oma-trajectory", {
      projectDir,
      home,
      env: {},
    });

    expect(trajectory.vendorSessions).toMatchObject([
      { vendor: "claude", vendorSid: "claude-session-1", status: "loaded" },
      { vendor: "kiro", vendorSid: "kiro-session-1", status: "unsupported" },
    ]);
    // The earlier prompt and the turn resumed after session.ended are outside
    // this session; the in-flight turn is kept whole.
    expect(
      trajectory.records.map((entry) =>
        entry.kind === "oma" ? entry.event?.kind : entry.kind,
      ),
    ).toEqual([
      "user",
      "assistant",
      "session.created",
      "tool",
      "context",
      "assistant",
      "decision.made",
      "boundary",
      "session.ended",
    ]);
    expect(trajectory.records.map((entry) => entry.index)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(trajectory.records.every((entry) => entry.turn === 1)).toBe(true);
    expect(trajectory.records[4]).toMatchObject({
      agent: "reviewer",
      parentCallId: "toolu_1",
      vendor: "claude",
    });
    expect(trajectory.records[6]?.text).toBe(
      "debug.root-cause · invert the token check",
    );
    expect(trajectory.records[7]?.text).toBe(
      "vendor-session-transition · claude → kiro",
    );
    expect(trajectory.totals).toMatchObject({
      records: 9,
      turns: 1,
      toolCalls: 1,
      toolErrors: 1,
      tokens: {
        input: 12,
        cacheRead: 100,
        cacheWrite: 20,
        output: 49,
        think: 12,
      },
    });

    const rendered = renderTrajectory(trajectory);
    expect(rendered).toContain("OMA trajectory oma-trajectory");
    expect(rendered).toContain("Turn 1");
    expect(rendered).toContain("transcript not supported");
  });

  it("reports a missing transcript and still shows the L1 events", () => {
    emitSession("oma-missing");
    const trajectory = buildTrajectory("oma-missing", {
      projectDir,
      home,
      env: {},
    });
    expect(trajectory.vendorSessions[0]).toMatchObject({
      vendor: "claude",
      status: "missing",
      records: 0,
    });
    expect(trajectory.records).toHaveLength(4);
    expect(trajectory.totals.turns).toBe(0);
    expect(trajectory.records[0]?.turn).toBeNull();
  });

  it("finds Codex rollouts under CODEX_HOME", () => {
    const codexHome = join(home, "accounts", "work");
    mkdirSync(join(codexHome, "sessions", "2026", "05", "25"), {
      recursive: true,
    });
    writeFileSync(
      join(
        codexHome,
        "sessions",
        "2026",
        "05",
        "25",
        "rollout-2026-05-25T11-00-00-codex-session-1.jsonl",
      ),
      jsonl(CODEX_ROWS),
    );
    emitEvent(projectDir, "oma-codex", {
      kind: "session.created",
      ts: at("11:00:02"),
      vendor: "codex",
      vendorSid: "codex-session-1",
      payload: { workflow: "work", category: "main" },
    });

    const withoutOverride = buildTrajectory("oma-codex", {
      projectDir,
      home,
      env: {},
    });
    expect(withoutOverride.vendorSessions[0]?.status).toBe("missing");

    const trajectory = buildTrajectory("oma-codex", {
      projectDir,
      home,
      env: { CODEX_HOME: codexHome },
    });
    expect(trajectory.vendorSessions[0]).toMatchObject({
      status: "loaded",
      records: 5,
    });
    expect(trajectory.totals.turns).toBe(2);
  });

  it("finds a transcript through the vendor home an event recorded", () => {
    const codexHome = join(home, "accounts", "work");
    mkdirSync(join(codexHome, "sessions"), { recursive: true });
    writeFileSync(
      join(codexHome, "sessions", "rollout-codex-session-2.jsonl"),
      jsonl(CODEX_ROWS),
    );
    emitEvent(projectDir, "oma-recorded-home", {
      kind: "session.created",
      ts: at("11:00:02"),
      vendor: "codex",
      vendorSid: "codex-session-2",
      payload: { workflow: "work", category: "main", vendorHome: codexHome },
    });

    const trajectory = buildTrajectory("oma-recorded-home", {
      projectDir,
      home,
      env: {},
    });
    expect(trajectory.vendorSessions[0]?.status).toBe("loaded");
  });

  it("never resolves a vendor session id that looks like a path", () => {
    emitEvent(projectDir, "oma-unsafe", {
      kind: "session.created",
      ts: at("10:00:01"),
      vendor: "claude",
      vendorSid: "../../secrets",
      payload: { workflow: "debug", category: "main" },
    });
    const trajectory = buildTrajectory("oma-unsafe", {
      projectDir,
      home,
      env: {},
    });
    expect(trajectory.vendorSessions[0]?.status).toBe("missing");
  });
});
