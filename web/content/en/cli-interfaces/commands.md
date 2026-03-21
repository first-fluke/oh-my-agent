---
title: Commands
description: Complete command surface from cli/cli.ts.
---

# Commands

The command surface below mirrors the current implementation in `cli/cli.ts`.

## Core Commands

```bash
oma                         # interactive installer
oma dashboard               # terminal dashboard
oma dashboard:web           # web dashboard (:9847)
oma usage:anti              # Antigravity usage quotas
oma update                  # update skills from registry
oma doctor                  # environment/skill diagnostics
oma stats                   # productivity metrics
oma retro                   # retrospective report
oma cleanup                 # cleanup orphan resources
oma bridge [url]            # MCP stdio -> streamable HTTP
```

## Agent Commands

```bash
oma agent:spawn <agent-id> <prompt> <session-id>
oma agent:status <session-id> [agent-ids...]
```

## Memory and Verification

```bash
oma memory:init
oma verify <agent-type>
```
