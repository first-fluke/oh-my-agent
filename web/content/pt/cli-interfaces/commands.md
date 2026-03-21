---
title: Comandos
description: Superfície completa de comandos a partir de cli/cli.ts.
---

# Comandos

A superfície de comandos abaixo reflete a implementação atual em `cli/cli.ts`.

## Comandos Principais

```bash
oma                         # instalador interativo
oma dashboard               # dashboard no terminal
oma dashboard:web           # dashboard web (:9847)
oma usage:anti              # cotas Antigravity
oma update                  # atualizar skills do registro
oma doctor                  # diagnóstico de ambiente/skills
oma stats                   # métricas de produtividade
oma retro                   # relatório retrospectivo
oma cleanup                 # limpar recursos órfãos
oma bridge [url]            # MCP stdio -> streamable HTTP
```

## Comandos de Agente

```bash
oma agent:spawn <agent-id> <prompt> <session-id>
oma agent:status <session-id> [agent-ids...]
```

## Memória e Verificação

```bash
oma memory:init
oma verify <agent-type>
```
