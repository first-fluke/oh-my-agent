# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md)

Когда-нибудь хотели, чтобы у вашего ИИ-ассистента были коллеги? Именно это и делает oh-my-agent.

Вместо того чтобы один ИИ делал все (и терялся на полпути), oh-my-agent распределяет работу между **специализированными агентами** — frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design и другими. Каждый глубоко знает свою область, имеет свои инструменты и чеклисты и не лезет в чужую зону.

Работает со всеми основными AI IDE: Antigravity, Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode и другими.

Вендорные нативные субагенты генерируются из `.agents/agents/`:
- Claude Code использует `.claude/agents/*.md`
- Codex CLI использует `.codex/agents/*.toml`
- Gemini CLI использует `.gemini/agents/*.md`

Когда workflow резолвит агента к тому же вендору, что и текущий рантайм, он должен сначала использовать нативный путь субагента этого вендора. Кросс-вендорные задачи откатываются к `oma agent:spawn`.

## Быстрый старт

```bash
# Одна команда (автоматически установит bun & uv, если их нет)
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash

# Или вручную
bunx oh-my-agent@latest
```

Выберите пресет — и готово:

| Пресет | Что получаете |
|--------|-------------|
| ✨ All | Все агенты и навыки |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + scm |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + scm |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + scm |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + scm |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + scm |

## Ваша команда агентов

| Агент | Что делает |
|-------|-------------|
| **oma-architecture** | Архитектурные компромиссы, границы модулей, анализ с опорой на ADR/ATAM/CBAM |
| **oma-backend** | API на Python, Node.js или Rust |
| **oma-brainstorm** | Исследует идеи, прежде чем вы начнете строить |
| **oma-db** | Проектирование схем, миграции, индексация, vector DB |
| **oma-debug** | Анализ корневых причин, исправления, регрессионные тесты |
| **oma-design** | Дизайн-системы, токены, доступность, адаптивность |
| **oma-dev-workflow** | CI/CD, релизы, автоматизация монорепо |
| **oma-frontend** | React/Next.js, TypeScript, Tailwind CSS v4, shadcn/ui |
| **oma-hwp** | Конвертация HWP/HWPX/HWPML в Markdown |
| **oma-image** | Мультивендорная AI-генерация изображений |
| **oma-mobile** | Кроссплатформенные приложения на Flutter |
| **oma-observability** | Маршрутизатор наблюдаемости — APM/RUM, метрики/логи/трейсы/профили, SLO, форензика инцидентов, тюнинг транспорта |
| **oma-orchestrator** | Параллельный запуск агентов через CLI |
| **oma-pdf** | Конвертация PDF в Markdown |
| **oma-pm** | Планирует задачи, декомпозирует требования, определяет API-контракты |
| **oma-qa** | Безопасность OWASP, производительность, ревью доступности |
| **oma-recap** | Analiz istorii razgovorov i tematicheskie svodki raboty |
| **oma-scm** | SCM (управление конфигурацией ПО): ветки, слияния, worktree, базовые линии; Conventional Commits |
| **oma-search** | Интент-маршрутизатор поиска + оценка доверия — документация, веб, код, локальный |
| **oma-tf-infra** | Мультиоблачный IaC на Terraform (Infrastructure as Code) |
| **oma-translator** | Естественный мультиязычный перевод |

## Как это работает

Просто пишите. Опишите, что вам нужно, и oh-my-agent сам разберется, каких агентов подключить.

```
Вы: "Собери TODO-приложение с аутентификацией пользователей"
→ PM планирует работу
→ Backend строит API аутентификации
→ Frontend строит UI на React
→ DB проектирует схему
→ QA проверяет все
→ Готово: скоординированный, проверенный код
```

Или используйте slash-команды для структурированных воркфлоу:

| Шаг | Команда | Что делает |
|-----|---------|-------------|
| 1 | `/brainstorm` | Свободная генерация идей |
| 2 | `/architecture` | Обзор архитектуры, компромиссы, анализ в духе ADR/ATAM/CBAM |
| 2 | `/design` | 7-фазный воркфлоу дизайн-системы |
| 2 | `/plan` | PM разбивает фичу на задачи |
| 3 | `/work` | Пошаговое мульти-агентное выполнение |
| 3 | `/orchestrate` | Автоматический параллельный запуск агентов |
| 3 | `/ultrawork` | 5-фазный воркфлоу качества с 11 ревью-гейтами |
| 4 | `/review` | Аудит безопасности + производительности + доступности |
| 5 | `/debug` | Структурированная отладка с поиском корневой причины |
| 6 | `/scm` | Рабочий процесс SCM и Git, поддержка Conventional Commits |

**Автодетекция**: Slash-команды не обязательны — слова вроде «архитектура», «plan», «review» и «debug» в сообщении (на 11 языках!) автоматически активируют нужный воркфлоу.

## CLI

```bash
# Установить глобально
bun install --global oh-my-agent   # или: brew install oh-my-agent

# Использовать где угодно
oma doctor                  # Проверка здоровья
oma dashboard               # Мониторинг в реальном времени
oma link                    # Регенерирует .claude/.codex/.gemini/и т.д. из .agents/
oma agent:spawn backend "Build auth API" session-01
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
```

Выбор модели работает в два слоя:
- Нативный диспатч того же вендора использует сгенерированное определение агента в `.claude/agents/`, `.codex/agents/` или `.gemini/agents/`.
- Кросс-вендорный или fallback CLI диспатч использует дефолты вендора из `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

**модели по агенту**: каждый агент может указывать собственную модель и `effort` через `.agents/oma-config.yaml`. Из коробки доступны пять runtime profiles: `claude-only`, `codex-only`, `gemini-only`, `antigravity`, `qwen-only`. Проверьте итоговую auth-матрицу командой `oma doctor --profile`. Полное руководство: [web/docs/guide/per-agent-models.md](../web/docs/guide/per-agent-models.md).

## Почему oh-my-agent?

> [Подробнее →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **Портативный** — `.agents/` путешествует с вашим проектом, не привязан к одной IDE
- **Ролевой** — Агенты смоделированы как настоящая инженерная команда, а не куча промптов
- **Экономит токены** — Двухуровневый дизайн навыков экономит ~75% токенов
- **Качество прежде всего** — Charter preflight, quality gates и ревью-воркфлоу из коробки
- **Мультивендорный** — Комбинируйте Gemini, Claude, Codex и Qwen для разных типов агентов
- **Наблюдаемый** — Дашборды в терминале и в вебе для мониторинга в реальном времени

## Архитектура

```mermaid
flowchart TD
    subgraph Workflows["Workflows"]
        direction TB
        W0["/brainstorm"]
        W1["/work"]
        W1b["/ultrawork"]
        W2["/orchestrate"]
        W3["/architecture"]
        W4["/plan"]
        W5["/review"]
        W6["/debug"]
        W7["/deepinit"]
        W8["/design"]
    end

    subgraph Orchestration["Orchestration"]
        direction TB
        PM[oma-pm]
        ORC[oma-orchestrator]
    end

    subgraph Domain["Domain Agents"]
        direction TB
        ARC[oma-architecture]
        FE[oma-frontend]
        BE[oma-backend]
        DB[oma-db]
        MB[oma-mobile]
        DES[oma-design]
        TF[oma-tf-infra]
    end

    subgraph Quality["Quality"]
        direction TB
        QA[oma-qa]
        DBG[oma-debug]
    end

    Workflows --> Orchestration
    Orchestration --> Domain
    Domain --> Quality
    Quality --> SCM([oma-scm])
```

## Узнать больше

- **[Подробная документация](./AGENTS_SPEC.md)** — Полная техническая спецификация и архитектура
- **[Поддерживаемые агенты](./SUPPORTED_AGENTS.md)** — Матрица поддержки агентов по IDE
- **[Веб-документация](https://first-fluke.github.io/oh-my-agent/)** — Гайды, туториалы и справочник CLI

## Спонсоры

Этот проект поддерживается благодаря нашим щедрым спонсорам.

> **Нравится проект?** Поставьте звезду!
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Попробуйте наш оптимизированный стартовый шаблон: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion

<!-- Champion tier ($100/mo) logos here -->

### 🛸 Booster

<!-- Booster tier ($30/mo) logos here -->

### ☕ Contributor

<!-- Contributor tier ($10/mo) names here -->

[Стать спонсором →](https://github.com/sponsors/first-fluke)

Полный список поддерживающих — в [SPONSORS.md](../SPONSORS.md).



## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## Лицензия

MIT
