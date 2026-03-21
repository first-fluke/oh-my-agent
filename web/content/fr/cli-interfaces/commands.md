---
title: Commandes
description: Surface complète des commandes issues de cli/cli.ts.
---

# Commandes

La surface de commandes ci-dessous reflète l'implémentation actuelle dans `cli/cli.ts`.

## Commandes principales

```bash
oma                         # installateur interactif
oma dashboard               # tableau de bord terminal
oma dashboard:web           # tableau de bord web (:9847)
oma usage:anti              # quotas Antigravity
oma update                  # mettre à jour les skills depuis le registre
oma doctor                  # diagnostics environnement/skills
oma stats                   # métriques de productivité
oma retro                   # rapport rétrospectif
oma cleanup                 # nettoyage des ressources orphelines
oma bridge [url]            # MCP stdio -> streamable HTTP
```

## Commandes d'agent

```bash
oma agent:spawn <agent-id> <prompt> <session-id>
oma agent:status <session-id> [agent-ids...]
```

## Mémoire et vérification

```bash
oma memory:init
oma verify <agent-type>
```
