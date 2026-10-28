---
title: Choose a Setup
description: Load one OMA skill for a task, select a domain preset, or install the Claude Code plugin with its runtime dependencies.
---

# Choose a setup

Choose the entry point for the task you want to complete.

| Need | Entry point | What it sets up |
|---|---|---|
| One focused task in your current agent | [Load one skill](#load-one-skill) | Instructions and supporting files in a temporary directory |
| Project hooks, specialist agents, and workflows | [Install a skill preset](#install-a-skill-preset) | OMA runtime integration with the selected skills |
| Claude Code marketplace installation | [Install the plugin](#install-the-claude-code-plugin) | The OMA plugin and project bootstrap |

## Load one skill

Ask your coding agent to run the command for your task and read the returned
instructions. `skills use` prints the instructions and the path to their support
directory. It does not launch another agent or run the OMA installer.

| Task | Command | First request |
|---|---|---|
| Admin UI design or an existing-UI review | `bunx skills use first-fluke/oh-my-agent@oma-design` | Review our admin page's hierarchy, table density, and empty states. |
| A reproducible bug | `bunx skills use first-fluke/oh-my-agent@oma-debug` | Reproduce this failure, fix its cause, and run the relevant check. |
| An architecture decision | `bunx skills use first-fluke/oh-my-agent@oma-architecture` | Compare keeping this job in the API with moving it to a worker. |

The selected folder includes its shared instruction references. Dependencies
outside that folder remain explicit: another domain skill, project rules, CLI
operations, browser tools, or an external engine may still be required. Read
the selected skill's dependencies for the requested operation. Install the
runtime when the task requires its hooks or managed execution.

For design work, `oma-design` selects Interface Design for admin and product
interface direction, Taste for other web art direction, and Impeccable for
existing-UI critique, audit, and polish. The project's stack and `DESIGN.md`
remain the implementation and design contracts.

## Install a skill preset

Install the CLI once, then select the project's skills:

```bash
bun install --global oh-my-agent
oma install --preset frontend --yes
oma doctor
```

An existing CLI installation can start from the second command. Use
`oma install --help` for preset names and provider options. The
[bootstrap installer](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#method-1-one-liner-install) also prepares
the runtime dependencies before interactive setup.

| Preset | First task | Applicable workflow examples |
|---|---|---|
| `frontend` | Plan a settings page, then implement its form | `/plan`, `/design`, `/review`, `/debug` |
| `backend` | Plan an authenticated API endpoint | `/plan`, `/architecture`, `/review`, `/debug` |
| `research` | Find papers and compare their evidence | Ask for a cited literature search |
| `all` | Coordinate a feature across UI, API, and data | `/orchestrate`, `/work`, `/ultrawork`, `/ralph` |

The [ten named presets](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#presets) are accepted by `--preset`.
An unknown name, an empty value, or `custom` is rejected before installation.
To select individual skills, run `oma install` interactively and choose Custom.
Without `--preset`, unattended `--yes`/CI setup selects `all`.

The frontend preset selects eight skills. Presets select skill content; the
installer still sets up shared files, all workflow and agent definitions, hooks,
and providers. Some workflows need skills outside a domain preset. Check
[workflow dependencies](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#workflows-that-need-skills-outside-a-preset)
before using them, or select `all` for every workflow. A smaller preset on an
existing installation does not remove other skills.

Provider choices are independent of presets. For example, add
`--semantic-memory none` when the project does not need a semantic-memory
service. See [installation effects](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#what-the-installer-also-does-by-default)
for the other files and integrations the runtime configures.

The install summary lists selected skills and checks the skill manifests present,
including retained skills. It reports static workflow and agent references,
including conditional branches, as referenced skill manifests. Run `oma doctor`
to repair missing or unreadable entries needed for your task. These checks do
not verify resource contents, tools, providers, credentials, or execution.

## Install the Claude Code plugin

Run these commands inside Claude Code:

```text
/plugin marketplace add first-fluke/oh-my-agent
/plugin install oma@oh-my-agent
```

The plugin's session-start hook provisions the CLI when needed and runs
`oma install --yes` for the current project. This path performs runtime setup.
Its success receipt belongs to that project, and the plugin's event hooks use
the installed CLI. Plugin hooks require Bash, including on Windows. Bootstrap
has a 600-second timeout; failures report manual setup steps and retain the
project log at `.agents/state/plugin-bootstrap.last-error.log`. A receipt is
reused only after CLI-version, project-configuration, and hook checks pass.
Restart the session after bootstrap reports completion.

For the configuration and dependency choices during setup, use
`oma install` directly. The plugin's unattended bootstrap uses the `all` skill
preset. Use `oma install --preset <name>` directly for a domain preset.

## Check the result

For a loaded skill, confirm that the agent read the selected instructions and
report the task's actual checks. For a runtime installation, run `oma doctor`
and try the first request for your preset. Doctor's provider warnings matter
when the requested task uses that provider.
