---
title: "Руководство: Интеграция в существующий проект"
description: Полное руководство по добавлению oh-my-agent в существующий проект — CLI-путь, ручной путь, верификация, структура символических ссылок SSOT и что делает установщик.
---

# Руководство: Интеграция в существующий проект

## Два пути интеграции

1. **CLI-путь** — Запустите `oma` (или `npx oh-my-agent`) и следуйте интерактивным подсказкам. Рекомендуется для большинства.
2. **Ручной путь** — Скопируйте файлы и настройте символические ссылки самостоятельно. Для ограниченных окружений.

Оба пути дают одинаковый результат: директория `.agents/` (SSOT) с символическими ссылками от IDE-специфичных директорий.

---

## CLI-путь

### 1. Установка CLI

```bash
bun install --global oh-my-agent
# Или одноразовый запуск
npx oh-my-agent
```

После глобальной установки доступна команда `oma` (или `oh-my-agent`).

### 2. Перейдите в корень проекта

```bash
cd /path/to/your/project
```

Установщик ожидает запуск из корня проекта (где находится `.git/`).

### 3. Запуск установщика

```bash
oma
```

### 4. Выбор типа проекта

| Пресет | Включённые навыки |
|--------|-------------------|
| **All** | Все доступные навыки |
| **Fullstack** | Frontend + Backend + PM + QA |
| **Frontend** | React/Next.js навыки |
| **Backend** | Python/Node.js/Rust бэкенд навыки |
| **Mobile** | Flutter/Dart мобильные навыки |
| **DevOps** | Terraform + CI/CD + Workflow навыки |
| **Custom** | Индивидуальный выбор навыков |

### 5. Выбор языка бэкенда (если применимо)

Python (FastAPI/SQLAlchemy), Node.js (NestJS/Hono + Prisma/Drizzle), Rust (Axum/Actix-web), или автоопределение (`/stack-set`).

### 6. Настройка символических ссылок IDE

Всегда создаются для Claude Code (`.claude/skills/`). Для GitHub Copilot — по запросу.

### 7. Git rerere

Рекомендуется для мультиагентных рабочих процессов — запоминает разрешения конфликтов слияния.

### 8. Конфигурация MCP

Настройка Serena MCP для Antigravity IDE и Gemini CLI при обнаружении.

---

## Ручной путь

Для окружений без интерактивного CLI:

### Шаг 1: Скачивание и распаковка

```bash
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz
sha256sum -c agent-skills.tar.gz.sha256
tar -xzf agent-skills.tar.gz
```

### Шаг 2: Копирование файлов

```bash
cp -r .agents/ /path/to/your/project/.agents/
mkdir -p /path/to/your/project/.claude/skills
mkdir -p /path/to/your/project/.claude/agents

# Символические ссылки навыков
ln -sf ../../.agents/skills/oma-frontend /path/to/your/project/.claude/skills/oma-frontend
ln -sf ../../.agents/skills/oma-backend /path/to/your/project/.claude/skills/oma-backend
ln -sf ../../.agents/skills/_shared /path/to/your/project/.claude/skills/_shared
```

### Шаг 3: Настройка предпочтений

```bash
mkdir -p /path/to/your/project/.agents/config
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
default_cli: gemini
agent_cli_mapping:
  frontend: gemini
  backend: gemini
EOF
```

### Шаг 4: Инициализация памяти

```bash
oma memory:init
# Или вручную: mkdir -p /path/to/your/project/.serena/memories
```

---

## Чек-лист верификации

```bash
oma doctor        # Полная проверка
oma doctor --json # JSON для CI
```

Проверяет: установку CLI, аутентификацию, конфигурацию MCP, статус навыков.

---

## Архитектура SSOT и символические ссылки

`.agents/` — единственное место хранения навыков, рабочих процессов, конфигов и определений агентов. IDE-директории содержат только символические ссылки.

**Преимущества:**
- **Одно обновление — все IDE** получают изменения автоматически
- **Без дублирования** — навыки хранятся один раз
- **Безопасное удаление** — удаление `.claude/` не уничтожает навыки
- **Git-дружественность** — символические ссылки маленькие и чисто диффятся

---

## Безопасность и откат

### Перед установкой

1. **Закоммитьте текущую работу** — чистый git позволяет `git checkout .` для отмены
2. **Проверьте существующую `.agents/`** — при наличии от другого инструмента — сделайте бэкап

### После установки

1. Проверьте `git status` — новые файлы только в `.agents/`, `.claude/` и `.github/`
2. Добавьте в `.gitignore`:
```gitignore
.serena/
.agents/results/
.agents/state/
```

### Полный откат

```bash
rm -rf .agents/ .claude/skills/ .claude/agents/ .serena/
# Или через git: git checkout -- .agents/ .claude/ && git clean -fd .agents/ .claude/ .serena/
```

---

## Настройка дашборда

```bash
oma dashboard        # Терминальный
oma dashboard:web    # Веб на http://localhost:9847
```

---

## Что делает установщик

1. **Миграция** — проверка устаревшей `.agent/` (ед. число) -> `.agents/` (мн. число)
2. **Обнаружение конкурентов** — предложение удалить конфликтующие инструменты
3. **Скачивание тарбола** — последний релиз с GitHub
4. **Установка общих ресурсов** — `_shared/` с core/, runtime/, conditional/
5. **Установка рабочих процессов** — все 14 определений
6. **Установка конфигов** — `oma-config.yaml`, `mcp.json` (без перезаписи существующих)
7. **Установка навыков** — выбранные навыки + языковые варианты
8. **Вендорные адаптации** — файлы для Claude, Codex, Gemini, Qwen
9. **Символические ссылки CLI** — `.claude/skills/`, `.claude/agents/`
10. **Git rerere + MCP** — опциональная настройка
