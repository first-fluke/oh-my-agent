import assert from "node:assert/strict";
import { test } from "node:test";
import { createSkillInvalidator } from "./skills.mjs";

function registry() {
  const registrations = [];
  return {
    registrations,
    registerProvider(factory) {
      const lifecycle = new AbortController();
      const entry = { invalidations: 0, disposals: 0 };
      entry.provider = factory({
        signal: lifecycle.signal,
        invalidate() {
          if (!lifecycle.signal.aborted) entry.invalidations += 1;
        },
      });
      entry.dispose = () => {
        if (lifecycle.signal.aborted) return;
        entry.disposals += 1;
        lifecycle.abort();
      };
      registrations.push(entry);
      return entry.dispose;
    },
  };
}

function injectableContext() {
  let callback;
  let cleanup;
  let stopped = false;
  return {
    inject(deps, register) {
      assert.deepEqual(deps, ["skills"]);
      callback = register;
      return {
        async dispose() {
          stopped = true;
          await cleanup?.();
        },
      };
    },
    async provide(skills) {
      await cleanup?.();
      cleanup = undefined;
      if (!stopped && skills) cleanup = callback({ skills });
    },
    get disposed() {
      return stopped;
    },
  };
}

test("optional skills service absence keeps invalidation and disposal safe", async () => {
  for (const ctx of [{}, { skills: {} }, injectableContext()]) {
    const invalidator = createSkillInvalidator(ctx);
    assert.doesNotThrow(() => invalidator.invalidate());
    await invalidator.dispose();
    assert.doesNotThrow(() => invalidator.invalidate());
  }
});

test("setup provider invalidates through public control without duplicating native skills", async () => {
  const skills = registry();
  const invalidator = createSkillInvalidator({ skills });
  const [entry] = skills.registrations;
  assert.equal(entry.provider.name, "oma-project-setup");
  assert.deepEqual(await entry.provider.list({ cwd: "/project" }), []);
  assert.equal(await entry.provider.get({ name: "oma-backend" }), undefined);
  invalidator.invalidate();
  assert.equal(entry.invalidations, 1);
  await invalidator.dispose();
  await invalidator.dispose();
  invalidator.invalidate();
  assert.equal(entry.disposals, 1);
  assert.equal(entry.invalidations, 1);
});

test("late skills services and replacements register and release on their injected lifecycle", async () => {
  const ctx = injectableContext();
  const invalidator = createSkillInvalidator(ctx);
  invalidator.invalidate();
  const first = registry();
  await ctx.provide(first);
  invalidator.invalidate();
  assert.equal(first.registrations[0].invalidations, 1);

  await ctx.provide(undefined);
  invalidator.invalidate();
  assert.equal(first.registrations[0].disposals, 1);
  assert.equal(first.registrations[0].invalidations, 1);

  const next = registry();
  await ctx.provide(next);
  invalidator.invalidate();
  assert.equal(next.registrations[0].invalidations, 1);
  await invalidator.dispose();
  assert.equal(ctx.disposed, true);
  assert.equal(next.registrations[0].disposals, 1);
  invalidator.invalidate();
  assert.equal(next.registrations[0].invalidations, 1);
});

test("disposing before a late service arrives prevents provider registration", async () => {
  const ctx = injectableContext();
  const invalidator = createSkillInvalidator(ctx);
  await invalidator.dispose();
  const skills = registry();
  await ctx.provide(skills);
  assert.equal(skills.registrations.length, 0);
});
