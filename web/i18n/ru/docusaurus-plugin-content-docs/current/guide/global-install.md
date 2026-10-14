---
title: "Руководство: Глобальная установка"
sidebar_label: Глобальная установка
description: Установите oh-my-agent в глобальный home OMA (~/.oma/), а не в отдельный проект, чтобы одни и те же навыки, рабочие процессы и правила применялись во всех проектах. Описаны oma install --global, oma update --global, oma uninstall --global, переопределение OMA_HOME, обнаружение двойной установки через oma doctor и особенности платформ (отказ от sudo, CI, WSL и защита cwd=HOME).
---

## Что такое глобальная установка?

По умолчанию `oma install` ограничивает всё текущим каталогом проекта: SSOT находится в `<cwd>/.agents/`, а конфигурации поставщиков записываются в `<cwd>/.claude/`, `<cwd>/.codex/` и другие каталоги. **Глобальная установка** (`oma install --global`) устанавливает oh-my-agent в глобальный home OMA, поэтому одни и те же навыки, рабочие процессы и правила доступны в каждом открытом проекте без повторной установки. SSOT находится в `~/.oma/.agents/`, а конфигурации поставщиков остаются в `~/.claude/`, `~/.codex/` и других каталогах.

## Сравнение проектной и глобальной установки

| Аспект | Проект (`oma install`) | Глобальная (`oma install --global`, home OMA по умолчанию) |
|--------|------------------------|--------------------------------|
| Расположение SSOT | `<cwd>/.agents/` | `~/.oma/.agents/` |
| Конфигурации поставщиков | `<cwd>/.claude/`, `<cwd>/.codex/` и т. д. | `~/.claude/`, `~/.codex/` и т. д. |
| Файл блокировки | `<cwd>/.agents/_install.lock` | `~/.oma/.agents/_install.lock` |
| Метаданные | `<cwd>/.agents/skills/_version.json` (schemaVersion 2) | `~/.oma/.agents/skills/_version.json` (schemaVersion 2) |
| Сценарий использования | Настройка для отдельного проекта | Личные значения по умолчанию для всех проектов |
| Область `oma-config.yaml` | Только проект | Базовая конфигурация пользователя |

Оба режима могут работать одновременно. `oma doctor` сообщает об обеих установках, если они есть, и отмечает расхождения между ними.

После успешной глобальной установки проверьте файлы в пользовательском корне и разрешённый профиль:

```bash
oma doctor --global --json
oma doctor --global --profile
```

Первая команда сообщает о состоянии установки и поставщиков, а команда профиля показывает план моделей, используемый агентами. Не забывайте `--global` (или `-g`): без него обе команды проверяют проект в текущем каталоге, конфигурация которого накладывается на глобальные значения по умолчанию.

## Настройка при первом запуске

При первом запуске `oma install --global` на машине установщик перед продолжением показывает пояснение:

```text
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.oma/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.oma/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Подтвердите продолжение. Затем установка проходит тот же интерактивный сценарий, что и для проекта: язык, пресет модели, тип проекта и выбор поставщиков.

После успешной установки показываются следующие шаги:

```text
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Особенности

### Отказ от sudo

`oma install` в любом режиме немедленно завершает работу при запуске через `sudo`:

```text
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Запускайте команду от обычного пользователя, без `sudo`.

### Окружения CI

Запуск `oma install --global` в CI изменяет каталог HOME CI-раннера. Обычно это нежелательно. Если установка всё же нужна (например, для начальной настройки пайплайна), oma выводит предупреждение:

```text
Running `oma install --global` in CI. This will modify the CI user's HOME. Proceeding because --yes / non-interactive mode is set.
```

Предупреждение появляется, когда `CI` равно `true` или `1`. Эти значения уже делают установку неинтерактивной, поэтому она продолжается со значениями по умолчанию и не ждёт ввода. Вне CI то же неинтерактивное поведение дают `--yes` или `OMA_YES=1`.

### WSL: Linux HOME и Windows USERPROFILE

Если oma обнаруживает запуск внутри Windows Subsystem for Linux, он выводит:

```text
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Установки в WSL и PowerShell независимы. Чтобы охватить оба окружения, один раз выполните `oma install --global` из WSL и один раз из PowerShell.

### cwd = HOME: защита в режиме проекта

`oma link` и `oma update` (без `--global`) отказываются запускаться, пока текущий каталог — ваш HOME. В режиме проекта `<cwd>/.claude/settings.json` оказался бы `~/.claude/settings.json` — вашими глобальными настройками Claude Code, — а рендер на уровне проекта переписал бы его команды `$HOME/.claude/hooks/...` в `$CLAUDE_PROJECT_DIR/...`, сломав каждый хук и statusline в проектах без собственного `.claude/hooks/`. Вместо этого используйте `oma link --global` / `oma update --global` для глобальной установки или сначала перейдите (`cd`) в проект.

Если запустить `oma install` (без `--global`), находясь в HOME, oma предупредит:

```text
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

В неинтерактивном режиме и CI установка автоматически прерывается. Если нужна установка для всего пользователя, используйте `--global`.

## Повторное создание ссылок глобальной установки

`oma link` заново создаёт нативные файлы поставщиков из SSOT без повторной установки. Как и `install` с `update`, команда определяет цель по контексту установки, поэтому для синхронизации `~/.oma/.agents/` передавайте `--global`; команда работает из любого каталога, а не только из `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.oma/.agents/oma-config.yaml)
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

Команда удаления отделяет файлы, принадлежащие oma, от пользовательских файлов. Она удаляет только навыки, записанные как управляемые OMA в `managed-skills.json` в `.agents/state/`; маркер `<!-- oma:generated -->` обозначает сгенерированные файлы prompt Copilot. Пользовательское содержимое (`oma-config.yaml`, `mcp.json` и навыки, не записанные как управляемые) никогда не удаляется. Сначала выполните `--dry-run`, чтобы увидеть точный список.

Чтобы удалить проектную установку, не указывайте `--global`:

```bash
oma uninstall [--dry-run]
```

## Переопределение OMA_HOME

Задайте в `OMA_HOME` абсолютный путь, чтобы перенести глобальные данные, принадлежащие OMA:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` — это корень глобального хранилища, а не цель проектной установки. С указанным выше значением глобальные определения находятся в `/tmp/oma-test/.agents/`; проектные install и link по-прежнему используют `<cwd>/.agents/`. Нативные настройки поставщиков и аутентификация остаются вне `OMA_HOME`. Глобальные файлы интеграции OpenCode записываются в `~/.config/opencode/` в фактическом каталоге HOME.

`OMA_STATE_HOME` — явное исключение для хранилища профилей, L1 и runtime проектов: путь должен быть абсолютным и содержит `u/`. Если переменная не задана, профили следуют за `OMA_HOME`. `XDG_CONFIG_HOME` больше не переносит состояние OMA и не меняет путь вывода OpenCode в OMA. Секреты OS Keychain, данные AgentMemory/Honcho и кэши управляемых toolchain остаются у своих прежних владельцев.

## Структура глобального хранилища

По умолчанию глобальные данные находятся в `~/.oma`. Если задан `OMA_HOME`, замените `~/.oma` его значением:

| Данные | Расположение |
|---|---|
| Глобальные определения, конфигурация, метаданные установки | `~/.oma/.agents/` |
| Манифест расписаний, сохранённое окружение, журналы запусков | `~/.oma/schedule/` |
| Глобальные резервные копии | `~/.oma/backup/` |
| Реестр, блокировки и журналы Serena | `~/.oma/state/serena/` |
| Индекс имён ключей Vault | `~/.oma/state/vault-index.json` |
| Профили, сессии L1, runtime проектов | `~/.oma/u/<profile>/` (`<OMA_STATE_HOME>/u/<profile>/`, если задан `OMA_STATE_HOME`) |

Глобальная конфигурация задаёт значения по умолчанию. Ближайший проектный `.agents/oma-config.*` и
его локальный overlay переопределяют их; корни разных проектов-предков не объединяются.
Полный порядок см. в разделе [Загрузка конфигурации](./oma-config-semantics.md#precedence-table).
Проект, выбравший `semantic_memory: none`, оставляет память отключённой, даже если
глобальная конфигурация выбирает AgentMemory.

## Существующие установки

Миграция home копирует данные, принадлежащие OMA, из `~/.agents/` и `~/.config/oma/`
в новую структуру. Оригиналы остаются на месте, кроме проверенных каталогов навыков OMA,
преобразованных в ссылки для обнаружения: их исходное содержимое архивируется в
`~/.oma/backup/legacy-global-skills/`, прежде чем старый путь станет ссылкой на перенесённый
навык. Существующие файлы назначения не перезаписываются; о конфликтах и используемых данных
сообщается для повторной попытки. Индексы Vault
объединяют имена ключей, не перемещая значения секретов из keychain ОС. Пользовательские
навыки и сторонние ссылки остаются на месте; файлы аутентификации поставщиков не
перемещаются. Читатели runtime используют только
новые пути.

```bash
oma home migrate --dry-run --json
oma home migrate --json
oma schedule sync
```

Глобальные install и update выполняют миграцию до записи своих глобальных файлов.
Проектные install/update используют единые корни, не перенося посторонние глобальные
данные. Миграция не меняет регистрации заданий в ОС; если есть расписания, выполните `oma schedule sync`
после миграции. Активные сервисы или раннеры могут отложить перенос данных;
завершите эти процессы и запустите миграцию повторно.

## См. также

- [Загрузка конфигурации](./oma-config-semantics.md): как объединяются глобальные, проектные и локальные файлы конфигурации
- [Интеграция в существующий проект](./integration.md): проектная установка, проверка и откат
- [Автоматические обновления](./automated-updates.md): запуск `oma update` из CI
