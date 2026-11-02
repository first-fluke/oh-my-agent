# Oh My Agent for Grok Bot

## Install from a link

The native installation page is
[Oh My Agent for Grok Bot](https://firstfluke.com/oh-my-agent/grok-bot/).
Once the plugin is approved on Cursor Marketplace, its **Add to Grok Bot** button
opens the registered `x.ai/bot/plugin/<id>` page. Follow Grok Bot's installation
prompt, then ask it to use an OMA skill such as `oma-qa`.

**Current status: the First Fluke application was submitted on 2026-11-02 UTC
and is awaiting Cursor's review. No approved OMA install link is available.**
The local page shows registration pending and does not offer an install button.
The page and this change still need publication. The CLI command below is a
manual installation route; it does not create a native marketplace link.

## Manual installation

Install OMA skills into the shared skill library on the **Grok Bot computer**.
Grok Bot uses `~/agent-data/workflows/<skill-name>/SKILL.md`; Grok Build uses
`.grok/skills/`. OMA's existing `grok` integration is for Build.

With an OMA release that includes the `grok-bot` target:

```bash
oma install --target grok-bot
```

All skills are selected by default. Choose a smaller preset or override the
workflows directory when needed:

```bash
oma install --target grok-bot --preset research
oma install --target grok-bot --workflows-dir /path/to/agent-data/workflows
```

Run the same install command again to update. The installer copies complete
skill directories and their shared resources, rather than linking to the checkout.
Changing the preset replaces OMA's previous selection and removes obsolete owned
files; unrelated skills and user-authored additions remain.
It tracks ownership, refuses collisions and local edits, and preserves unrelated
Bot skills. This target is noninteractive and does not configure runtime vendors,
Serena, MCP servers, or hooks. Tools required by individual skills still need to
be available on the Bot computer; installing instructions does not grant access
to apps, credentials, or other model providers.

Before these flags are released, run from a checkout containing this change:

```bash
git clone https://github.com/first-fluke/oh-my-agent.git
cd oh-my-agent
bun install
bun cli/cli.ts install --target grok-bot
```

This source command requires Bun and does not require a build. An older published
CLI will not recognize the new target.

## Ask your Bot to install

Paste this into a Grok Bot conversation:

> Install Oh My Agent on your computer. Read
> https://github.com/first-fluke/oh-my-agent/blob/main/integrations/grok-bot/README.md
> and follow its Grok Bot installation instructions. Use a release containing the
> grok-bot target, or a source checkout containing it. Install into your shared
> workflows library, preserve existing skills, and report the installed skill
> names and any missing prerequisites. Do not publish or schedule anything.

After installation, ask for a skill by name, for example: “Use oma-search to
research this API.” If it is missing, open **Connect apps → connected count →
Private skills** and enable it for the current Bot. File installation alone does
not verify that a signed-in Bot has loaded a skill.

## Remove

```bash
oma uninstall --target grok-bot
# Preview removal without changing the library:
oma uninstall --target grok-bot --dry-run
# Use the same override if installation used a custom directory:
oma uninstall --target grok-bot --workflows-dir /path/to/agent-data/workflows
```

## References

- [Grok Bot skills and routines](https://docs.x.ai/grok-bot/skills-routines-and-automations): shared private skills, enabling them, and invocation by name.
- [APM target matrix](https://microsoft.github.io/apm/reference/targets-matrix/#grok-bot): Bot workflows path and distinction from Build.
- [Upstream Grok Bot skill installer instructions](https://github.com/bostonaholic/grokbot-skills/blob/main/AGENTS.md): complete skill folders under `~/agent-data/workflows/`.
- [Cursor plugin submission](https://cursor.com/docs/reference/plugins): public plugin repository, marketplace review and component discovery.
- [Publisher handoff](./publishing.md): validate the package, submit the application and activate the verified installation link.
