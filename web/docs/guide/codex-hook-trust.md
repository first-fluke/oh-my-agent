---
title: "Guide: Codex Hook Trust"
description: Why Codex hooks do not run until you review them once, what happens on updates, and what oh-my-agent automates for spawned Codex subprocesses.
---

# Guide: Codex Hook Trust

When oh-my-agent installs into a project, it writes vendor-native hook configs, including `.codex/hooks.json` for the Codex CLI. Unlike Claude Code, Codex does not run these hooks automatically. It gates every non-managed command hook behind Trust-On-First-Use (TOFU): a hook only runs after you have reviewed and enabled it once.

This is a Codex-side safety mechanism, not an oh-my-agent limitation. This guide explains the one-time step you need to take, what happens when oh-my-agent updates, and what it handles for you automatically.

---

## The one-time step: review hooks in Codex

After `oma` (install), `oma link`, or `oma update` writes `.codex/hooks.json` in a project Codex has not seen before, the hooks do **not** run yet. You must open Codex and review them once:

1. Open the project in the Codex CLI.
2. Run `/hooks` to open the hook browser (TUI).
3. Review the listed hooks and enable them.

Until you do this, the hooks stay untrusted and are skipped silently. This is why oh-my-agent prints a notice whenever it creates or changes `.codex/hooks.json`:

```
Codex hooks installed/updated — run codex and use /hooks to trust them (untrusted hooks do not run)
```

**Note:** `--dangerously-bypass-hook-trust` does not help here. Its warning ("Enabled hooks may run without review") means it only bypasses review for hooks that were already enabled — it will not run a hook that has never been reviewed. The `/hooks` browser is the only way to enable a hook the first time.

Under the hood, Codex stores your decision in `~/.codex/config.toml` under a `[hooks.state]` entry keyed by the hooks file path, event, block, and hook, with an `enabled` flag and a `trusted_hash` of the command string.

---

## What happens on updates

Once you have trusted the hooks, you do not need to repeat the step on every update:

- **Re-running `oma link` or `oma update` keeps the trust** as long as the hook command strings are unchanged. Codex compares the stored hash against the current command; a match keeps the hook trusted.
- **If a future oh-my-agent version changes a hook command string**, the hash no longer matches and that hook silently reverts to untrusted. You will see the installer notice again and need to re-trust via `/hooks`.

So the review step is only required the first time, and again after any release that actually changes a hook command.

---

## What oh-my-agent automates for you

When oh-my-agent spawns a Codex subprocess itself — for example, a cross-vendor agent dispatched through `oma agent spawn` — it passes `--dangerously-bypass-hook-trust` automatically. This lets its own vetted hooks run across updates without asking you to re-trust them manually.

This flag is applied **only** to Codex processes that oh-my-agent spawns. It is never written into your `~/.codex/config.toml` or project config, so it does not affect Codex sessions you start yourself.

---

## No `[features] hooks` flag needed

Older setups required enabling `[features] hooks = true` in Codex config. Hooks have been stable and on by default since Codex CLI ~0.14x, so this is no longer needed. oh-my-agent no longer writes it, and it actively strips the deprecated `child_agents_md` flag from Codex config when it finds it.

---

## Summary

| Situation | What you do |
|:----------|:------------|
| First install / first `.codex/hooks.json` in a project | Open Codex, run `/hooks`, enable the hooks once |
| `oma update` with unchanged hook commands | Nothing — trust is preserved |
| `oma update` that changes a hook command | Re-run `/hooks` to re-trust (installer prints a notice) |
| Codex subprocess spawned by oh-my-agent | Nothing — bypass is applied automatically |
