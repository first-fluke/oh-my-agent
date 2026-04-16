---
title: "Руководство: Автоматические обновления"
description: Полная документация GitHub Action oh-my-agent — настройка, все входы и выходы, подробные примеры, как это работает и сравнение с центральным реестром.
---

# Руководство: Автоматические обновления

## Обзор

GitHub Action oh-my-agent (`first-fluke/oma-update-action@v1`) автоматически обновляет навыки агентов в вашем проекте, запуская `oma update` в CI. Поддерживает два режима: создание PR для ревью или прямой коммит в ветку.

---

## Быстрая настройка

Добавьте `.github/workflows/update-oh-my-agent.yml`:

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'  # Каждый понедельник в 9:00 UTC
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: first-fluke/oma-update-action@v1
```

Минимальная конфигурация. Создаёт PR при наличии обновлений.

---

## Все входы Action

| Вход | Тип | По умолчанию | Описание |
|------|-----|-------------|---------|
| `mode` | string | `"pr"` | `"pr"` — PR, `"commit"` — прямой коммит |
| `base-branch` | string | `"main"` | Целевая ветка |
| `force` | string | `"false"` | `"true"` — перезаписать конфиги (`oma-config.yaml`, `mcp.json`, `stack/`) |
| `pr-title` | string | `"chore(deps): update oh-my-agent skills"` | Заголовок PR |
| `pr-labels` | string | `"dependencies,automated"` | Лейблы PR через запятую |
| `commit-message` | string | `"chore(deps): update oh-my-agent skills"` | Сообщение коммита |
| `token` | string | `${{ github.token }}` | GitHub-токен. PAT нужен для запуска downstream workflows |

---

## Все выходы Action

| Выход | Тип | Описание |
|-------|-----|---------|
| `updated` | string | `"true"` если обнаружены изменения |
| `version` | string | Версия после обновления |
| `pr-number` | string | Номер PR (только в режиме pr) |
| `pr-url` | string | URL PR (только в режиме pr) |

---

## Примеры

### Пример 1: PR по умолчанию

```yaml
- uses: first-fluke/oma-update-action@v1
  id: update
- name: Summary
  if: steps.update.outputs.updated == 'true'
  run: echo "Updated to ${{ steps.update.outputs.version }}, PR: ${{ steps.update.outputs.pr-url }}"
```

### Пример 2: Прямой коммит с PAT

```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.OH_MY_AGENT_PAT }}
- uses: first-fluke/oma-update-action@v1
  with:
    mode: commit
    token: ${{ secrets.OH_MY_AGENT_PAT }}
    base-branch: develop
```

### Пример 3: Уведомление в Slack

```yaml
- uses: first-fluke/oma-update-action@v1
  id: update
- name: Notify Slack
  if: steps.update.outputs.updated == 'true'
  uses: slackapi/slack-github-action@v2
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK }}
    webhook-type: incoming-webhook
    payload: '{"text": "oh-my-agent updated to v${{ steps.update.outputs.version }}"}'
```

### Пример 4: Принудительный режим

```yaml
- uses: first-fluke/oma-update-action@v1
  with:
    force: 'true'
    pr-title: "chore(deps): force-update oh-my-agent skills (reset configs)"
    pr-labels: "dependencies,automated,force-update"
```

**Внимание:** Force-режим перезаписывает `oma-config.yaml`, `mcp.json` и `stack/`.

---

## Как это работает

### Шаг 1: Установка Bun

```yaml
- uses: oven-sh/setup-bun@v2
```

### Шаг 2: Установка oh-my-agent

```bash
bun install -g oh-my-agent
```

### Шаг 3: Запуск oma update

```bash
oma update --ci  # Неинтерактивный режим
```

Внутренне: проверка последней версии через prompt-manifest.json, сравнение с локальной, скачивание тарбола, сохранение конфигов (если не --force), копирование новых файлов, восстановление конфигов, обновление вендорных адаптаций и символических ссылок.

### Шаг 4: Проверка изменений

Если `.agents/` или `.claude/` изменились — устанавливает `updated=true` и `version`.

Далее в зависимости от mode: `pr` — создание PR через `peter-evans/create-pull-request@v8`, `commit` — прямой коммит от `github-actions[bot]`.

---

## Сравнение с центральным реестром

| Аспект | GitHub Action | Центральный реестр |
|--------|-------------|-------------------|
| **Файлы** | 1 workflow | 3 файла |
| **Источник** | npm-реестр | GitHub Release |
| **Фиксация версий** | Нет — всегда последняя | Да — явная в .agent-registry.yml |
| **Контрольная сумма** | Нет | Да — SHA256 |
| **Сохранение конфигов** | Автоматическое | Настраиваемые glob-паттерны |
| **Прямой коммит** | Да (mode: commit) | Нет (sync всегда коммитит) |
| **Лучше для** | Простые проекты, одна команда | Мульти-проектные организации |

Для большинства команд GitHub Action достаточен. Центральный реестр — для фиксации версий и контрольных сумм.
