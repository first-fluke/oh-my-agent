import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import activate, { buildPrompt, catalog, insertRequest } from "./main.mjs";

const html = readFileSync(new URL("./panel.html", import.meta.url), "utf8");
const manifest = JSON.parse(
  readFileSync(new URL("./orca-plugin.json", import.meta.url), "utf8"),
);
const workspace = {
  displayName: "example",
  branch: "fix/example",
  terminals: [{ id: "agent-1" }],
};

function fakeHost(context = workspace, accepted = true) {
  const calls = [];
  return {
    calls,
    host: {
      async call(method, params) {
        calls.push({ method, params });
        return method === "workspace.readContext" ? context : { accepted };
      },
    },
  };
}

test("manifest and worker expose the same bounded, single-line requests", () => {
  const commands = new Map();
  activate({
    commands: { register: (id, handler) => commands.set(id, handler) },
  });
  assert.deepEqual(
    [...commands.keys()],
    manifest.contributes.commands.map((item) => item.id),
  );
  for (const action of catalog.actions) {
    const prompt = buildPrompt(action.id);
    assert.ok(prompt.length < 4096);
    assert.ok(
      [...prompt].every(
        (char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127,
      ),
    );
  }
  assert.throws(() => buildPrompt("unknown"), /Unknown OMA/);
  assert.deepEqual(
    manifest.capabilities.map((item) => item.kind),
    ["workspace:read", "terminal:send"],
  );
  assert.equal(manifest.contributes.skills, undefined);
  const marketplace = JSON.parse(
    readFileSync(new URL("./orca-marketplace.json", import.meta.url), "utf8"),
  );
  assert.equal(
    marketplace.plugins[0].id,
    `${manifest.publisher}.${manifest.id}`,
  );
  assert.equal(marketplace.plugins[0].source.ref, `orca-v${manifest.version}`);
  assert.deepEqual(marketplace.plugins[0].categories, ["productivity"]);
});

test("palette inserts a request without submitting or claiming a task result", async () => {
  const host = fakeHost();
  const result = await insertRequest(host, "review");
  assert.deepEqual(result, {
    status: "inserted",
    terminalId: "agent-1",
    submitted: false,
  });
  assert.deepEqual(host.calls[1], {
    method: "terminal.sendText",
    params: {
      terminalId: "agent-1",
      text: buildPrompt("review"),
      enter: false,
    },
  });
});

test("palette never guesses a target when context is absent or ambiguous", async () => {
  for (const context of [
    null,
    { ...workspace, terminals: [] },
    { ...workspace, terminals: [{ id: "a" }, { id: "b" }] },
  ]) {
    const host = fakeHost(context);
    await assert.rejects(insertRequest(host, "verify"), /worktree|exactly one/);
    assert.equal(host.calls.length, 1);
  }
});

test("palette reports rejected writes and propagates denied host calls", async () => {
  await assert.rejects(
    insertRequest(fakeHost(workspace, false), "review"),
    /did not accept/,
  );
  await assert.rejects(
    insertRequest(
      {
        host: {
          call: async () => {
            throw new Error("capability_denied");
          },
        },
      },
      "review",
    ),
    /capability_denied/,
  );
});

test("palette prevents duplicate in-flight insertions and recovers after failure", async () => {
  const handlers = new Map();
  let release;
  const host = fakeHost();
  host.host.call = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  activate({
    ...host,
    commands: { register: (id, handler) => handlers.set(id, handler) },
  });
  const first = handlers.get("oma.review")();
  await assert.rejects(handlers.get("oma.verify")(), /already pending/);
  release(null);
  await assert.rejects(first, /worktree/);
  const again = handlers.get("oma.review")();
  release(null);
  await assert.rejects(again, /worktree/);
});

// Run the exact shipped inline panel code with a small DOM/bridge harness.
// Host responses stay asynchronous so focus changes and ambiguous writes can
// be exercised without starting an agent or requiring Electron in CI.
function panelHarness() {
  class Element {
    value = "";
    textContent = "";
    disabled = false;
    children = [];
    listeners = {};
    attrs = {};
    addEventListener(name, handler) {
      this.listeners[name] = handler;
    }
    setAttribute(name, value) {
      this.attrs[name] = value;
    }
    append(child) {
      this.children.push(child);
    }
    add(child) {
      this.append(child);
    }
    replaceChildren(...children) {
      this.children = children;
      this.value = "";
    }
    click() {
      return this.listeners.click?.();
    }
  }
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement: () => new Element(),
  };
  document.getElementById("oma-catalog").textContent = JSON.stringify(catalog);
  const messages = [];
  const listeners = {};
  const timers = new Map();
  let timerId = 0;
  const parent = { postMessage: (message) => messages.push(message) };
  const window = {
    parent,
    addEventListener: (name, handler) => {
      listeners[name] = handler;
    },
  };
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  runInNewContext(script, {
    document,
    window,
    Option: class extends Element {
      constructor(label, value) {
        super();
        this.textContent = label;
        this.value = value;
      }
    },
    setTimeout: (fn) => {
      timers.set(++timerId, fn);
      return timerId;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  return {
    elements,
    messages,
    timers,
    element: (id) => document.getElementById(id),
    async reply(message, value, error, source = parent) {
      listeners.message({
        source,
        data: {
          type: "orca-panel-action-result",
          requestId: message.requestId,
          ok: !error,
          value,
          error,
        },
      });
      await Promise.resolve();
      await Promise.resolve();
    },
    async ready(context = workspace) {
      await this.reply(messages[0], context);
    },
    select(id = "agent-1") {
      this.element("terminal").value = id;
      this.element("terminal").listeners.change();
    },
    hide: () => listeners.pagehide(),
  };
}

test("panel waits for explicit terminal selection and uses the shared preview", async () => {
  const panel = panelHarness();
  await panel.ready();
  assert.equal(panel.element("insert").disabled, true);
  panel.select();
  assert.equal(panel.element("insert").disabled, false);
  const buttons = panel.element("actions").children;
  for (const [index, action] of catalog.actions.entries()) {
    buttons[index].click();
    assert.equal(panel.element("prompt").value, buildPrompt(action.id));
  }
  assert.equal(panel.timers.size, 0);
});

test("panel checks context again, locks duplicate clicks, and only reports insertion", async () => {
  const panel = panelHarness();
  await panel.ready();
  panel.select();
  const insertion = panel.element("insert").click();
  panel.element("insert").click();
  assert.equal(panel.messages.length, 2);
  await panel.reply(panel.messages[1], workspace);
  assert.equal(panel.messages[2].params.enter, false);
  assert.equal(panel.messages[2].params.terminalId, "agent-1");
  await panel.reply(panel.messages[2], { accepted: true });
  await insertion;
  assert.match(panel.element("status").textContent, /Request inserted/);
  assert.match(panel.element("status").textContent, /No task result/);
  assert.equal(panel.timers.size, 0);
});

test("panel blocks stale worktrees and never redirects a request", async () => {
  const panel = panelHarness();
  await panel.ready();
  panel.select();
  const insertion = panel.element("insert").click();
  await panel.reply(panel.messages[1], {
    ...workspace,
    terminals: [{ id: "other-agent" }],
  });
  await insertion;
  assert.equal(panel.messages.length, 2);
  assert.match(panel.element("status").textContent, /changed/);
  assert.equal(panel.element("insert").disabled, true);
});

test("panel does not turn rejected or denied writes into success", async () => {
  for (const error of [undefined, "capability_denied"]) {
    const panel = panelHarness();
    await panel.ready();
    panel.select();
    const insertion = panel.element("insert").click();
    await panel.reply(panel.messages[1], workspace);
    await panel.reply(panel.messages[2], { accepted: false }, error);
    await insertion;
    assert.match(
      panel.element("status").textContent,
      /did not accept|capability_denied/,
    );
    assert.doesNotMatch(
      panel.element("status").textContent,
      /Request inserted/,
    );
  }
});

test("panel ignores foreign messages and never replays a timed-out write", async () => {
  const panel = panelHarness();
  await panel.ready();
  panel.select();
  const insertion = panel.element("insert").click();
  await panel.reply(panel.messages[1], workspace);
  await panel.reply(panel.messages[2], { accepted: true }, undefined, {});
  assert.equal(panel.timers.size, 1);
  for (const timeout of panel.timers.values()) timeout();
  await insertion;
  assert.match(panel.element("status").textContent, /may have been inserted/);
  assert.equal(panel.messages.length, 3);
  await panel.reply(panel.messages[2], { accepted: true });
  assert.match(panel.element("status").textContent, /may have been inserted/);
});

test("panel handles missing worktrees and cleans pending calls on close", async () => {
  const panel = panelHarness();
  await panel.ready(null);
  assert.equal(panel.element("insert").disabled, true);
  assert.match(panel.element("status").textContent, /Open a project/);
  const refresh = panel.element("refresh").click();
  panel.hide();
  await refresh;
  assert.equal(panel.timers.size, 0);
  assert.match(panel.element("status").textContent, /closed/);
});
