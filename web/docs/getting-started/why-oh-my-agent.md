---
title: Why oh-my-agent
description: Choose oh-my-agent when you need repository-owned agent skills, workflows, multi-vendor dispatch, and explicit verification.
---

# Why oh-my-agent

oh-my-agent adds a repository-owned layer around the agent CLIs your team already uses. The `.agents/` directory stores [skills](./glossary.md#skill), [workflows](./glossary.md#workflow), [agent definitions](./glossary.md#agent-definition), rules, and model configuration. Vendor-native files are generated from that [source of truth](./glossary.md#ssot), so the behavior can be reviewed and changed with the project.

## Choose it when the repository needs the coordination layer

OMA is a useful fit when you need one or more of these:

- **Several agent hosts or vendors.** `model_preset: auto` uses the current runtime's native configuration. Fixed and custom presets can route roles to other vendors; `oma agent spawn` handles non-native dispatch.
- **A repeatable team workflow.** `/work` handles one scoped task, `/orchestrate` coordinates delegated work, `/ultrawork` runs parallel work with review steps, and `/ralph` repeats a task with an explicit judge phase.
- **Repository-owned instructions.** Skills, workflows, rules, and agent definitions live beside the code. `oma link` projects the selected files into supported vendor formats.
- **Mechanical checks and durable results.** Agent runs can write structured status and result receipts, while `oma verify agent <agent-type>` and `oma docs verify` provide explicit checks.

If a project uses one host and does not need shared skills, workflows, or vendor routing, the extra `.agents/` files and CLI commands may not justify the setup. OMA is a coordination layer; it does not replace the host's model, editor, or project-specific acceptance criteria.

## Verification is a command you select

Run `oma verify agent <agent-type> --workspace <path>` when you want the checks for a backend, frontend, mobile, QA, debug, or planning role. The verifier combines static inspections with configured commands such as tests, type checks, SQL checks, or `flutter analyze`; see [`cli/commands/verify/report.ts`](https://github.com/first-fluke/oh-my-agent/blob/main/cli/commands/verify/report.ts). The report shows the result of each check. Passing these checks does not establish that a feature meets its product or domain requirements, so the task's acceptance criteria still need review.

`/ralph` adds a separate [judge](./glossary.md#judge) phase when you select that workflow. It rechecks the declared criteria across iterations and records the workflow artifacts; it is not a gate that runs for every ordinary prompt. Skill loading also does not start every workflow or verification command.

## Dispatch remains visible

`oma doctor --profile` shows the resolved vendor and model for each dispatch role. `oma agent spawn <agent-id> <prompt> <session-id>` is the explicit CLI path when a role is not handled by the current host. The model resolution rules and provider-specific behavior are documented in [Important Defaults](./important-defaults.md) and [Per-Agent Models](../guide/per-agent-models.md).

Hooks can activate a workflow only when the relevant host integration is enabled. Native skill routing is performed by the host, while workflow routing follows the selected workflow or hook; a plain prompt does not guarantee that a particular skill or gate runs.

Optional coordination controls are documented in the [session quota cap](../guide/configuration-reference.md#session-quota-caps), the [`/orchestrate` retry and exploration loop](../core-concepts/workflows.md#orchestrate), and [workspace assignment](../core-concepts/parallel-execution.md#workspace-aware-pattern).

## The practical trade-off

OMA gives a team a shared place to define routing, execution steps, checks, and output files. In return, the team has to keep that repository configuration current and decide which workflows or verification commands belong in its acceptance contract. That trade-off is useful when consistency across contributors matters more than the smallest possible install.

For the original positioning discussion, see [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

## Next steps

- [Quick Start](./quick-start.md): install, check the setup, and run one scoped task
- [Important Defaults](./important-defaults.md): what the installer turns on and how to change it
- [Installation](./installation.md#presets): pick a skill preset that covers the workflows you plan to use
- [Workflows](../core-concepts/workflows.md): when to use `/work`, `/orchestrate`, `/ultrawork`, and `/ralph`
- [Troubleshooting](../guide/troubleshooting.md): fixes for install, vendor, and hook problems
