# oh-my-agent: Мультиагентний Оркестратор

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md)

Найкращий мультиагентний оркестратор для агентного програмування.

Керуйте 9 спеціалізованими доменними агентами (PM, Frontend, Backend, Mobile, QA, Debug, Brainstorm, DevWorkflow, Terraform) через **Serena Memory**. Підтримка паралельного виконання CLI, дашборди спостереження в реальному часі та прогресивне завантаження навичок без налаштувань. Комплексне рішення для агентного програмування.

> **Подобається цей проєкт?** Поставте зірку!
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Спробуйте наш оптимізований стартовий шаблон: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

## Зміст

- [Архітектура](#архітектура)
- [Що це таке?](#що-це-таке)
- [Швидкий старт](#швидкий-старт)
- [Спонсори](#спонсори)
- [Ліцензія](#ліцензія)

## Архітектура

```mermaid
flowchart TD
    subgraph Workflows["Робочі процеси"]
        direction TB
        W0["/brainstorm"]
        W1["/coordinate"]
        W1b["/coordinate-pro"]
        W2["/orchestrate"]
        W3["/plan"]
        W4["/review"]
        W5["/debug"]
    end

    subgraph Orchestration["Оркестрація"]
        direction TB
        PM[pm-agent]
        WF[workflow-guide]
        ORC[orchestrator]
    end

    subgraph Domain["Доменні агенти"]
        direction TB
        FE[frontend-agent]
        BE[backend-agent]
        MB[mobile-agent]
        TF[tf-infra-agent]
    end

    subgraph Quality["Якість"]
        direction TB
        QA[qa-agent]
        DBG[debug-agent]
    end


    Workflows --> Orchestration
    Orchestration --> Domain
    Domain --> Quality
    Quality --> CMT([commit])
```

## Що це таке?

Колекція **Agent Skills**, що забезпечують спільну мультиагентну розробку. Робота розподіляється між експертними агентами:

| Агент | Спеціалізація | Тригери |
|-------|---------------|---------|
| **Brainstorm** | Ідеація з пріоритетом дизайну перед плануванням | "brainstorm", "ideate", "explore idea" |
| **Workflow Guide** | Координація складних мультиагентних проєктів | "мульти-домен", "складний проєкт" |
| **PM Agent** | Аналіз вимог, декомпозиція завдань, архітектура | "план", "розбити", "що треба побудувати" |
| **Frontend Agent** | React/Next.js, TypeScript, Tailwind CSS | "UI", "компонент", "стилізація" |
| **Backend Agent** | FastAPI, PostgreSQL, JWT автентифікація | "API", "база даних", "автентифікація" |
| **Mobile Agent** | Кросплатформна розробка на Flutter | "мобільний додаток", "iOS/Android" |
| **QA Agent** | Безпека OWASP Top 10, продуктивність, доступність | "перевірити безпеку", "аудит", "перевірити продуктивність" |
| **Debug Agent** | Діагностика помилок, аналіз коренних причин, регресійні тести | "баг", "помилка", "збій" |
| **Developer Workflow** | Автоматизація завдань монорепо, mise завдання, CI/CD, міграції, реліз | "dev workflow", "mise завдання", "CI/CD пайплайн" |
| **TF Infra Agent** | Мультихмарне IaC провізіонування (AWS, GCP, Azure, OCI) | "інфраструктура", "terraform", "налаштування хмари" |
| **Orchestrator** | CLI-паралельне виконання агентів з Serena Memory | "запустити агент", "паралельне виконання" |
| **Commit** | Conventional Commits з правилами для конкретного проєкту | "коміт", "зберегти зміни" |

## Швидкий старт

### Передумови

- **AI IDE** (Antigravity, Claude Code, Codex, Gemini, etc.)
- **Bun** (для CLI та дашбордів)
- **uv** (для налаштування Serena)

### Варіант 1: Інтерактивний CLI (Рекомендовано)

```bash
# Встановіть bun, якщо його ще немає:
# curl -fsSL https://bun.sh/install | bash

# Встановіть uv, якщо його ще немає:
# curl -LsSf https://astral.sh/uv/install.sh | sh

bunx oh-my-agent
```

Виберіть тип проєкту, і навички будуть встановлені в `.agents/skills/`.

| Пресет | Навички |
|--------|---------|
| ✨ All | Все |
| 🌐 Fullstack | brainstorm, frontend, backend, pm, qa, debug, commit |
| 🎨 Frontend | brainstorm, frontend, pm, qa, debug, commit |
| ⚙️ Backend | brainstorm, backend, pm, qa, debug, commit |
| 📱 Mobile | brainstorm, mobile, pm, qa, debug, commit |
| 🚀 DevOps | brainstorm, tf-infra, dev-workflow, pm, qa, debug, commit |

### Варіант 2: Глобальна установка (Для Orchestrator)

Щоб використовувати основні інструменти глобально або запустити SubAgent Orchestrator:

```bash
bun install --global oh-my-agent
```

Вам також потрібен принаймні один CLI інструмент:

| CLI | Встановлення | Автентифікація |
|-----|--------------|----------------|
| Gemini | `bun install --global @anthropic-ai/gemini-cli` | `gemini auth` |
| Claude | `curl -fsSL https://claude.ai/install.sh \| bash` | `claude auth` |
| Codex | `bun install --global @openai/codex` | `codex auth` |
| Qwen | `bun install --global @qwen-code/qwen` | `qwen auth` |

### Варіант 3: Інтеграція в існуючий проєкт

**Рекомендовано (CLI):**

Виконайте наступну команду в кореневій директорії вашого проєкту для автоматичного встановлення/оновлення навичок та робочих процесів:

```bash
bunx oh-my-agent
```

> **Порада:** Запустіть `bunx oh-my-agent doctor` після встановлення, щоб перевірити правильність налаштування (включаючи глобальні робочі процеси).

### 3. Чат

**Просте завдання** (автоматична активація одного агента):

```
"Створи форму входу з Tailwind CSS та валідацією форми"
→ активується frontend-agent
```

**Складний проєкт** (координація workflow-guide):

```
"Побудуй TODO додаток з автентифікацією користувача"
→ workflow-guide → PM Agent планує → агенти створені в Agent Manager
```

**Явна координація** (робочий процес, ініційований користувачем):

```
/coordinate
→ Крок за кроком: планування PM → створення агентів → перевірка QA
```

**Зберегти зміни** (conventional commits):

```
/commit
→ Аналіз змін, пропозиція типу/області коміту, створення коміту з Co-Author
```

### 3. Моніторинг з дашбордами

Для деталей налаштування та використання дашбордів, див. [`docs/USAGE.md`](./docs/USAGE.md#real-time-dashboards).

## Спонсори

Цей проєкт підтримується завдяки нашим щедрим спонсорам.

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion

<!-- Логотипи рівня Champion ($100/місяць) тут -->

### 🛸 Booster

<!-- Логотипи рівня Booster ($30/місяць) тут -->

### ☕ Contributor

<!-- Імена рівня Contributor ($10/місяць) тут -->

[Стати спонсором →](https://github.com/sponsors/first-fluke)

Повний список підтримуючих у [SPONSORS.md](./SPONSORS.md).

## Історія зірок

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)

## Ліцензія

MIT
