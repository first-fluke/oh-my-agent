---
title: Интеграция в существующий проект
description: Безопасный и неразрушающий процесс интеграции навыков oh-my-agent в существующий проект Antigravity.
---

# Интеграция в существующий проект

Это руководство заменяет устаревший рабочий процесс с корневым `AGENT_GUIDE.md` и отражает текущую структуру проекта (`cli` + `web`) и поведение CLI.

## Цель

Добавить навыки `oh-my-agent` в существующий проект без перезаписи текущих ресурсов.

## Рекомендуемый путь (CLI)

Выполните в корне целевого проекта:

```bash
bunx oh-my-agent
```

Что происходит:

- Устанавливает или обновляет `.agents/skills/*`
- Устанавливает общие ресурсы в `.agents/skills/_shared`
- Устанавливает `.agents/workflows/*`
- Устанавливает `.agents/config/user-preferences.yaml`
- Опционально устанавливает глобальные рабочие процессы в `~/.gemini/antigravity/global_workflows`

## Безопасный ручной путь

Используйте, когда нужен полный контроль над каждой копируемой директорией.

```bash
cd /path/to/your-project

mkdir -p .agents/skills .agents/workflows .agents/config

# Копировать только отсутствующие директории навыков (пример)
for skill in oma-coordination oma-pm oma-frontend oma-backend oma-mobile oma-qa oma-debug oma-orchestrator oma-commit; do
  if [ ! -d ".agents/skills/$skill" ]; then
    cp -r /path/to/oh-my-agent/.agents/skills/$skill .agents/skills/$skill
  fi
done

# Копировать общие ресурсы, если отсутствуют
[ -d .agents/skills/_shared ] || cp -r /path/to/oh-my-agent/.agents/skills/_shared .agents/skills/_shared

# Копировать рабочие процессы, если отсутствуют
for wf in coordinate.md orchestrate.md plan.md review.md debug.md setup.md tools.md; do
  [ -f ".agents/workflows/$wf" ] || cp /path/to/oh-my-agent/.agents/workflows/$wf .agents/workflows/$wf
done

# Копировать пользовательские настройки по умолчанию, только если отсутствуют
[ -f .agents/config/user-preferences.yaml ] || cp /path/to/oh-my-agent/.agents/config/user-preferences.yaml .agents/config/user-preferences.yaml
```

## Чек-лист верификации

```bash
# 9 устанавливаемых навыков (исключая _shared)
find .agents/skills -mindepth 1 -maxdepth 1 -type d ! -name '_shared' | wc -l

# Общие ресурсы
[ -d .agents/skills/_shared ] && echo ok

# 7 рабочих процессов
find .agents/workflows -maxdepth 1 -name '*.md' | wc -l

# Базовая проверка работоспособности команд
bunx oh-my-agent doctor
```

## Опциональные панели мониторинга

Панели мониторинга опциональны и используют установленный CLI:

```bash
bunx oh-my-agent dashboard
bunx oh-my-agent dashboard:web
```

URL веб-панели по умолчанию: `http://localhost:9847`

## Стратегия отката

Перед интеграцией создайте контрольный коммит в вашем проекте:

```bash
git add -A
git commit -m "chore: checkpoint before oh-my-agent integration"
```

Если нужно отменить изменения, откатите этот коммит стандартным процессом вашей команды.

## Поддержка мульти-CLI через символические ссылки

При запуске `bunx oh-my-agent` после выбора навыков вы увидите такой запрос:

```text
Also develop with other CLI tools?
  ○ Claude Code (.claude/skills/)
  ○ OpenCode, Amp, Codex (.agents/skills/)
  ○ GitHub Copilot (.github/skills/)
```

Выберите дополнительные CLI-инструменты, которые вы используете наряду с Antigravity. Установщик:

1. Устанавливает навыки в `.agents/skills/` (нативное расположение Antigravity)
2. Создаёт символические ссылки из директории навыков каждого выбранного CLI на `.agents/skills/`

Это обеспечивает единый источник истины, позволяя навыкам работать в нескольких CLI-инструментах.

### Структура символических ссылок

```
.agents/skills/oma-frontend/      <- Источник (SSOT)
.claude/skills/oma-frontend/     -> ../../.agents/skills/oma-frontend/
.agents/skills/oma-frontend/     -> ../../.agents/skills/oma-frontend/ (OpenCode, Amp, Codex)
.github/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (GitHub Copilot)
```

Установщик пропускает существующие символические ссылки и предупреждает, если в целевом расположении существует реальная директория.

## Примечания

- Не перезаписывайте существующие папки `.agents/skills/*`, если вы не намерены заменить кастомизированные навыки.
- Храните файлы политик проекта (`.agents/config/*`) под управлением вашего репозитория.
- Для паттернов мультиагентной оркестрации перейдите к [`Руководству по использованию`](./usage.md).
