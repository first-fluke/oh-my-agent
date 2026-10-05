import { realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import {
  decodeOutput,
  hookContext,
  hookPayload,
  postContext,
  preDecision,
  stopReason,
} from "./protocol.mjs";
import { createHookRunner } from "./runner.mjs";

const RUNTIME_NOTE = [
  "[OMA runtime]",
  "Runtime: DeepSeek Harness (DSH). OMA skills are available under .agents/skills.",
  "Follow the project's AGENTS.md and the selected skill's instructions.",
  "Use the tools and agent APIs actually exposed by DSH. OMA hook JSON uses the Claude compatibility dialect; this does not make the session a Claude session.",
  "Automatic OMA keyword workflows and native OMA role dispatch are not provided by this plugin.",
].join("\n");

async function initializedWorkspace(agent) {
  const sessionCwd = agent?.session?.header?.cwd;
  const id = agent?.id ?? agent?.session?.header?.id;
  if (
    typeof sessionCwd !== "string" ||
    !isAbsolute(sessionCwd) ||
    typeof id !== "string" ||
    !id
  )
    return false;
  const cwd = await realpath(sessionCwd);
  let current = cwd;
  let ancestorMarker = false;
  while (true) {
    for (const marker of ["oma-config.yaml", "oma-config.cue"]) {
      try {
        if ((await stat(join(current, ".agents", marker))).isFile()) {
          if (current === cwd) return true;
          ancestorMarker = true;
        }
      } catch (error) {
        if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
      }
    }
    try {
      await stat(join(current, ".git"));
      return ancestorMarker;
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
    }
    const parent = dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

export function registerBridge(ctx, config, createUserMessage) {
  const runner = createHookRunner(config);
  const stopStates = new WeakMap();
  const initializedAgents = new WeakSet();
  const announcedAgents = new WeakSet();
  const assistantResponses = new WeakMap();
  const maxStopBlocks = config?.maxStopBlocks ?? 2;
  if (
    !Number.isSafeInteger(maxStopBlocks) ||
    maxStopBlocks < 1 ||
    maxStopBlocks > 10
  ) {
    throw new TypeError("maxStopBlocks must be an integer between 1 and 10");
  }
  let disposed = false;
  const message = (text) =>
    createUserMessage({
      content: [{ type: "text", text }],
      source: { kind: "oma-hook" },
    });
  const report = (error) => ctx.logger?.warn?.(`oma: ${error.message}`);
  async function active(agent, signal) {
    if (disposed || signal?.aborted || !(await initializedWorkspace(agent)))
      return false;
    return !disposed && !signal?.aborted;
  }
  async function run(event, agent, signal, execution, result) {
    const stdout = await runner.run(
      event,
      await hookPayload(event, agent, execution, result),
      { signal, owner: agent },
    );
    return decodeOutput(stdout, event);
  }
  ctx.effect(
    () => async () => {
      disposed = true;
      await runner.dispose();
    },
    "oma: terminate and drain hook processes",
  );

  // Tie the active OMA session to this DSH session, so `oma state trajectory`
  // can join the session's events with the DSH log. The session is named in
  // the payload: `--vendor` accepts only OMA's own vendor list. Best effort:
  // with no active OMA session there is nothing to tie it to, and the command
  // fails.
  async function announce(agent, signal) {
    const header = agent.session.header;
    if (announcedAgents.has(agent) || (header.delegationDepth ?? 0) > 0) return;
    announcedAgents.add(agent);
    const vendorSid = header.id ?? agent.id;
    const dshHome = process.env.DSH_HOME?.trim();
    try {
      await runner.run(
        "boundary",
        { cwd: await realpath(header.cwd) },
        {
          signal,
          owner: agent,
          args: [
            "state",
            "emit",
            "boundary",
            JSON.stringify({
              reason: "dsh-session",
              toVendor: "dsh",
              toVendorSid: vendorSid,
              ...(dshHome ? { vendorHome: dshHome } : {}),
            }),
          ],
        },
      );
    } catch {
      // No active OMA session, or an older OMA CLI.
    }
  }

  ctx.on("agent/created", async ({ agent, source, signal }) => {
    if (!(await active(agent, signal))) return;
    await announce(agent, signal);
    if (source === "resume" || initializedAgents.has(agent)) return;
    initializedAgents.add(agent);
    agent.inject(message(RUNTIME_NOTE));
  });
  ctx.on("agent/disposed", ({ agent }) => {
    stopStates.delete(agent);
    assistantResponses.delete(agent.session);
    void runner.cancelOwner(agent);
  });
  ctx.on("session/event", (session, event) => {
    if (event.type !== "assistant/message" || event.data.interrupted) return;
    const text = event.data.message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .slice(-65536);
    assistantResponses.set(session, { turn: event.data.turn, text });
  });
  ctx.on("tools/pre-execute", async (execution, next) => {
    const agent = execution.agent;
    try {
      if (!(await active(agent, execution.signal))) return next();
      const output = await run(
        "PreToolUse",
        agent,
        execution.signal,
        execution,
      );
      if (disposed || execution.signal.aborted) return { kind: "cancel" };
      const context = hookContext(output);
      if (context) agent.inject(message(context));
      return preDecision(output, execution.arguments) ?? next();
    } catch (error) {
      if (disposed || execution.signal.aborted) return { kind: "cancel" };
      report(error);
      return {
        kind: "deny",
        reason: `OMA hook could not validate this tool: ${error.message}`,
      };
    }
  });
  ctx.on("tools/post-execute", async (execution, result, next) => {
    const agent = execution.agent;
    let context;
    try {
      if (!(await active(agent, execution.signal))) return next();
      context = postContext(
        await run("PostToolUse", agent, execution.signal, execution, result),
      );
    } catch (error) {
      report(error);
      context = `OMA post-tool validation failed: ${error.message}`;
    }
    const downstream = await next();
    if (!context || disposed || execution.signal.aborted) return downstream;
    return {
      ...downstream,
      additionalContexts: [
        message(context),
        ...(downstream.additionalContexts ?? []),
      ],
    };
  });
  ctx.on("agent/turn-stopping", async ({ agent, turn, signal }) => {
    let state = stopStates.get(agent);
    if (state?.turn !== turn) {
      state = { turn, blocks: 0, inFlight: false, warned: false };
      stopStates.set(agent, state);
    }
    if (state.inFlight) return;
    state.inFlight = true;
    let reason;
    try {
      if (!(await active(agent, signal))) return;
      const payload = await hookPayload("Stop", agent);
      const latest = assistantResponses.get(agent.session);
      if (latest?.turn === turn) payload.response = latest.text;
      const stdout = await runner.run("Stop", payload, {
        signal,
        owner: agent,
      });
      reason = stopReason(decodeOutput(stdout, "Stop"));
    } catch (error) {
      report(error);
      reason = `OMA stop validation failed: ${error.message}`;
    } finally {
      state.inFlight = false;
    }
    if (!reason || disposed || signal.aborted) return;
    if (state.blocks >= maxStopBlocks) {
      if (!state.warned) {
        state.warned = true;
        report(
          new Error(
            `Stop validation remains unresolved after ${maxStopBlocks} continuation requests: ${reason}`,
          ),
        );
      }
      return;
    }
    state.blocks += 1;
    agent.steer(message(reason));
  });
}
