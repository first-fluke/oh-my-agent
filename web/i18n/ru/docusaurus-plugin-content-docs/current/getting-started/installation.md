---
title: Установка
description: Полное руководство по установке oh-my-agent — три метода установки, все шесть пресетов с перечнем навыков, требования к CLI-инструментам для всех пяти вендоров, пост-установочная настройка, поля oma-config.yaml и верификация с помощью oma doctor.
---

# Установка

## Предварительные требования

- **ИИ-совместимая IDE или CLI** — как минимум одно из: Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity CLI (`agy`), Antigravity IDE, Cursor или OpenCode
- **bun** — среда выполнения и пакетный менеджер JavaScript (автоматически устанавливается скриптом установки, если отсутствует)
- **uv** — пакетный менеджер Python для Serena MCP (автоматически устанавливается при отсутствии)

---

## Способ 1: Установка одной командой (рекомендуется)

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Оба bootstrap-скрипта работают одинаково:
1. Определяет вашу платформу (macOS, Linux или Windows)
2. Проверяет наличие bun, uv и serena, устанавливает их при отсутствии
3. Запускает интерактивный установщик с выбором пресета
4. Создаёт `.agents/` с выбранными навыками
5. Настраивает слой интеграции `.claude/` (хуки, символические ссылки, настройки)
6. Конфигурирует Serena MCP при обнаружении

Типичное время установки: менее 60 секунд.

---

## Способ 2: Ручная установка через bunx

```bash
bunx oh-my-agent@latest
```

Запускает интерактивный установщик без начальной загрузки зависимостей. Требуется предварительно установленный bun.

Установщик предложит выбрать пресет, который определяет, какие навыки будут установлены:

### Пресеты

| Пресет | Включённые навыки |
|--------|-------------------|
| **all** | oma-brainstorm, oma-pm, oma-frontend, oma-backend, oma-db, oma-mobile, oma-design, oma-qa, oma-debug, oma-tf-infra, oma-dev-workflow, oma-translator, oma-orchestrator, oma-scm, oma-coordination |
| **fullstack** | oma-frontend, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **frontend** | oma-frontend, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **backend** | oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **mobile** | oma-mobile, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **devops** | oma-tf-infra, oma-dev-workflow, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |

Каждый пресет включает oma-pm (планирование), oma-qa (ревью), oma-debug (исправление ошибок), oma-brainstorm (идеация) и oma-scm (git) как базовые агенты. Доменные пресеты добавляют соответствующих агентов реализации поверх них.

Общие ресурсы (`_shared/`) устанавливаются всегда, вне зависимости от пресета. Это включает основную маршрутизацию, загрузку контекста, структуру промптов, определение вендора, протоколы выполнения и протокол памяти.

### Что создаётся

После установки ваш проект будет содержать:

```
.agents/
├── config/
│   └── oma-config.yaml      # Ваши настройки
├── skills/
│   ├── _shared/                    # Общие ресурсы (устанавливаются всегда)
│   │   ├── core/                   # skill-routing, context-loading и т.д.
│   │   ├── runtime/                # memory-protocol, execution-protocols/
│   │   └── conditional/            # quality-score, experiment-ledger и т.д.
│   ├── oma-frontend/               # В зависимости от пресета
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                         # Другие выбранные навыки
├── workflows/                      # Все 16 определений рабочих процессов
├── agents/                         # Определения субагентов
├── mcp.json                        # Конфигурация MCP-сервера
├── results/plan-{sessionId}.json                       # Пустой (заполняется через /plan)
├── state/                          # Пустой (используется постоянными рабочими процессами)
└── results/                        # Пустой (заполняется при выполнении агентов)

.claude/
├── settings.json                   # Хуки и разрешения
├── hooks/
│   ├── triggers.json               # Маппинг ключевых слов к рабочим процессам (11 языков)
│   ├── keyword-detector.ts         # Логика автоопределения
│   ├── persistent-mode.ts          # Поддержка постоянных рабочих процессов
│   └── hud.ts                      # Индикатор [OMA] в строке состояния
├── skills/                         # Символические ссылки -> .agents/skills/
└── agents/                         # Определения субагентов для IDE

.serena/
└── memories/                       # Состояние выполнения (заполняется во время сессий)
```

---

## Способ 3: Глобальная установка

Для использования на уровне CLI (дашборды, запуск агентов, диагностика) установите oh-my-agent глобально:

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# или
npm install --global oh-my-agent
```

Это устанавливает команду `oma` глобально, предоставляя доступ ко всем CLI-командам из любой директории:

```bash
oma doctor              # Проверка состояния
oma dashboard           # Мониторинг в терминале
oma dashboard:web       # Веб-дашборд на http://localhost:9847
oma agent:spawn         # Запуск агентов из терминала
oma agent:parallel      # Параллельный запуск агентов
oma agent:status        # Проверка статуса агентов
oma agent:review        # Ревью кода через внешний CLI (codex/claude/gemini/qwen)
oma stats               # Статистика сессий
oma retro               # Ретроспектива разработки (коммиты, горячие точки, тренды)
oma recap               # История разговоров с ИИ-инструментами
oma cleanup             # Очистка артефактов сессий
oma link                # Перегенерация вендорных файлов из SSOT `.agents/`
oma update              # Обновление oh-my-agent
oma verify              # Верификация вывода агентов
oma visualize           # Визуализация зависимостей (псевдоним: `oma viz`)
oma describe            # Просмотр CLI-команд в формате JSON
oma bridge              # MCP stdio ↔ Streamable HTTP мост
oma memory:init         # Инициализация схемы памяти Serena
oma auth:status         # Проверка статуса аутентификации CLI (gh/claude/codex/cursor/qwen)
oma search              # Механические примитивы поиска (псевдоним: `oma s`)
oma image               # Генерация изображений через ИИ (псевдоним: `oma img`)
oma export              # Экспорт навыков для внешних IDE (например, cursor)
oma star                # Поставить звезду репозиторию
```

`oma` — сокращение от `oh-my-agent`. Обе команды работают как CLI-команды.

---

## Установка ИИ CLI-инструментов

Необходим хотя бы один ИИ CLI-инструмент. oh-my-agent поддерживает пятерых вендоров, и вы можете комбинировать их — используя разные CLI для разных агентов через маппинг агент-CLI.

### Gemini CLI

```bash
bun install --global @google/gemini-cli
# или
npm install --global @google/gemini-cli
```

Аутентификация происходит автоматически при первом запуске. Gemini CLI читает навыки из `.agents/skills/` по умолчанию.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# или
npm install --global @anthropic-ai/claude-code
```

Аутентификация происходит автоматически при первом запуске. Claude Code использует `.claude/` для хуков и настроек, с навыками, символически связанными из `.agents/skills/`.

### Codex CLI

```bash
bun install --global @openai/codex
# или
npm install --global @openai/codex
```

После установки выполните `codex login` для аутентификации.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

После установки выполните `/auth` внутри CLI для аутентификации.

### Antigravity CLI (`agy`)

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

Аутентификация выполняется при первом запуске `agy`. Бинарный файл называется `agy`. В безголовых (headless) средах вместо этого задайте переменную окружения `ANTIGRAVITY_API_KEY`. Команда `oma doctor` отображает статус аутентификации через `~/.gemini/antigravity-cli/cache/onboarding.json`.

---

## oma-config.yaml

Команда `oma install` создаёт `.agents/oma-config.yaml`. Это центральный файл конфигурации для всего поведения oh-my-agent:

```yaml
# Обязательно
language: en
model_preset: antigravity   # встроенные: antigravity, claude, codex, qwen, cursor, mixed

# Необязательно — настройки даты и времени
date_format: ISO
timezone: UTC

# Необязательно — автообновление CLI в фоне
auto_update_cli: true

# Необязательно — частичное переопределение по агенту (только объекты, поверхностное слияние)
agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Необязательно — пользовательские слаги моделей
# models:
#   my-model: { cli: gemini, cli_model: gemini-3-flash, supports: { thinking: true } }

# Необязательно — пользовательские пресеты
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### Справочник по полям

| Поле | Тип | По умолчанию | Описание |
|------|-----|-------------|---------|
| `language` | string | `en` | Код языка ответов. Весь вывод агентов, сообщения рабочих процессов и отчёты используют этот язык. Поддерживает 11 языков (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl). |
| `date_format` | string | `YYYY-MM-DD` | Строка формата даты для временных меток в планах, файлах памяти и отчётах. |
| `timezone` | string | `UTC` | Часовой пояс для всех временных меток. Используются стандартные идентификаторы (например, `Asia/Seoul`, `America/New_York`). |
| `model_preset` | string | `claude` | Ключ активного пресета. Один из встроенных ключей (`antigravity`, `claude`, `codex`, `qwen`, `cursor`, `mixed`) либо ключ из `custom_presets`. См. [Модели по агентам](../guide/per-agent-models.md). |
| `agents` | map | (пустой) | Частичные переопределения по агентам (`AgentSpec` только как объект). Поверхностно сливаются поверх значений пресета. |
| `models` | map | (пустой) | Пользовательские слаги моделей. |
| `custom_presets` | map | (пустой) | Пользовательские пресеты. Поддерживают `extends:` для частичного наследования от встроенного пресета. |

### Определение вендора

При запуске агента CLI-вендор определяется по активному `model_preset` (и переопределениям `agents:`, если они есть). Подробности — [Модели по агентам](../guide/per-agent-models.md).

---

## Верификация: `oma doctor`

После установки и настройки проверьте, что всё работает:

```bash
oma doctor
```

Эта команда проверяет:
- Все необходимые CLI-инструменты установлены и доступны
- Конфигурация MCP-сервера валидна
- Файлы навыков существуют с корректным YAML-фронтматтером в SKILL.md
- Символические ссылки в `.claude/skills/` указывают на валидные цели
- Хуки правильно настроены в `.claude/settings.json`
- Провайдер памяти доступен (Serena MCP)
- `oma-config.yaml` является валидным YAML с обязательными полями

Если что-то не так, `oma doctor` точно укажет, что исправить, с готовыми командами для копирования.

---

## Обновление

### Обновление CLI

```bash
oma update
```

Обновляет глобальный CLI oh-my-agent до последней версии.

### Обновление навыков проекта

Навыки и рабочие процессы внутри проекта можно обновить через GitHub Action (`action/`) для автоматизированных обновлений или вручную, повторно запустив установщик:

```bash
bunx oh-my-agent@latest
```

Установщик обнаруживает существующие установки и предлагает обновление с сохранением вашего `oma-config.yaml` и любой пользовательской конфигурации.

---

## Что дальше

Откройте проект в вашей ИИ-IDE и начните использовать oh-my-agent. Навыки определяются автоматически. Попробуйте:

```
"Build a login form with email validation using Tailwind CSS"
```

Или используйте команду рабочего процесса:

```
/plan authentication feature with JWT and refresh tokens
```

Смотрите [Руководство по использованию](/docs/guide/usage) для подробных примеров или изучите [Агенты](/docs/core-concepts/agents), чтобы понять, что делает каждый специалист.
