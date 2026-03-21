---
title: Commando's
description: Volledig commando-overzicht uit cli/cli.ts.
---

# Commando's

Het onderstaande commando-overzicht weerspiegelt de huidige implementatie in `cli/cli.ts`.

## Kerncommando's

```bash
oma                         # interactieve installer
oma dashboard               # terminaldashboard
oma dashboard:web           # webdashboard (:9847)
oma usage:anti              # Antigravity-gebruiksquota
oma update                  # skills bijwerken vanuit registry
oma doctor                  # omgevings-/skilldiagnose
oma stats                   # productiviteitsmetrieken
oma retro                   # retrospectief rapport
oma cleanup                 # opruimen van verweesde resources
oma bridge [url]            # MCP stdio -> streamable HTTP
```

## Agentcommando's

```bash
oma agent:spawn <agent-id> <prompt> <session-id>
oma agent:status <session-id> [agent-ids...]
```

## Geheugen en verificatie

```bash
oma memory:init
oma verify <agent-type>
```
