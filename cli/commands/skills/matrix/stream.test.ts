import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MATRIX_STREAM_LIMIT, parseMatrixStream } from "./stream.js";

const workspace = resolve("/tmp/matrix-parser");
const file = ".agents/skills/probe/SKILL.md";
const stream = (...events: unknown[]) =>
  `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
const claudeResult = (result = '{"ok":true}', extra = {}) => ({
  type: "result",
  subtype: "success",
  is_error: false,
  result,
  ...extra,
});
const call = (id: string, name: string, input: unknown) => ({
  type: "assistant",
  message: { content: [{ type: "tool_use", id, name, input }] },
});
const result = (id: string, content: string, is_error = false) => ({
  type: "user",
  message: {
    content: [{ type: "tool_result", tool_use_id: id, content, is_error }],
  },
});
const command = (text: string, output = "file text\n", exit = 0) => ({
  type: "item.completed",
  item: {
    type: "command_execution",
    command: text,
    aggregated_output: output,
    exit_code: exit,
    status: exit === 0 ? "completed" : "failed",
    cwd: workspace,
  },
});
const answer = (text = '{"ok":true}', extra = {}) => ({
  type: "item.completed",
  item: { type: "agent_message", text, ...extra },
});
const completed = {
  type: "turn.completed",
  usage: { input_tokens: 10, output_tokens: 4, cached_input_tokens: 2 },
};

describe("native matrix stream evidence", () => {
  it("correlates successful Claude reads and Skill activation without using assistant claims", () => {
    const run = parseMatrixStream(
      "claude",
      stream(
        { type: "system", subtype: "init", model: "claude-reported" },
        call("skill", "Skill", { skill: "probe" }),
        result("skill", "Skill loaded"),
        call("read", "Read", { file_path: file }),
        result(
          "read",
          "     1→first\n     2→second\n\n<system-reminder>\nWhenever you read a file, consider its safety.\n</system-reminder>",
        ),
        {
          type: "assistant",
          message: {
            content: [{ type: "text", text: "I read every reference." }],
          },
        },
        claudeResult('{"ok":true}', {
          total_cost_usd: 0.01,
          usage: { input_tokens: 7, output_tokens: 3 },
        }),
      ),
      workspace,
    );
    expect(run).toMatchObject({
      complete: true,
      nativeSuccess: true,
      output: '{"ok":true}',
      model: "claude-reported",
      costUsd: 0.01,
      usage: { inputTokens: 7, outputTokens: 3 },
    });
    expect(run.activations).toEqual(["probe"]);
    expect(run.reads).toEqual([
      {
        path: resolve(workspace, file),
        content: "first\nsecond",
        success: true,
        missing: false,
      },
    ]);
  });

  it("requires matching successful tool results and preserves explicit not-found reads", () => {
    const run = parseMatrixStream(
      "claude",
      stream(
        result("unmatched", "invented proof"),
        call("skill", "Skill", { skill: "probe" }),
        result("skill", "Error: unavailable", true),
        call("read", "Read", { file_path: file }),
        result("read", "File does not exist.", true),
        call("denied", "Read", { file_path: "denied.md" }),
        result("denied", "Permission denied", true),
        claudeResult(),
      ),
      workspace,
    );
    expect(run.nativeSuccess).toBe(true);
    expect(run.activations).toEqual([]);
    expect(
      run.reads.map(({ success, missing }) => ({ success, missing })),
    ).toEqual([
      { success: false, missing: true },
      { success: false, missing: false },
    ]);
  });

  it("omits outside-workspace reads and subagent events", () => {
    const run = parseMatrixStream(
      "claude",
      stream(
        call("outside", "Read", { file_path: "../private.md" }),
        result("outside", "private"),
        {
          ...call("child", "Skill", { skill: "other" }),
          parent_tool_use_id: "parent",
        },
        { ...result("child", "loaded"), parent_tool_use_id: "parent" },
        claudeResult(),
      ),
      workspace,
    );
    expect(run.reads).toEqual([]);
    expect(run.activations).toEqual([]);
  });

  it.each([
    `cat ${file}`,
    `/bin/zsh -lc 'cat ${file}'`,
    `cat -- '${file}'`,
    `sed -n '1,160p' ${file}`,
    `head -n 160 ${file}`,
  ])("recognizes an unambiguous native command read: %s", (text) => {
    const run = parseMatrixStream(
      "codex",
      stream(command(text), answer(), completed),
      workspace,
    );
    expect(run.complete).toBe(true);
    expect(run.nativeSuccess).toBe(true);
    expect(run.reads).toEqual([
      {
        path: resolve(workspace, file),
        content: "file text\n",
        success: true,
        missing: false,
      },
    ]);
    expect(run.usage).toEqual({
      inputTokens: 10,
      outputTokens: 4,
      cachedInputTokens: 2,
    });
  });

  it.each([
    `echo ${file}`,
    `cat ${file} || true`,
    `cat ${file} | tee output`,
    `cat $(echo ${file})`,
    `cat \`${file}\``,
    `cat ${file}; true`,
    `cat ${file} other.md`,
    `cat ../outside.md`,
    `cat ${file} > output`,
    `python -c 'print("file text")'`,
    `/bin/zsh -lc 'echo ${file}; cat ${file}'`,
  ])("rejects ambiguous commands and tool claims: %s", (text) => {
    const run = parseMatrixStream(
      "codex",
      stream(command(text), answer(), completed),
      workspace,
    );
    expect(run.reads).toEqual([]);
  });

  it("retains native failed reads only as missing-resource evidence", () => {
    const run = parseMatrixStream(
      "codex",
      stream(
        command(`cat ${file}`, "cat: missing: No such file or directory\n", 1),
        command("cat denied.md", "Permission denied\n", 1),
        answer(),
        completed,
      ),
      workspace,
    );
    expect(run.nativeSuccess).toBe(true);
    expect(run.reads[0]).toMatchObject({ success: false, missing: true });
    expect(run.reads[1]).toMatchObject({ success: false, missing: false });
  });

  it("requires absolute paths or explicit consistent cwd for Codex read evidence", () => {
    const withoutCwd = command(`cat ${file}`);
    const { cwd: _cwd, ...item } = withoutCwd.item;
    expect(
      parseMatrixStream(
        "codex",
        stream({ ...withoutCwd, item }, answer(), completed),
        workspace,
      ).reads,
    ).toEqual([]);
    const absolute = { ...item, command: `cat ${resolve(workspace, file)}` };
    expect(
      parseMatrixStream(
        "codex",
        stream({ ...withoutCwd, item: absolute }, answer(), completed),
        workspace,
      ).reads,
    ).toHaveLength(1);
    expect(
      parseMatrixStream(
        "codex",
        stream(
          { ...withoutCwd, item: { ...absolute, cwd: "/outside" } },
          answer(),
          completed,
        ),
        workspace,
      ).reads,
    ).toEqual([]);
    expect(
      parseMatrixStream(
        "codex",
        stream(
          {
            ...withoutCwd,
            item: {
              ...absolute,
              cwd: workspace,
              workdir: resolve(workspace, "other"),
            },
          },
          answer(),
          completed,
        ),
        workspace,
      ).reads,
    ).toEqual([]);
  });

  it("does not strip shell-preserved double-quoted backslashes from missing paths", () => {
    const wrongPath = resolve(workspace, "references/unavailable\\.txt");
    const run = parseMatrixStream(
      "codex",
      stream(
        command(`cat "${wrongPath}"`, "No such file or directory", 1),
        answer(),
        completed,
      ),
      workspace,
    );
    expect(run.reads).toEqual([]);
  });

  it.each(["private\nmodel", "m".repeat(257), "<model>"])(
    "bounds reported native model identifiers",
    (model) => {
      expect(
        parseMatrixStream(
          "claude",
          stream({ type: "system", model }, claudeResult()),
          workspace,
        ).model,
      ).toBeNull();
    },
  );

  it("rejects truncated tool output as proof", () => {
    const run = parseMatrixStream(
      "codex",
      stream(
        command(`cat ${file}`, "Warning: truncated output\nfile text"),
        answer(),
        completed,
      ),
      workspace,
    );
    expect(run.reads[0]?.success).toBe(false);
  });

  it("uses only the final native answer and ignores explicit commentary", () => {
    const run = parseMatrixStream(
      "codex",
      stream(
        answer('{"ok":true}'),
        answer("final invalid contract"),
        completed,
      ),
      workspace,
    );
    expect(run.output).toBe("final invalid contract");
    const commentary = parseMatrixStream(
      "codex",
      stream(answer('{"ok":true}', { phase: "commentary" }), completed),
      workspace,
    );
    expect(commentary.output).toBe("");
    const beforeTool = parseMatrixStream(
      "codex",
      stream(answer(), command(`cat ${file}`), completed),
      workspace,
    );
    expect(beforeTool.output).toBe("");
  });

  it.each([
    stream(answer(), {
      type: "turn.failed",
      error: { message: "private upstream text" },
    }),
    stream(
      { type: "error", message: "private upstream text" },
      answer(),
      completed,
    ),
    stream(
      { type: "item.completed", item: { type: "error", message: "failure" } },
      answer(),
      completed,
    ),
    stream(
      {
        type: "item.started",
        item: { id: "unfinished", type: "command_execution" },
      },
      answer(),
      completed,
    ),
  ])(
    "never accepts a correct answer after native failure or unfinished tools",
    (raw) => {
      const run = parseMatrixStream("codex", raw, workspace);
      expect(run.nativeSuccess).toBe(false);
      expect(run.error).not.toContain("private upstream text");
    },
  );

  it.each([
    "",
    "not json\n",
    stream(answer()),
    `${stream(answer(), completed)}{`,
    stream(answer(), completed, answer()),
    JSON.stringify({ type: "turn.completed" }).slice(0, -1),
    "x".repeat(MATRIX_STREAM_LIMIT + 1),
  ])("requires a complete bounded JSONL stream and terminal event", (raw) => {
    const run = parseMatrixStream("codex", raw, workspace);
    expect(run.complete && run.nativeSuccess && !run.error).toBe(false);
    expect(run.error).toBeDefined();
  });

  it("rejects Claude error results and unresolved call/result pairs", () => {
    const error = parseMatrixStream(
      "claude",
      stream(claudeResult('{"ok":true}', { is_error: true })),
      workspace,
    );
    expect(error.nativeSuccess).toBe(false);
    const unresolved = parseMatrixStream(
      "claude",
      stream(call("pending", "Read", { file_path: file }), claudeResult()),
      workspace,
    );
    expect(unresolved.nativeSuccess).toBe(false);
    const duplicate = parseMatrixStream(
      "claude",
      stream(
        call("same", "Read", { file_path: file }),
        call("same", "Read", { file_path: file }),
        claudeResult(),
      ),
      workspace,
    );
    expect(duplicate.complete).toBe(false);
  });
});
