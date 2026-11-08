/**
 * oh-my-agent — opencode-family npm package entry (`oh-my-agent-opencode`).
 *
 * SSOT source. `oma emit --target opencode-package` ships this file as the
 * package `main`/`exports` next to the bridge (`./oma.ts`) and the handler
 * entries it spawns. It is NOT part of the per-project install, which keeps
 * registering `./plugins/oma/oma.ts` directly.
 *
 * Two plugin contracts coexist in the family, and a package plugin must
 * satisfy whichever host imports it:
 *
 *  - OpenCode 2.x (opencode.ai/docs/build/plugins): the default export is a
 *    definition `{ id, setup(ctx) }` (`Plugin.define` is the identity). Hooks
 *    are registered through context domains — `ctx.session.hook("prompt" |
 *    "context" | "experimental.idle")`, `ctx.tool.hook("execute.before")`.
 *    A function default export is rejected ("Plugin must export a default
 *    definition with an id and an effect or setup function").
 *  - Kilo Code CLI (7.x) and OpenCode 1.18.29+: a package plugin "must
 *    default export an object with server()" — the V1 object form. `server`
 *    receives the same `{ project, client, $, directory, worktree }` input
 *    the function-style bridge takes and returns the hooks object. (Older 1.x
 *    loaders that only accept a bare function export are not served by the
 *    package; they still work with the per-project `./plugins/oma/oma.ts`.)
 *
 * So the default export carries both: `server` (the unchanged legacy bridge,
 * called by the V1 loaders) and `id` + `setup` (the v2 definition, whose
 * `setup` adapts the v2 events onto that same legacy hooks object) — one
 * bridge implementation, zero duplicated handler logic. Dependency-free: the
 * v2 context is typed structurally, so neither `@opencode/plugin` nor
 * `@opencode-ai/plugin` is needed at runtime.
 *
 * v2 mapping (→ legacy hook the bridge already implements):
 *   session "prompt"             → "chat.message"  (keyword-detector, skill-injector)
 *   session "context"            → "experimental.chat.system.transform" (inject)
 *   tool "execute.before"        → "tool.execute.before" (scm-guard, test-filter;
 *                                  a throw rejects the call, as in v1)
 *   session "experimental.idle"  → event session.idle (persistent-mode re-entry
 *                                  through ctx.session.prompt)
 */

import legacy from "./oma.ts";

type LegacyHooks = Awaited<ReturnType<typeof legacy>>;

/** Structural subset of the OpenCode 2.x plugin context this entry uses. */
interface OmaV2Context {
  location?: { directory?: string };
  session: {
    hook: (
      name: string,
      callback: (event: Record<string, unknown>) => Promise<void> | void,
    ) => Promise<unknown>;
    prompt?: (input: Record<string, unknown>) => Promise<unknown>;
  };
  tool: {
    hook: (
      name: string,
      callback: (event: Record<string, unknown>) => Promise<void> | void,
    ) => Promise<unknown>;
  };
}

function sessionIDOf(event: Record<string, unknown>): string | undefined {
  return typeof event.sessionID === "string" ? event.sessionID : undefined;
}

/**
 * The package plugin. V1 object loaders (Kilo, OpenCode 1.18.29+) call
 * `server(input)` and use the returned hooks; OpenCode 2.x reads `id` and
 * calls `setup(ctx)`, which instantiates the legacy bridge with a client
 * adapter (so session.idle re-entry posts through `ctx.session.prompt`) and
 * registers one v2 hook per legacy handler.
 */
export default {
  id: "oh-my-agent",
  server: legacy,
  async setup(ctx: OmaV2Context): Promise<void> {
    const directory = ctx.location?.directory ?? process.cwd();
    const hooks: LegacyHooks = await legacy({
      directory,
      client: {
        session: {
          prompt: async ({ path, body }) => {
            if (!ctx.session.prompt) return;
            await ctx.session.prompt({
              sessionID: path.id,
              text: body.parts.map((part) => part.text).join("\n"),
            });
          },
        },
      },
    });

    await ctx.session.hook("prompt", async (event) => {
      const sessionID = sessionIDOf(event);
      const prompt = event.prompt as { text?: unknown } | undefined;
      const text = typeof prompt?.text === "string" ? prompt.text : "";
      await hooks["chat.message"](
        { sessionID },
        { parts: [{ type: "text", text }] },
      );
    });

    await ctx.session.hook("context", async (event) => {
      const sessionID = sessionIDOf(event);
      const out: { system: string[] } = { system: [] };
      await hooks["experimental.chat.system.transform"]({ sessionID }, out);
      const system = event.system;
      if (!Array.isArray(system)) return;
      for (const text of out.system) system.push({ type: "text", text });
    });

    await ctx.tool.hook("execute.before", async (event) => {
      const input = event.input;
      if (!input || typeof input !== "object") return;
      // The legacy hook mutates `output.args.command`; `args` IS the v2
      // input object, so a test-filter rewrite lands on the real call.
      await hooks["tool.execute.before"](
        { tool: typeof event.tool === "string" ? event.tool : undefined },
        { args: input as { command?: string } },
      );
    });

    await ctx.session.hook("experimental.idle", async (event) => {
      const sessionID = sessionIDOf(event);
      if (!sessionID) return;
      await hooks.event({
        event: { type: "session.idle", properties: { sessionID } },
      });
    });
  },
};
