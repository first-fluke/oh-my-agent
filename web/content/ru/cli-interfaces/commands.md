---
title: Команды
description: Полный набор команд из cli/cli.ts.
---

# Команды

Набор команд ниже соответствует текущей реализации в `cli/cli.ts`.

## Основные команды

```bash
oma                         # интерактивный установщик
oma dashboard               # терминальная панель мониторинга
oma dashboard:web           # веб-панель мониторинга (:9847)
oma usage:anti              # квоты Antigravity
oma update                  # обновление навыков из реестра
oma doctor                  # диагностика окружения и навыков
oma stats                   # метрики продуктивности
oma retro                   # ретроспективный отчёт
oma cleanup                 # очистка осиротевших ресурсов
oma bridge [url]            # MCP stdio -> streamable HTTP
```

## Команды агентов

```bash
oma agent:spawn <agent-id> <prompt> <session-id>
oma agent:status <session-id> [agent-ids...]
```

## Память и верификация

```bash
oma memory:init
oma verify <agent-type>
```
