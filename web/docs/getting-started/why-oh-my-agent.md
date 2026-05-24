---
title: Why oh-my-agent
description: Positioning thesis for oh-my-agent in a saturated multi-agent CLI category. Cost has shifted from implementation to test and maintenance; oh-my-agent ships quality gates, independent verification, multi-vendor dispatch, and repo-native customization to address that shift.
---

# Why oh-my-agent

The multi-agent CLI category is crowded. In the last quarter alone, more than twenty multi-agent orchestrators have appeared - Metateam, OpenSwarm, DevSquad, Praktor, Salacia, Codelegate, agent-of-empires, TTal, Maggy, and others. Most optimize the same axis: making agents write code faster.

oh-my-agent optimizes a different axis. With capable models, the cost of analysis, design, and implementation in the SDLC approaches zero. Testing and maintenance — keeping a system working, secure, and understandable after the first commit — are where the cost now sits. oh-my-agent is designed around that axis.

This page makes that positioning concrete. For the long-form discussion that originated this framing, see [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

---

## The cost has shifted

When a single capable model can produce a working feature in minutes, the bottleneck is no longer implementation throughput. The bottleneck is verifying that the produced code actually does what was claimed, catching silent regressions across iterations, keeping secrets out of prompts and logs, and surfacing token spend before it surprises the team.

A harness that only spawns agents faster does not address any of these. A harness designed for the post-implementation phase does.

---

## What oh-my-agent ships for the post-implementation phase

Each capability below addresses a specific failure mode reported in the multi-agent CLI category.

### Independent verification, not LLM self-assessment

`oma verify <agent>` runs fourteen deterministic checks per agent type. The checks are mechanical: exit code from the test command, TypeScript strict pass, raw SQL pattern detection, hardcoded secret scan, Flutter analyze, inline style scan, scope violation against the agent's charter. No LLM judges whether the work "looks correct". A check passes if and only if its underlying command reports success.

This addresses the most common complaint in the category, summarized by one community post as "agents lie - they say tests pass when tests do not". See `cli/commands/verify/verify.ts` for the check list.

### Re-verification across iterations

The `ralph` workflow wraps `ultrawork` with an independent JUDGE phase. After every iteration, JUDGE re-verifies every criterion - including the ones that already passed in earlier iterations. This catches the case where fixing criterion C2 silently breaks criterion C1, which is the actual mechanism behind most regressions in long agent sessions.

Heavy verifications (greater than thirty seconds) are cached against affected file paths, so re-verification stays cheap. See `.agents/workflows/ralph/resources/judge-protocol.md` for the protocol.

### Quota caps that block before damage

Every `oma agent:spawn` call records the spawn's token estimate to `.serena/memories/session-cost-{sessionId}.md`. Before the next spawn, `checkCap` consults the configured quota cap and refuses to launch if any dimension is exceeded. Three dimensions are enforced: total tokens, total spawn count, and per-vendor token budget.

Without the cap you discover at the end of the month that you spent $40,000. With it, the orchestrator tells you at spawn fifteen that one spawn remains. See `cli/io/session-cost.ts` and configure under `session.quota_cap` in `.agents/oma-config.yaml`.

### Retry then explore, not retry forever

When `orchestrate` Step 5 finds a verification failure, it retries the agent up to twice with error context. If the second retry still fails and the cost cap is not yet exceeded, the workflow switches to the Exploration Loop - it spawns two or three alternative hypothesis variants in parallel separate workspaces and keeps only the highest-scoring result. Failed approaches are discarded with their cost recorded.

This is a structured response to the case where one approach is fundamentally wrong. Retrying it never converges; trying different approaches in parallel does.

### Monorepo-aware workspace routing

`detectWorkspace` reads pnpm, nx, turbo, and lerna configurations and routes each agent to its target sub-workspace automatically. The backend agent runs against `apps/api/`, the frontend agent against `apps/web/`, without the orchestrator having to compose paths manually. See `cli/io/workspaces.ts`.

---

## Multi-vendor is not optional

The second design assumption is that any team doing real AI-assisted development uses more than one provider. Today that means Claude, Codex, Gemini, Copilot, Qwen, Kimi, and whatever ships next quarter. Vendor switching is a fact, not an edge case - Anthropic moves agent features to a separate paid plan, OpenAI ships Codex CLI the same week Anthropic models degrade, GitHub Copilot moves to consumption-based pricing.

oh-my-agent treats vendor selection as per-agent configuration through `model_preset` and `agents.<id>.model` in `.agents/oma-config.yaml`. The portable `.agents/` directory is the single source of truth; every supported runtime projects from it. No vendor lock-in is required to use oh-my-agent, and no migration is required when you switch.

---

## Repo-native customization

The third assumption is that no two teams share the same definition of "done". One team requires OWASP Top 10 scans on every backend change. Another requires a Korean-language QA report. A third requires that every migration is reviewed by a database agent before merge.

Because `.agents/` is just files in your repository, every team can add or modify agents, skills, workflows, and quality gates to match their own code of conduct and compliance posture. Customization is a `git commit`, not a vendor support ticket.

---

## What this means in practice

If your priority is spawning parallel agents fast, many tools cover that. If your priority is shipping code that keeps working after the agents leave the room, oh-my-agent is built for that. `oma verify`, JUDGE, the Exploration Loop, the quota cap, and monorepo routing are the reason the project exists, not optional add-ons.

For details on each capability, see the Core Concepts section (Agents, Parallel Execution) in the sidebar.
