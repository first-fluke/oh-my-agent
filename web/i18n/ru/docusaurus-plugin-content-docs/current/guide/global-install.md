---
title: "Руководство: Глобальная установка"
sidebar_label: Глобальная установка
description: Установите oh-my-agent в свой HOME (`~/.agents/`), а не в отдельный проект, чтобы одни и те же навыки, рабочие процессы и правила применялись во всех проектах. Описаны `oma install --global`, `oma update --global`, `oma uninstall --global`, переопределение OMA_HOME, обнаружение двойной установки через `oma doctor` и особенности платформ (отказ от sudo, CI, WSL и защита cwd=HOME).
---

## Что такое глобальная установка?

По умолчанию `oma install` ограничивает всё текущим каталогом проекта: SSOT находится в `<cwd>/.agents/`, а конфигурации поставщиков записываются в `<cwd>/.claude/`, `<cwd>/.codex/` и другие каталоги. **Глобальная установка** (`oma install --global`) устанавливает oh-my-agent в ваш пользовательский HOME, поэтому одни и те же навыки, рабочие процессы и правила доступны в каждом открытом проекте без повторной установки. SSOT находится в `~/.agents/`, а конфигурации поставщиков — в `~/.claude/`, `~/.codex/` и других каталогах.

## Сравнение проектной и глобальной установки

| Аспект | Проект (`oma install`) | Глобальная (`oma install --global`) |
|--------|------------------------|------------------------------------|
| Расположение SSOT | `<cwd>/.agents/` | `~/.agents/` |
| Конфигурации поставщиков | `<cwd>/.claude/`, `<cwd>/.codex/` и т. д. | `~/.claude/`, `~/.codex/` и т. д. |
| Файл блокировки | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Метаданные | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Сценарий использования | Настройка для отдельного проекта | Личные значения по умолчанию для всех проектов |
| Область `oma-config.yaml` | Только проект | Базовая конфигурация пользователя |

Оба режима могут работать одновременно. `oma doctor` сообщает об обеих установках, если они есть, и отмечает расхождения между ними.

После успешной глобальной установки проверьте файлы в пользовательском корне и разрешённый профиль:

```bash
oma doctor --json
oma doctor --profile
```

Первая команда сообщает о состоянии установки и поставщиков, а команда профиля показывает план моделей, используемый агентами. Выполняйте их из любого проекта, если нужно проверить глобальную установку.

## Настройка при первом запуске

При первом запуске `oma install --global` на машине установщик перед продолжением показывает пояснение:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Подтвердите продолжение. Затем установка проходит тот же интерактивный сценарий, что и для проекта: язык, пресет модели, тип проекта и выбор поставщиков.

После успешной установки показываются следующие шаги:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Особенности

### Отказ от sudo

`oma install` в любом режиме немедленно завершает работу при запуске через `sudo`:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Запускайте команду от обычного пользователя, без `sudo`.

### Окружения CI

Запуск `oma install --global` в CI изменяет каталог HOME CI-раннера. Обычно это нежелательно. Если установка нужна (например, для начальной настройки пайплайна), oma выводит предупреждение:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

Установка продолжается, если задан `--yes` или `OMA_YES=1`. Без него предупреждение показывается, а установка продолжается интерактивно (в большинстве CI-конфигураций это приведёт к зависанию).

### WSL: Linux HOME и Windows USERPROFILE

Если oma обнаруживает запуск внутри Windows Subsystem for Linux, он выводит:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Установки в WSL и PowerShell независимы. Чтобы охватить оба окружения, один раз выполните `oma install --global` из WSL и один раз из PowerShell.

### cwd = HOME: защита в режиме проекта

`oma link` и `oma update` (без `--global`) отказываются запускаться, пока текущий каталог — ваш HOME. В режиме проекта `<cwd>/.claude/settings.json` оказался бы `~/.claude/settings.json` — вашими глобальными настройками Claude Code, — а рендер на уровне проекта переписал бы его команды `$HOME/.claude/hooks/...` в `$CLAUDE_PROJECT_DIR/...`, сломав каждый хук и statusline в проектах без собственного `.claude/hooks/`. Вместо этого используйте `oma link --global` / `oma update --global` для установки в HOME или сначала перейдите (`cd`) в проект.

Если запустить `oma install` (без `--global`), находясь в HOME, oma предупредит:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

В неинтерактивном режиме и CI установка автоматически прерывается. Если нужна установка для пользователя, используйте `--global`.

## Повторное создание ссылок глобальной установки

`oma link` заново создаёт нативные файлы поставщиков из SSOT без повторной установки. Как и `install` с `update`, команда определяет цель по контексту установки, поэтому для синхронизации `~/.agents/` передавайте `--global`; команда работает из любого каталога, а не только из `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.agents/oma-config.yaml)
oma link opencode --global
```

Без `--global` `oma link` обращается к `<cwd>/.agents/`; поэтому запуск внутри проекта при глобальной установке сообщит, что `.agents/` там не найден.

## Удаление

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

Команда удаления отделяет файлы, принадлежащие oma, от пользовательских файлов. Пользовательское содержимое (`oma-config.yaml`, `mcp.json`, пользовательские навыки без маркера `<!-- oma:generated -->`) никогда не удаляется.

Чтобы удалить проектную установку, не указывайте `--global`:

```bash
oma uninstall [--dry-run]
```

## Переопределение OMA_HOME

Для тестирования или подготовки окружения можно перенаправить все операции oma в произвольный каталог:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` имеет приоритет над `--global` и `process.cwd()`. Запрещённые системные пути (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) отклоняются даже через `OMA_HOME`. Путь должен быть абсолютным и доступным для записи.

Для безопасной дымовой проверки укажите пустой доступный для записи каталог в `OMA_HOME` и выполните `oma install --global --yes`; в сводке этот каталог должен быть назван корнем установки. После проверки удалите каталог, затем выполните настоящую установку с нужным HOME.
