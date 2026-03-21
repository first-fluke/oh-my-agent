---
title: Агенты
description: Типы агентов, стратегия рабочих пространств и процесс оркестрации.
---

# Агенты

## Категории агентов

- Идеация: Brainstorm
- Планирование: PM agent
- Реализация: Frontend, Backend, Mobile, DB
- Инфраструктура: TF-infra agent
- DevOps: Dev-workflow
- Обеспечение качества: QA, Debug
- Локализация: Translator
- Координация: oma-coordination, oma-orchestrator

## Стратегия рабочих пространств

Разделение рабочих пространств снижает количество конфликтов слияния:

```text
./apps/api      -> backend
./apps/web      -> frontend
./apps/mobile   -> mobile
```

## Процесс управления агентами

1. PM определяет декомпозицию задач
2. Доменные агенты выполняют работу параллельно
3. Прогресс транслируется в память Serena
4. QA проверяет согласованность на системном уровне

## Файлы среды выполнения Serena

- `orchestrator-session.md`
- `task-board.md`
- `progress-{agent}.md`
- `result-{agent}.md`
