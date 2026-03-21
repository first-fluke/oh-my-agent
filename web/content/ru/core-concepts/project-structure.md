---
title: Структура Проекта
description: Обновлённое дерево каталогов после разделения рабочих пространств CLI и веб-документации.
---

# Структура проекта

Подробное дерево директорий для этого репозитория.

```text
.
├── .agents/
│   ├── config/
│   │   └── user-preferences.yaml   # Язык, часовой пояс, маппинг CLI
│   ├── workflows/
│   │   ├── brainstorm.md           # /brainstorm (дизайн-ориентированная идеация)
│   │   ├── coordinate.md           # /coordinate (мультиагентная оркестрация через UI)
│   │   ├── deepinit.md             # /deepinit (глубокая инициализация проекта)
│   │   ├── exec-plan.md            # /exec-plan (управление планом выполнения)
│   │   ├── orchestrate.md          # /orchestrate (автоматизированное CLI параллельное выполнение)
│   │   ├── plan.md                 # /plan (декомпозиция задач PM)
│   │   ├── review.md               # /review (полный QA конвейер)
│   │   ├── debug.md                # /debug (структурированное исправление багов)
│   │   ├── setup.md                # /setup (конфигурация CLI и MCP)
│   │   ├── tools.md                # /tools (управление MCP инструментами)
│   │   └── ultrawork.md            # /ultrawork (максимальная параллельная оркестрация)
│   └── skills/
│       ├── _shared/                    # Общие ресурсы (не навык)
│       │   ├── serena-memory-protocol.md
│       │   ├── common-checklist.md
│       │   ├── skill-routing.md
│       │   ├── context-loading.md
│       │   ├── context-budget.md
│       │   ├── reasoning-templates.md
│       │   ├── clarification-protocol.md
│       │   ├── difficulty-guide.md
│       │   ├── lessons-learned.md
│       │   ├── verify.sh
│       │   └── api-contracts/
│       ├── oma-backend/              # FastAPI
│       ├── oma-brainstorm/                 # Идеация и исследование концепций
│       ├── oma-commit/                     # Навык Conventional commits
│       ├── oma-db/                   # Моделирование баз данных
│       ├── oma-debug/                # Исправление багов
│       ├── oma-dev-workflow/               # CI/CD и рабочие процессы разработки
│       ├── oma-frontend/             # React/Next.js
│       ├── oma-mobile/               # Flutter
│       ├── oma-orchestrator/               # CLI-основанный спавнер субагентов
│       ├── oma-pm/                   # Продакт-менеджер
│       ├── oma-qa/                   # Безопасность и QA
│       ├── oma-tf-infra/             # Terraform и облачная инфраструктура
│       ├── oma-translator/                 # Многоязычный перевод
│       └── oma-coordination/             # Координация мультиагентов
│       # Каждый навык имеет:
│       #   SKILL.md              (~40 строк, оптимизировано по токенам)
│       #   resources/
│       #     ├── execution-protocol.md  (шаги цепочки мыслей)
│       #     ├── examples.md            (few-shot ввод/вывод)
│       #     ├── checklist.md           (самопроверка)
│       #     ├── error-playbook.md      (восстановление после сбоев)
│       #     ├── tech-stack.md          (детальные техспецификации)
│       #     └── snippets.md            (паттерны для копирования)
├── .serena/
│   └── memories/                   # Состояние выполнения (gitignored)
├── package.json
├── docs/
│   ├── USAGE.md                    # Подробное руководство по использованию (английский)
│   ├── USAGE.ko.md                 # Подробное руководство по использованию (корейский)
│   ├── project-structure.md        # Полная справка по структуре (английский)
│   └── project-structure.ko.md     # Полная справка по структуре (корейский)
├── README.md                       # Этот файл (английский)
└── README.ko.md                    # Корейское руководство
```
