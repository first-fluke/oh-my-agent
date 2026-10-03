---
title: "Руководство: Интеграция в существующий проект"
sidebar_label: Существующие проекты
description: "Полное руководство по добавлению oh-my-agent в существующий проект: путь через CLI, ручной путь, проверка, структура символических ссылок SSOT и внутреннее устройство установщика."
---

# Руководство: Интеграция в существующий проект

## Два пути интеграции

Добавить oh-my-agent в существующий проект можно двумя способами:

1. **Через CLI**: запустите `oma` (или `npx oh-my-agent`) и следуйте интерактивным подсказкам. Подходит большинству пользователей.
2. **Вручную**: скопируйте файлы и самостоятельно настройте символические ссылки. Это удобно в ограниченных окружениях и нестандартных конфигурациях.

Оба пути дают один результат: каталог `.agents/` (SSOT) и созданные нативные файлы поставщиков, например `.claude/agents/`, `.codex/agents/` и `.qwen/agents/`.

---

## Путь через CLI: пошагово

### 1. Установите CLI

```bash
# Global install (recommended)
bun install --global oh-my-agent

# Or use npx for one-time runs
npx oh-my-agent
```

После глобальной установки становятся доступны команды `oma` (или `oh-my-agent`).

### 2. Перейдите в корень проекта

```bash
cd /path/to/your/project
```

Запускайте установщик из каталога проекта, который хотите настроить. OMA записывает SSOT относительно корня установки; для проверки изменений и отката рекомендуется Git-репозиторий, но установщику он не требуется.

### 3. Запустите установщик

```bash
oma
```

Команда по умолчанию (без подкоманды) запускает интерактивный установщик.

### 4. Выберите тип проекта

Установщик предлагает такие пресеты:

| Пресет | Включённые навыки |
|:-------|:-----------------|
| **All** | Все доступные навыки |
| **Fullstack** | Навыки Frontend + Backend + PM + QA |
| **Frontend** | Навыки React/Next.js |
| **Backend** | Навыки серверной разработки на Python/Node.js/Rust |
| **Mobile** | Навыки мобильной разработки на Flutter/Dart |
| **DevOps** | Навыки Terraform + CI/CD + Workflow |
| **Custom** | Выбор отдельных навыков из полного списка |

### 5. Выберите язык бэкенда (если применимо)

Если выбран пресет с навыком backend, установщик попросит выбрать вариант языка:

- **Python**: FastAPI/SQLAlchemy (по умолчанию)
- **Node.js**: NestJS/Hono + Prisma/Drizzle
- **Rust**: Axum/Actix-web
- **Other / Auto-detect**: настройте позже с помощью `/stack-set`

### 6. Настройте символические ссылки IDE

Установщик всегда создаёт символические ссылки Claude Code (`.claude/skills/`). Он также создаёт нативные файлы агентов, хуки, настройки и файлы интеграции выбранных поставщиков; текущие семейства поставщиков включают Antigravity, Claude, Codex, Cursor, Kiro, Kimi и Qwen, а также пути расширений для pi и OpenCode. Если существует каталог `.github/`, установщик может автоматически создать символические ссылки GitHub Copilot. При выборе **ZCode** рабочие процессы публикуются как slash-команды через символические ссылки `.zcode/commands/*.md` (только рабочие процессы, без файлов агентов и хуков). В противном случае он задаёт вопрос:

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. Рекомендуемые глобальные настройки Git

В конце `oma install` и `oma update` CLI проверяет две **глобальные** настройки Git, полезные для мультиагентных рабочих процессов:

| Ключ | Требуемое значение | Зачем |
|:----|:------------------|:-----|
| `rerere.enabled` | `true` | Повторное использование сохранённых решений: при слиянии нескольких агентов часто возникают одинаковые конфликты, и rerere повторяет прежнее исправление |
| `init.defaultBranch` | `main` | Единое имя ветки по умолчанию для новых репозиториев |

Если значение отсутствует или отличается, CLI предлагает интерактивно подтвердить изменение (по умолчанию **да**):

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse) (unset)
Set git init.defaultBranch to main? (Recommended global default) (currently "master")
```

После подтверждения выполняется эквивалент:

```bash
git config --global rerere.enabled true
git config --global init.defaultBranch main
```

**Неинтерактивные режимы** (`--yes`, `--ci`, `CI=true`) никогда не записывают глобальную конфигурацию Git. Они лишь выводят сообщение о пропуске с командами для ручного исправления.

`oma doctor` показывает те же проверки в разделе **Git Config**, считает несоответствия проблемами, выводит их как `gitRecommended` в формате `--json` и может применить исправления интерактивно.

### 8. Настройте MCP

Если существует конфигурация MCP Antigravity IDE (`~/.gemini/antigravity/mcp_config.json`), установщик предложит настроить мост Serena MCP:

```
Configure Serena MCP with bridge? (Required for full functionality)
```

После подтверждения будет создана настройка:

```json
{
  "mcpServers": {
    "serena": {
      "command": "npx",
      "args": ["-y", "oh-my-agent@latest", "bridge", "http://localhost:12341/mcp"],
      "disabled": false
    }
  }
}
```

Если существуют настройки Gemini CLI (`~/.gemini/settings.json`), установщик аналогично предложит настроить Serena для Gemini CLI в режиме HTTP:

```json
{
  "mcpServers": {
    "serena": {
      "url": "http://localhost:12341/mcp"
    }
  }
}
```

### 9. Завершение

Установщик показывает сводку всего установленного:

- список установленных навыков;
- расположение каталога навыков;
- созданные символические ссылки;
- пропущенные элементы (если есть).

---

## Ручной путь

Для окружений, в которых интерактивный CLI недоступен (CI-пайплайны, ограниченные оболочки, корпоративные машины).

### Шаг 1: скачайте и распакуйте

```bash
# Download the latest tarball from the registry
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Verify checksum
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Extract
tar -xzf agent-skills.tar.gz
```

### Шаг 2: скопируйте файлы в проект

```bash
# Copy the core .agents/ directory
cp -r .agents/ /path/to/your/project/.agents/

# Regenerate vendor-native files from the SSOT
cd /path/to/your/project
oma link
```

`oma link` заново создаёт `.claude/`, `.codex/`, `.qwen/` и другие нативные файлы поставщиков из `.agents/agents/`. Во время выполнения OMA использует нативную диспетчеризацию только тогда, когда текущий поставщик runtime совпадает с целевым поставщиком агента. Смешанные конфигурации поставщиков также работают, но для несовпадающих агентов выполняется внешний `oma agent spawn`.

Для Qwen Code сгенерированные Markdown-определения находятся в `.qwen/agents/`. Выберите роль OMA через `subagent_type` Agent tool, например `backend-engineer`. Проверьте доступные определения командой `/agents manage` в Qwen Code. Нативные агенты используют тот же [жизненный цикл результата](./agent-results-and-resume.md), что и запуски через CLI: `oma agent begin`, `oma agent verify` и `oma agent finish`. При `model_preset: free` используйте `oma agent spawn`, чтобы дочерний процесс получил конфигурацию шлюза.

Qwen Code использует тот же `code-intelligence-primer`, что и остальные поставщики. Как и Claude Code, он регистрирует общий primer на `SessionStart` и `UserPromptSubmit`: указания внедряются один раз за сессию и снова после сжатия контекста. Primer следует настроенному провайдеру (Serena или Gortex), включает указания по отложенным инструментам и допускает нативный fallback, когда провайдер недоступен или отвечает слишком долго. Qwen не добавляет отдельную блокировку поиска по коду или отслеживание результатов провайдера.

После обновления CLI выполните `oma link qwen`, чтобы заново создать настройки хуков и wrapper, затем запустите новую сессию Qwen. Тесты вывода хуков проверяют контракт интеграции; они не гарантируют, какой инструмент выберет модель.

### Шаг 3: настройте пользовательские параметры

```bash
mkdir -p /path/to/your/project/.agents
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
model_preset: antigravity
EOF
```

### Шаг 4: создайте каталог памяти

```bash
oma memory init
# Or manually:
mkdir -p /path/to/your/project/.agents/state/memories
```

---

## Чек-лист проверки

После установки любым способом убедитесь, что всё настроено правильно:

```bash
# Run the doctor command for a full health check
oma doctor

# Check output format for CI
oma doctor --json
```

Команда doctor проверяет:

| Проверка | Что проверяется |
|:---------|:----------------|
| **Установки CLI** | agy, claude, codex, qwen (версия и доступность) |
| **Аутентификация** | Состояние API-ключа или OAuth для каждого CLI |
| **Конфигурация MCP** | Настройка сервера Serena MCP для каждой среды CLI |
| **Состояние навыков** | Какие навыки установлены и актуальны ли они |

Команды для ручной проверки:

```bash
# Verify .agents/ directory exists
ls -la .agents/

# Verify skills are installed
ls .agents/skills/

# Verify symlinks point to correct targets
ls -la .claude/skills/

# Verify config exists
cat .agents/oma-config.yaml

# Verify memory directory
ls .agents/state/memories/ 2>/dev/null || echo "Memory not initialized"

# Check version
cat .agents/skills/_version.json 2>/dev/null
```

---

## Структура символических ссылок для нескольких IDE (концепция SSOT)

oh-my-agent использует архитектуру Single Source of Truth (SSOT). Каталог `.agents/` — единственное место, где хранятся навыки, рабочие процессы, конфигурации и определения агентов. Все каталоги, специфичные для IDE, содержат только символические ссылки на `.agents/`.

### Структура каталогов

```
your-project/
  .agents/                          # SSOT — the real files live here
    agents/                         # Agent definition files
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # Shipped auxiliary config files
      ...
    oma-config.yaml                 # User-owned project configuration
    mcp.json                        # MCP server configuration
    results/plan-{sessionId}.json    # Current plan (generated by /plan)
    skills/                         # Installed skills
      _shared/                      # Shared resources across all skills
        core/                       # Core protocols and references
        runtime/                    # Runtime execution protocols
        conditional/                # Conditionally-loaded resources
      oma-frontend/                 # Frontend skill
      oma-backend/                  # Backend skill
      oma-qa/                       # QA skill
      ...
    workflows/                      # Workflow definitions
      orchestrate.md
      work.md
      ultrawork.md
      plan.md
      ...
    state/                          # Runtime coordination state
      memories/                     # Coordination artifacts (progress-*, result-*, task-board, session-cost-*)
    results/                        # Agent execution results
  .claude/                          # Claude Code — symlinks only
    skills/                         # -> .agents/skills/* and .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — symlinks only (optional)
    skills/                         # -> .agents/skills/*
  .zcode/                           # ZCode — workflow commands only (optional)
    commands/                       # -> .agents/workflows/*
  .serena/                          # Serena MCP storage (separate from OMA state)
    memories/                       # Serena's own onboarding memories
    metrics.json                    # Productivity metrics
```

### Зачем нужны символические ссылки?

Когда `oma update` обновляет `.agents/`, изменения подхватывает каждая IDE, которая на него ссылается. Навыки хранятся в одном месте, а не копируются для каждой IDE. Удаление `.claude/` не удаляет навыки: SSOT в `.agents/` сохраняется. Символические ссылки также мало весят и дают чистые Git-диффы.

---

## Советы по безопасности и стратегия отката

### Перед установкой

1. **Закоммитьте текущую работу.** Установщик создаёт новые каталоги и файлы. Чистое состояние Git позволит отменить изменения командой `git checkout .`.
2. **Проверьте каталог `.agents/`.** Если он был создан другим инструментом, сначала сделайте резервную копию. Установщик перезапишет его.

### После установки

1. **Проверьте созданные файлы.** Выполните `git status`, чтобы увидеть все новые файлы. Установщик создаёт файлы только в `.agents/`, `.claude/` и, если включён, `.github/`.
2. **Проверьте `.gitignore`.** В Git-репозитории команды install/update/link автоматически добавляют runtime-записи в корневой `.gitignore` (`.antigravitycli/`, `.agents/results/`, `.agents/state/`, `.agents/backup/`, `docs/plans/`) — убедитесь, что они добавлены. Большинство команд фиксирует `.agents/` и `.claude/`, чтобы делиться настройкой. Единственный оставленный на ваше усмотрение каталог — `.serena/`: Serena сама управляет своим кэшем через внутренний `.serena/.gitignore`, поэтому можно зафиксировать `.serena/project.yml` (общая конфигурация проекта) или полностью игнорировать каталог:

```gitignore
# optional — ignore Serena entirely (runtime memory)
.serena/
```

### Откат

Чтобы полностью удалить oh-my-agent из проекта:

```bash
# Remove the SSOT directory
rm -rf .agents/

# Remove IDE symlinks
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # if created

# Remove runtime files
rm -rf .serena/
```

Или просто отмените изменения через Git:

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## Настройка дашборда

После установки можно настроить мониторинг в реальном времени. Подробности приведены в [руководстве по мониторингу дашборда](/docs/guide/dashboard-monitoring).

Быстрая настройка:

```bash
# Terminal dashboard (watches .agents/state/memories/ for changes)
oma dashboard terminal

# Web dashboard (browser-based; OMA prints a tokenized loopback URL)
oma dashboard web
```

---

## Что установщик делает внутри

При запуске `oma` (команды установки) происходит следующее:

### 1. Миграция со старой структуры

Установщик проверяет старый каталог `.agent/` (в единственном числе) и при его наличии переносит его в `.agents/` (во множественном числе). Это одноразовая миграция для пользователей, обновляющихся с ранних версий.

### 2. Обнаружение конкурирующих инструментов

Установщик ищет конкурирующие инструменты и предлагает удалить их, чтобы избежать конфликтов.

### 3. Скачивание тарбола

Установщик скачивает архив последнего релиза из GitHub Releases oh-my-agent. Архив содержит полный каталог `.agents/` со всеми навыками, общими ресурсами, рабочими процессами, конфигурациями и определениями агентов.

### 4. Установка общих ресурсов

`installShared()` копирует каталог `_shared/` в `.agents/skills/_shared/`. В него входят:

- `core/`: маршрутизация навыков, загрузка контекста, структура промптов, принципы качества, определение поставщика и API-контракты;
- `runtime/`: протокол памяти и протоколы выполнения для каждого поставщика;
- `conditional/`: ресурсы, загружаемые только при выполнении определённых условий (оценка качества, цикл исследования).

### 5. Установка рабочих процессов

`installWorkflows()` копирует все файлы рабочих процессов в `.agents/workflows/`. Это определения для `/orchestrate`, `/work`, `/ultrawork`, `/plan`, `/brainstorm`, `/deepinit`, `/review`, `/debug`, `/design`, `/scm`, `/tools` и `/stack-set`.

### 6. Установка конфигурации

`installConfigs()` копирует вспомогательные файлы в `.agents/config/`, создаёт `.agents/mcp.json` и подготавливает пользовательский `.agents/oma-config.yaml` или `.agents/oma-config.cue`. Существующие пользовательские файлы сохраняются, если не указан `--force`; `oma update` также сохраняет пользовательскую конфигурацию и при необходимости добавляет новые ключи верхнего уровня из шаблона.

### 7. Установка навыков

Для каждого выбранного навыка `installSkill()` копирует каталог навыка в `.agents/skills/{skill-name}/`. Если выбран вариант (например, Python для backend), дополнительно создаётся каталог `stack/` с ресурсами для соответствующего языка.

### 8. Адаптация под поставщиков

`installVendorAdaptations()` устанавливает файлы IDE для выбранных поддерживаемых поставщиков:

- определения агентов (`.claude/agents/*.md`, `.codex/agents/*.toml`, `.gemini/agents/*.md`);
- конфигурации хуков (`.claude/hooks/`, `.codex/hooks.json`);
- файлы настроек и общий документ интеграции поставщиков (только `AGENTS.md`, включая Claude Code ≥ 2.1.277). `CLAUDE.md` и `GEMINI.md` никогда не получают блок OMA; существующий пользовательский `CLAUDE.md` получает только строку импорта `@AGENTS.md`, чтобы Claude Code не пропускал `AGENTS.md`.

Codex защищает свои хуки одноразовым шагом доверия, поэтому `.codex/hooks.json` не выполняется, пока вы не проверите его через браузер Codex `/hooks`. Подробности приведены в [руководстве по доверию к хукам Codex](/docs/guide/codex-hook-trust).

### 9. Символические ссылки CLI

`createCliSymlinks()` создаёт ссылки из каталогов IDE в SSOT:

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}` (если включён Copilot)

Нативные файлы агентов создаются из `.agents/agents/` командами `oma link`, `oma install` или `oma update`, а не напрямую связываются символическими ссылками.

### 10. Глобальные рабочие процессы

`installGlobalWorkflows()` устанавливает файлы рабочих процессов, которые могут понадобиться глобально (вне каталога проекта).

### 11. Рекомендуемая конфигурация Git и MCP

Как описано выше в пути через CLI, install/update по интерактивному согласию могут настроить рекомендуемые **глобальные** параметры Git (`rerere.enabled`, `init.defaultBranch`) и при необходимости конфигурацию MCP.
