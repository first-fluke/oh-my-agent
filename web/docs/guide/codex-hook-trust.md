---
title: "Guide: Codex Hook Trust"
sidebar_label: Codex Hook Trust
description: How Codex gates hooks behind trust, what oh-my-agent records so its hooks run, and when you still need to review hooks yourself.
---

# Guide: Codex Hook Trust

When oh-my-agent installs into a project, it writes vendor-native hook configs, including `.codex/hooks.json` for the Codex CLI. Codex does not run a hook just because it is configured. Two approvals gate it, and both live in your user config (`$CODEX_HOME/config.toml`, default `~/.codex/config.toml`). A project cannot approve its own hooks:

1. **Project trust.** A project's `.codex/` folder (its `config.toml` and `hooks.json`) loads only for a trusted project: `[projects."<path>"] trust_level = "trusted"`.
2. **Per-hook trust.** Every non-managed hook, in project or user scope, needs a `[hooks.state."<hooks.json path>:<event>:<group>:<handler>"]` entry whose `trusted_hash` matches the hook's current declaration (command, timeout, matcher, async flag, status message).

A new or changed hook shows "Hooks need review" in the Codex TUI. `codex exec` silently leaves it out.

---

## What oh-my-agent records for you

`oma install`, `oma update`, and `oma link` write both approvals for **oh-my-agent's own hooks**. These are the handlers named `oma-hook-*` or run through the `oma-hook.sh` wrapper. The hash is the same one Codex computes when you choose "Trust all and continue", so the hooks run on the first Codex session with no `/hooks` step. A later oh-my-agent release that changes a hook command records the new hash during `oma update`, so the hooks stay on.

oh-my-agent edits only the affected tables in `config.toml`. It re-reads the result and leaves the file untouched if anything else would change. It never:

- approves a hook you added yourself to the same `hooks.json`,
- trusts a project you marked `trust_level = "untrusted"`,
- re-enables a hook you turned off (`enabled = false`),
- touches Codex before Codex has created its home directory.

A global install (`~/.codex/hooks.json`) gets the per-hook entries only, because there is no project to trust.

---

## When you still review hooks yourself

If oh-my-agent could not record trust, it prints the reason with the notice:

```text
⚠ Codex hooks installed/updated but not trusted (<reason>) — run codex and use /hooks to trust them (untrusted hooks do not run).
```

The usual cases are a `config.toml` it cannot parse, a project you marked untrusted, or Codex not having been run yet. In that case open the project in Codex, run `/hooks`, and enable the hooks once. Then run `oma link codex` so later updates keep them trusted.

---

## Codex processes oh-my-agent spawns

When oh-my-agent spawns a Codex subprocess itself (for example `oma agent spawn`), it also passes `--dangerously-bypass-hook-trust`. That flag runs enabled hooks without the hash check. It does not lift project trust. The flag applies only to processes oh-my-agent starts and is never written to your config.

---

## No `[features] hooks` flag needed

Older oh-my-agent releases wrote `[features] codex_hooks = true` in Codex config. Codex 0.124 renamed that flag to `hooks` and made hooks a stable, default-on feature, so no flag is needed. oh-my-agent writes neither key, and it strips the deprecated `codex_hooks` and `child_agents_md` flags from the `[features]` table when it finds them.

---

## Summary

| Situation | What you do |
|:----------|:------------|
| First install in a project | Nothing: trust is recorded by the installer |
| `oma update` that changes a hook command | Nothing: the new hash is recorded |
| Installer prints "not trusted (…)" | Fix the reason, or run `/hooks` once in Codex |
| A hook you added to `.codex/hooks.json` | Review it in `/hooks` yourself |

## See also

- [Existing project integration](./integration.md): what the installer writes for each vendor
- [Global install](./global-install.md): user-wide installs that write `~/.codex/`
