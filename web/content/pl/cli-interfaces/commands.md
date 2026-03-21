---
title: Komendy
description: Kompletna powierzchnia komend z cli/cli.ts.
---

# Komendy

Poniższa powierzchnia komend odzwierciedla bieżącą implementację w `cli/cli.ts`.

## Komendy podstawowe

```bash
oma                         # interaktywny instalator
oma dashboard               # panel terminalowy
oma dashboard:web           # panel webowy (:9847)
oma usage:anti              # limity Antigravity
oma update                  # aktualizacja umiejętności z rejestru
oma doctor                  # diagnostyka środowiska/umiejętności
oma stats                   # metryki produktywności
oma retro                   # raport retrospektywny
oma cleanup                 # czyszczenie osieroconych zasobów
oma bridge [url]            # MCP stdio -> streamable HTTP
```

## Komendy agentów

```bash
oma agent:spawn <agent-id> <prompt> <session-id>
oma agent:status <session-id> [agent-ids...]
```

## Pamięć i weryfikacja

```bash
oma memory:init
oma verify <agent-type>
```
