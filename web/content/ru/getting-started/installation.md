---
title: Установка
description: Полное руководство по установке oh-my-agent — три метода установки, все шесть пресетов с перечнем навыков, требования к CLI-инструментам для всех четырёх вендоров, пост-установочная настройка, поля oma-config.yaml и верификация с помощью oma doctor.
---

# Установка

## Предварительные требования

- **ИИ-совместимая IDE или CLI** — как минимум одно из: Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity IDE, Cursor или OpenCode
- **bun** — среда выполнения и пакетный менеджер JavaScript (автоматически устанавливается скриптом установки, если отсутствует)
- **uv** — пакетный менеджер Python для Serena MCP (автоматически устанавливается при отсутствии)

---

## Способ 1: Установка одной командой (рекомендуется)

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Этот скрипт:
1. Определяет вашу платформу (macOS, Linux)
2. Проверяет наличие bun и uv, устанавливает их при отсутствии
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
| **all** | oma-brainstorm, oma-pm, oma-frontend, oma-backend, oma-db, oma-mobile, oma-design, oma-qa, oma-debug, oma-tf-infra, oma-dev-workflow, oma-translator, oma-orchestrator, oma-commit, oma-coordination |
| **fullstack** | oma-frontend, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **frontend** | oma-frontend, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **backend** | oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **mobile** | oma-mobile, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **devops** | oma-tf-infra, oma-dev-workflow, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |

Каждый пресет включает oma-pm (планирование), oma-qa (ревью), oma-debug (исправление ошибок), oma-brainstorm (идеация) и oma-commit (git) как базовые агенты. Доменные пресеты добавляют соответствующих агентов реализации поверх них.

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
├── workflows/                      # Все 14 определений рабочих процессов
├── agents/                         # Определения субагентов
├── mcp.json                        # Конфигурация MCP-сервера
├── plan.json                       # Пустой (заполняется через /plan)
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
oma stats               # Статистика сессий
oma retro               # Ретроспективный анализ
oma cleanup             # Очистка артефактов сессий
oma update              # Обновление oh-my-agent
oma verify              # Верификация вывода агентов
oma visualize           # Визуализация зависимостей
oma describe            # Описание структуры проекта
oma bridge              # SSE-to-stdio мост для Antigravity
oma memory:init         # Инициализация провайдера памяти
oma auth:status         # Проверка статуса аутентификации CLI
oma usage:anti          # Обнаружение анти-паттернов использования
oma star                # Поставить звезду репозиторию
```

`oma` — сокращение от `oh-my-agent`. Обе команды работают как CLI-команды.

---

## Установка ИИ CLI-инструментов

Необходим хотя бы один ИИ CLI-инструмент. oh-my-agent поддерживает четырёх вендоров, и вы можете комбинировать их — используя разные CLI для разных агентов через маппинг агент-CLI.

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

---

## oma-config.yaml

Команда `oma install` создаёт `.agents/oma-config.yaml`. Это центральный файл конфигурации для всего поведения oh-my-agent:

```yaml
# Язык ответов для всех агентов и рабочих процессов
language: en

# Формат даты в отчётах и файлах памяти
date_format: "YYYY-MM-DD"

# Часовой пояс для временных меток
timezone: "UTC"

# CLI-инструмент по умолчанию для запуска агентов
# Варианты: gemini, claude, codex, qwen
default_cli: gemini

# Маппинг CLI по агентам (переопределяет default_cli)
agent_cli_mapping:
  frontend: claude       # Сложные UI-рассуждения
  backend: gemini        # Быстрая генерация API
  mobile: gemini
  db: gemini
  pm: gemini             # Быстрая декомпозиция
  qa: claude             # Тщательный аудит безопасности
  debug: claude          # Глубокий анализ корневых причин
  design: claude
  tf-infra: gemini
  dev-workflow: gemini
  translator: claude
  orchestrator: gemini
  commit: gemini
```

### Справочник по полям

| Поле | Тип | По умолчанию | Описание |
|------|-----|-------------|---------|
| `language` | string | `en` | Код языка ответов. Весь вывод агентов, сообщения рабочих процессов и отчёты используют этот язык. Поддерживает 11 языков (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl). |
| `date_format` | string | `YYYY-MM-DD` | Строка формата даты для временных меток в планах, файлах памяти и отчётах. |
| `timezone` | string | `UTC` | Часовой пояс для всех временных меток. Используются стандартные идентификаторы (например, `Asia/Seoul`, `America/New_York`). |
| `default_cli` | string | `gemini` | Резервный CLI, когда нет агенто-специфичного маппинга. Используется как уровень 3 в приоритете определения вендора. |
| `agent_cli_mapping` | map | (пустой) | Сопоставляет ID агентов с конкретными CLI-вендорами. Имеет приоритет над `default_cli`. |

### Приоритет определения вендора

При запуске агента CLI-вендор определяется по следующему приоритету (от высшего):

1. Флаг `--model`, переданный в `oma agent:spawn`
2. Запись `agent_cli_mapping` для конкретного агента в `oma-config.yaml`
3. Настройка `default_cli` в `oma-config.yaml`
4. `active_vendor` в `cli-config.yaml` (устаревший запасной вариант)
5. `gemini` (жёстко закодированный финальный запасной вариант)

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

Смотрите [Руководство по использованию](/guide/usage) для подробных примеров или изучите [Агенты](/core-concepts/agents), чтобы понять, что делает каждый специалист.
