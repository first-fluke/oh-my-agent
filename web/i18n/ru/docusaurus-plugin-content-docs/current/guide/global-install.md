---
title: "Руководство: Глобальная установка"
description: Установите oh-my-agent в домашнюю директорию пользователя (~/.agents/) вместо установки для каждого проекта, чтобы одни и те же скилы, рабочие процессы и правила применялись во всех проектах. Описываются oma install --global, oma update --global, oma uninstall --global, переопределение OMA_HOME, обнаружение двойной установки через oma doctor и особенности платформ (отказ от sudo, CI, WSL, защита cwd=HOME).
---

## Что такое глобальная установка?

По умолчанию `oma install` ограничивает всю установку текущей директорией проекта: SSOT находится в `<cwd>/.agents/`, а конфигурации вендоров записываются в `<cwd>/.claude/`, `<cwd>/.codex/` и т. д. **Глобальная установка** (`oma install --global`) устанавливает oh-my-agent в домашнюю директорию пользователя, чтобы одни и те же скилы, рабочие процессы и правила были доступны в каждом открываемом проекте без повторного выполнения шага установки. SSOT находится в `~/.agents/`, а конфигурации вендоров — в `~/.claude/`, `~/.codex/` и т. д.

## Сравнение: проект и глобальная установка

| Аспект | Проект (`oma install`) | Глобальная (`oma install --global`) |
|--------|------------------------|--------------------------------|
| Расположение SSOT | `<cwd>/.agents/` | `~/.agents/` |
| Конфигурации вендоров | `<cwd>/.claude/`, `<cwd>/.codex/` и т. д. | `~/.claude/`, `~/.codex/` и т. д. |
| Lock-файл | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Метаданные | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Сценарий использования | Настройка для отдельного проекта | Личные значения по умолчанию для всех проектов |
| Область oma-config.yaml | Специфично для проекта | Базовая линия на уровне пользователя |

Оба режима могут сосуществовать. `oma doctor` сообщает о наличии обеих установок и сигнализирует о расхождениях между ними.

## Первый запуск

При первом запуске `oma install --global` на машине установка показывает пояснительное примечание перед продолжением:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Подтвердите, чтобы продолжить. Установка далее проходит тот же интерактивный сценарий, что и установка для проекта (язык, пресет модели, тип проекта, выбор вендора).

После успешной установки отображаются следующие шаги:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Особенности

### Отказ от sudo

`oma install` (в любом режиме) немедленно завершает работу, если запущен под `sudo`:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Выполните команду от обычного пользователя без `sudo`.

### CI-окружения

Запуск `oma install --global` внутри CI-пайплайна изменяет HOME-директорию пользователя CI-раннера. Обычно это нежелательно. Если это всё же нужно (например, в бутстрап-пайплайне), oma выводит предупреждение:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

Установка продолжается, если задано `--yes` / `OMA_YES=1`. Без этого выводится предупреждение, а установка продолжается в интерактивном режиме (что в большинстве CI-конфигураций приведёт к зависанию).

### WSL: HOME в Linux и USERPROFILE в Windows

Когда oma определяет, что он запущен в подсистеме Windows для Linux, он выводит:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Установка в WSL и установка через PowerShell независимы. Если нужен глобальный охват с обеих сторон, выполните `oma install --global` один раз в WSL и один раз в PowerShell.

### Предупреждение cwd = HOME (режим проекта)

Если вы запускаете `oma install` (без `--global`), находясь в домашней директории, oma выводит предупреждение:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

В неинтерактивном / CI-режиме это автоматически прерывает операцию. Используйте `--global`, если намереваетесь выполнить установку на уровне пользователя.

## Удаление

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

Команда удаления отделяет файлы, принадлежащие oma, от пользовательских файлов. Пользовательское содержимое (oma-config.yaml, mcp.json, пользовательские скилы без маркера `<!-- oma:generated -->`) никогда не удаляется.

Чтобы удалить установку для проекта, пропустите `--global`:

```bash
oma uninstall [--dry-run]
```

## Переопределение OMA_HOME

Для целей тестирования или staging-окружения можно перенаправить все операции oma в произвольную директорию:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` имеет приоритет над `--global` и `process.cwd()`. Запрещённые системные пути (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) отклоняются даже через `OMA_HOME`. Путь должен быть абсолютным и доступным для записи.
