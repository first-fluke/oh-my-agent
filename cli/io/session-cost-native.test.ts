import { describe, expect, it, vi } from "vitest";
import { parseClaudeRows } from "./native-transcript/claude.js";
import { parseCodexRows } from "./native-transcript/codex.js";
import type { TranscriptRecord } from "./native-transcript/types.js";

vi.mock("./native-transcript/identity.js", () => ({
  nativeSessionId: vi.fn(() => "child-session"),
  loadBoundNativeTranscript: vi.fn(),
}));

import { loadBoundNativeTranscript } from "./native-transcript/identity.js";
import {
  finalizeNativeUsage,
  usageFromTranscript,
} from "./session-cost-native.js";

const message = (
  overrides: Partial<TranscriptRecord> = {},
): TranscriptRecord => ({
  id: "message-1",
  kind: "assistant",
  text: "done",
  startedAt: 1000,
  durationMs: 10,
  tokens: { input: 100, cacheRead: 200, cacheWrite: 50, output: 80, think: 30 },
  ...overrides,
});

describe("native token accounting", () => {
  const claudeUsage = (usage: object): TranscriptRecord[] =>
    parseClaudeRows([
      {
        type: "assistant",
        message: {
          id: "reply-1",
          content: [{ type: "text", text: "answer" }],
          usage,
        },
      },
    ]);
  const codexUsage = (usage: object): TranscriptRecord[] =>
    parseCodexRows([
      {
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "answer" }],
        },
      },
      {
        type: "event_msg",
        payload: { type: "token_count", info: { last_token_usage: usage } },
      },
    ]);

  for (const [vendor, parseUsage] of [
    ["claude", claudeUsage],
    ["codex", codexUsage],
  ] as const) {
    it.each([
      {},
      { input_tokens: 10 },
      { output_tokens: 10 },
      { input_tokens: -1, output_tokens: 10 },
      { input_tokens: 10, output_tokens: -1 },
      { input_tokens: Number.NaN, output_tokens: 10 },
      { input_tokens: 10, output_tokens: Number.POSITIVE_INFINITY },
      { input_tokens: 1.5, output_tokens: 10 },
    ])(
      `${vendor} preserves the estimate for missing or invalid native core counters: %j`,
      (usage) => {
        const records = parseUsage(usage);
        expect(usageFromTranscript(records)).toBeUndefined();
        vi.mocked(loadBoundNativeTranscript).mockReturnValue({
          status: "loaded",
          records,
          sourcePath: "/vendor/child.jsonl",
          sourceHash: "fixture",
          complete: true,
        });
        expect(
          finalizeNativeUsage(
            { vendor, agentId: "backend", tokens: 5 },
            { stdout: "", workspace: "/fixture", startedAt: 1000 },
          ),
        ).toMatchObject({
          tokens: 5,
          usageSource: "prompt-estimate",
          usageUnavailableReason:
            "native transcript has incomplete usage counters",
        });
      },
    );

    it(`${vendor} accepts genuine zero core counters and absent optional counters`, () => {
      expect(
        usageFromTranscript(parseUsage({ input_tokens: 0, output_tokens: 0 })),
      ).toEqual({ input: 0, cacheRead: 0, cacheWrite: 0, output: 0 });
    });
  }

  it.each([
    { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: -1 },
    {
      input_tokens: 10,
      output_tokens: 20,
      cache_creation_input_tokens: Number.NaN,
    },
    { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: null },
    {
      input_tokens: 10,
      output_tokens: 20,
      output_tokens_details: { thinking_tokens: 21 },
    },
  ])("rejects invalid Claude optional counters: %j", (usage) => {
    expect(usageFromTranscript(claudeUsage(usage))).toBeUndefined();
  });

  it.each([
    { input_tokens: 10, output_tokens: 20, cached_input_tokens: 11 },
    { input_tokens: 10, output_tokens: 20, cached_input_tokens: -1 },
    { input_tokens: 10, output_tokens: 20, cached_input_tokens: Number.NaN },
    {
      input_tokens: 10,
      output_tokens: 20,
      cache_write_input_tokens: Number.POSITIVE_INFINITY,
    },
    { input_tokens: 10, output_tokens: 20, cached_input_tokens: null },
    { input_tokens: 10, output_tokens: 20, reasoning_output_tokens: 21 },
  ])("rejects invalid or impossible Codex optional counters: %j", (usage) => {
    expect(usageFromTranscript(codexUsage(usage))).toBeUndefined();
  });

  it("does not reuse an earlier Claude counter after invalid final usage", () => {
    expect(
      usageFromTranscript(
        parseClaudeRows([
          {
            type: "assistant",
            message: {
              id: "reply-1",
              content: [{ type: "text", text: "first" }],
              usage: { input_tokens: 10, output_tokens: 20 },
            },
          },
          {
            type: "assistant",
            message: {
              id: "reply-1",
              content: [{ type: "text", text: "final" }],
              usage: {},
            },
          },
        ]),
      ),
    ).toBeUndefined();
  });

  it("counts Claude's repeated per-message usage once across streamed blocks", () => {
    const usage = {
      input_tokens: 10,
      cache_read_input_tokens: 200,
      cache_creation_input_tokens: 50,
      output_tokens: 30,
    };
    const rows = [
      {
        type: "assistant",
        message: {
          id: "reply-1",
          content: [{ type: "text", text: "first" }],
          usage,
        },
      },
      {
        type: "assistant",
        message: {
          id: "reply-1",
          content: [{ type: "text", text: "second" }],
          usage,
        },
      },
    ];
    expect(usageFromTranscript(parseClaudeRows(rows))).toEqual({
      input: 10,
      cacheRead: 200,
      cacheWrite: 50,
      output: 30,
    });
  });
  it("counts cached input once and includes reasoning only inside output", () => {
    expect(usageFromTranscript([message()])).toEqual({
      input: 100,
      cacheRead: 200,
      cacheWrite: 50,
      output: 80,
    });
  });

  it("uses final counters for duplicate response IDs and sums separate calls", () => {
    expect(
      usageFromTranscript([
        message(),
        message({
          tokens: {
            input: 10,
            cacheRead: 20,
            cacheWrite: 0,
            output: 30,
            think: 15,
          },
        }),
        message({ id: "message-2" }),
      ]),
    ).toEqual({ input: 110, cacheRead: 220, cacheWrite: 50, output: 110 });
  });

  it("does not claim complete actual usage when counters are missing or invalid", () => {
    expect(
      usageFromTranscript([
        message(),
        message({ id: "missing", tokens: undefined }),
      ]),
    ).toBeUndefined();
    expect(
      usageFromTranscript([
        message({
          tokens: {
            input: Number.NaN,
            cacheRead: 0,
            cacheWrite: 0,
            output: 0,
            think: 0,
          },
        }),
      ]),
    ).toBeUndefined();
  });

  it("retains an explicit estimate when the child transcript is missing", () => {
    vi.mocked(loadBoundNativeTranscript).mockReturnValue({
      status: "missing",
      reason: "native transcript missing",
    });
    expect(
      finalizeNativeUsage(
        {
          vendor: "codex",
          agentId: "backend",
          runId: "run-1",
          tokens: 5,
          estimatedInputTokens: 5,
          state: "reserved",
        },
        { stdout: "", workspace: "/fixture", startedAt: 1000 },
      ),
    ).toMatchObject({
      tokens: 5,
      usageSource: "prompt-estimate",
      state: "final",
      usageUnavailableReason: "native transcript missing",
    });
  });

  it("retains an explicit estimate for interrupted or truncated native runs", () => {
    const reservation = {
      vendor: "codex",
      agentId: "backend",
      tokens: 5,
      usageSource: "prompt-estimate" as const,
    };
    const options = { stdout: "", workspace: "/fixture", startedAt: 1000 };
    expect(
      finalizeNativeUsage(reservation, { ...options, interrupted: true }),
    ).toMatchObject({
      tokens: 5,
      usageSource: "prompt-estimate",
      usageUnavailableReason:
        "agent interrupted before final usage was captured",
    });
    vi.mocked(loadBoundNativeTranscript).mockReturnValue({
      status: "loaded",
      records: [message()],
      sourcePath: "/vendor/child.jsonl",
      sourceHash: "fixture",
      complete: false,
    });
    expect(finalizeNativeUsage(reservation, options)).toMatchObject({
      tokens: 5,
      usageSource: "prompt-estimate",
      usageUnavailableReason: "native transcript is incomplete",
    });
  });

  it("replaces the estimate with counters from the bound native child", () => {
    vi.mocked(loadBoundNativeTranscript).mockReturnValue({
      status: "loaded",
      records: [message()],
      sourcePath: "/vendor/child.jsonl",
      sourceHash: "fixture",
      complete: true,
    });
    expect(
      finalizeNativeUsage(
        {
          vendor: "claude",
          agentId: "backend",
          runId: "run-1",
          tokens: 5,
          estimatedInputTokens: 5,
          state: "reserved",
        },
        {
          stdout: "",
          workspace: "/fixture",
          startedAt: 1000,
          expectedSessionId: "child-session",
        },
      ),
    ).toMatchObject({
      tokens: 430,
      estimatedInputTokens: 5,
      usageSource: "native-transcript",
      state: "final",
      vendorSid: "child-session",
    });
  });

  it("labels observed root usage as partial when native subagent counters are unavailable", () => {
    vi.mocked(loadBoundNativeTranscript).mockReturnValue({
      status: "loaded",
      records: [
        message(),
        message({
          id: "tool-1",
          kind: "tool",
          toolName: "Agent",
          tokens: undefined,
        }),
      ],
      sourcePath: "/vendor/child.jsonl",
      sourceHash: "fixture",
      complete: true,
    });
    expect(
      finalizeNativeUsage(
        { vendor: "claude", agentId: "backend", tokens: 5 },
        { stdout: "", workspace: "/fixture", startedAt: 1000 },
      ),
    ).toMatchObject({
      tokens: 430,
      usageSource: "native-transcript",
      usageCoverage: "partial",
      usageUnavailableReason: "native subagent usage is not fully covered",
    });
  });
});
