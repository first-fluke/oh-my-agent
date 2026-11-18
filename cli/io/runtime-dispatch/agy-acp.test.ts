import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough, Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import {
  AGY_ACP_SUBCOMMAND,
  AGY_SETTLE_PROMPT,
  AGY_SETTLED_MARKER,
  choosePermissionOutcome,
  isSupportedAgyVersion,
  parseAgyAcpArgs,
  resolveAgyModelId,
  runAgyAcp,
  stopReasonExitCode,
  wrapAgyInvocationForAcp,
} from "./agy-acp.js";

// ---------------------------------------------------------------------------
// agy subagents run over ACP (`agy acp`), not print mode (`agy -p`). The
// message shapes below were captured from agy 1.5.9 (2026-11-18).
// ---------------------------------------------------------------------------

const MODELS = [
  { modelId: "gemini-4-argon-high", name: "Gemini 4 Argon (High)" },
  { modelId: "gemini-3.8-flash-low", name: "Gemini 3.8 Flash (Low)" },
];

describe("parseAgyAcpArgs", () => {
  it("splits server flags from session flags and the prompt", () => {
    const parsed = parseAgyAcpArgs([
      "agy",
      "--dangerously-skip-permissions",
      "--add-dir",
      "/ws",
      "-p",
      "@pm hello",
      "--model",
      "Gemini 4 Argon (High)",
      "--mode=accept-edits",
    ]);
    expect(parsed).toEqual({
      command: "agy",
      serverArgs: ["--dangerously-skip-permissions", "--add-dir", "/ws"],
      prompt: "@pm hello",
      model: "Gemini 4 Argon (High)",
      mode: "accept-edits",
      autoApprove: true,
      ignored: [],
    });
  });

  it("leaves the prompt to stdin when the flag has no value", () => {
    // harness dispatch strips a dash-leading prompt and pipes it via stdin.
    const parsed = parseAgyAcpArgs(["agy", "-p", "--model", "x"]);
    expect(parsed.prompt).toBeUndefined();
    expect(parsed.model).toBe("x");
  });

  it("is not auto-approving without the skip-permissions flag", () => {
    expect(
      parseAgyAcpArgs(["agy", "--mode", "accept-edits", "-p", "hi"])
        .autoApprove,
    ).toBe(false);
  });

  it("drops print-mode-only flags, which `agy acp` would reject", () => {
    const parsed = parseAgyAcpArgs([
      "agy",
      "--print-timeout",
      "30m",
      "--output-format=json",
      "--disable-slash-commands",
      "--add-dir",
      "/ws",
      "-p",
      "hi",
    ]);
    expect(parsed.serverArgs).toEqual(["--add-dir", "/ws"]);
    expect(parsed.prompt).toBe("hi");
    expect(parsed.ignored).toEqual([
      "--print-timeout",
      "--output-format",
      "--disable-slash-commands",
    ]);
  });

  it("rejects a session flag without a value and a missing binary", () => {
    expect(() => parseAgyAcpArgs(["agy", "--model"])).toThrow(/--model/);
    expect(() => parseAgyAcpArgs([])).toThrow(/agy command/);
  });
});

describe("resolveAgyModelId", () => {
  it("maps an `agy models` display name onto the ACP model id", () => {
    expect(resolveAgyModelId("Gemini 4 Argon (High)", MODELS)).toBe(
      "gemini-4-argon-high",
    );
    expect(resolveAgyModelId("gemini 3.8 flash (low)", MODELS)).toBe(
      "gemini-3.8-flash-low",
    );
  });

  it("accepts an ACP model id as-is and rejects unknown models", () => {
    expect(resolveAgyModelId("gemini-4-argon-high", MODELS)).toBe(
      "gemini-4-argon-high",
    );
    expect(resolveAgyModelId("gemini-4-argon", MODELS)).toBeNull();
  });
});

describe("choosePermissionOutcome", () => {
  const request = {
    options: [
      { optionId: "allow", name: "Allow", kind: "allow_once" },
      { optionId: "deny", name: "Deny", kind: "reject_once" },
    ],
  };

  it("approves on an auto-approve launch and denies on a restricted one", () => {
    expect(choosePermissionOutcome(request, true)).toEqual({
      outcome: { outcome: "selected", optionId: "allow" },
    });
    expect(choosePermissionOutcome(request, false)).toEqual({
      outcome: { outcome: "selected", optionId: "deny" },
    });
  });

  it("cancels when no matching option exists", () => {
    expect(choosePermissionOutcome({ options: [] }, true)).toEqual({
      outcome: { outcome: "cancelled" },
    });
  });
});

describe("isSupportedAgyVersion", () => {
  it("requires agy 1.5.10+ (1.5.9 withholds background-subagent results)", () => {
    expect(isSupportedAgyVersion("1.5.9")).toBe(false);
    expect(isSupportedAgyVersion("1.4.20")).toBe(false);
    expect(isSupportedAgyVersion("1.5.10")).toBe(true);
    expect(isSupportedAgyVersion("1.6.0")).toBe(true);
    expect(isSupportedAgyVersion("2.0.0-beta.1")).toBe(true);
  });

  it("accepts a version it cannot parse", () => {
    expect(isSupportedAgyVersion(undefined)).toBe(true);
    expect(isSupportedAgyVersion("dev")).toBe(true);
  });
});

describe("stopReasonExitCode", () => {
  it("succeeds only on end_turn", () => {
    expect(stopReasonExitCode("end_turn")).toBe(0);
    expect(stopReasonExitCode("cancelled")).toBe(130);
    expect(stopReasonExitCode("max_tokens")).toBe(1);
    expect(stopReasonExitCode("refusal")).toBe(1);
  });
});

describe("wrapAgyInvocationForAcp", () => {
  it("runs the agy argv through `oma agent:acp` and keeps the vendor binary", () => {
    const wrapped = wrapAgyInvocationForAcp(
      { command: "agy", args: ["-p", "hi"], env: { A: "1" } },
      { command: "/usr/bin/bun", prefixArgs: ["/repo/cli/cli.ts"] },
    );
    expect(wrapped).toEqual({
      command: "/usr/bin/bun",
      args: ["/repo/cli/cli.ts", AGY_ACP_SUBCOMMAND, "agy", "-p", "hi"],
      env: { A: "1" },
      vendorCommand: "agy",
    });
  });
});

// ---------------------------------------------------------------------------
// runAgyAcp against a scripted fake `agy acp` server
// ---------------------------------------------------------------------------

type Rpc = {
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
};

interface FakeAgentOptions {
  /** Permission request the agent sends during the prompt turn. */
  permission?: boolean;
  stopReason?: string;
  /** agentInfo.version reported by initialize. */
  version?: string;
  /** The first turn starts a background subagent (`invoke_subagent`). */
  launchSubagent?: boolean;
  /** Text the agent answers to each settle turn, in order. */
  settleReplies?: string[];
}

function collect(): { stream: Writable; text: () => string } {
  let text = "";
  return {
    stream: new Writable({
      write(chunk, _enc, done) {
        text += chunk.toString();
        done();
      },
    }),
    text: () => text,
  };
}

function fakeAgent(options: FakeAgentOptions = {}) {
  const received: Rpc[] = [];
  const spawned: { command?: string; args?: string[] } = {};
  const spawnAgent = (command: string, args: string[]) => {
    spawned.command = command;
    spawned.args = args;
    const child = new EventEmitter() as ChildProcess & EventEmitter;
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    Object.assign(child, { stdin, stdout, kill: () => true });
    const send = (message: Rpc) =>
      stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
    let promptId: number | string | undefined;
    let prompts = 0;
    let buffer = "";
    const say = (text: string) =>
      send({
        method: "session/update",
        params: {
          sessionId: "s-1",
          update: {
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text },
          },
        },
      });
    stdin.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const message = JSON.parse(buffer.slice(0, newline)) as Rpc;
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        received.push(message);
        const sessionId = "s-1";
        switch (message.method) {
          case "initialize":
            send({
              id: message.id,
              result: {
                protocolVersion: 1,
                agentInfo: { version: options.version ?? "1.5.10" },
              },
            });
            break;
          case "session/new":
            send({
              id: message.id,
              result: { sessionId, models: { availableModels: MODELS } },
            });
            break;
          case "session/prompt":
            promptId = message.id;
            prompts++;
            if (prompts > 1) {
              // A settle turn.
              say(options.settleReplies?.[prompts - 2] ?? AGY_SETTLED_MARKER);
              send({ id: promptId, result: { stopReason: "end_turn" } });
              break;
            }
            if (options.launchSubagent) {
              send({
                method: "session/update",
                params: {
                  sessionId,
                  update: {
                    sessionUpdate: "tool_call",
                    toolCallId: "call-1",
                    name: "invoke_subagent",
                    status: "in_progress",
                  },
                },
              });
            }
            send({
              method: "session/update",
              params: {
                sessionId,
                update: {
                  sessionUpdate: "agent_message_chunk",
                  content: { type: "text", text: "PO" },
                },
              },
            });
            if (options.permission) {
              send({
                id: "1",
                method: "session/request_permission",
                params: {
                  sessionId,
                  toolCall: { title: "echo hi" },
                  options: [
                    { optionId: "allow", kind: "allow_once" },
                    { optionId: "deny", kind: "reject_once" },
                  ],
                },
              });
            } else {
              finishTurn();
            }
            break;
          case undefined:
            // Our reply to the permission request.
            finishTurn();
            break;
          default:
            send({ id: message.id, result: {} });
        }
      }
    });
    function finishTurn() {
      send({
        method: "session/update",
        params: {
          sessionId: "s-1",
          update: {
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text: "NG" },
          },
        },
      });
      send({
        id: promptId,
        result: { stopReason: options.stopReason ?? "end_turn" },
      });
    }
    stdin.on("finish", () => {
      stdout.end();
      setImmediate(() => child.emit("close", 0));
    });
    return child;
  };
  return { spawnAgent, received, spawned };
}

const noSignals = { on: () => process, off: () => process } as unknown as Pick<
  NodeJS.Process,
  "on" | "off"
>;

async function run(argv: string[], agent: ReturnType<typeof fakeAgent>) {
  const stdout = collect();
  const stderr = collect();
  const stdin = new PassThrough();
  stdin.end();
  const code = await runAgyAcp(argv, {
    stdin,
    stdout: stdout.stream,
    stderr: stderr.stream,
    cwd: "/ws",
    env: {},
    spawnAgent: agent.spawnAgent,
    signals: noSignals,
  });
  return { code, stdout: stdout.text(), stderr: stderr.text() };
}

describe("runAgyAcp", () => {
  it("starts `agy acp`, applies session flags, and streams the reply", async () => {
    const agent = fakeAgent();
    const result = await run(
      [
        "agy",
        "--dangerously-skip-permissions",
        "--add-dir",
        "/ws",
        "-p",
        "hello",
        "--model",
        "Gemini 4 Argon (High)",
        "--mode",
        "accept-edits",
      ],
      agent,
    );
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("PONG\n");
    expect(agent.spawned).toEqual({
      command: "agy",
      args: ["acp", "--dangerously-skip-permissions", "--add-dir", "/ws"],
    });
    const byMethod = (method: string) =>
      agent.received.find((message) => message.method === method);
    expect(byMethod("session/new")?.params).toEqual({
      cwd: "/ws",
      mcpServers: [],
    });
    expect(byMethod("session/set_model")?.params).toEqual({
      sessionId: "s-1",
      modelId: "gemini-4-argon-high",
    });
    expect(byMethod("session/set_mode")?.params).toEqual({
      sessionId: "s-1",
      modeId: "accept-edits",
    });
    expect(byMethod("session/prompt")?.params).toEqual({
      sessionId: "s-1",
      prompt: [{ type: "text", text: "hello" }],
    });
    expect(byMethod("session/close")).toBeDefined();
  });

  it("denies permission requests on a restricted launch", async () => {
    const agent = fakeAgent({ permission: true });
    const result = await run(
      ["agy", "--mode", "accept-edits", "-p", "hello"],
      agent,
    );
    expect(result.code).toBe(0);
    const reply = agent.received.find(
      (message) => message.id === "1" && message.method === undefined,
    );
    expect(reply?.result).toEqual({
      outcome: { outcome: "selected", optionId: "deny" },
    });
    expect(result.stderr).toMatch(/denied permission for echo hi/);
  });

  it("approves permission requests on an auto-approve launch", async () => {
    const agent = fakeAgent({ permission: true });
    await run(["agy", "--dangerously-skip-permissions", "-p", "hello"], agent);
    const reply = agent.received.find(
      (message) => message.id === "1" && message.method === undefined,
    );
    expect(reply?.result).toEqual({
      outcome: { outcome: "selected", optionId: "allow" },
    });
  });

  it("fails before prompting on an unknown model", async () => {
    const agent = fakeAgent();
    const result = await run(["agy", "-p", "hi", "--model", "nope"], agent);
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/unknown model 'nope'/);
    expect(
      agent.received.some((message) => message.method === "session/prompt"),
    ).toBe(false);
  });

  it("exits non-zero when the turn does not end normally", async () => {
    const agent = fakeAgent({ stopReason: "max_tokens" });
    const result = await run(["agy", "-p", "hi"], agent);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/max_tokens/);
  });

  // agy can end a turn while a subagent it launched is still running; closing
  // the session then stops the subagent and its result is lost.
  it("sends no settle turn when the turn started no background subagent", async () => {
    const agent = fakeAgent();
    await run(["agy", "-p", "hi"], agent);
    expect(
      agent.received.filter((message) => message.method === "session/prompt"),
    ).toHaveLength(1);
  });

  it("settles a background subagent and hides the bare settled marker", async () => {
    const agent = fakeAgent({ launchSubagent: true });
    const result = await run(["agy", "-p", "hi"], agent);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("PONG\n");
    const prompts = agent.received.filter(
      (message) => message.method === "session/prompt",
    );
    expect(prompts).toHaveLength(2);
    expect(prompts[1]?.params?.prompt).toEqual([
      { type: "text", text: AGY_SETTLE_PROMPT },
    ]);
    const closeIndex = agent.received.findIndex(
      (message) => message.method === "session/close",
    );
    expect(closeIndex).toBeGreaterThan(
      agent.received.indexOf(prompts[1] as Rpc),
    );
  });

  it("emits the work a settle turn finishes, then confirms again", async () => {
    const agent = fakeAgent({
      launchSubagent: true,
      settleReplies: ["SAVED:/out/a.png", AGY_SETTLED_MARKER],
    });
    const result = await run(["agy", "-p", "hi"], agent);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("PONG\nSAVED:/out/a.png\n");
    expect(
      agent.received.filter((message) => message.method === "session/prompt"),
    ).toHaveLength(3);
  });

  it("stops asking after three unsettled follow-up turns", async () => {
    const agent = fakeAgent({
      launchSubagent: true,
      settleReplies: ["still waiting", "still waiting", "still waiting"],
    });
    const result = await run(["agy", "-p", "hi"], agent);
    expect(result.code).toBe(0);
    expect(result.stderr).toMatch(/unsettled after 3 follow-up turns/);
    expect(
      agent.received.filter((message) => message.method === "session/prompt"),
    ).toHaveLength(4);
  });

  it("refuses an agy older than 1.5.10 before opening a session", async () => {
    const agent = fakeAgent({ version: "1.5.9" });
    const result = await run(["agy", "-p", "hi"], agent);
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/agy update/);
    expect(
      agent.received.some((message) => message.method === "session/new"),
    ).toBe(false);
  });

  it("refuses to start without a prompt", async () => {
    const agent = fakeAgent();
    const result = await run(["agy"], agent);
    expect(result.code).toBe(2);
    expect(agent.spawned.command).toBeUndefined();
  });
});
