import { realpath } from "node:fs/promises";
import {
  decodeOutput,
  hookContext,
  hookPayload,
  postContext,
  preDecision,
  stopReason,
} from "./protocol.mjs";
import { createHookRunner } from "./runner.mjs";
import { createWorkspaceSetup } from "./setup.mjs";
import { createSkillInvalidator } from "./skills.mjs";

const RUNTIME_NOTE = [
  "[OMA runtime]",
  "Runtime: DeepSeek Harness (DSH). OMA skills are available under .agents/skills.",
  "Follow the project's AGENTS.md and the selected skill's instructions.",
  "Use the tools and agent APIs actually exposed by DSH. OMA hook JSON uses the Claude compatibility dialect; this does not make the session a Claude session.",
  "Automatic OMA keyword workflows and native OMA role dispatch are not provided by this plugin.",
].join("\n");

class WorkspaceSetupError extends Error {
  constructor(error) {
    super(
      `OMA workspace setup failed: ${error.message}. Check workspace write access and the plugin's OMA dependency, then reload the plugin. You can also initialize OMA manually and set autoSetup: false.`,
      { cause: error },
    );
  }
}

export function registerBridge(
  ctx,
  config,
  createUserMessage,
  dependencies = {},
) {
  const maxStopBlocks = config?.maxStopBlocks ?? 2;
  if (
    !Number.isSafeInteger(maxStopBlocks) ||
    maxStopBlocks < 1 ||
    maxStopBlocks > 10
  ) {
    throw new TypeError("maxStopBlocks must be an integer between 1 and 10");
  }
  const runner = createHookRunner(config);
  const setup = (dependencies.createWorkspaceSetup ?? createWorkspaceSetup)(
    config,
  );
  const skillInvalidator = (
    dependencies.createSkillInvalidator ?? createSkillInvalidator
  )(ctx);
  const stopStates = new WeakMap();
  const preparedAgents = new WeakSet();
  const initializedAgents = new WeakSet();
  const announcedAgents = new WeakSet();
  const disposedAgents = new WeakSet();
  const setupFailures = new WeakSet();
  const assistantResponses = new WeakMap();
  let disposed = false;
  const message = (text) =>
    createUserMessage({
      content: [{ type: "text", text }],
      source: { kind: "oma-hook" },
    });
  const report = (error) => ctx.logger?.warn?.(`oma: ${error.message}`);
  const inactive = (agent, signal) =>
    disposed || disposedAgents.has(agent) || signal?.aborted;
  async function active(agent, signal) {
    if (inactive(agent, signal)) return false;
    try {
      const ready = await setup.ensure(agent, signal);
      if (!ready || inactive(agent, signal)) return false;
      if (!preparedAgents.has(agent)) {
        skillInvalidator.invalidate();
        preparedAgents.add(agent);
      }
      return true;
    } catch (error) {
      if (inactive(agent, signal)) throw error;
      const failure = new WorkspaceSetupError(error);
      if (!setupFailures.has(agent)) {
        setupFailures.add(agent);
        report(failure);
        agent.inject(message(failure.message));
      }
      throw failure;
    }
  }
  async function run(event, agent, signal, execution, result) {
    const payload = await hookPayload(event, agent, execution, result);
    if (inactive(agent, signal)) throw new Error("OMA hook was cancelled");
    const stdout = await runner.run(event, payload, { signal, owner: agent });
    return decodeOutput(stdout, event);
  }
  ctx.effect(
    () => async () => {
      disposed = true;
      await Promise.all([
        setup.dispose(),
        runner.dispose(),
        skillInvalidator.dispose(),
      ]);
    },
    "oma: terminate and drain setup and hook processes",
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
      const cwd = await realpath(header.cwd);
      if (inactive(agent, signal)) return;
      await runner.run(
        "boundary",
        { cwd },
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

  ctx.on("agent/created", async ({ agent, signal }) => {
    try {
      if (!(await active(agent, signal))) return;
      await announce(agent, signal);
      if (inactive(agent, signal) || initializedAgents.has(agent)) return;
      initializedAgents.add(agent);
      agent.inject(
        message(
          `${RUNTIME_NOTE}\nOMA CLI command (argument array): ${JSON.stringify(runner.invocation())}. Use this command for OMA instructions instead of assuming a global oma executable.`,
        ),
      );
    } catch (error) {
      if (!inactive(agent, signal) && !(error instanceof WorkspaceSetupError))
        report(error);
    }
  });
  ctx.on("agent/disposed", ({ agent }) => {
    disposedAgents.add(agent);
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
      if (!(await active(agent, execution.signal)))
        return inactive(agent, execution.signal) ? { kind: "cancel" } : next();
      const output = await run(
        "PreToolUse",
        agent,
        execution.signal,
        execution,
      );
      if (inactive(agent, execution.signal)) return { kind: "cancel" };
      const context = hookContext(output);
      if (context) agent.inject(message(context));
      return preDecision(output, execution.arguments) ?? next();
    } catch (error) {
      if (inactive(agent, execution.signal)) return { kind: "cancel" };
      if (!(error instanceof WorkspaceSetupError)) report(error);
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
      if (
        !inactive(agent, execution.signal) &&
        !(error instanceof WorkspaceSetupError)
      )
        report(error);
      context = `OMA post-tool validation failed: ${error.message}`;
    }
    const downstream = await next();
    if (!context || inactive(agent, execution.signal)) return downstream;
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
      if (inactive(agent, signal)) return;
      const latest = assistantResponses.get(agent.session);
      if (latest?.turn === turn) payload.response = latest.text;
      const stdout = await runner.run("Stop", payload, {
        signal,
        owner: agent,
      });
      reason = stopReason(decodeOutput(stdout, "Stop"));
    } catch (error) {
      if (!inactive(agent, signal) && !(error instanceof WorkspaceSetupError))
        report(error);
      reason = `OMA stop validation failed: ${error.message}`;
    } finally {
      state.inFlight = false;
    }
    if (!reason || inactive(agent, signal)) return;
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
