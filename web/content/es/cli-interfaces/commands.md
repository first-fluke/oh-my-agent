---
title: Comandos
description: Superficie completa de comandos de cli/cli.ts.
---

# Comandos

La superficie de comandos a continuacion refleja la implementacion actual en `cli/cli.ts`.

## Comandos principales

```bash
oma                         # instalador interactivo
oma dashboard               # panel de control en terminal
oma dashboard:web           # panel de control web (:9847)
oma usage:anti              # cuotas Antigravity
oma update                  # actualizar skills desde el registro
oma doctor                  # diagnosticos de entorno/skills
oma stats                   # metricas de productividad
oma retro                   # informe retrospectivo
oma cleanup                 # limpiar recursos huerfanos
oma bridge [url]            # MCP stdio -> streamable HTTP
```

## Comandos de agentes

```bash
oma agent:spawn <agent-id> <prompt> <session-id>
oma agent:status <session-id> [agent-ids...]
```

## Memoria y verificacion

```bash
oma memory:init
oma verify <agent-type>
```
